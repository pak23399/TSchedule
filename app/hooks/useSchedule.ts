"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { UiEvent } from "../types/event";
import { getWeekEvents } from "../service/eventsAPI";

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}

// export function useSchedule(weekStart: Date, userId = 1) {
//   const [events, setEvents] = useState<UiEvent[]>([]);
//   const [loading, setLoading] = useState(true);

//   const reloadWeek = useCallback(
//     async (wsDate: Date = weekStart) => {
//       const ws = toYMD(wsDate);
//       const res = await fetch(`/api/events?weekStart=${ws}&userId=${userId}`);
//       const json = await res.json();
//       const arr: UiEvent[] = json.events ?? [];
//       setEvents(arr.filter((e) => e.dayIndex >= 0 && e.dayIndex <= 6));
//     },
//     [weekStart, userId]
//   );

//   useEffect(() => {
//     const load = async () => {
//       setLoading(true);
//       try {
//         await reloadWeek(weekStart);
//       } finally {
//         setLoading(false);
//       }
//     };
//     load();
//   }, [weekStart, reloadWeek]);

//   const grouped = useMemo(() => {
//     const g: Record<number, UiEvent[]> = {};
//     for (const e of events) {
//       if (!g[e.dayIndex]) g[e.dayIndex] = [];
//       g[e.dayIndex].push(e);
//     }
//     return g;
//   }, [events]);

//   const createEvent = useCallback(
//     async (form: any) => {
//       const payload = {
//         userId: form.userId ?? userId,
//         eventType: form.eventType,
//         title: form.title,
//         topic: form.topic || null,
//         dayIndex: Number(form.dayIndex),
//         startDate: form.startDate,
//         endDate: form.endDate,
//         startTime:
//           String(form.startTime).length === 5
//             ? `${form.startTime}:00`
//             : form.startTime,
//         endTime:
//           String(form.endTime).length === 5 ? `${form.endTime}:00` : form.endTime,
//         summary: form.summary || null,
//         details: form.details || null,
//         exercises: form.exercises || null,
//       };

//       const r = await fetch("/api/events", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });

//       if (!r.ok) {
//         const t = await r.text();
//         throw new Error(t || `HTTP ${r.status}`);
//       }

//       await reloadWeek(weekStart);
//     },
//     [reloadWeek, weekStart, userId]
//   );

//   return {
//     events,
//     setEvents,  // cần cho drag/resize optimistic update
//     loading,
//     setLoading, // để page control prev/next hiển thị loading
//     grouped,
//     reloadWeek,
//     createEvent,
//   };
// }
function apiBase() {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) throw new Error("Missing NEXT_PUBLIC_API_URL in .env.local");
  return base.replace(/\/$/, "");
}

function getToken() {
  if (typeof window === "undefined") return null;
  // đổi key này nếu bạn đang lưu token bằng key khác
  return localStorage.getItem("accessToken");
}

async function apiFetch(path: string, init: RequestInit = {}) {
  const token = getToken();

  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  // nếu có body mà chưa set Content-Type thì set JSON
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  // testing 
  const testing = `${apiBase()}${path}`;
  console.log("URL nay : = ",testing);
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers,
  });

  return res;
}

export function useSchedule(weekStart: Date) {
  const [events, setEvents] = useState<UiEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const reloadWeek = useCallback(
    async (wsDate: Date = weekStart) => {
      const ws = toYMD(wsDate);

      const res = await apiFetch(`/api/events/week?weekStart=${encodeURIComponent(ws)}`);

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `HTTP ${res.status}`);
      }

      const arr: UiEvent[] = await res.json();

      // template CodyHouse: 0..6 (Mon..Sun)
      setEvents(arr.filter((e) => e.dayIndex >= 0 && e.dayIndex <= 6));
    },
    [weekStart]
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await reloadWeek(weekStart);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [weekStart, reloadWeek]);

  const grouped = useMemo(() => {
    const g: Record<number, UiEvent[]> = {};
    for (const e of events) {
      if (!g[e.dayIndex]) g[e.dayIndex] = [];
      g[e.dayIndex].push(e);
    }
    return g;
  }, [events]);

  const createEvent = useCallback(
    async (form: any) => {
      // .NET CreateEventDto KHÔNG có userId (backend lấy từ JWT)
      const payload = {
        eventType: form.eventType,
        title: form.title,
        topic: form.topic || null,
        dayIndex: Number(form.dayIndex),
        startDate: form.startDate, // "YYYY-MM-DD"
        endDate: form.endDate,     // "YYYY-MM-DD"
        startTime:
          String(form.startTime).length === 5 ? `${form.startTime}:00` : form.startTime, // "HH:mm:ss"
        endTime:
          String(form.endTime).length === 5 ? `${form.endTime}:00` : form.endTime,
        summary: form.summary || null,
        details: form.details || null,
        exercises: form.exercises || null,
      };

      const r = await apiFetch("/api/events", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(t || `HTTP ${r.status}`);
      }

      await reloadWeek(weekStart);
    },
    [reloadWeek, weekStart]
  );

  return {
    events,
    setEvents, // cần cho drag/resize optimistic update
    loading,
    setLoading, // để page control prev/next hiển thị loading
    grouped,
    reloadWeek,
    createEvent,
  };
}
