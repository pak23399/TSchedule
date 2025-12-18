"use client";

import type { UiEvent } from "../types/event";

type Props = {
  ev: UiEvent;
  start: string; // HH:MM
  end: string;   // HH:MM
  dataEvent: string; // "event-1" | "event-2" | ...
};

export function EventItem({ ev, start, end, dataEvent }: Props) {
  return (
    <li
      className="cd-schedule__event"
      data-event-id={ev.id}
    >
      <a
        href="#0"
        className="cd-schedule__event-content"
        data-start={start}
        data-end={end}
        data-event={dataEvent}
      >
        <em className="cd-schedule__name">{ev.title}</em>
        <em className="cd-schedule__time">
          {start} - {end}
        </em>
      </a>
    </li>
  );
}
