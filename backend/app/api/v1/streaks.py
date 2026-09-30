from datetime import date, timedelta

from fastapi import APIRouter, HTTPException

from app.api.v1.state import find_user_by_id, update_user

router = APIRouter()


@router.post("/users/{user_id}/streak/checkin")
async def streak_checkin(user_id: str):
    user = await find_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    today = date.today()
    today_key = today.isoformat()
    last_action = user.get("streak_last_action")
    current = int(user.get("streak_current", 0) or 0)
    longest = int(user.get("streak_longest", 0) or 0)
    if last_action == today_key:
        return {
            "streak_current": current,
            "streak_longest": longest,
            "is_new_day": False,
            "arc_awarded": 0,
            "message": "Already checked in today",
        }

    current = current + 1 if last_action == (today - timedelta(days=1)).isoformat() else 1
    longest = max(longest, current)
    await update_user(
        user_id,
        {"streak_current": current, "streak_longest": longest, "streak_last_action": today_key},
        {"arc_balance": 5},
    )
    return {
        "streak_current": current,
        "streak_longest": longest,
        "is_new_day": True,
        "arc_awarded": 5,
        "message": f"Streak: {current} days! +5 ARC",
    }


@router.get("/users/{user_id}/streak")
async def get_streak(user_id: str):
    user = await find_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "streak_current": int(user.get("streak_current", 0) or 0),
        "streak_longest": int(user.get("streak_longest", 0) or 0),
        "streak_last_action": user.get("streak_last_action"),
    }


def _arc_level(balance: int) -> str:
    if balance >= 1000:
        return "Legend"
    if balance >= 600:
        return "Architect"
    if balance >= 300:
        return "Strategist"
    if balance >= 100:
        return "Builder"
    return "Apprentice"


def _next_milestone(balance: int) -> int:
    for milestone in (100, 300, 600, 1000):
        if balance < milestone:
            return milestone
    return 1000


@router.get("/arc/{user_id}")
async def get_arc_balance(user_id: str):
    user = await find_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    balance = int(user.get("arc_balance", 0) or 0)
    return {
        "user_id": user_id,
        "arc_balance": balance,
        "level": _arc_level(balance),
        "next_milestone": _next_milestone(balance),
    }