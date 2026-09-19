from fastapi import FastAPI
from app.routes.path_routes import router as path_router
from app.database import ensure_indexes

app = FastAPI(title="Pathfinder API", version="2.0.0")

app.include_router(path_router, prefix="/api/paths", tags=["Paths"])


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
