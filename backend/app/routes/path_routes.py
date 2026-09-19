from fastapi import APIRouter, HTTPException

from app.models.path import PathModel, UserPathProgress
from app.services import path_service

router = APIRouter()


@router.get("/")
async def get_paths(category: str = None, limit: int = 50, skip: int = 0):
    try:
        result = await path_service.get_paths_paginated(
            category=category,
            limit=limit,
            skip=skip,
        )
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/{slug}")
async def get_path_by_slug(slug: str):
    try:
        path = await path_service.get_path_by_slug(slug)
        if not path:
            raise HTTPException(status_code=404, detail="Path not found")
        return path
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/import")
async def import_path(path: PathModel):
    try:
        inserted_id = await path_service.save_path(path)
        return {
            "message": "Successfully imported path",
            "id": inserted_id,
            "title": path.title,
            "message_detail": "Path created and added to database",
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {str(exc)}")


@router.post("/progress")
async def save_user_progress(progress: UserPathProgress):
    try:
        progress_id = await path_service.upsert_progress(progress)
        return {
            "message": "Progress saved",
            "id": progress_id,
            "user_id": progress.user_id,
            "path_id": progress.path_id,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/progress/{user_id}/{path_id}")
async def get_user_progress(user_id: str, path_id: str):
    try:
        progress = await path_service.get_progress_for_user_path(user_id, path_id)
        if not progress:
            raise HTTPException(status_code=404, detail="Progress not found")
        return progress
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
