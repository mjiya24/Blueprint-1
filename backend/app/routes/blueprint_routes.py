from fastapi import APIRouter, HTTPException
from app.models.blueprint import BlueprintModel
from app.services import blueprint_service

router = APIRouter()

@router.get("/")
async def get_all_blueprints():
    try:
        blueprints = await blueprint_service.fetch_all_blueprints()
        return {"count": len(blueprints), "data": blueprints}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/import")
async def import_blueprint(blueprint: BlueprintModel):
    try:
        new_id = await blueprint_service.save_blueprint(blueprint)
        return {"message": "Successfully imported blueprint", "id": new_id, "title": blueprint.title}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
