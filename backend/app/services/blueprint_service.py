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
    # Converts the Pydantic model to a dictionary and inserts it into MongoDB
    blueprint_dict = blueprint_data.model_dump()
    result = await blueprint_collection.insert_one(blueprint_dict)
    return str(result.inserted_id)
