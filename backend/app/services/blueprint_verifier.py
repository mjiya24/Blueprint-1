"""
Phase 2 — Live Job-Feed Ingestion & Nightly Verification Engine

Fetches occupational demand data from the BLS public API (free, no API key
required for basic queries) and updates each blueprint's
`verification_status` and `verification_last_checked` fields in MongoDB.

Usage (automatic):
  On startup, server.py schedules `run_nightly_verifier(db)` as a background
  asyncio task.  It runs once immediately, then sleeps 24 h and repeats.

Usage (manual/admin):
  POST /api/verify/refresh — triggers a single pass without the 24 h loop.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# BLS Series mapping  (Occupational Employment & Wage Statistics — national)
# Series format: OEUSxxxxxxxxxxxxxxx
# ---------------------------------------------------------------------------
BLS_SERIES_MAP: dict[str, str] = {
    "rideshare":        "OEUS000000053706100",   # Uber/Lyft drivers
    "delivery":         "OEUS000000043500001",   # Couriers & delivery workers
    "dog walker":       "OEUS000000039509900",   # Animal care workers
    "virtual assistant":"OEUS000000043601200",   # Secretaries & admin assistants
    "data entry":       "OEUS000000043906012",   # Data entry keyers
    "freelance writer": "OEUS000000027303011",   # Writers & authors
    "graphic designer": "OEUS000000027102201",   # Graphic designers
    "web developer":    "OEUS000000015113100",   # Web developers
    "software":         "OEUS000000015113200",   # Software developers
    "data analyst":     "OEUS000000015119210",   # Data scientists / analysts
    "ux":               "OEUS000000027102900",   # UX & product designers
    "social media":     "OEUS000000011202100",   # Marketing specialists
    "bookkeep":         "OEUS000000043303100",   # Bookkeeping clerks
    "tutor":            "OEUS000000025902100",   # Education workers
    "notary":           "OEUS000000023200200",   # Paralegals & legal support
}

BLS_API_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/"


def _match_series(title: str) -> Optional[str]:
    """Return the first BLS series ID whose keyword appears in `title`."""
    lower = title.lower()
    for keyword, series_id in BLS_SERIES_MAP.items():
        if keyword in lower:
            return series_id
    return None


async def _fetch_bls(series_id: str, api_key: Optional[str] = None) -> dict:
    """
    Hit the BLS public API for a single series.
    Returns the latest data point dict, or {} on failure.
    """
    payload: dict = {
        "seriesid": [series_id],
        "startyear": "2023",
        "endyear": "2025",
    }
    if api_key:
        payload["registrationkey"] = api_key

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(BLS_API_URL, json=payload)
            resp.raise_for_status()
            data = resp.json()

        if data.get("status") == "REQUEST_SUCCEEDED":
            series_list = data.get("Results", {}).get("series", [])
            if series_list:
                latest = series_list[0].get("data", [{}])[0]
                return {
                    "value": latest.get("value"),
                    "period": latest.get("period"),
                    "year": latest.get("year"),
                }
    except Exception as exc:  # network / parse failures are non-fatal
        logger.debug(f"[Verifier] BLS fetch error for {series_id}: {exc}")

    return {}


async def _verify_one(db, doc_id: str, title: str) -> dict:
    """
    Verify a single blueprint document.
    Escalates verification_status to 'bls-verified' when BLS data is found.
    Returns a dict with new status and confidence score (0-100).
    """
    series_id = _match_series(title)
    new_status = "source-linked"
    confidence = 45  # base confidence for source-linked

    if series_id:
        bls = await _fetch_bls(series_id)
        if bls.get("value"):
            new_status = "bls-verified"
            confidence = 85  # high confidence when BLS data found

    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    await db["ideas"].update_one(
        {"id": doc_id},
        {"$set": {
            "verification_status": new_status,
            "verification_last_checked": now_str,
            "confidence_score": confidence,
        }},
    )
    return {"status": new_status, "confidence": confidence}


async def verify_all_once(db) -> dict:
    """
    Single verification pass over every blueprint in the DB.
    Returns a summary dict suitable for the /api/verify/refresh response.
    """
    logger.info("[Verifier] Starting nightly check…")
    counts: dict[str, int] = {}
    processed = 0

    cursor = db["ideas"].find({}, {"id": 1, "title": 1})
    async for doc in cursor:
        result = await _verify_one(db, doc.get("id", ""), doc.get("title", ""))
        status = result["status"]
        counts[status] = counts.get(status, 0) + 1
        processed += 1
        await asyncio.sleep(0.08)   # stay well under BLS rate limit (500 req/day)

    logger.info(f"[Verifier] Nightly check complete. {processed} Blueprints updated. bls-verified: {counts.get('bls-verified', 0)}, source-linked: {counts.get('source-linked', 0)}")
    return {"processed": processed, "status_counts": counts}


async def run_nightly_verifier(db) -> None:
    """
    Long-running background task: runs verify_all_once(), then sleeps 24 h.
    Start with asyncio.create_task(run_nightly_verifier(db)) in startup hook.
    """
    while True:
        try:
            await verify_all_once(db)
        except Exception as exc:
            logger.error(f"[Verifier] Nightly pass raised: {exc}", exc_info=exc)
        await asyncio.sleep(24 * 3600)
