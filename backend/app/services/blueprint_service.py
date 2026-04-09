from app.database import blueprint_collection
from app.models.blueprint import BlueprintModel

async def fetch_all_blueprints():
    # Grabs all blueprints from MongoDB, formatting the ID correctly
    blueprints = []
    cursor = blueprint_collection.find({})
    async for document in cursor:
        document["_id"] = str(document["_id"])
        blueprints.append(document)
    return blueprints

async def save_blueprint(blueprint_data: BlueprintModel):
    """
    Create and save a new blueprint to the database.
    Migrated from patterns in OLD_server_backup.py blueprint POST endpoints.
    
    Args:
        blueprint_data: BlueprintModel instance containing blueprint details
    
    Returns:
        str: The MongoDB inserted ID of the newly created blueprint
    
    Raises:
        Exception: If database insertion fails
    """
    import uuid
    from datetime import datetime
    
    # Convert Pydantic model to dictionary
    blueprint_dict = blueprint_data.model_dump()
    
    # Add system fields for database tracking
    blueprint_dict["id"] = str(uuid.uuid4())
    blueprint_dict["version"] = "2.0"
    blueprint_dict["created_at"] = datetime.utcnow().isoformat()
    blueprint_dict["updated_at"] = datetime.utcnow().isoformat()
    
    # Insert into MongoDB and return the inserted ID
    result = await blueprint_collection.insert_one(blueprint_dict)
    return str(result.inserted_id)

async def get_blueprints_paginated(category: str = None, limit: int = 50, skip: int = 0):
    """
    Fetch paginated blueprints from MongoDB.
    Migrated from OLD_server_backup.py @api_router.get("/blueprints")
    
    Args:
        category: Optional filter by blueprint category (or "All" for all categories)
        limit: Number of results per page (default 50)
        skip: Number of results to skip for pagination (default 0)
    
    Returns:
        dict with keys: blueprints (list), total (int), has_more (bool)
    """
    query = {"version": "2.0"}
    if category and category != "All":
        query["category"] = category
    
    # Count total matching documents
    total = await blueprint_collection.count_documents(query)
    
    # Fetch paginated results, sorted by creation date (newest first)
    items = await blueprint_collection.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).to_list(limit)
    
    return {
        "blueprints": items,
        "total": total,
        "has_more": skip + limit < total
    }
