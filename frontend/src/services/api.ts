import type { PathModel, PathsResponse, UserPathProgress } from "../types/path";

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export async function fetchPaths(category?: string, limit = 20, skip = 0): Promise<PathsResponse> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  params.set("limit", String(limit));
  params.set("skip", String(skip));

  const res = await fetch(`${API_BASE}/api/paths/?${params.toString()}`);

  if (!res.ok) {
    throw new Error(`Failed to fetch paths: ${res.status}`);
  }

  return (await res.json()) as PathsResponse;
}

export async function fetchPathBySlug(slug: string): Promise<PathModel> {
  const res = await fetch(`${API_BASE}/api/paths/${encodeURIComponent(slug)}`);

  if (!res.ok) {
    throw new Error(`Failed to fetch path ${slug}: ${res.status}`);
  }

  return (await res.json()) as PathModel;
}

export async function fetchUserPathProgress(userId: string, pathId: string): Promise<UserPathProgress | null> {
  const res = await fetch(
    `${API_BASE}/api/paths/progress/${encodeURIComponent(userId)}/${encodeURIComponent(pathId)}`
  );

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Failed to fetch progress: ${res.status}`);
  }

  return (await res.json()) as UserPathProgress;
}

export async function saveUserPathProgress(payload: UserPathProgress): Promise<{ message: string; id: string; user_id: string; path_id: string }> {
  const res = await fetch(`${API_BASE}/api/paths/progress`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Failed to save progress: ${res.status}`);
  }

  return (await res.json()) as { message: string; id: string; user_id: string; path_id: string };
}
