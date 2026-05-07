import { NextRequest, NextResponse } from "next/server";
import {
  classifySitePulseError,
  emptySitePulseSnapshot,
  getSitePulseSnapshot,
  recordSitePulseEvent,
  sanitizeSitePulseError,
} from "@/lib/site-pulse";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

function logPulse(level: "info" | "error", data: Record<string, unknown>) {
  const payload = { level, route: "/api/site-pulse", ...data };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else console.log(line);
}

export async function GET() {
  const startedAt = Date.now();

  try {
    const snapshot = await getSitePulseSnapshot();
    logPulse("info", { method: "GET", source: snapshot.source, ms: Date.now() - startedAt });
    return json(snapshot);
  } catch (error) {
    const reason = classifySitePulseError(error, "snapshot_failed");
    const detail = sanitizeSitePulseError(error);
    logPulse("error", { method: "GET", reason, detail, ms: Date.now() - startedAt });
    return json(emptySitePulseSnapshot("offline", reason, detail));
  }
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();

  try {
    const raw = await request.text();
    const body = raw ? JSON.parse(raw) : {};

    await recordSitePulseEvent({
      visitorId: body.visitorId,
      path: body.path,
      eventType: body.eventType,
      source: body.source,
    });

    const snapshot = await getSitePulseSnapshot();
    logPulse("info", { method: "POST", source: snapshot.source, ms: Date.now() - startedAt });
    return json(snapshot);
  } catch (error) {
    const reason = classifySitePulseError(error, "insert_failed");
    const detail = sanitizeSitePulseError(error);
    logPulse("error", { method: "POST", reason, detail, ms: Date.now() - startedAt });
    return json(emptySitePulseSnapshot("offline", reason, detail));
  }
}
