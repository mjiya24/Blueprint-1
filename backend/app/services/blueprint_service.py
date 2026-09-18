from app.database import blueprint_collection, FALLBACK_BLUEPRINTS
from app.models.blueprint import BlueprintModel


async def fetch_all_blueprints():
    # Grabs all blueprints from MongoDB, formatting the ID correctly.
    # If the database is unavailable, use the local in-memory fallback.
    if blueprint_collection is None:
        return [dict(item) for item in FALLBACK_BLUEPRINTS]

    blueprints = []
    try:
        cursor = blueprint_collection.find({})
        async for document in cursor:
            document["_id"] = str(document["_id"])
            blueprints.append(document)
    except Exception:
        return [dict(item) for item in FALLBACK_BLUEPRINTS]
    return blueprints


async def save_blueprint(blueprint_data: BlueprintModel):
    """
    Create and save a new blueprint to the database.
    If MongoDB is unavailable, keep the data in local memory so the app keeps working.
    """
    import uuid
    from datetime import datetime

    blueprint_dict = blueprint_data.model_dump()
    blueprint_dict["id"] = str(uuid.uuid4())
    blueprint_dict["version"] = "2.0"
    blueprint_dict["created_at"] = datetime.utcnow().isoformat()
    blueprint_dict["updated_at"] = datetime.utcnow().isoformat()

    if blueprint_collection is None:
        FALLBACK_BLUEPRINTS.append({**blueprint_dict, "_id": str(uuid.uuid4())})
        return blueprint_dict["id"]

    try:
        result = await blueprint_collection.insert_one(blueprint_dict)
        return str(result.inserted_id)
    except Exception:
        FALLBACK_BLUEPRINTS.append({**blueprint_dict, "_id": str(uuid.uuid4())})
        return blueprint_dict["id"]


async def get_blueprints_paginated(category: str = None, limit: int = 50, skip: int = 0):
    """
    Fetch paginated blueprints from MongoDB, or return an empty result set from memory.
    """
    if blueprint_collection is None:
        items = [dict(item) for item in FALLBACK_BLUEPRINTS]
        if category and category != "All":
            items = [item for item in items if item.get("category") == category]
        total = len(items)
        start = max(0, skip)
        end = start + max(0, limit)
        return {
            "blueprints": items[start:end],
            "total": total,
            "has_more": end < total,
        }

    query = {"version": "2.0"}
    if category and category != "All":
        query["category"] = category

    try:
        total = await blueprint_collection.count_documents(query)
        items = await blueprint_collection.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).to_list(limit)
        return {
            "blueprints": items,
            "total": total,
            "has_more": skip + limit < total,
        }
    except Exception:
        items = [dict(item) for item in FALLBACK_BLUEPRINTS]
        if category and category != "All":
            items = [item for item in items if item.get("category") == category]
        total = len(items)
        start = max(0, skip)
        end = start + max(0, limit)
        return {
            "blueprints": items[start:end],
            "total": total,
            "has_more": end < total,
        }
