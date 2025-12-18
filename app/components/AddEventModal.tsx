"use client";

import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => Promise<void>;
  weekStart: Date;
  days: string[];
  toYMD: (d: Date) => string;
  addDays: (d: Date, n: number) => Date;
};

export function AddEventModal({
  open,
  onClose,
  onSubmit,
  weekStart,
  days,
  toYMD,
  addDays,
}: Props) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    userId: 1,
    eventType: "normal" as "normal" | "study_plan",
    title: "",
    topic: "",
    dayIndex: 0,
    startDate: toYMD(weekStart),
    endDate: toYMD(addDays(weekStart, 6)),
    startTime: "09:00",
    endTime: "10:00",
    summary: "",
    details: "",
    exercises: "",
  });

  useEffect(() => {
    setForm((p) => ({
      ...p,
      startDate: toYMD(weekStart),
      endDate: toYMD(addDays(weekStart, 6)),
    }));
  }, [weekStart]);

  if (!open) return null;

  const submit = async () => {
    setError(null);
    setCreating(true);
    try {
      await onSubmit(form);
      onClose();
      setForm((p) => ({ ...p, title: "" }));
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      onMouseDown={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "min(720px, 100%)",
          background: "#fff",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <h3>Add event</h3>

        {error && (
          <div style={{ color: "red", marginBottom: 8 }}>{error}</div>
        )}

        <div style={{ display: "grid", gap: 8 }}>
          <input
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />

          <select
            value={form.eventType}
            onChange={(e) =>
              setForm({ ...form, eventType: e.target.value as any })
            }
          >
            <option value="normal">Normal</option>
            <option value="study_plan">Study plan</option>
          </select>

          <select
            value={form.dayIndex}
            onChange={(e) =>
              setForm({ ...form, dayIndex: Number(e.target.value) })
            }
          >
            {days.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={form.startDate}
            onChange={(e) =>
              setForm({ ...form, startDate: e.target.value })
            }
          />
          <input
            type="date"
            value={form.endDate}
            onChange={(e) =>
              setForm({ ...form, endDate: e.target.value })
            }
          />

          <input
            type="time"
            value={form.startTime}
            onChange={(e) =>
              setForm({ ...form, startTime: e.target.value })
            }
          />
          <input
            type="time"
            value={form.endTime}
            onChange={(e) =>
              setForm({ ...form, endTime: e.target.value })
            }
          />
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button onClick={onClose}  >Cancel</button>
          <button onClick={submit} disabled={creating || !form.title}>
            {creating ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
