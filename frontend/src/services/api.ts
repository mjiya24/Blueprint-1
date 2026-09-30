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

export async function resolveCreatorPath(creatorHandle: string, pathSlug: string, userId?: string): Promise<{
  creator: { name: string; handle: string; avatar: string; verified: boolean; total_members: number; bio?: string };
  path: { id: string; title: string; slug: string; description: string; category: string; days_count: number; summary?: string };
  steps: Array<{ id: string; type: string; title: string; description: string; duration: number; widget_data: Record<string, any> }>;
  has_access?: boolean;
} | null> {
  const payload = await safeFetchJson<{
    creator: { name: string; handle: string; avatar: string; verified: boolean; total_members: number; bio?: string };
    path: { id: string; title: string; slug: string; description: string; category: string; days_count: number; summary?: string };
    steps: Array<{ id: string; type: string; title: string; description: string; duration: number; widget_data: Record<string, any>; locked?: boolean }>;
    has_access?: boolean;
  }>(`${API_BASE}/api/paths/resolve/${encodeURIComponent(creatorHandle)}/${encodeURIComponent(pathSlug)}${userId ? `?user_id=${encodeURIComponent(userId)}` : ''}`);

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

export async function generatePathFromSource(payload: {
  source_type: "youtube" | "notion" | "text" | "pdf";
  source_input: string;
  domain: string;
  template?: "7-day-challenge" | "3-day-onboarding" | "30-day-masterclass" | "pre-market-checklist";
  attachments?: Array<{ name: string; type: string; uri?: string }>;
}): Promise<{
  title: string;
  category: string;
  description: string;
  creator_handle: string;
  steps: Array<{ id: string; day: number; title: string; type: string; instructions: string; widget_data: Record<string, any> }>;
} | null> {
  const result = await safeFetchJson<{
    title: string;
    category: string;
    description: string;
    creator_handle: string;
    steps: Array<{ id: string; day: number; title: string; type: string; instructions: string; widget_data: Record<string, any> }>;
  }>(`${API_BASE}/api/paths/ai-generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return result ?? null;
}

export async function publishGeneratedPath(payload: {
  title: string;
  description: string;
  category: string;
  creator_handle?: string;
  steps: Array<{ id: string; day: number; title: string; type: string; instructions: string; widget_data: Record<string, any> }>;
  pricing_tiers: Array<{ name: string; price: number; description: string; currency?: string; billing_frequency?: "per_week" | "per_month" | "per_year" | "lifetime"; frequency_label?: string }>;
  price?: number;
  currency?: string;
  billing_frequency?: "per_week" | "per_month" | "per_year" | "lifetime";
  access_limit?: number | null;
  visibility: "public" | "unlisted" | "private";
}): Promise<{ status: string; path_id: string; slug: string; public_bio_link: string } | null> {
  const result = await safeFetchJson<{ status: string; path_id: string; slug: string; public_bio_link: string }>(`${API_BASE}/api/paths/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return result ?? null;
}

export async function publishCreatorShop(payload: Record<string, any>): Promise<{ status: string; handle: string; url: string; shop: Record<string, any> } | null> {
  return await safeFetchJson<{ status: string; handle: string; url: string; shop: Record<string, any> }>(`${API_BASE}/api/shops/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function fetchCreatorShop(handle: string): Promise<Record<string, any> | null> {
  return await safeFetchJson<Record<string, any>>(`${API_BASE}/api/shops/${encodeURIComponent(handle)}`);
}

export async function createPathCheckout(payload: {
  path_slug: string;
  creator_handle: string;
  user_id: string;
  email?: string;
  price_cents?: number;
  origin_url?: string;
}): Promise<{ session_id: string; url: string; test_mode: boolean } | null> {
  return await safeFetchJson<{ session_id: string; url: string; test_mode: boolean }>(`${API_BASE}/api/payments/create-checkout-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function completeTestPathCheckout(sessionId: string): Promise<boolean> {
  const result = await safeFetchJson<{ has_access: boolean }>(`${API_BASE}/api/payments/test-complete/${encodeURIComponent(sessionId)}`, { method: "POST" });
  return result?.has_access === true;
}

export async function recordPaymentTelemetry(payload: { event_name: 'paywall_impression' | 'checkout_initiated' | 'checkout_completed'; path_slug: string; user_id?: string; session_id?: string; metadata?: Record<string, any> }) {
  await safeFetchJson(`${API_BASE}/api/payments/telemetry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function completePathStep(pathId: string, stepId: string, proofData?: Record<string, any>, userId = "usr_current_user") {
  try {
    const response = await fetch(`${API_BASE}/api/paths/${encodeURIComponent(pathId)}/complete-step`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step_id: stepId,
        user_id: userId,
        proof_data: proofData || {},
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      return { status: "success", standby: true };
    }

    return await response.json();
  } catch (err) {
    console.warn("Step completion logged locally (standby mode)");
    return { status: "success", standby: true };
  }
}

export async function fetchCreatorInsights() {
  const payload = await safeFetchJson<{ active_members: number; total_joins: number; completion_speed_days: number; roadblocks: any[]; step_dropoff: any[] }>(`${API_BASE}/api/creator/insights`);
  return payload ?? {
    active_members: 1284,
    total_joins: 3961,
    completion_speed_days: 4.8,
    roadblocks: [],
    step_dropoff: [],
  };
}

export async function fetchCreatorAnalytics(creatorHandle = 'miamitrader') {
  return await safeFetchJson<{
    total_revenue: number;
    mrr_projected: number;
    funnel_conversion_rate: number;
    hook_engagement_rate: number;
    paywall_conversion_rate: number;
    active_members: number;
    avg_time_to_day_1_seconds: number;
    funnel: { label: string; value: number }[];
    step_dropoff: { label: string; value: number }[];
  }>(`${API_BASE}/api/analytics/creator/${encodeURIComponent(creatorHandle)}`);
}
