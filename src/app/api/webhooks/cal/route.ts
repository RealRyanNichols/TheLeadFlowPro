import { createHash, randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { rememberPublicVisitor } from "@/lib/lead-memory";
import { recordSitePulseEvent } from "@/lib/site-pulse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(req: Request) {
  const secret = process.env.CAL_WEBHOOK_SECRET;
  if (!secret) return { ok: false, status: 503, error: "CAL_WEBHOOK_SECRET not set" };

  const url = new URL(req.url);
  const bearer = req.headers.get("authorization");
  const headerSecret = req.headers.get("x-cal-secret");
  const querySecret = url.searchParams.get("secret");

  if (bearer === `Bearer ${secret}` || headerSecret === secret || querySecret === secret) {
    return { ok: true };
  }

  return { ok: false, status: 401, error: "unauthorized" };
}

function text(value: unknown, max = 500) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed ? trimmed.slice(0, max) : null;
}

function email(value: unknown) {
  const raw = text(value, 200)?.toLowerCase() ?? null;
  return raw && /.+@.+\..+/.test(raw) ? raw : null;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    const found = text(value);
    if (found) return found;
  }
  return null;
}

function visitorIdFromEmail(input: string) {
  return `cal_${createHash("sha256").update(input).digest("hex").slice(0, 32)}`;
}

function extractCalContact(body: Record<string, unknown>) {
  const payload = (body.payload && typeof body.payload === "object"
    ? body.payload
    : body) as Record<string, unknown>;
  const attendees = Array.isArray(payload.attendees) ? payload.attendees : [];
  const firstAttendee = attendees[0] && typeof attendees[0] === "object"
    ? (attendees[0] as Record<string, unknown>)
    : {};
  const responses = payload.responses && typeof payload.responses === "object"
    ? (payload.responses as Record<string, unknown>)
    : {};

  const contactEmail = email(
    firstAttendee.email ??
      payload.email ??
      payload.attendeeEmail ??
      (responses.email && typeof responses.email === "object"
        ? (responses.email as Record<string, unknown>).value
        : responses.email),
  );
  const fullName = firstString(
    firstAttendee.name,
    payload.name,
    payload.attendeeName,
    responses.name && typeof responses.name === "object"
      ? (responses.name as Record<string, unknown>).value
      : responses.name,
  );
  const eventTitle = firstString(payload.title, payload.eventTitle, payload.eventTypeSlug, body.triggerEvent);
  const startTime = firstString(payload.startTime, payload.start, payload.startTimeUtc);

  return {
    payload,
    contactEmail,
    fullName,
    eventTitle,
    startTime,
  };
}

export async function POST(req: Request) {
  const auth = authorized(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    body = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const eventType = firstString(body.triggerEvent, body.eventType, body.type) ?? "cal-webhook";
  const { payload, contactEmail, fullName, eventTitle, startTime } = extractCalContact(body);
  const visitorId = contactEmail ? visitorIdFromEmail(contactEmail) : `cal_${randomUUID()}`;

  try {
    await rememberPublicVisitor({
      visitorId,
      email: contactEmail,
      fullName,
      topic: "booking",
      stage: "booked-call",
      path: "/book",
      source: "cal-webhook",
      profile: {
        calEventType: eventType,
        calEventTitle: eventTitle,
        calStartTime: startTime,
      },
    });

    await recordSitePulseEvent({
      visitorId,
      path: "/book",
      eventType: "api_sync",
      source: "cal-webhook",
      target: eventType,
      value: 1,
    });
  } catch (error) {
    console.error("cal_webhook_memory_failed", {
      eventType,
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  return NextResponse.json({
    ok: true,
    eventType,
    remembered: Boolean(contactEmail || fullName),
    eventTitle,
    startTime,
    // Do not echo the full Cal payload back.
    receivedKeys: Object.keys(payload).slice(0, 20),
  });
}
