from fastapi import FastAPI
from app.routes import blueprint_routes

# Initialize your Blueprint API engine
app = FastAPI(title="Blueprint API Engine", version="2.0.0")

# Wire up the router
app.include_router(blueprint_routes.router, prefix="/api/blueprints", tags=["Blueprints"])

@app.get("/")
def read_root():
    return {"status": "online", "message": "Blueprint Engine is running and routes are wired up."}

@app.get("/health")
def health_check():
    return {"status": "healthy", "database": "standby"}
