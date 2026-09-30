from __future__ import annotations

import hashlib
import hmac
import secrets
import uuid
from typing import Any

import bcrypt
from app.database import db

MEMORY_USERS: dict[str, dict[str, Any]] = {}
MEMORY_EMAILS: dict[str, str] = {}
DATABASE_BACKED_USERS: set[str] = set()


def _password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _password_matches(password: str, stored_hash: str) -> bool:
    if stored_hash.startswith(("$2a$", "$2b$", "$2y$")):
        try:
            return bcrypt.checkpw(password.encode(), stored_hash.encode())
        except ValueError:
            return False
    try:
        salt, expected = stored_hash.split("$", 1)
    except ValueError:
        return False
    actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120_000).hex()
    return hmac.compare_digest(actual, expected)


async def find_user_by_email(email: str) -> dict[str, Any] | None:
    normalized = email.strip().lower()
    memory_id = MEMORY_EMAILS.get(normalized)
    if memory_id:
        return MEMORY_USERS.get(memory_id)
    if db is None:
        return None
    try:
        user = await db.users.find_one({"email": normalized}, {"_id": 0})
    except Exception:
        return None
    if user:
        user_id = str(user.get("id") or "")
        if user_id:
            MEMORY_USERS[user_id] = user
            MEMORY_EMAILS[normalized] = user_id
            DATABASE_BACKED_USERS.add(user_id)
    return user


async def find_user_by_id(user_id: str) -> dict[str, Any] | None:
    user = MEMORY_USERS.get(user_id)
    if user:
        return user
    if db is None:
        return None
    try:
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
    except Exception:
        return None
    if user:
        MEMORY_USERS[user_id] = user
        MEMORY_EMAILS[str(user.get("email", "")).lower()] = user_id
        DATABASE_BACKED_USERS.add(user_id)
    return user


async def create_user(email: str, password: str, name: str) -> dict[str, Any] | None:
    normalized = email.strip().lower()
    if await find_user_by_email(normalized):
        return None

    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": normalized,
        "name": name.strip(),
        "password_hash": _password_hash(password),
        "is_guest": False,
        "is_architect": False,
        "profile": {"interests": [], "skills": [], "budget": "", "time_availability": ""},
        "phone_verified": False,
        "phone_number": "",
        "arc_balance": 0,
        "streak_current": 0,
        "streak_longest": 0,
        "streak_last_action": None,
    }

    MEMORY_USERS[user_id] = user
    MEMORY_EMAILS[normalized] = user_id
    if db is not None:
        try:
            await db.users.insert_one(user.copy())
            DATABASE_BACKED_USERS.add(user_id)
        except Exception:
            pass
    return user


async def authenticate_user(email: str, password: str) -> dict[str, Any] | None:
    user = await find_user_by_email(email)
    if not user or not _password_matches(password, str(user.get("password_hash", ""))):
        return None
    return user


async def update_user(user_id: str, fields: dict[str, Any], increments: dict[str, int] | None = None) -> dict[str, Any] | None:
    user = await find_user_by_id(user_id)
    if not user:
        return None
    user.update(fields)
    for key, amount in (increments or {}).items():
        user[key] = int(user.get(key, 0) or 0) + amount
    if db is not None and user_id in DATABASE_BACKED_USERS:
        update: dict[str, Any] = {}
        if fields:
            update["$set"] = fields
        if increments:
            update["$inc"] = increments
        try:
            await db.users.update_one({"id": user_id}, update)
        except Exception:
            DATABASE_BACKED_USERS.discard(user_id)
    return user


def public_user(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user.get("name", "Guest"),
        "is_guest": bool(user.get("is_guest", False)),
        "is_architect": bool(user.get("is_architect", False)),
        "profile": user.get("profile", {}),
        "phone_verified": bool(user.get("phone_verified", False)),
        "phone_number": user.get("phone_number", ""),
    }