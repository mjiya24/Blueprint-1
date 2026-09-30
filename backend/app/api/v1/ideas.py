from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, HTTPException

router = APIRouter()
_seed_file = Path(__file__).resolve().parents[3] / "mock_ideas.json"
with _seed_file.open(encoding="utf-8") as ideas_file:
    IDEA_CATALOG: list[dict[str, Any]] = json.load(ideas_file)


@router.get("")
async def get_ideas(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    cost: Optional[str] = None,
    hours_per_week: Optional[str] = None,
    visa_status: Optional[str] = None,
):
    ideas = IDEA_CATALOG
    if category and category != "All":
        ideas = [idea for idea in ideas if idea.get("category") == category]
    if difficulty and difficulty.lower() != "all":
        ideas = [idea for idea in ideas if str(idea.get("difficulty", "")).lower() == difficulty.lower()]
    if cost and cost.lower() != "all":
        ideas = [idea for idea in ideas if str(idea.get("startup_cost", "")).lower() == cost.lower()]
    if hours_per_week == "side-hustle":
        ideas = [idea for idea in ideas if idea.get("time_needed") in {"flexible", "part-time"}]
    if visa_status == "visa-restricted":
        ideas = [idea for idea in ideas if not idea.get("visa_required", False)]

    safe_skip = max(0, skip)
    safe_limit = max(1, min(limit, 500))
    return {
        "ideas": ideas[safe_skip:safe_skip + safe_limit],
        "total": len(ideas),
        "skip": safe_skip,
        "limit": safe_limit,
    }


@router.get("/{idea_id}")
async def get_idea(idea_id: str):
    for idea in IDEA_CATALOG:
        if idea.get("id") == idea_id:
            return idea
    raise HTTPException(status_code=404, detail="Idea not found")