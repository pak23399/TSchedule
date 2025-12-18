export type UiEvent = {
  id: number;
  userId: number;
  eventType: "study_plan" | "normal" | string;
  topic: string | null;
  dayIndex: number;
  title: string;
  summary: string | null;
  details: string | null;
  exercises: string | null;
  startIso: string;
  endIso: string;
};
