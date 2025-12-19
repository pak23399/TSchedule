"use client";

import { useEffect } from "react";
import type { UiEvent } from "../types/event";

type Options = {
  events: UiEvent[];
  setEvents: React.Dispatch<React.SetStateAction<UiEvent[]>>;

  /** timeline UI đang render, default 09:00 -> 18:00 */
  timelineMinHHMM?: string; // "09:00"
  timelineMaxHHMM?: string; // "18:00"

  /**
   * Nếu backend .NET yêu cầu Bearer token:
   * truyền vào hàm getToken() để hook tự attach Authorization header.
   * (Nếu chưa auth thì cứ bỏ trống)
   */
  getToken?: () => string | null;
};

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
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

function normalizeTimeForDb(hhmmOrHhmmss: string) {
  // "14:00" -> "14:00:00"
  if (!hhmmOrHhmmss) return hhmmOrHhmmss;
  return hhmmOrHhmmss.length === 5 ? `${hhmmOrHhmmss}:00` : hhmmOrHhmmss;
}

function isHHMM(s: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

export function useDragResize({
  events,
  setEvents,
  timelineMinHHMM = "09:00",
  timelineMaxHHMM = "18:00",
  getToken,
}: Options) {
  useEffect(() => {
    const root = document.querySelector(".js-cd-schedule") as HTMLElement | null;
    if (!root) return;

    // remove loading class (nếu có)
    root.classList.remove("cd-schedule--loading");

    if (events.length === 0) return;

    const timelineItems = root
      .querySelector(".cd-schedule__timeline")
      ?.getElementsByTagName("li");

    if (!timelineItems || timelineItems.length < 2) return;

    const timelineStart = minutesFromHHMM(
      (timelineItems[0].textContent || timelineMinHHMM).trim()
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

    // ===== 1) placement: set top/height theo data-start/end (đúng CodyHouse) =====
    for (let i = 0; i < singleEvents.length; i++) {
      const li = singleEvents[i];
      const a = li.getElementsByTagName("a")[0];
      if (!a) continue;

      const start = minutesFromHHMM(a.getAttribute("data-start") || timelineMinHHMM);
      const end = minutesFromHHMM(a.getAttribute("data-end") || "10:00");
      const duration = end - start;

      const eventTop = (slotHeight * (start - timelineStart)) / timelineUnitDuration;
      const eventHeight = (slotHeight * duration) / timelineUnitDuration;

      li.style.top = `${eventTop - 1}px`;
      li.style.height = `${eventHeight + 1}px`;
    }

    const groups = Array.from(root.querySelectorAll(".cd-schedule__group")) as HTMLElement[];

    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

    // ===== 2) gọi .NET PATCH =====
    const patchDotnet = async (id: number, payload: any) => {
      const base = process.env.NEXT_PUBLIC_API_URL; // ví dụ: http://localhost:5251
      const url = base ? `${base}/api/events/${id}` : `/api/events/${id}`;

      // ✅ ĐỌC TRỰC TIẾP TOKEN (an toàn nhất cho drag/resize)
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("accessToken")
          : null;

      if (!token) {
        console.error("PATCH aborted: missing accessToken");
        throw new Error("Not authenticated");
      }

      const resp = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        console.error("PATCH failed", {
          url,
          status: resp.status,
          text,
        });
        throw new Error(
          `PATCH ${url} failed (${resp.status}): ${text || resp.statusText}`
        );
      }

      return resp;
    };

    // ===== 3) khi thả chuột: tính lại time/day rồi update db + update UI =====
    const onDragEndUpdate = async (li: HTMLElement, a: HTMLAnchorElement, dayIdx: number) => {
      const idStr = li.dataset.eventId;
      if (!idStr) return;
      const id = Number(idStr);

      const ev = events.find((e) => e.id === id);
      if (!ev) return;

      const top = parseFloat(li.style.top || "0");
      const height = parseFloat(li.style.height || "0");

      const timelineMin = timelineStart;
      const timelineMax = minutesFromHHMM(timelineMaxHHMM);

      const rawStartMinutes = timelineStart + (top / slotHeight) * timelineUnitDuration;
      const rawDurationMinutes = (height / slotHeight) * timelineUnitDuration;

      let startMinutes =
        Math.round(rawStartMinutes / timelineUnitDuration) * timelineUnitDuration;

      let durationMinutes =
        Math.round(rawDurationMinutes / timelineUnitDuration) * timelineUnitDuration;

      durationMinutes = Math.max(timelineUnitDuration, durationMinutes);

      startMinutes = clamp(startMinutes, timelineMin, timelineMax - timelineUnitDuration);

      let endMinutes = startMinutes + durationMinutes;
      endMinutes = clamp(endMinutes, startMinutes + timelineUnitDuration, timelineMax);

      const newStartHHMM = hhmmFromMinutes(startMinutes);
      const newEndHHMM = hhmmFromMinutes(endMinutes);

      if (!isHHMM(newStartHHMM) || !isHHMM(newEndHHMM)) return;

      // Backend TIME thường cần "HH:mm:ss"
      const startTimeDb = normalizeTimeForDb(newStartHHMM);
      const endTimeDb = normalizeTimeForDb(newEndHHMM);

      // 1) update DB (gọi .NET)
      await patchDotnet(id, {
        dayIndex: dayIdx,
        startTime: startTimeDb,
        endTime: endTimeDb,
      });

      // 2) update state UI (để render lại đúng trong tuần hiện tại)
      const baseDate = new Date(ev.startIso);
      const diff = dayIdx - ev.dayIndex;

      const startDate = new Date(baseDate);
      startDate.setDate(startDate.getDate() + diff);
      startDate.setHours(
        Number(newStartHHMM.slice(0, 2)),
        Number(newStartHHMM.slice(3, 5)),
        0,
        0
      );

      const endDate = new Date(startDate);
      endDate.setHours(
        Number(newEndHHMM.slice(0, 2)),
        Number(newEndHHMM.slice(3, 5)),
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

      // 3) update attrs so placement logic is consistent if needed
      a.setAttribute("data-start", newStartHHMM);
      a.setAttribute("data-end", newEndHHMM);

      // update text time (nếu có)
      const timeEl = a.querySelector(".cd-schedule__time");
      if (timeEl) timeEl.textContent = `${newStartHHMM} - ${newEndHHMM}`;
    };

    const cleanupFns: Array<() => void> = [];

    // ===== 4) attach listeners drag/resize + dblclick =====
    for (let i = 0; i < singleEvents.length; i++) {
      const li = singleEvents[i];
      const a = li.getElementsByTagName("a")[0];
      if (!a) continue;

      const onMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const rect = li.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const startLeft = rect.left;

        const origTop = parseFloat(li.style.top || "0");
        const origHeight = parseFloat(li.style.height || "0");

        // resize nếu bấm gần đáy event
        const isResize = e.offsetY > rect.height - 10;

        let currentGroup = li.closest(".cd-schedule__group") as HTMLElement | null;
        let currentDayIdx =
          currentGroup?.getAttribute("data-day-index") !== null
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

            // detect day column by mouse centerX (không appendChild vì React quản DOM)
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

          try {
            await onDragEndUpdate(li, a, currentDayIdx);
          } catch (err) {
            console.error("Drag/resize update failed:", err);
          }
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);

        // tránh bị “kẹt drag” khi bạn mở DevTools / mất focus
        window.addEventListener("blur", onUp);
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
  }, [events, setEvents, timelineMinHHMM, timelineMaxHHMM, getToken]);
}
