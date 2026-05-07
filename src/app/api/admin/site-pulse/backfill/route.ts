import { NextResponse } from "next/server";
import {
  classifySitePulseError,
  getSitePulseSnapshot,
  upsertSitePulseBackfillDays,
  type SitePulseBackfillDay,
} from "@/lib/site-pulse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function checkAuth(req: Request): { ok: true } | { ok: false; res: NextResponse } {
  const expected = process.env.ADMIN_INIT_SECRET;
  if (!expected) {
    return {
      ok: false,
      res: NextResponse.json({ error: "ADMIN_INIT_SECRET not set" }, { status: 503 }),
    };
  }

  const provided = req.headers.get("x-admin-secret");
  if (provided !== expected) {
    return {
      ok: false,
      res: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true };
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

function extractDays(body: unknown): SitePulseBackfillDay[] {
  if (!body || typeof body !== "object") return [];
  const maybeDays = (body as { days?: unknown; day?: unknown }).days;
  const maybeDay = (body as { day?: unknown }).day;

  if (Array.isArray(maybeDays)) return maybeDays as SitePulseBackfillDay[];
  if (maybeDay && typeof maybeDay === "object") return [maybeDay as SitePulseBackfillDay];
  return [];
}

function generateZeroCatchupDays(startDate: string) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const today = new Date(new Date().toISOString().slice(0, 10));
  if (Number.isNaN(start.getTime()) || start > today) return [];

  const days: SitePulseBackfillDay[] = [];
  for (const cursor = new Date(start); cursor <= today; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    days.push({
      date: cursor.toISOString().slice(0, 10),
      views: 0,
      visitors: 0,
      serviceClicks: 0,
      bookClicks: 0,
      capacityClicks: 0,
      source: "catchup-placeholder",
    });
  }
  return days;
}

export async function GET(req: Request) {
  const auth = checkAuth(req);
  if (!auth.ok) return auth.res;

  try {
    return json({
      ok: true,
      instructions:
        "POST { days: [{ date: '2026-05-05', views, visitors, serviceClicks, bookClicks, capacityClicks, source: 'vercel-analytics' }] } or { catchupFrom: '2026-05-05' } to create zero-filled placeholders until real analytics are imported.",
      snapshot: await getSitePulseSnapshot(),
    });
  } catch (error) {
    return json(
      { ok: false, reason: classifySitePulseError(error, "snapshot_failed") },
      500,
    );
  }
}

export async function POST(req: Request) {
  const auth = checkAuth(req);
  if (!auth.ok) return auth.res;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "invalid JSON" }, 400);
  }

  const days = extractDays(body);
  const startDate =
    body && typeof body === "object" && typeof (body as { catchupFrom?: unknown }).catchupFrom === "string"
      ? (body as { catchupFrom: string }).catchupFrom
      : null;
  const catchupDays = startDate ? generateZeroCatchupDays(startDate) : [];
  const importDays = days.length ? days : catchupDays;

  if (!importDays.length) {
    return json({ ok: false, error: "days array required" }, 400);
  }

  try {
    const imported = await upsertSitePulseBackfillDays(importDays);
    return json({
      ok: true,
      imported,
      snapshot: await getSitePulseSnapshot(),
    });
  } catch (error) {
    return json(
      { ok: false, reason: classifySitePulseError(error, "insert_failed") },
      500,
    );
  }
}
