"use client";
import type { UiEvent } from "../types/event";
import { EventItem } from "./EventItem";
type Props = {
    days: string[];
    weekStart: Date;
    grouped: Record<number, UiEvent[]>;
    addDays: (d: Date, days: number) => Date;
    ddmm: (d: Date) => string;
    toHHMM: (iso: string) => string;
    eventDataEvent: (ev: UiEvent) => string; // returns "event-1" | "event-2"...
};

export function ScheduleGrid({
    days,
    weekStart,
    grouped,
    addDays,
    ddmm,
    toHHMM,
    eventDataEvent,
}: Props) {
    return (
        <div className="cd-schedule cd-schedule--loading margin-top-lg margin-bottom-lg js-cd-schedule">
            {/* timeline */}
            <div className="cd-schedule__timeline">
                <ul>
                    <li><span>09:00</span></li>
                    <li><span>09:30</span></li>
                    <li><span>10:00</span></li>
                    <li><span>10:30</span></li>
                    <li><span>11:00</span></li>
                    <li><span>11:30</span></li>
                    <li><span>12:00</span></li>
                    <li><span>12:30</span></li>
                    <li><span>13:00</span></li>
                    <li><span>13:30</span></li>
                    <li><span>14:00</span></li>
                    <li><span>14:30</span></li>
                    <li><span>15:00</span></li>
                    <li><span>15:30</span></li>
                    <li><span>16:00</span></li>
                    <li><span>16:30</span></li>
                    <li><span>17:00</span></li>
                    <li><span>17:30</span></li>
                    <li><span>18:00</span></li>
                </ul>
            </div>

            {/* events grid */}
            <div className="cd-schedule__events">
                <ul>
                    {days.map((day, idx) => (
                        <li key={day} className="cd-schedule__group" data-day-index={idx}>
                            <div className="cd-schedule__top-info">
                                <span>
                                    {day}
                                    <small style={{ opacity: 0.6, marginLeft: 6 }}>
                                        {ddmm(addDays(weekStart, idx))}
                                    </small>
                                </span>
                            </div>

                            <ul>
                                {(grouped[idx] || []).map((ev) => {
                                    const start = toHHMM(ev.startIso);
                                    const end = toHHMM(ev.endIso);

                                    return (
                                        <EventItem
                                            key={ev.id}
                                            ev={ev}
                                            start={start}
                                            end={end}
                                            dataEvent={eventDataEvent(ev)}
                                        />

                                    );
                                })}
                            </ul>
                        </li>
                    ))}
                </ul>
            </div>

            {/* CodyHouse modal layer (optional, giữ để sau này làm modal đẹp) */}
            <div className="cd-schedule-modal">
                <header className="cd-schedule-modal__header">
                    <div className="cd-schedule-modal__content">
                        <span className="cd-schedule-modal__date"></span>
                        <h3 className="cd-schedule-modal__name"></h3>
                    </div>
                    <div className="cd-schedule-modal__header-bg"></div>
                </header>

                <div className="cd-schedule-modal__body">
                    <div className="cd-schedule-modal__event-info"></div>
                    <div className="cd-schedule-modal__body-bg"></div>
                </div>

                <a href="#0" className="cd-schedule-modal__close text-replace">
                    Close
                </a>
            </div>
            <div className="cd-schedule__cover-layer"></div>
        </div>
    );
}
