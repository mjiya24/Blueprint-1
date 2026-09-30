import re
from typing import Any, List, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()
PUBLISHED_SHOPS: dict[str, dict[str, Any]] = {}


class ShopPublishRequest(BaseModel):
    handle: str = Field(min_length=2, max_length=40)
    name: str = Field(min_length=2, max_length=100)
    headline: str = Field(min_length=8, max_length=180)
    description: str = Field(min_length=10, max_length=1200)
    category: str
    accent_color: str = "#35E4A1"
    background_mode: Literal["original", "custom"] = "original"
    background_color: str = "#FFFFFF"
    banner_wallpaper: str = ""
    modules: List[Literal["blueprints", "pod_merch", "dropship", "affiliate_stack", "services"]] = Field(default_factory=lambda: ["blueprints", "services"])
    socials: dict[str, str] = Field(default_factory=dict)
    creator_intent: str = ""
    ingestion_source: str = ""
    name_options: List[str] = Field(default_factory=list)
    products: list[dict[str, Any]] = Field(default_factory=list, max_length=3)
    pod_products: List[dict[str, Any]] = Field(default_factory=list)
    affiliate_items: List[dict[str, Any]] = Field(default_factory=list)
    dropship_items: List[dict[str, Any]] = Field(default_factory=list)
    custom_inventory: List[dict[str, Any]] = Field(default_factory=list)
    custom_inventory_section_title: str = "Custom Merch"
    source_assets: List[dict[str, Any]] = Field(default_factory=list)
    logo_url: str = ""
    hook_tool: dict[str, Any]
    high_ticket_offer: dict[str, Any]
    proof_wall: dict[str, Any] = Field(default_factory=dict)
    street_cred_enabled: bool = False
    sales_agent: dict[str, Any] = Field(default_factory=dict)
    visibility: Literal["public", "unlisted", "private"] = "public"


@router.get("/{handle}")
async def get_shop(handle: str):
    shop = PUBLISHED_SHOPS.get(handle.lower())
    if not shop or shop.get("visibility") == "private":
        raise HTTPException(status_code=404, detail="Shop not found")
    return shop


@router.post("/publish")
async def publish_shop(payload: ShopPublishRequest):
    handle = re.sub(r"[^a-z0-9_-]", "", payload.handle.lower().lstrip("@"))
    if len(handle) < 2:
        raise HTTPException(status_code=422, detail="Choose a valid storefront handle")
    shop = payload.model_dump()
    shop["handle"] = handle
    shop["status"] = "published"
    shop["url"] = f"/shop/{handle}"
    PUBLISHED_SHOPS[handle] = shop
    return {"status": "published", "handle": handle, "url": shop["url"], "shop": shop}
