from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("DATABASE_URL") or os.getenv("MONGO_URL", "mongodb://localhost:27017")

try:
    client = AsyncIOMotorClient(
        MONGO_URL,
        serverSelectionTimeoutMS=3000,
        connectTimeoutMS=3000,
        socketTimeoutMS=3000,
    )
    db = client.blueprint_db
    path_collection = db.get_collection("paths")
    user_path_progress_collection = db.get_collection("user_path_progress")
except Exception:
    client = None
    db = None
    path_collection = None
    user_path_progress_collection = None


async def ensure_indexes():
    if path_collection is None or user_path_progress_collection is None:
        return

    try:
        await path_collection.create_index("slug", unique=True)
        await path_collection.create_index("creator_id")
        await path_collection.create_index("status")
        await path_collection.create_index("category")

        await user_path_progress_collection.create_index(
            [("user_id", 1), ("path_id", 1)],
            unique=True,
        )
        await user_path_progress_collection.create_index("user_id")
        await user_path_progress_collection.create_index("path_id")
    except Exception as exc:
        print(f"MongoDB offline/standby: Index creation skipped ({exc})")
