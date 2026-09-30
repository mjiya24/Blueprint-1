import os

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field

from app.api.v1.state import authenticate_user, create_user, find_user_by_id, public_user, update_user

router = APIRouter()


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)
    name: str = Field(min_length=1)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class VerifyPhoneRequest(BaseModel):
    user_id: str
    firebase_id_token: str


@router.post("/signup")
async def signup(payload: SignupRequest):
    user = await create_user(str(payload.email), payload.password, payload.name)
    if user is None:
        raise HTTPException(status_code=400, detail="Email already registered")
    return public_user(user)


@router.post("/login")
async def login(payload: LoginRequest):
    user = await authenticate_user(str(payload.email), payload.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return public_user(user)


@router.post("/verify-phone")
async def verify_phone(payload: VerifyPhoneRequest):
    api_key = os.getenv("FIREBASE_WEB_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=400, detail="Invalid or expired Firebase token")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={api_key}",
                json={"idToken": payload.firebase_id_token},
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=400, detail="Invalid or expired Firebase token") from exc
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Invalid or expired Firebase token")

    users = response.json().get("users", [])
    phone_number = users[0].get("phoneNumber") if users else None
    if not phone_number:
        raise HTTPException(status_code=400, detail="Phone number not verified in this token")
    if not await find_user_by_id(payload.user_id):
        raise HTTPException(status_code=404, detail="User not found")
    await update_user(payload.user_id, {"phone_number": phone_number, "phone_verified": True})
    return {"verified": True, "phone": phone_number}