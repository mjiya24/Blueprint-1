import asyncio
import json
import logging
import os
import re
from typing import Any, Dict, Iterable, Optional

import google.generativeai as genai

logger = logging.getLogger(__name__)

_DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
_CONFIGURED = False


def configure_gemini() -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is required")
    genai.configure(api_key=api_key)
    _CONFIGURED = True


def _extract_json_blob(text: str) -> str:
    cleaned = re.sub(r"```json\n?|```\n?", "", text or "").strip()
    if cleaned.startswith("{") and cleaned.endswith("}"):
        return cleaned
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        raise ValueError("No JSON object found in model output")
    return match.group(0)


def parse_json_strict(text: str, required_keys: Optional[Iterable[str]] = None) -> Dict[str, Any]:
    blob = _extract_json_blob(text)
    payload = json.loads(blob)
    if required_keys:
        missing = [k for k in required_keys if k not in payload]
        if missing:
            raise ValueError(f"Missing required keys: {', '.join(missing)}")
    return payload


def validate_blueprint_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    required = [
        "title",
        "description",
        "category",
        "tags",
        "match_tags",
        "difficulty",
        "difficulty_score",
        "startup_cost",
        "startup_cost_range",
        "time_to_first_dollar",
        "potential_earnings",
        "action_steps",
    ]
    missing = [k for k in required if k not in payload]
    if missing:
        raise ValueError(f"Blueprint missing required keys: {', '.join(missing)}")

    steps = payload.get("action_steps")
    if not isinstance(steps, list) or len(steps) != 17:
        raise ValueError("Blueprint action_steps must contain exactly 17 items")

    for idx, step in enumerate(steps, start=1):
        if not isinstance(step, dict):
            raise ValueError(f"Step {idx} is not an object")
        if "step_number" not in step or "text" not in step:
            raise ValueError(f"Step {idx} missing step_number or text")
        step.setdefault("is_locked", step.get("step_number", idx) > 5)
        step.setdefault("common_wall", None)
        step.setdefault("workaround_hint", None)
        step.setdefault("completed", False)
    return payload


def _generate_content_sync(
    prompt: str,
    system_message: str = "",
    model: Optional[str] = None,
    expect_json: bool = False,
) -> str:
    configure_gemini()
    model_name = model or _DEFAULT_MODEL
    generation_config: Dict[str, Any] = {
        "temperature": 0.2,
    }
    if expect_json:
        generation_config["response_mime_type"] = "application/json"

    gm = genai.GenerativeModel(
        model_name=model_name,
        system_instruction=system_message or None,
        generation_config=generation_config,
    )
    resp = gm.generate_content(prompt)
    text = (getattr(resp, "text", None) or "").strip()
    if text:
        return text

    # Fallback for edge responses with empty .text
    candidates = getattr(resp, "candidates", None) or []
    if candidates:
        parts = getattr(candidates[0], "content", None)
        if parts and getattr(parts, "parts", None):
            merged = "".join(getattr(p, "text", "") for p in parts.parts).strip()
            if merged:
                return merged

    raise ValueError("Gemini returned an empty response")


async def generate_text(
    prompt: str,
    system_message: str = "",
    model: Optional[str] = None,
) -> str:
    return await asyncio.to_thread(_generate_content_sync, prompt, system_message, model, False)


async def generate_json_strict(
    prompt: str,
    system_message: str,
    required_keys: Iterable[str],
    model: Optional[str] = None,
) -> Dict[str, Any]:
    text = await asyncio.to_thread(_generate_content_sync, prompt, system_message, model, True)
    return parse_json_strict(text, required_keys)


async def ping_gemini(model: Optional[str] = None) -> bool:
    try:
        reply = await asyncio.to_thread(
            _generate_content_sync,
            'Reply with exactly this JSON: {"status":"ok"}',
            "You are a healthcheck assistant. Return valid JSON only.",
            model,
            True,
        )
        payload = parse_json_strict(reply, ["status"])
        return payload.get("status") == "ok"
    except Exception as exc:
        logger.error("Gemini ping failed", exc_info=exc)
        return False
