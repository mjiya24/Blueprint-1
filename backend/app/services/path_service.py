from datetime import datetime
import uuid

from app.database import path_collection, user_path_progress_collection
from app.models.path import PathModel, UserPathProgress


async def fetch_all_paths():
    if path_collection is None:
        return []

    try:
        cursor = path_collection.find({})
        docs = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            docs.append(doc)
        return docs
    except Exception:
        return []


async def save_path(path_data: PathModel):
    if path_collection is None:
        return path_data.id

    doc = path_data.model_dump()
    doc["created_at"] = doc.get("created_at") or datetime.utcnow().isoformat()
    doc["updated_at"] = doc.get("updated_at") or datetime.utcnow().isoformat()

    result = await path_collection.insert_one(doc)
    return str(result.inserted_id)


async def get_paths_paginated(category: str = None, limit: int = 50, skip: int = 0):
    query = {}

    if category and category != "All":
        query["category"] = category

    if path_collection is None:
        return {
            "paths": [],
            "total": 0,
            "has_more": False,
        }

    try:
        total = await path_collection.count_documents(query)
        items = await path_collection.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).to_list(limit)

        return {
            "paths": items,
            "total": total,
            "has_more": skip + limit < total,
        }
    except Exception:
        return {
            "paths": [],
            "total": 0,
            "has_more": False,
        }


async def get_path_by_slug(slug: str):
    if path_collection is None:
        return None
    return await path_collection.find_one({"slug": slug}, {"_id": 0})


async def upsert_progress(progress: UserPathProgress):
    if user_path_progress_collection is None:
        return progress.id

    progress_dict = progress.model_dump()
    progress_dict["updated_at"] = datetime.utcnow().isoformat()

    await user_path_progress_collection.update_one(
        {"user_id": progress.user_id, "path_id": progress.path_id},
        {"$set": progress_dict},
        upsert=True,
    )
    return progress.id


async def get_progress_for_user_path(user_id: str, path_id: str):
    if user_path_progress_collection is None:
        return None

    return await user_path_progress_collection.find_one(
        {"user_id": user_id, "path_id": path_id},
        {"_id": 0},
    )
