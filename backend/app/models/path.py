from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class AssetType(str, Enum):
    PDF = "pdf"
    TRANSCRIPT = "transcript"
    NOTION = "notion"
    VIDEO = "video"
    NOTES = "notes"
    AUDIO = "audio"
    OTHER = "other"


class StepKind(str, Enum):
    LESSON = "lesson"
    TASK = "task"
    CHECKPOINT = "checkpoint"
    MILESTONE = "milestone"
    CTA = "cta"
    REVIEW = "review"


class PathStatus(str, Enum):
    DRAFT = "draft"
    REVIEW = "review"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class Visibility(str, Enum):
    PUBLIC = "public"
    PRIVATE = "private"
    UNLISTED = "unlisted"


class Difficulty(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class Role(str, Enum):
    CREATOR = "creator"
    CONSUMER = "consumer"
    ADMIN = "admin"


class SourceAsset(BaseModel):
    id: str
    type: AssetType
    title: str
    url: Optional[str] = None
    external_ref: Optional[str] = None
    uploaded_at: Optional[str] = None


class PathStep(BaseModel):
    id: str
    title: str
    description: str
    step_number: int
    kind: StepKind
    duration_minutes: Optional[int] = None
    prerequisites: List[str] = Field(default_factory=list)
    checklist: List[str] = Field(default_factory=list)
    resources: List[str] = Field(default_factory=list)
    completion_criteria: Optional[str] = None
    success_metric: Optional[str] = None
    is_locked: bool = False
    unlock_after_step: Optional[str] = None


class PathModel(BaseModel):
    id: str
    creator_id: str
    title: str
    slug: str
    category: str
    niche: str
    summary: str
    description: str
    price: float
    currency: str = "USD"
    status: PathStatus
    visibility: Visibility
    target_audience: List[str] = Field(default_factory=list)
    difficulty: Difficulty
    estimated_duration_days: Optional[int] = None
    estimated_duration_hours: Optional[int] = None
    cover_image_url: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    source_assets: List[SourceAsset] = Field(default_factory=list)
    steps: List[PathStep] = Field(default_factory=list)
    outcome: str
    success_signals: List[str] = Field(default_factory=list)
    created_at: str
    updated_at: str
    version: str = "2.0"

    @field_validator("steps", mode="after")
    @classmethod
    def validate_steps(cls, v):
        if not v:
            raise ValueError("A path must contain at least one step.")
        return v


class CreatorProfile(BaseModel):
    user_id: str
    business_name: Optional[str] = None
    bio: Optional[str] = None
    stripe_account_id: Optional[str] = None
    payout_status: str = "not_connected"
    approved_paths: List[str] = Field(default_factory=list)


class ConsumerProfile(BaseModel):
    user_id: str
    favorite_categories: List[str] = Field(default_factory=list)
    purchased_paths: List[str] = Field(default_factory=list)
    completed_paths: List[str] = Field(default_factory=list)


class User(BaseModel):
    id: str
    email: str
    name: str
    role: Role
    creator_profile: Optional[CreatorProfile] = None
    consumer_profile: Optional[ConsumerProfile] = None
    created_at: str
    updated_at: str


class UserPathProgress(BaseModel):
    id: str
    user_id: str
    path_id: str
    started_at: str
    last_active_at: str
    completed_step_ids: List[str] = Field(default_factory=list)
    percent_complete: float = 0.0
    status: str = "in_progress"
