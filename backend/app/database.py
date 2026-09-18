from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

# Load our environment variables (the secrets)
load_dotenv()

MONGO_URL = os.getenv("DATABASE_URL") or os.getenv("MONGO_URL", "mongodb://localhost:27017")

# Keep the app usable even when MongoDB isn't running locally.
# This gives us a safe, in-memory fallback for smoke testing and local usage.
try:
    client = AsyncIOMotorClient(
        MONGO_URL,
        serverSelectionTimeoutMS=3000,
        connectTimeoutMS=3000,
        socketTimeoutMS=3000,
    )
    db = client.blueprint_db
    blueprint_collection = db.get_collection("blueprints")
except Exception:
    client = None
    db = None
    blueprint_collection = None

FALLBACK_BLUEPRINTS = []


def get_blueprint_collection():
    return blueprint_collection


def list_fallback_blueprints():
    return FALLBACK_BLUEPRINTS
