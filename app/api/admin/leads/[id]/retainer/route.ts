import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { leadMessageAuthor } from "@/lib/leadMessageAuthor";
import {
  cancelRetainerAtPeriodEnd,
  retainerActive,
  retainerCancelDetail,
  retainerFromDiagnostic,
  subscriptionBelongsToLead,
  subscriptionIdFromSession,
} from "@/lib/agencyRetainer";

// Ends an agency retainer (decision 66): the one admin write to a Stripe
// subscription. Human-clicked, confirmed in the browser, admin only.
//
// Order:
// 1. Signed in and admin. Nothing about the lead is read before that.
// 2. The lead is read with the signed-in user's own client, so row level
//    security still applies. A lead with no monthly retainer is a 409.
// 3. The subscription id comes from the stamp the webhook wrote; a stamp
//    that predates that field is resolved through the checkout session.
// 4. Stripe's own record must say the subscription is an agency payment
//    for this lead (its lead id, or its customer's email). The stamp alone
//    is never enough: an unauthenticated form post can write a lead's
//    diagnostic, so a forged stamp naming someone else's subscription
//    stops here with a 409 and touches nothing.
// 5. Stripe is told cancel_at_period_end. The client keeps the paid period.
//    Nothing is refunded and nothing is emailed to the client from here.
// 6. The lead's stamp records who ended it, when, and when the period
//    closes, and the timeline gets one line. A retry after a dropped
//    connection finds the stamp and stops.
//
// The Stripe webhook (customer.subscription.updated with cancel_at_period_end)
// posts the owner alert, stamps the lead too, and adds its own timeline line
// once that event is registered on the endpoint (decision 62).

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(401, "Sign in to manage a retainer.");
  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
  if (profile?.role !== "admin") return fail(403, "Owner access required.");
  const by = leadMessageAuthor(profile.full_name, user.email).auditName;

  const { id } = await context.params;
  if (typeof id !== "string" || !UUID_RE.test(id)) return fail(400, "That lead link is not valid.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Confirm the cancellation first.");
  }
  if (!body || typeof body !== "object" || (body as { confirm?: unknown }).confirm !== true) {
    return fail(400, "Confirm the cancellation first.");
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeKey) return fail(501, "Stripe is not configured on this server, so the retainer cannot be ended from here. End it in the Stripe dashboard.");

  const leadRead = await supabase.from("leads").select("id, email, diagnostic").eq("id", id).is("deleted_at", null).maybeSingle();
  if (leadRead.error) return fail(500, "This is a connection problem, not a problem with the lead. Try again.");
  if (!leadRead.data) return fail(404, "Lead not found. It may have been deleted.");

  const diagnostic = leadRead.data.diagnostic && typeof leadRead.data.diagnostic === "object" ? (leadRead.data.diagnostic as Record<string, unknown>) : {};
  const state = retainerFromDiagnostic(diagnostic);
  if (!state) return fail(409, "This lead has no monthly agency retainer to end.");
  if (!retainerActive(state)) {
    return NextResponse.json({ ok: true, duplicate: true, cancelScheduledAt: state.cancelScheduledAt, summary: "This retainer was already set to end. Nothing changed." });
  }

  const subscriptionId = state.subscriptionId ?? (state.sessionId ? await subscriptionIdFromSession(stripeKey, state.sessionId) : null);
  if (!subscriptionId) {
    return fail(409, "The Stripe subscription behind this retainer could not be found. End it in the Stripe dashboard (Customers, the client, Subscriptions).");
  }

  const owned = await subscriptionBelongsToLead(stripeKey, subscriptionId, { id, email: typeof leadRead.data.email === "string" ? leadRead.data.email : null });
  if (!owned.ok) {
    if (owned.reason === "unreachable") return fail(502, "Stripe did not answer. Nothing changed. Try again in a moment.");
    return fail(409, "Stripe does not show this subscription as this client's agency retainer, so nothing was changed. Check it in the Stripe dashboard before ending it there.");
  }
  if (owned.status === "canceled") {
    return NextResponse.json({ ok: true, duplicate: true, summary: "This subscription already ended in Stripe. Nothing changed." });
  }

  const cancelled = await cancelRetainerAtPeriodEnd(stripeKey, subscriptionId);
  if (!cancelled.ok) {
    return fail(
      502,
      cancelled.reason === "unreachable"
        ? "Stripe did not answer in time. Nothing was recorded here; the subscription may or may not have been updated. Try again in a moment (a repeat is safe) or check it in the Stripe dashboard."
        : "Stripe refused the cancellation. Nothing changed here. Check the subscription in the Stripe dashboard.",
    );
  }
  const currentPeriodEnd = cancelled.currentPeriodEnd ?? owned.currentPeriodEnd;

  const now = new Date().toISOString();
  const payment = diagnostic.agency_payment && typeof diagnostic.agency_payment === "object" ? (diagnostic.agency_payment as Record<string, unknown>) : {};
  const stamped = await supabase
    .from("leads")
    .update({
      diagnostic: {
        ...diagnostic,
        agency_payment: {
          ...payment,
          subscription_id: subscriptionId,
          cancel_scheduled_at: now,
          cancelled_by: by,
          current_period_end: currentPeriodEnd,
        },
      },
    })
    .eq("id", id)
    .is("deleted_at", null)
    .select("id");
  const stampLanded = !stamped.error && Array.isArray(stamped.data) && stamped.data.length > 0;

  const detail = retainerCancelDetail(state, subscriptionId, by);
  const prior = await supabase.from("lead_activity").select("id").eq("lead_id", id).eq("kind", "system").eq("detail", detail).limit(1).maybeSingle();
  let activityLanded = !prior.error && !!prior.data;
  if (!activityLanded) {
    const activity = await supabase.from("lead_activity").insert({ lead_id: id, kind: "system", detail });
    activityLanded = !activity.error;
  }

  return NextResponse.json({
    ok: true,
    duplicate: false,
    subscriptionId,
    cancelScheduledAt: now,
    currentPeriodEnd,
    warnings: [
      ...(stampLanded ? [] : ["Stripe has the cancellation, but the lead page did not record it. Refresh; if the button is still there, do not click it again: check Stripe first."]),
      ...(activityLanded ? [] : ["The timeline line did not save. Stripe has the cancellation."]),
    ],
    summary: currentPeriodEnd
      ? `The retainer ends at the close of the paid period (${currentPeriodEnd.slice(0, 10)}). Nothing renews after that.`
      : "The retainer ends at the close of the paid period. Nothing renews after that.",
  });
}
