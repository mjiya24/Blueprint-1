from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.auth import router as auth_router
from app.api.v1.ideas import router as ideas_router
from app.api.v1.streaks import router as streak_router
from app.routes.path_routes import build_activity_feed, build_creator_insights, router as path_router
from app.routes.payment_routes import TelemetryRequest, record_payment_event, router as payment_router
from app.routes.analytics_routes import router as analytics_router
from app.routes.shop_routes import router as shop_router
from app.database import ensure_indexes

app = FastAPI(title="Pathfinder API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://127.0.0.1:8081",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(ideas_router, prefix="/api/ideas", tags=["Ideas"])
app.include_router(streak_router, prefix="/api", tags=["Streaks"])
app.include_router(path_router, prefix="/api/paths", tags=["Paths"])
app.include_router(payment_router, prefix="/api/payments", tags=["Payments"])
app.include_router(analytics_router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(shop_router, prefix="/api/shops", tags=["Shops"])


@app.get("/api/activity")
async def get_activity_feed(limit: int = 10):
    return build_activity_feed(limit=limit)


@app.get("/api/creator/insights")
async def get_creator_insights():
    return build_creator_insights()


@app.post("/api/telemetry/step-action")
async def record_step_action(payload: dict):
    event = await record_payment_event("step_action", TelemetryRequest(
        event_name="step_action",
        path_slug=str(payload.get("path_id") or "unknown"),
        user_id=payload.get("member_id") or payload.get("user_id"),
        metadata=payload,
    ))
    seconds = int(payload.get("time_spent_seconds") or 0)
    return {
        "status": "success",
        "telemetry_id": event["id"],
        "recorded_at": event["recorded_at"],
        "velocity_score": "fast" if seconds and seconds <= 300 else "steady",
    }


@app.on_event("startup")
async def startup_event():
    await ensure_indexes()


@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Pathfinder API is running and routes are wired up.",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "database": "standby",
    }
