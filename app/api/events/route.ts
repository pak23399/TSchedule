import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getDbPool } from "@/lib/db";

/**
 * Helpers
 */
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
function ymd(d: Date) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}
function normalizeTime(t: string) {
  // accept "HH:MM" or "HH:MM:SS"
  if (!t) return t;
  return t.length === 5 ? `${t}:00` : t;
}
function isValidYMD(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/**
 * GET /api/events?weekStart=YYYY-MM-DD&userId=1
 * - weekStart: Monday of the week to display
 * - returns occurrences for that week only, derived from UserEvent rules
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const weekStartStr = searchParams.get("weekStart"); // required
    const userIdStr = searchParams.get("userId"); // optional (default 1)

    if (!weekStartStr || !isValidYMD(weekStartStr)) {
      return NextResponse.json(
        { error: "weekStart is required in format YYYY-MM-DD (Monday)" },
        { status: 400 }
      );
    }

    const userId = userIdStr ? Number(userIdStr) : 1;
    if (!Number.isFinite(userId) || userId <= 0) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    const weekStart = new Date(`${weekStartStr}T00:00:00`);
    if (Number.isNaN(weekStart.getTime())) {
      return NextResponse.json({ error: "Invalid weekStart date" }, { status: 400 });
    }

    const pool = await getDbPool();

    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query(`
        SELECT
          id, user_id, event_type, topic, day_index,
          title, summary, details, exercises,
          CONVERT(varchar(10), start_date, 23) AS start_ymd,
          CONVERT(varchar(10), end_date, 23)   AS end_ymd,
          DATEPART(HOUR, start_time)   AS start_h,
          DATEPART(MINUTE, start_time) AS start_m,
          DATEPART(HOUR, end_time)     AS end_h,
          DATEPART(MINUTE, end_time)   AS end_m,
          created_at
        FROM UserEvent
        WHERE user_id = @userId
      `);

    const events = result.recordset.flatMap((row: any) => {
  if (row.day_index === null || row.day_index === undefined) return [];
  const dayIndex = Number(row.day_index);
  if (!Number.isFinite(dayIndex) || dayIndex < 0 || dayIndex > 6) return [];

  const targetDate = addDays(weekStart, dayIndex);
  const targetYMD = ymd(targetDate);

  const startYMD = String(row.start_ymd);
  const endYMD = String(row.end_ymd);

  // check targetDate in [start_date, end_date]
  if (targetYMD < startYMD || targetYMD > endYMD) return [];

  const sh = Number(row.start_h), sm = Number(row.start_m);
  const eh = Number(row.end_h), em = Number(row.end_m);

  if (![sh, sm, eh, em].every(Number.isFinite)) return []; // bỏ record lỗi

  const start = new Date(`${targetYMD}T00:00:00`);
  start.setHours(sh, sm, 0, 0);

  const end = new Date(`${targetYMD}T00:00:00`);
  end.setHours(eh, em, 0, 0);

  // Nếu end <= start (vd nhập sai), có thể bỏ hoặc tự cộng 1h. Mình chọn bỏ:
  if (end.getTime() <= start.getTime()) return [];

  return [{
    id: row.id,
    userId: row.user_id,
    eventType: row.event_type,
    topic: row.topic,
    dayIndex,
    title: row.title,
    summary: row.summary,
    details: row.details,
    exercises: row.exercises,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    startDate: startYMD,
    endDate: endYMD,
    startTime: `${String(sh).padStart(2,"0")}:${String(sm).padStart(2,"0")}`,
    endTime: `${String(eh).padStart(2,"0")}:${String(em).padStart(2,"0")}`,
    createdAt: row.created_at,
  }];
    });


    return NextResponse.json({
      weekStart: weekStartStr,
      userId,
      events,
    });
  } catch (err: any) {
    console.error("GET /api/events error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events
 * Body (JSON):
 * {
 *   userId: number,
 *   eventType: "study_plan" | "normal",
 *   topic?: string | null,
 *   dayIndex: number (0..6),
 *   title: string,
 *   summary?: string | null,
 *   details?: string | null,
 *   exercises?: string | null,
 *   startDate: "YYYY-MM-DD",
 *   endDate: "YYYY-MM-DD",
 *   startTime: "HH:MM" | "HH:MM:SS",
 *   endTime: "HH:MM" | "HH:MM:SS"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const userId = Number(body.userId ?? 1);
    const eventType = String(body.eventType ?? "");
    const topic = body.topic ?? null;
    const dayIndex = Number(body.dayIndex);
    const title = String(body.title ?? "").trim();
    const summary = body.summary ?? null;
    const details = body.details ?? null;
    const exercises = body.exercises ?? null;

    const startDate = String(body.startDate ?? "");
    const endDate = String(body.endDate ?? "");
    const startTime = normalizeTime(String(body.startTime ?? "")); // "HH:MM:SS"
    const endTime = normalizeTime(String(body.endTime ?? ""));     // "HH:MM:SS"

    const parseTimeParts = (t: string) => {
      // expect HH:MM:SS
      const m = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.exec(t);
      if (!m) return null;
      return { h: Number(m[1]), mi: Number(m[2]), s: Number(m[3]) };
    };

    if (!Number.isFinite(userId) || userId <= 0) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }
    if (eventType !== "study_plan" && eventType !== "normal") {
      return NextResponse.json(
        { error: "eventType must be 'study_plan' or 'normal'" },
        { status: 400 }
      );
    }
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    if (!Number.isFinite(dayIndex) || dayIndex < 0 || dayIndex > 6) {
      return NextResponse.json({ error: "dayIndex is required (0..6)" }, { status: 400 });
    }
    if (!isValidYMD(startDate) || !isValidYMD(endDate)) {
      return NextResponse.json({ error: "startDate/endDate must be YYYY-MM-DD" }, { status: 400 });
    }
    if (!startTime || !endTime) {
      return NextResponse.json({ error: "startTime/endTime is required" }, { status: 400 });
    }

    const st = parseTimeParts(startTime);
    const et = parseTimeParts(endTime);
    if (!st || !et) {
      return NextResponse.json({ error: "startTime/endTime must be HH:MM or HH:MM:SS" }, { status: 400 });
    }

    // optional: validate end > start (within a day)
    const startMin = st.h * 60 + st.mi;
    const endMin = et.h * 60 + et.mi;
    if (endMin <= startMin) {
      return NextResponse.json({ error: "endTime must be after startTime" }, { status: 400 });
    }

    const pool = await getDbPool();

    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("eventType", sql.VarChar(20), eventType)
      .input("topic", sql.NVarChar(200), topic)
      .input("dayIndex", sql.Int, dayIndex)
      .input("title", sql.NVarChar(255), title)
      .input("summary", sql.NVarChar(sql.MAX), summary)
      .input("details", sql.NVarChar(sql.MAX), details)
      .input("exercises", sql.NVarChar(sql.MAX), exercises)
      .input("startDate", sql.Date, startDate)
      .input("endDate", sql.Date, endDate)
      // time parts (avoid timezone issues)
      .input("sh", sql.Int, st.h)
      .input("sm", sql.Int, st.mi)
      .input("ss", sql.Int, st.s)
      .input("eh", sql.Int, et.h)
      .input("em", sql.Int, et.mi)
      .input("es", sql.Int, et.s)
      .query(`
        INSERT INTO UserEvent(
          user_id, event_type, topic, day_index,
          title, summary, details, exercises,
          start_date, end_date, start_time, end_time
        )
        OUTPUT INSERTED.id
        VALUES(
          @userId, @eventType, @topic, @dayIndex,
          @title, @summary, @details, @exercises,
          @startDate, @endDate,
          TIMEFROMPARTS(@sh, @sm, @ss, 0, 0),
          TIMEFROMPARTS(@eh, @em, @es, 0, 0)
        )
      `);

    return NextResponse.json({ id: result.recordset[0].id }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/events error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

