"use client";

import { useEffect } from "react";
import type { UiEvent } from "../types/event";

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function toHHMM(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function minutesFromHHMM(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function hhmmFromMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${pad(h)}:${pad(m)}`;
}

type Params = {
  events: UiEvent[];
  setEvents: React.Dispatch<React.SetStateAction<UiEvent[]>>;
  timelineEnd?: string; // default "18:00"
};

export function useDragResize({ events, setEvents, timelineEnd = "18:00" }: Params) {
  useEffect(() => {
    const root = document.querySelector(".js-cd-schedule") as HTMLElement | null;
    if (!root) return;

    // remove loading class
    root.classList.remove("cd-schedule--loading");

    if (events.length === 0) return;

    const timelineItems = root
      .querySelector(".cd-schedule__timeline")!
      .getElementsByTagName("li");

    const timelineStart = minutesFromHHMM(
      (timelineItems[0].textContent || "09:00").trim()
    );
    const timelineUnitDuration =
      minutesFromHHMM((timelineItems[1].textContent || "09:30").trim()) -
      timelineStart;

    const topInfo = root.querySelector(".cd-schedule__top-info") as HTMLElement | null;
    if (!topInfo) return;

    const slotHeight = topInfo.offsetHeight;

    const singleEvents = root.getElementsByClassName(
      "cd-schedule__event"
    ) as HTMLCollectionOf<HTMLElement>;

    // 1) placement: set top/height from data-start/end on <a>
    for (let i = 0; i < singleEvents.length; i++) {
      const li = singleEvents[i];
      const a = li.getElementsByTagName("a")[0];

      const start = minutesFromHHMM(a.getAttribute("data-start") || "09:00");
      const end = minutesFromHHMM(a.getAttribute("data-end") || "10:00");
      const duration = end - start;

      const eventTop =
        (slotHeight * (start - timelineStart)) / timelineUnitDuration;
      const eventHeight = (slotHeight * duration) / timelineUnitDuration;

      li.style.top = `${eventTop - 1}px`;
      li.style.height = `${eventHeight + 1}px`;
    }

    const groups = Array.from(
      root.querySelectorAll(".cd-schedule__group")
    ) as HTMLElement[];

    const onDragEndUpdate = async (
      li: HTMLElement,
      a: HTMLAnchorElement,
      dayIdx: number
    ) => {
      const idStr = li.dataset.eventId;
      if (!idStr) return;
      const id = Number(idStr);

      const ev = events.find((e) => e.id === id);
      if (!ev) return;

      const top = parseFloat(li.style.top || "0");
      const height = parseFloat(li.style.height || "0");

      const clamp = (v: number, min: number, max: number) =>
        Math.max(min, Math.min(max, v));
      const isHHMM = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

      const timelineMin = timelineStart; // e.g. 09:00
      const timelineMax = minutesFromHHMM(timelineEnd); // e.g. 18:00

      // px -> minutes
      const rawStartMinutes =
        timelineStart + (top / slotHeight) * timelineUnitDuration;
      const rawDurationMinutes = (height / slotHeight) * timelineUnitDuration;

      // snap to step
      let startMinutes =
        Math.round(rawStartMinutes / timelineUnitDuration) * timelineUnitDuration;

      let durationMinutes =
        Math.round(rawDurationMinutes / timelineUnitDuration) * timelineUnitDuration;

      durationMinutes = Math.max(timelineUnitDuration, durationMinutes);

      // clamp inside timeline
      startMinutes = clamp(
        startMinutes,
        timelineMin,
        timelineMax - timelineUnitDuration
      );

      let endMinutes = startMinutes + durationMinutes;
      endMinutes = clamp(endMinutes, startMinutes + timelineUnitDuration, timelineMax);

      const newStartTime = hhmmFromMinutes(startMinutes);
      const newEndTime = hhmmFromMinutes(endMinutes);

      if (!isHHMM(newStartTime) || !isHHMM(newEndTime)) return;

      // send HH:MM:SS to backend
      const startTimeDb = `${newStartTime}:00`;
      const endTimeDb = `${newEndTime}:00`;

      const resp = await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayIndex: dayIdx,
          startTime: startTimeDb,
          endTime: endTimeDb,
        }),
      });

      if (!resp.ok) {
        // nếu muốn debug:
        // console.log("PATCH failed", resp.status, await resp.text());
        return;
      }

      // update UI state for THIS WEEK rendering
      const base = new Date(ev.startIso);
      const diff = dayIdx - ev.dayIndex;

      const startDate = new Date(base);
      startDate.setDate(startDate.getDate() + diff);
      startDate.setHours(
        Number(newStartTime.slice(0, 2)),
        Number(newStartTime.slice(3, 5)),
        0,
        0
      );

      const endDate = new Date(startDate);
      endDate.setHours(
        Number(newEndTime.slice(0, 2)),
        Number(newEndTime.slice(3, 5)),
        0,
        0
      );

      const newStartIso = startDate.toISOString();
      const newEndIso = endDate.toISOString();

      setEvents((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, dayIndex: dayIdx, startIso: newStartIso, endIso: newEndIso }
            : e
        )
      );

      // update attrs so placement logic is consistent if needed
      a.setAttribute("data-start", newStartTime);
      a.setAttribute("data-end", newEndTime);

      const timeEl = a.querySelector(".cd-schedule__time");
      if (timeEl) timeEl.textContent = `${newStartTime} - ${newEndTime}`;
    };

    const cleanupFns: Array<() => void> = [];

    // 2) attach drag/resize/dblclick
    for (let i = 0; i < singleEvents.length; i++) {
      const li = singleEvents[i];
      const a = li.getElementsByTagName("a")[0];

      const onMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const rect = li.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const startLeft = rect.left;

        const origTop = parseFloat(li.style.top || "0");
        const origHeight = parseFloat(li.style.height || "0");

        // resize zone: bottom 10px
        const isResize = e.offsetY > rect.height - 10;

        let currentGroup = li.closest(".cd-schedule__group") as HTMLElement | null;
        let currentDayIdx =
          currentGroup?.getAttribute("data-day-index") != null
            ? Number(currentGroup!.getAttribute("data-day-index"))
            : groups.indexOf(currentGroup!);

        const onMove = (ev: MouseEvent) => {
          const dy = ev.clientY - startY;
          const dx = ev.clientX - startX;

          if (isResize) {
            let newHeight = origHeight + dy;
            if (newHeight < 20) newHeight = 20;
            li.style.height = `${newHeight}px`;
          } else {
            li.style.top = `${origTop + dy}px`;

            // detect day column by mouse centerX (NO appendChild)
            const centerX = startLeft + dx + rect.width / 2;
            for (let gIdx = 0; gIdx < groups.length; gIdx++) {
              const gRect = groups[gIdx].getBoundingClientRect();
              if (centerX >= gRect.left && centerX <= gRect.right) {
                currentGroup = groups[gIdx];
                currentDayIdx = gIdx;
              }
            }
          }
        };

        const onUp = async () => {
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
          window.removeEventListener("blur", onUp);
          await onDragEndUpdate(li, a, currentDayIdx);
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        window.addEventListener("blur", onUp); // tránh kẹt khi mở DevTools
      };

      li.addEventListener("mousedown", onMouseDown);
      cleanupFns.push(() => li.removeEventListener("mousedown", onMouseDown));

      const onDbl = (e: MouseEvent) => {
        e.preventDefault();
        const idStr = li.dataset.eventId;
        if (!idStr) return;
        const ev = events.find((x) => x.id === Number(idStr));
        if (!ev) return;

        alert(
          [
            `Tiêu đề: ${ev.title}`,
            `Loại: ${ev.eventType}`,
            ev.topic ? `Chủ đề: ${ev.topic}` : "",
            `Bắt đầu: ${new Date(ev.startIso).toLocaleString()}`,
            `Kết thúc: ${new Date(ev.endIso).toLocaleString()}`,
          ]
            .filter(Boolean)
            .join("\n")
        );
      };

      li.addEventListener("dblclick", onDbl);
      cleanupFns.push(() => li.removeEventListener("dblclick", onDbl));
    }

    return () => cleanupFns.forEach((fn) => fn());
  }, [events, setEvents, timelineEnd]);
}
