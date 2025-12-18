import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getDbPool } from "@/lib/db";

function normalizeTime(t?: string | null) {
  if (!t) return null;
  return t.length === 5 ? `${t}:00` : t; // HH:MM -> HH:MM:SS
}
function timeStringToDate(t: string): Date {
  // t = "HH:MM:SS"
  const [h, m, s] = t.split(":").map(Number);
  const d = new Date(1970, 0, 1, h, m, s || 0, 0);
  return d;
}
function parseTimeParts(t: string) {
  const m = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.exec(t);
  if (!m) return null;
  return { h: Number(m[1]), mi: Number(m[2]), s: Number(m[3]) };
}

// ✅ params là Promise trong Next mới
type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const { id: idStr } = await ctx.params; // ✅ await params
    const id = Number(idStr);

    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();

    const dayIndex = body.dayIndex;
    const startTime = normalizeTime(body.startTime);
    const endTime = normalizeTime(body.endTime);

    const startDate = body.startDate ?? null;
    const endDate = body.endDate ?? null;

    const title = body.title ?? null;
    const summary = body.summary ?? null;
    const details = body.details ?? null;
    const exercises = body.exercises ?? null;
    const topic = body.topic ?? null;
    const eventType = body.eventType ?? null;

    const pool = await getDbPool();
    const r = pool.request().input("id", sql.Int, id);

    if (dayIndex !== undefined && dayIndex !== null) {
      const di = Number(dayIndex);
      if (!Number.isFinite(di) || di < 0 || di > 6) {
        return NextResponse.json({ error: "dayIndex must be 0..6" }, { status: 400 });
      }
      r.input("dayIndex", sql.Int, di);
    }

    const start = body.startTime ? parseTimeParts(body.startTime) : null;
const end = body.endTime ? parseTimeParts(body.endTime) : null;

    if (body.startTime && !start) {
      return NextResponse.json({ error: "Invalid startTime, expected HH:MM:SS" }, { status: 400 });
    }
    if (body.endTime && !end) {
      return NextResponse.json({ error: "Invalid endTime, expected HH:MM:SS" }, { status: 400 });
    }

    if (start) {
      r.input("startH", sql.Int, start.h);
      r.input("startM", sql.Int, start.mi);
      r.input("startS", sql.Int, start.s);
    }
    if (end) {
      r.input("endH", sql.Int, end.h);
      r.input("endM", sql.Int, end.mi);
      r.input("endS", sql.Int, end.s);
    }



    if (startDate) r.input("startDate", sql.Date, startDate);
    if (endDate) r.input("endDate", sql.Date, endDate);

    if (title !== null) r.input("title", sql.NVarChar(255), String(title));
    if (summary !== null) r.input("summary", sql.NVarChar(sql.MAX), summary);
    if (details !== null) r.input("details", sql.NVarChar(sql.MAX), details);
    if (exercises !== null) r.input("exercises", sql.NVarChar(sql.MAX), exercises);
    if (topic !== null) r.input("topic", sql.NVarChar(200), topic);

    if (eventType !== null) {
      const et = String(eventType);
      if (et !== "study_plan" && et !== "normal") {
        return NextResponse.json({ error: "eventType must be 'study_plan' or 'normal'" }, { status: 400 });
      }
      r.input("eventType", sql.VarChar(20), et);
    }

    await r.query(`
      UPDATE UserEvent SET
        day_index =
          COALESCE(@dayIndex, day_index),

        start_time =
          CASE
            WHEN @startH IS NULL THEN start_time
            ELSE TIMEFROMPARTS(@startH, @startM, @startS, 0, 0)
          END,

        end_time =
          CASE
            WHEN @endH IS NULL THEN end_time
            ELSE TIMEFROMPARTS(@endH, @endM, @endS, 0, 0)
          END
        WHERE id = @id
    `);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("PATCH /api/events/:id error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const { id: idStr } = await ctx.params; // ✅ await params
    const id = Number(idStr);

    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const pool = await getDbPool();
    await pool.request().input("id", sql.Int, id).query(`DELETE FROM UserEvent WHERE id = @id`);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/events/:id error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
