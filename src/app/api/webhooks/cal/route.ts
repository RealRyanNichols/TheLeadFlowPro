import { createHash, createHmac, randomUUID, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { rememberPublicVisitor } from "@/lib/lead-memory";
import { prisma } from "@/lib/prisma";
import { recordSitePulseEvent } from "@/lib/site-pulse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function authorized(req: Request, rawBody: string) {
  const secret = process.env.CAL_WEBHOOK_SECRET;
  if (!secret) return { ok: false, status: 503, error: "CAL_WEBHOOK_SECRET not set" };

  const url = new URL(req.url);
  const bearer = req.headers.get("authorization");
  const headerSecret = req.headers.get("x-cal-secret");
  const querySecret = url.searchParams.get("secret");
  const signatureHeader = req.headers.get("x-cal-signature-256");
  const signature = signatureHeader?.replace(/^sha256=/i, "").trim();
  const expectedSignature = createHmac("sha256", secret).update(rawBody).digest("hex");

  if (
    (signature && safeCompare(signature, expectedSignature)) ||
    bearer === `Bearer ${secret}` ||
    headerSecret === secret ||
    querySecret === secret
  ) {
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

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function visitorIdFromEmail(input: string) {
  return `cal_${createHash("sha256").update(input).digest("hex").slice(0, 32)}`;
}

function bookingMarker(input: {
  contactEmail: string | null;
  fullName: string | null;
  eventTitle: string | null;
  startTime: string | null;
  bookingId: string | null;
}) {
  if (input.bookingId) return `cal_booking:${input.bookingId}`;
  const raw = [
    input.contactEmail,
    input.fullName,
    input.eventTitle,
    input.startTime,
  ].filter(Boolean).join("|");
  return `cal_booking:${createHash("sha256").update(raw || randomUUID()).digest("hex").slice(0, 32)}`;
}

function estimatedCallHours(durationMinutes: number | null, eventTitle: string | null) {
  const title = eventTitle?.toLowerCase() ?? "";
  if (title.includes("decision sprint") || title.includes("90")) return 5;

  // Free fit calls still consume Ryan's calendar: 10 minutes before, the call,
  // and 10 minutes after for notes/routing. Round up to a practical block.
  const minutes = (durationMinutes ?? 10) + 20;
  return Math.max(0.5, Math.ceil((minutes / 60) * 4) / 4);
}

function isCancellationEvent(eventType: string) {
  return /cancel/i.test(eventType);
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
  const durationMinutes = firstNumber(
    payload.duration,
    payload.length,
    payload.eventLength,
    payload.eventTypeLength,
    payload.eventType && typeof payload.eventType === "object"
      ? (payload.eventType as Record<string, unknown>).length
      : null,
  );
  const bookingId = firstString(payload.uid, payload.id, payload.bookingId, payload.bookingUid, body.id);

  return {
    payload,
    contactEmail,
    fullName,
    eventTitle,
    startTime,
    durationMinutes,
    bookingId,
  };
}

async function createCalWorkOrder(input: {
  eventType: string;
  visitorId: string;
  contactEmail: string | null;
  fullName: string | null;
  eventTitle: string | null;
  startTime: string | null;
  durationMinutes: number | null;
  bookingId: string | null;
}) {
  const marker = bookingMarker(input);
  const canceled = isCancellationEvent(input.eventType);

  try {
    const existing = await (prisma as any).workOrder.findFirst({
      where: { notes: { contains: marker } },
      select: { id: true, status: true },
    });

    if (canceled) {
      if (existing) {
        await (prisma as any).workOrder.update({
          where: { id: existing.id },
          data: {
            status: "canceled",
            notes: {
              set: `${marker}\nCal.com cancellation received. Capacity released.`,
            },
          },
        });
      }
      return { action: existing ? "canceled" : "ignored-cancel", created: false, id: existing?.id ?? null, marker };
    }

    const dueAt = input.startTime ? new Date(input.startTime) : null;
    const safeDueAt = dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt : null;
    const title = input.eventTitle || "Booked 10-minute fit call";
    const estimatedHours = estimatedCallHours(input.durationMinutes, input.eventTitle);
    const clientName =
      input.fullName ||
      input.contactEmail ||
      `Cal booking ${marker.slice(-6)}`;

    if (existing) {
      const updated = await (prisma as any).workOrder.update({
        where: { id: existing.id },
        data: {
          clientName,
          publicLabel: "Booked fit call",
          title,
          status: "scheduled",
          estimatedHours,
          dueAt: safeDueAt,
          notes: [
            marker,
            input.contactEmail ? `attendee_email:${input.contactEmail}` : null,
            input.fullName ? `attendee_name:${input.fullName}` : null,
            input.startTime ? `start_time:${input.startTime}` : null,
            input.durationMinutes ? `duration_minutes:${input.durationMinutes}` : null,
            `visitor_id:${input.visitorId}`,
            "Updated from Cal.com so Ryan's capacity meter reflects the current booked call time.",
          ].filter(Boolean).join("\n"),
        },
      });
      return { action: "updated", created: false, id: updated.id as string, marker };
    }

    const created = await (prisma as any).workOrder.create({
      data: {
        clientName,
        publicLabel: "Booked fit call",
        offerSlug: null,
        title,
        status: "scheduled",
        estimatedHours,
        completedHours: 0,
        deliveryGuaranteeDays: null,
        dueAt: safeDueAt,
        notes: [
          marker,
          input.contactEmail ? `attendee_email:${input.contactEmail}` : null,
          input.fullName ? `attendee_name:${input.fullName}` : null,
          input.startTime ? `start_time:${input.startTime}` : null,
          input.durationMinutes ? `duration_minutes:${input.durationMinutes}` : null,
          `visitor_id:${input.visitorId}`,
          "Auto-created from Cal.com so Ryan's capacity meter reflects booked calls.",
        ].filter(Boolean).join("\n"),
      },
    });

    return { action: "created", created: true, id: created.id as string, marker };
  } catch (error) {
    console.warn("Cal webhook: work order not created", {
      marker,
      error: error instanceof Error ? error.message : "unknown",
    });
    return { action: "failed", created: false, id: null, marker };
  }
}

export async function POST(req: Request) {
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const auth = authorized(req, rawBody);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(rawBody || "{}");
    body = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const eventType = firstString(body.triggerEvent, body.eventType, body.type) ?? "cal-webhook";
  const { payload, contactEmail, fullName, eventTitle, startTime, durationMinutes, bookingId } = extractCalContact(body);
  const visitorId = contactEmail ? visitorIdFromEmail(contactEmail) : `cal_${randomUUID()}`;
  const workOrder = await createCalWorkOrder({
    eventType,
    visitorId,
    contactEmail,
    fullName,
    eventTitle,
    startTime,
    durationMinutes,
    bookingId,
  });

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
        calDurationMinutes: durationMinutes,
        workOrderId: workOrder.id,
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
    durationMinutes,
    workOrderCreated: workOrder.created,
    workOrderAction: workOrder.action,
    workOrderId: workOrder.id,
    // Do not echo the full Cal payload back.
    receivedKeys: Object.keys(payload).slice(0, 20),
  });
}
