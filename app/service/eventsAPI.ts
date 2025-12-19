// src/services/eventsApi.ts
export type UiEvent = {
  id: number;
  userId: string; // Guid từ .NET
  eventType: string;
  topic?: string | null;
  dayIndex: number;
  title: string;
  summary?: string | null;
  details?: string | null;
  exercises?: string | null;
  startIso: string;
  endIso: string;
};

function apiBase() {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) throw new Error("Missing NEXT_PUBLIC_API_URL in .env.local");
  return base.replace(/\/$/, "");
}

// Nếu bạn đang lưu token ở localStorage:
export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken"); // đổi key nếu bạn đang dùng key khác
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(init.headers);

  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }

  // PATCH NoContent
  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
}

// GET /api/events/week?weekStart=YYYY-MM-DD
export function getWeekEvents(weekStart: string) {
  return request<UiEvent[]>(`/api/events/week?weekStart=${encodeURIComponent(weekStart)}`);
}

// PATCH /api/events/{id}
export function patchEventTime(
  id: number,
  payload: { dayIndex?: number; startTime?: string; endTime?: string }
) {
  return request<void>(`/api/events/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
