"use client";

type Props = {
  weekStart: Date;
  weekEnd: Date;
  onPrev: () => void;
  onNext: () => void;
  onPickDate: (d: Date) => void;
  onAddEvent: () => void;
  toYMD: (d: Date) => string;
  ddmm: (d: Date) => string;
};

export function WeekControls({
  weekStart,
  weekEnd,
  onPrev,
  onNext,
  onPickDate,
  onAddEvent,
  toYMD,
  ddmm,
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        justifyContent: "center",
        margin: "12px 0 16px",
        flexWrap: "wrap",
      }}
    >
      <button type="button" onClick={onPrev}>
        ← Prev week
      </button>

      <div style={{ fontWeight: 600 }}>
        Week: {ddmm(weekStart)} – {ddmm(weekEnd)}
      </div>

      <button type="button" onClick={onNext}>
        Next week →
      </button>

      <button type="button" onClick={onAddEvent}>
        + Add event
      </button>

      <input
        type="date"
        value={toYMD(weekStart)}
        onChange={(e) => {
          const picked = new Date(`${e.target.value}T00:00:00`);
          onPickDate(picked);
        }}
      />
    </div>
  );
}
 