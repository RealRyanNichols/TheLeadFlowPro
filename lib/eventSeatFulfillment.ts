import type { SupabaseClient } from "@supabase/supabase-js";
import { formatEventWhen, STANDS_ALONE_DISCLOSURE } from "@/lib/events";
import {
  deliverEventConfirmation,
  validateEventPayment,
} from "@/lib/eventPayments";
import type { StripeCheckoutSession } from "@/lib/stripeCheckout";

type EventForEmail = {
  id: string;
  slug: string;
  title: string;
  starts_at: string | null;
  duration_minutes: number | null;
  timezone: string;
  venue: string | null;
  city: string | null;
  clinic_enabled: boolean;
  instructor_name: string;
};

type Registration = {
  id: string;
  event_id: string;
  status: string;
  stripe_session_id: string | null;
  full_name: string;
  email: string;
  business_name: string | null;
  bottleneck: string | null;
  access_token: string;
  seat_number: number | null;
  confirmation_sent_at: string | null;
  events: EventForEmail | EventForEmail[] | null;
};

/** Paid seat and token-gated arrival instructions. Safe for repeated webhooks. */
export async function ensureEventSeatPaid(
  supabase: SupabaseClient,
  session: StripeCheckoutSession,
) {
  if (session.payment_status !== "paid")
    throw new Error("Workshop payment has not cleared");
  const registrationId =
    typeof session.metadata?.registration_id === "string"
      ? session.metadata.registration_id
      : "";
  const sessionId = typeof session.id === "string" ? session.id : "";
  if (!registrationId || !sessionId)
    throw new Error(
      "Paid event checkout is missing its registration or session ID",
    );

  const load = async (): Promise<Registration> => {
    const loaded = await supabase
      .from("event_registrations")
      .select(
        "id,event_id,status,stripe_session_id,full_name,email,business_name,bottleneck,access_token,seat_number,confirmation_sent_at,events(id,slug,title,starts_at,duration_minutes,timezone,venue,city,clinic_enabled,instructor_name)",
      )
      .eq("id", registrationId)
      .single();
    if (loaded.error || !loaded.data)
      throw new Error("Paid workshop registration could not be loaded");
    return loaded.data as unknown as Registration;
  };
  const before = await load();
  validateEventPayment(session, before);
  const claimed = await supabase.rpc("claim_event_seat", {
    p_registration_id: registrationId,
    p_stripe_session_id: sessionId,
    p_amount_cents: Number(session.amount_total),
  });
  if (claimed.error) throw new Error("Paid workshop seat could not be claimed");

  // Re-read after the atomic claim. This also detects a different payment
  // racing for an older registration that did not have an active session yet.
  const registration = await load();
  validateEventPayment(session, registration);
  const event = Array.isArray(registration.events)
    ? registration.events[0]
    : registration.events;
  if (!event) throw new Error("Paid workshop registration has no event");
  if (
    !["paid", "attended", "no_show", "overbooked"].includes(registration.status)
  ) {
    throw new Error("Workshop seat is not in a confirmed or reviewable state");
  }
  if (registration.confirmation_sent_at) return;
  const overbooked = registration.status === "overbooked";
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey)
    throw new Error("Workshop confirmation delivery is not configured");

  const address = await supabase.rpc("event_exact_address", {
    p_event_id: event.id,
  });
  const details = Array.isArray(address.data) ? address.data[0] : address.data;
  if (address.error || (!overbooked && !details?.exact_address)) {
    throw new Error("Paid workshop arrival instructions are missing");
  }
  const when = formatEventWhen(event);
  const location = [event.venue, details?.exact_address, event.city]
    .filter(Boolean)
    .join("\n");
  const portalUrl = `https://www.theleadflowpro.com/events/${event.slug}/confirmed?t=${encodeURIComponent(registration.access_token)}`;
  const send = async (recipient: "internal" | "attendee", payload: object) => {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `workshop:${sessionId}:${registration.status}:${recipient}`,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok)
      throw new Error(`Workshop ${recipient} email was not accepted`);
  };

  await deliverEventConfirmation({
    alreadySent: Boolean(registration.confirmation_sent_at),
    configured: Boolean(resendKey),
    sendInternal: () =>
      send("internal", {
        from: "The LeadFlow Pro <hello@theleadflowpro.com>",
        to: ["hello@theleadflowpro.com"],
        subject: overbooked
          ? `Workshop payment needs review: ${event.title}`
          : `Paid seat ${registration.seat_number ?? ""}: ${event.title}`,
        text: [
          overbooked
            ? "Payment arrived after the room filled. Contact the attendee and resolve the payment or capacity. No refund has been issued by this workflow."
            : `Seat ${registration.seat_number ?? "?"} is paid.`,
          "",
          `Name: ${registration.full_name}`,
          `Email: ${registration.email}`,
          registration.business_name
            ? `Business: ${registration.business_name}`
            : "",
          registration.bottleneck
            ? `Bottleneck: ${registration.bottleneck}`
            : "Bottleneck: not submitted yet",
          "",
          "Admin: https://www.theleadflowpro.com/admin/events",
        ].join("\n"),
      }),
    sendAttendee: () =>
      send("attendee", {
        from: "Ryan Nichols <hello@theleadflowpro.com>",
        to: [registration.email],
        reply_to: "hello@theleadflowpro.com",
        subject: overbooked
          ? `About your ${event.title} payment`
          : `Your seat is confirmed — ${event.title}`,
        text: overbooked
          ? [
              `${registration.full_name.split(" ")[0]},`,
              "",
              "Your payment arrived after the last available seat was taken. Your seat is not confirmed. The workshop team has been notified to review your payment and contact you about the next step.",
              "Please do not make another payment. You can reply to this email to reach us.",
              "",
              portalUrl,
              "",
              "Ryan Nichols",
              "The LeadFlow Pro",
            ].join("\n")
          : [
              `${registration.full_name.split(" ")[0]}, your seat is confirmed.`,
              "",
              event.title,
              when.full,
              "",
              location,
              "",
              "Bring a charged laptop and its charger. A free ChatGPT account is enough.",
              "",
              event.clinic_enabled
                ? "Before class, tell us one business bottleneck you want help with. Your attendee page also has the calendar download:"
                : "Your attendee page and calendar download:",
              portalUrl,
              "",
              STANDS_ALONE_DISCLOSURE,
              "",
              "See you there.",
              "",
              "Ryan Nichols",
              "The LeadFlow Pro | Longview, Texas",
            ].join("\n"),
      }),
    markSent: async () => {
      const marked = await supabase
        .from("event_registrations")
        .update({
          confirmation_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", registrationId)
        .eq("stripe_session_id", sessionId)
        .select("id");
      if (marked.error || !marked.data?.length)
        throw new Error("Workshop confirmation marker could not be saved");
    },
  });
}
