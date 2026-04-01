from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

# Load our environment variables (the secrets)
load_dotenv()

MONGO_URL = os.getenv("DATABASE_URL") or os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)

# Targets the specific database named "blueprint_db"
db = client.blueprint_db

# Targets the specific collection where our 500+ hustles will live
blueprint_collection = db.get_collection("blueprints")
