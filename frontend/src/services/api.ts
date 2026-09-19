import type { PathModel, PathsResponse, UserPathProgress } from "../types/path";

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

const EMPTY_PATHS_RESPONSE: PathsResponse = { paths: [], total: 0, has_more: false };

async function safeFetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchPaths(category?: string, limit = 20, skip = 0): Promise<PathsResponse> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  params.set("limit", String(limit));
  params.set("skip", String(skip));

  const payload = await safeFetchJson<PathsResponse>(`${API_BASE}/api/paths/?${params.toString()}`);
  if (!payload) {
    return EMPTY_PATHS_RESPONSE;
  }

  return payload;
}

export async function fetchPathBySlug(slug: string): Promise<PathModel | null> {
  const payload = await safeFetchJson<PathModel>(`${API_BASE}/api/paths/${encodeURIComponent(slug)}`);
  return payload ?? null;
}

export async function fetchUserPathProgress(userId: string, pathId: string): Promise<UserPathProgress | null> {
  const payload = await safeFetchJson<UserPathProgress>(
    `${API_BASE}/api/paths/progress/${encodeURIComponent(userId)}/${encodeURIComponent(pathId)}`
  );

  if (!payload) {
    return null;
  }

  return payload;
}

export async function saveUserPathProgress(payload: UserPathProgress): Promise<{ message: string; id: string; user_id: string; path_id: string } | null> {
  const result = await safeFetchJson<{ message: string; id: string; user_id: string; path_id: string }>(`${API_BASE}/api/paths/progress`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return result ?? null;
}
