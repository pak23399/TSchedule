"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { UiEvent } from "../types/event";

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function useSchedule(weekStart: Date, userId = 1) {
  const [events, setEvents] = useState<UiEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const reloadWeek = useCallback(
    async (wsDate: Date = weekStart) => {
      const ws = toYMD(wsDate);
      const res = await fetch(`/api/events?weekStart=${ws}&userId=${userId}`);
      const json = await res.json();
      const arr: UiEvent[] = json.events ?? [];
      setEvents(arr.filter((e) => e.dayIndex >= 0 && e.dayIndex <= 6));
    },
    [weekStart, userId]
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
      const payload = {
        userId: form.userId ?? userId,
        eventType: form.eventType,
        title: form.title,
        topic: form.topic || null,
        dayIndex: Number(form.dayIndex),
        startDate: form.startDate,
        endDate: form.endDate,
        startTime:
          String(form.startTime).length === 5
            ? `${form.startTime}:00`
            : form.startTime,
        endTime:
          String(form.endTime).length === 5 ? `${form.endTime}:00` : form.endTime,
        summary: form.summary || null,
        details: form.details || null,
        exercises: form.exercises || null,
      };

      const r = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        const t = await r.text();
        throw new Error(t || `HTTP ${r.status}`);
      }

      await reloadWeek(weekStart);
    },
    [reloadWeek, weekStart, userId]
  );

  return {
    events,
    setEvents,  // cần cho drag/resize optimistic update
    loading,
    setLoading, // để page control prev/next hiển thị loading
    grouped,
    reloadWeek,
    createEvent,
  };
}
