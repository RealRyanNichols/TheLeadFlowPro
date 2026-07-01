import crypto from "crypto";
import { NextResponse } from "next/server";
import { sanitizeVercelDrainRecord, type VercelDrainRecord } from "@/lib/analytics-taxonomy";

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

function sha1(data: Buffer, secret: string) {
  return crypto.createHmac("sha1", secret).update(data).digest("hex");
}

function signaturesMatch(expected: string, actual: string | null) {
  if (!actual) return false;

  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(actual, "hex");
  if (expectedBuffer.length !== actualBuffer.length) return false;

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

function parseDrainPayload(rawBody: string) {
  const trimmed = rawBody.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  }

  if (trimmed.startsWith("{") && !trimmed.includes("\n")) {
    return [JSON.parse(trimmed)];
  }

  return trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const rawBody = await request.text();
  const signatureSecret = process.env.VERCEL_DRAIN_SIGNATURE_SECRET || process.env.VERCEL_WEB_ANALYTICS_DRAIN_SECRET;

  if (!signatureSecret) {
    console.error(
      JSON.stringify({
        level: "error",
        route: "/api/analytics/vercel-drain",
        reason: "missing_signature_secret",
        ms: Date.now() - startedAt,
      }),
    );
    return json({ ok: false, code: "missing_signature_secret" }, 503);
  }

  const expectedSignature = sha1(Buffer.from(rawBody, "utf8"), signatureSecret);
  if (!signaturesMatch(expectedSignature, request.headers.get("x-vercel-signature"))) {
    console.error(
      JSON.stringify({
        level: "error",
        route: "/api/analytics/vercel-drain",
        reason: "invalid_signature",
        ms: Date.now() - startedAt,
      }),
    );
    return json({ ok: false, code: "invalid_signature" }, 403);
  }

  try {
    const records = parseDrainPayload(rawBody) as VercelDrainRecord[];
    const sanitized = records.map(sanitizeVercelDrainRecord);
    const eventNames = Array.from(new Set(sanitized.map((event) => event.eventName || event.eventType).filter(Boolean))).slice(0, 20);
    const paths = Array.from(new Set(sanitized.map((event) => event.path).filter(Boolean))).slice(0, 20);

    // Do not log raw drain payloads. This route is intentionally anonymous;
    // identified lead events belong in leadflow.behavioral_events.
    console.log(
      JSON.stringify({
        level: "info",
        route: "/api/analytics/vercel-drain",
        schema: "vercel.analytics.v2",
        received: records.length,
        retained: sanitized.length,
        eventNames,
        paths,
        ms: Date.now() - startedAt,
      }),
    );

    return json({ ok: true, received: records.length, retained: sanitized.length });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        route: "/api/analytics/vercel-drain",
        reason: "parse_failed",
        error: error instanceof Error ? error.message : "unknown",
        ms: Date.now() - startedAt,
      }),
    );
    return json({ ok: false, code: "parse_failed" }, 400);
  }
}
