# Blueprint Migration: Request/Response Endpoints → Modular Structure

## Summary
Successfully migrated the main Blueprint API endpoints from the monolithic server.py into the new modular service-oriented architecture:
1. **GET /blueprints** (Retrieve) - Fetch paginated blueprints with filtering
2. **POST /blueprints** (Create) - Create and import new blueprints into the database

## Migration 1: GET /blueprints → Fetch Blueprints

**Source**: `OLD_server_backup.py` line 1885

### Changes Made

#### 1. Service Layer - `app/services/blueprint_service.py`
Added new async function `get_blueprints_paginated()`:
- **Purpose**: Encapsulates all database logic for fetching blueprints
- **Parameters**: 
  - `category` (str, optional): Filter by blueprint category
  - `limit` (int, default 50): Results per page
  - `skip` (int, default 0): Pagination offset
- **Returns**: Dictionary with:
  - `blueprints`: List of blueprint documents
  - `total`: Total matching document count
  - `has_more`: Boolean indicating more results available

**Database Operations**:
```python
query = {"version": "2.0"}  # Only v2 blueprints
if category and category != "All":
    query["category"] = category
total = await blueprint_collection.count_documents(query)
items = await blueprint_collection.find(query, {"_id": 0})
           .sort("created_at", -1)  # Newest first
           .skip(skip)
           .to_list(limit)
```

#### 2. Route Layer - `app/routes/blueprint_routes.py`
Updated `GET /` endpoint:
- **Previous**: Called `fetch_all_blueprints()` (no filtering/pagination)
- **New**: Calls `get_blueprints_paginated()` with query parameters
- **Parameters**: `category`, `limit`, `skip`
- **Error Handling**: Try/except with HTTPException(500)

#### 3. API Integration - `app/main.py`
Already configured with:
```python
app.include_router(blueprint_routes.router, prefix="/api/blueprints", tags=["Blueprints"])
```

### GET Endpoint Usage

```bash
# Get all v2.0 blueprints
GET /api/blueprints

# Filter by category
GET /api/blueprints?category=Gig&limit=20&skip=0

# Pagination
GET /api/blueprints?limit=50&skip=0
```

**Response**:
```json
{
  "blueprints": [...],
  "total": 42,
  "has_more": true
}
```

---

## Migration 2: POST /blueprints → Create Blueprint

**Source**: Patterns from server.py `/saved-ideas` POST endpoint + BlueprintModel schema

### Changes Made

#### 1. Service Layer - `app/services/blueprint_service.py`
Enhanced `save_blueprint()` function:
- **Purpose**: Create and persist new blueprints to MongoDB
- **Input**: `BlueprintModel` instance containing:
  - `title` (str): Blueprint name
  - `category` (str): Category (Gig, Digital, Local, Passive, QuickWin, etc.)
  - `startup_cost` (int): Initial investment in dollars
  - `time_to_cash` (str): Time to first monetization
  - `difficulty` (str): Difficulty level
  - `geo_targeted` (bool): Location-specific flag
  - `optimal_locations` (list): Target regions
  - `match_dimensions` (object): Environment, social, assets, interests criteria
  - `steps` (list): Step-by-step action plan
  - `ai_go_deeper_prompt` (str): Expansion prompt for AI
  
- **Database Operations**:
  - Converts Pydantic model to dictionary
  - Adds system fields: `id`, `version`, `created_at`, `updated_at`
  - Inserts into MongoDB's `blueprints` collection
  - Returns inserted document ID

- **Returns**: str (MongoDB inserted ID)

**Implementation**:
```python
blueprint_dict = blueprint_data.model_dump()
blueprint_dict["id"] = str(uuid.uuid4())
blueprint_dict["version"] = "2.0"
blueprint_dict["created_at"] = datetime.utcnow().isoformat()
blueprint_dict["updated_at"] = datetime.utcnow().isoformat()
result = await blueprint_collection.insert_one(blueprint_dict)
return str(result.inserted_id)
```

