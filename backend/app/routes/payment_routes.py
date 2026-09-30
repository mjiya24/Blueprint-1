import json
import os
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel, Field

from app.database import db

router = APIRouter()

ENABLE_TEST_PAYMENTS = os.getenv("ENABLE_TEST_PAYMENTS", "true").lower() == "true"
STANDBY_ENTITLEMENTS = set()
STANDBY_SESSIONS = {}
PAYMENT_TELEMETRY = []


class CheckoutSessionRequest(BaseModel):
    path_slug: str = Field(min_length=1)
    creator_handle: str = Field(min_length=1)
    user_id: Optional[str] = None
    email: Optional[str] = None
    price_cents: int = Field(default=4900, ge=0)
    origin_url: Optional[str] = None


class AccessCheckResponse(BaseModel):
    has_access: bool
    path_slug: str
    user_id: str
    test_mode: bool


class TelemetryRequest(BaseModel):
    event_name: str
    path_slug: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    metadata: dict = Field(default_factory=dict)


async def _has_entitlement(user_id: str, path_slug: str) -> bool:
    if (user_id, path_slug) in STANDBY_ENTITLEMENTS:
        return True
    if db is None:
        return False
    try:
        record = await db.path_entitlements.find_one({"user_id": user_id, "path_slug": path_slug})
        return bool(record and record.get("active", True))
    except Exception:
        return False


async def _grant_entitlement(user_id: str, path_slug: str, session_id: str):
    STANDBY_ENTITLEMENTS.add((user_id, path_slug))
    if db is None:
        return
    try:
        await db.path_entitlements.update_one(
            {"user_id": user_id, "path_slug": path_slug},
            {"$set": {
                "user_id": user_id,
                "path_slug": path_slug,
                "session_id": session_id,
                "active": True,
                "granted_at": datetime.utcnow().isoformat(),
            }},
            upsert=True,
        )
    except Exception:
        pass


async def record_payment_event(event_name: str, payload: TelemetryRequest):
    event = {
        "id": f"payevt-{uuid.uuid4().hex[:10]}",
        "event_name": event_name,
        "path_slug": payload.path_slug,
        "user_id": payload.user_id,
        "session_id": payload.session_id,
        "metadata": payload.metadata,
        "recorded_at": datetime.utcnow().isoformat(),
    }
    PAYMENT_TELEMETRY.append(event)
    return event


@router.post("/create-checkout-session")
async def create_checkout_session(payload: CheckoutSessionRequest):
    user_id = payload.user_id or payload.email
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id or email is required")

    session_id = f"cs_test_{uuid.uuid4().hex}"
    STANDBY_SESSIONS[session_id] = {
        "user_id": user_id,
        "path_slug": payload.path_slug,
        "creator_handle": payload.creator_handle,
        "price_cents": payload.price_cents,
        "status": "open",
    }
    await record_payment_event("checkout_initiated", TelemetryRequest(
        event_name="checkout_initiated",
        path_slug=payload.path_slug,
        user_id=user_id,
        session_id=session_id,
        metadata={"price_cents": payload.price_cents, "creator_handle": payload.creator_handle},
    ))

    if ENABLE_TEST_PAYMENTS:
        return {
            "session_id": session_id,
            "url": f"{payload.origin_url or '/c/' + payload.creator_handle + '/' + payload.path_slug}?payment=test&session_id={session_id}",
            "test_mode": True,
        }

    try:
        import stripe
        stripe.api_key = os.getenv("STRIPE_API_KEY")
        session = stripe.checkout.Session.create(
            mode="payment",
            customer_email=payload.email,
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "unit_amount": payload.price_cents,
                    "product_data": {"name": f"Path access: {payload.path_slug}"},
                },
                "quantity": 1,
            }],
            success_url=f"{payload.origin_url}?payment=success&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{payload.origin_url}?payment=cancelled",
            metadata={"path_slug": payload.path_slug, "creator_handle": payload.creator_handle, "user_id": user_id},
        )
        return {"session_id": session.id, "url": session.url, "test_mode": False}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Checkout unavailable: {exc}")


@router.post("/test-complete/{session_id}")
async def complete_test_checkout(session_id: str):
    session = STANDBY_SESSIONS.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Checkout session not found")
    await _grant_entitlement(session["user_id"], session["path_slug"], session_id)
    session["status"] = "complete"
    await record_payment_event("checkout_completed", TelemetryRequest(
        event_name="checkout_completed",
        path_slug=session["path_slug"],
        user_id=session["user_id"],
        session_id=session_id,
    ))
    return {"status": "success", "has_access": True, "path_slug": session["path_slug"]}


@router.post("/webhook")
async def payment_webhook(request: Request, stripe_signature: Optional[str] = Header(default=None, alias="Stripe-Signature")):
    body = await request.body()
    try:
        webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
        if webhook_secret and stripe_signature:
            import stripe
            payload = stripe.Webhook.construct_event(body, stripe_signature, webhook_secret)
        else:
            payload = json.loads(body.decode("utf-8"))
        event_type = payload.get("type")
        session = payload.get("data", {}).get("object", {})
        if event_type == "checkout.session.completed" and session.get("payment_status") in {"paid", "no_payment_required"}:
            metadata = session.get("metadata") or {}
            user_id = metadata.get("user_id")
            path_slug = metadata.get("path_slug")
            if user_id and path_slug:
                await _grant_entitlement(user_id, path_slug, session.get("id", "stripe_session"))
                await record_payment_event("checkout_completed", TelemetryRequest(
                    event_name="checkout_completed", path_slug=path_slug, user_id=user_id, session_id=session.get("id"),
                ))
        return {"received": True}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid webhook payload: {exc}")


@router.get("/access-check", response_model=AccessCheckResponse)
async def access_check(path_slug: str, user_id: str):
    return AccessCheckResponse(
        has_access=await _has_entitlement(user_id, path_slug),
        path_slug=path_slug,
        user_id=user_id,
        test_mode=ENABLE_TEST_PAYMENTS,
    )


@router.post("/telemetry")
async def payment_telemetry(payload: TelemetryRequest):
    if payload.event_name not in {"paywall_impression", "checkout_initiated", "checkout_completed"}:
        raise HTTPException(status_code=400, detail="Unsupported payment telemetry event")
    return await record_payment_event(payload.event_name, payload)
