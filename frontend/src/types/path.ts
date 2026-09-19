export type AssetType =
  | "pdf"
  | "transcript"
  | "notion"
  | "video"
  | "notes"
  | "audio"
  | "other";

export type StepKind =
  | "lesson"
  | "task"
  | "checkpoint"
  | "milestone"
  | "cta"
  | "review";

export type PathStatus = "draft" | "review" | "published" | "archived";
export type Visibility = "public" | "private" | "unlisted";
export type Difficulty = "beginner" | "intermediate" | "advanced";
export type Role = "creator" | "consumer" | "admin";

export interface SourceAsset {
  id: string;
  type: AssetType;
  title: string;
  url?: string | null;
  external_ref?: string | null;
  uploaded_at?: string | null;
}

export interface PathStep {
  id: string;
  title: string;
  description: string;
  step_number: number;
  kind: StepKind;
  duration_minutes?: number | null;
  prerequisites: string[];
  checklist: string[];
  resources: string[];
  completion_criteria?: string | null;
  success_metric?: string | null;
  is_locked: boolean;
  unlock_after_step?: string | null;
}

export interface PathModel {
  id: string;
  creator_id: string;
  title: string;
  slug: string;
  category: string;
  niche: string;
  summary: string;
  description: string;
  price: number;
  currency: string;
  status: PathStatus;
  visibility: Visibility;
  target_audience: string[];
  difficulty: Difficulty;
  estimated_duration_days?: number | null;
  estimated_duration_hours?: number | null;
  cover_image_url?: string | null;
  tags: string[];
  source_assets: SourceAsset[];
  steps: PathStep[];
  outcome: string;
  success_signals: string[];
  created_at: string;
  updated_at: string;
  version: string;
}

export interface UserPathProgress {
  id: string;
  user_id: string;
  path_id: string;
  started_at: string;
  last_active_at: string;
  completed_step_ids: string[];
  percent_complete: number;
  status: string;
}

export interface PathsResponse {
  paths: PathModel[];
  total: number;
  has_more: boolean;
}