#### 2. Route Layer - `app/routes/blueprint_routes.py`
Implemented `POST /import` endpoint:
- **Purpose**: Accept blueprint creation requests from API clients
- **Input**: JSON body conforming to `BlueprintModel` schema
- **Validation**: FastAPI/Pydantic automatic validation
- **Error Handling**: 
  - 400: Invalid blueprint data
  - 500: Database insertion error
- **Response**: Success response with:
  - `message`: Confirmation message
  - `id`: Inserted MongoDB document ID
  - `title`: Blueprint title
  - `message_detail`: Additional context

**Implementation**:
```python
@router.post("/import")
async def import_blueprint(blueprint: BlueprintModel):
    inserted_id = await blueprint_service.save_blueprint(blueprint)
    return {
        "message": "Successfully imported blueprint",
        "id": inserted_id,
        "title": blueprint.title,
        "message_detail": "Blueprint created and added to database"
    }
```

### POST Endpoint Usage

```bash
# Create a new blueprint
POST /api/blueprints/import

# Request Body (JSON):
{
  "title": "Freelance Writing",
  "category": "Digital",
  "startup_cost": 0,
  "time_to_cash": "1-2 weeks",
  "difficulty": "Beginner",
  "geo_targeted": false,
  "optimal_locations": [],
  "match_dimensions": {
    "environment": "remote",
    "social": "solo",
    "assets": ["laptop"],
    "interests": ["writing", "content"]
  },
  "steps": [
    {"step_number": 1, "task": "Set up writing portfolio"},
    {"step_number": 2, "task": "Apply to job boards"},
    ...
  ],
  "ai_go_deeper_prompt": "Expand on freelance writing monetization strategies"
}
```

**Response** (201 Created):
```json
{
  "message": "Successfully imported blueprint",
  "id": "507f1f77bcf86cd799439011",
  "title": "Freelance Writing",
  "message_detail": "Blueprint created and added to database"
}
```

---

## Architecture Benefits
1. ✓ **Separation of Concerns**: Database logic isolated in service layer
2. ✓ **Layer Independence**: Routes depend only on service interface, not DB details
3. ✓ **Type Safety**: Pydantic validates all inputs before database operations
4. ✓ **Reusability**: Service functions callable from multiple routes
5. ✓ **Testability**: Service functions independently unit-testable
6. ✓ **Maintainability**: Single source of truth for each operation
7. ✓ **Error Handling**: Consistent exception handling across endpoints

## Next Steps
Other endpoints ready for migration from server.py:
- `GET /ideas` (line 1283) - v1 ideas API with category/difficulty/cost filtering
- `GET /ideas/personalized/{user_id}` - User-matched ideas with scoring  
- `GET /ideas/{idea_id}` - Single idea detail
- `POST /saved-ideas` - User saves an idea/blueprint
- `GET /blueprints/daily/{user_id}` - Daily blueprint recommendation
- `GET /blueprints/{blueprint_id}` - Single blueprint detail
- And 8+ additional endpoints

---
**Last Updated**: 2024 (POST /import endpoint added)  
**Original Code References**: `backend/server.py` lines 1885 (GET) and `/saved-ideas` pattern (POST)  
**Implementation**: `/app/services/blueprint_service.py` + `/app/routes/blueprint_routes.py`

## Next Steps
Other endpoints ready to migrate from [OLD_server_backup.py](OLD_server_backup.py):
- Line 1283: `GET /ideas` - v1 ideas API
- Line 1297: `GET /ideas/personalized/{user_id}` - User-matched ideas
- Line 1312: `GET /ideas/{idea_id}` - Single idea details
- Line 1340+: Other saved-ideas, carousels, search endpoints

---
**Migration Date**: 2024  
**Original Implementation**: [OLD_server_backup.py](OLD_server_backup.py):1885  
**Current Implementation**: `/app/services/blueprint_service.py` + `/app/routes/blueprint_routes.py`
