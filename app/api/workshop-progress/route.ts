import { NextResponse } from "next/server";
import { createWorkshopServiceClient } from "@/lib/eventCommerce";
import type { StripeCheckoutSession } from "@/lib/stripeCheckout";

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function retrievePaidWorkshopSession(sessionId: string) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret || !/^cs_(test_|live_)?[A-Za-z0-9_]+$/.test(sessionId)) return null;
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const session = (await response.json()) as StripeCheckoutSession;
  if (session.payment_status !== "paid" || session.metadata?.workshop_schema !== "v2") return null;
  return session;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const sessionId = clean(body.session_id, 240);
  const checkinType = clean(body.checkin_type, 30) || "seven_day";
  if (!sessionId || !["before_class", "seven_day", "thirty_day"].includes(checkinType)) {
    return NextResponse.json({ error: "Invalid progress check-in." }, { status: 400 });
  }

  const session = await retrievePaidWorkshopSession(sessionId);
  const eventId = clean(session?.metadata?.event_id, 80);
  const registrationId = clean(session?.metadata?.registration_id, 80);
  if (!session || !eventId || !registrationId) {
    return NextResponse.json({ error: "A verified paid attendee link is required." }, { status: 403 });
  }

  const service = createWorkshopServiceClient();
  const { data: registration } = await service
    .from("workshop_registrations")
    .select("id, event_id, status, payment_status")
    .eq("id", registrationId)
    .eq("event_id", eventId)
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();
  if (!registration || registration.status !== "confirmed" || registration.payment_status !== "paid") {
    return NextResponse.json({ error: "The paid attendee record is still processing." }, { status: 409 });
  }

  const helpRequested = body.implementation_help_requested === true;
  const { error } = await service.from("workshop_progress_checkins").upsert(
    {
      event_id: eventId,
      registration_id: registrationId,
      checkin_type: checkinType,
      progress_summary: clean(body.progress_summary, 2000) || null,
      blocked_by: clean(body.blocked_by, 2000) || null,
      next_action: clean(body.next_action, 1000) || null,
      implementation_help_requested: helpRequested,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "registration_id,checkin_type" },
  );
  if (error) {
    console.error("Workshop progress check-in failed:", error.code);
    return NextResponse.json({ error: "The progress update could not be saved." }, { status: 500 });
  }

  if (helpRequested) {
    const externalId = `workshop_registration:${registrationId}`;
    const { data: lead } = await service
      .from("leads")
      .select("id")
      .eq("external_id", externalId)
      .is("deleted_at", null)
      .maybeSingle();
    if (lead?.id) {
      const title = "Requested workshop progress review";
      const { data: task } = await service
        .from("lead_tasks")
        .select("id")
        .eq("lead_id", lead.id)
        .eq("title", title)
        .is("completed_at", null)
        .maybeSingle();
      if (!task) {
        await service.from("lead_tasks").insert({
          lead_id: lead.id,
          title,
          due_date: new Date().toISOString().slice(0, 10),
          priority: "high",
          assigned_to: "Pat Grabbs",
          task_type: "call",
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
