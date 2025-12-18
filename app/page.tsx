"use client";

import { useState } from "react";
import type { UiEvent } from "./types/event";

import { WeekControls } from "./components/WeekControls";
import { ScheduleGrid } from "./components/ScheduleGrid";
import { AddEventModal } from "./components/AddEventModal";

import { useSchedule } from "./hooks/useSchedule";
import { useDragResize } from "./hooks/useDragResize";

// ===== helpers =====
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Monday-based start of week
function startOfWeekMonday(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // Sun=0..Sat=6
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function ddmm(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function toHHMM(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function eventDataEvent(ev: UiEvent) {
  return ev.eventType === "study_plan" ? "event-1" : "event-2";
}

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function Page() {
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeekMonday(new Date())
  );
  const [showAdd, setShowAdd] = useState(false);

  const weekEnd = addDays(weekStart, 6);

  // Data layer: load week + grouped + createEvent
  const { events, setEvents, loading, setLoading, grouped, createEvent } =
    useSchedule(weekStart, 1);

  // Drag/resize layer: ALL in hook now (no drag logic in page.tsx)
  useDragResize({ events, setEvents, timelineEnd: "18:00" });

  return (
    <>
      <header className="cd-main-header text-center flex flex-column flex-center">
        <h1 className="text-xl">Schedule Template (CodyHouse + UserEvent)</h1>
      </header>

      <WeekControls
        weekStart={weekStart}
        weekEnd={weekEnd}
        toYMD={toYMD}
        ddmm={ddmm}
        onPrev={() => {
          setLoading(true);
          setWeekStart((p) => addDays(p, -7));
        }}
        onNext={() => {
          setLoading(true);
          setWeekStart((p) => addDays(p, 7));
        }}
        onPickDate={(picked) => {
          setLoading(true);
          setWeekStart(startOfWeekMonday(picked));
        }}
        onAddEvent={() => setShowAdd(true)}
      />

      {loading ? (
        <p style={{ textAlign: "center" }}>Loading...</p>
      ) : (
        <ScheduleGrid
          days={DAYS}
          weekStart={weekStart}
          grouped={grouped}
          addDays={addDays}
          ddmm={ddmm}
          toHHMM={toHHMM}
          eventDataEvent={eventDataEvent}
        />
      )}

      <AddEventModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSubmit={createEvent}
        weekStart={weekStart}
        days={DAYS}
        toYMD={toYMD}
        addDays={addDays}
      />
    </>
  );
}
