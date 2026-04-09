from fastapi import APIRouter, HTTPException
from app.models.blueprint import BlueprintModel
from app.services import blueprint_service

router = APIRouter()

@router.get("/")
async def get_blueprints(category: str = None, limit: int = 50, skip: int = 0):
    """
    Fetch paginated v2.0 blueprints with optional category filtering.
    Migrated from OLD_server_backup.py @api_router.get("/blueprints")
    
    Query Parameters:
    - category: Filter by blueprint category (optional, use "All" for all categories)
    - limit: Number of blueprints per page (default: 50)
    - skip: Number of blueprints to skip for pagination (default: 0)
    
    Returns:
    - blueprints: List of blueprint objects
    - total: Total number of matching blueprints
    - has_more: Boolean indicating if more results are available
    """
    try:
        result = await blueprint_service.get_blueprints_paginated(
            category=category,
            limit=limit,
            skip=skip
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/import")
async def import_blueprint(blueprint: BlueprintModel):
    """
    Create and import a new blueprint into the database.
    Migrated from OLD_server_backup.py blueprint creation patterns.
    
    Request Body:
    - Blueprint data conforming to BlueprintModel schema:
      - title (str): Blueprint name
      - category (str): Category (Gig, Digital, Local, etc.)
      - startup_cost (int): Initial cost in dollars
      - time_to_cash (str): Time to first earning (e.g., "1 week")
      - difficulty (str): Difficulty level (Beginner, Intermediate, Advanced)
      - geo_targeted (bool): Whether blueprint is location-specific
      - optimal_locations (list): List of optimal geographic regions
      - match_dimensions (object): Matching criteria (environment, social, assets, interests)
      - steps (list): List of action steps with step_number and task
      - ai_go_deeper_prompt (str): Prompt for AI expansion
    
    Returns:
        {
            "message": "Successfully imported blueprint",
            "id": "<mongodb_id>",
            "title": "<blueprint_title>",
            "message_detail": "Blueprint created and added to database"
        }
    
    Status Codes:
        - 200: Successfully created blueprint
        - 400: Invalid blueprint data
        - 500: Database error
    """
    try:
        # Insert blueprint into database using service layer
        inserted_id = await blueprint_service.save_blueprint(blueprint)
        
        return {
            "message": "Successfully imported blueprint",
            "id": inserted_id,
            "title": blueprint.title,
            "message_detail": "Blueprint created and added to database"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
