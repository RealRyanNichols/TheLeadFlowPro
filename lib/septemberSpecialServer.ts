import "server-only";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { deliverPaymentEmail } from "@/lib/paymentEmailDelivery";
import {
  CAPACITY, ENDS_AT, PRICE_CENTS, PURCHASE_KIND, STARTS_AT, UUID_PATTERN,
  canReleaseFailedSpecialPayment, paidSpecialReservation, specialStatus, type SpecialProspect, type SpecialSession,
} from "@/lib/septemberSpecial";

type Reservation = {
  id: string;
  status: "creating" | "open" | "paid" | "expired";
  prospect: SpecialProspect;
  stripe_session_id: string | null;
  created_at: string;
  expires_at: string;
};

export class SpecialCheckoutError extends Error {
  constructor(public code: string, public httpStatus = 409) { super(code); }
}

function assertResult(error: unknown) {
  if (error) throw new Error("Special reservation database operation failed");
}

function checkoutParams(row: Reservation): Stripe.Checkout.SessionCreateParams {
  return {
    mode: "payment",
    // No payment_method_types on purpose: Checkout uses the payment methods
    // turned on in the Stripe dashboard (cards, wallets, Klarna, Afterpay,
    // Zip, Sunbit) and shows each one only when this amount fits its limits.
    // The provider decides buyer eligibility and terms. This remains one
    // payment, with no LeadFlow subscription or internally financed installments.
    customer_email: row.prospect.email,
    expires_at: Math.floor(Date.parse(row.expires_at) / 1000),
    client_reference_id: row.id,
    metadata: { kind: PURCHASE_KIND, reservation_id: row.id },
    payment_intent_data: { metadata: { kind: PURCHASE_KIND, reservation_id: row.id } },
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd", unit_amount: PRICE_CENTS,
        product_data: {
          name: "September 30-Day Business Special | The LeadFlow Pro",
          description: "$1,497 one time: $500 ad budget + $997 services. 100 Facebook posts, website, 30-day follow-up series, 10 custom images, 5 reels, and local commercial shoot.",
        },
      },
    }],
    // Fixed trusted origin: a hostile Host header cannot redirect a buyer.
    success_url: "https://www.theleadflowpro.com/september-special/confirmation?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: "https://www.theleadflowpro.com/september-special?checkout=cancelled#claim",
    custom_text: { submit: { message: "One-time payment. No subscription. Your package includes $500 in advertising budget and $997 in services. On-site video is limited to 50 miles of Longview, Texas." } },
  };
}

async function expireReservation(db: SupabaseClient, row: Reservation) {
  const { error } = await db.rpc("september_special_expire", {
    p_id: row.id, p_session_id: row.stripe_session_id,
  });
  assertResult(error);
}

export async function recordSpecialSession(
  db: SupabaseClient,
  session: SpecialSession & { customer_details?: { email?: string | null } | null; customer_email?: string | null },
) {
  const reservationId = paidSpecialReservation(session);
  if (!reservationId) throw new Error("Special payment did not match the approved offer");
  const { error } = await db.rpc("september_special_paid", {
    p_id: reservationId, p_session_id: session.id, p_amount: PRICE_CENTS,
    p_currency: "usd", p_customer_email: session.customer_details?.email || session.customer_email || null,
  });
  assertResult(error);
  // The paid ledger commits first. Email failures remain retryable, including
  // after an already-paid webhook replay; each recipient has a durable delivery
  // marker plus Resend idempotency so neither receives duplicate kickoff mail.
  const saved = await db.from("september_special_reservations")
    .select("prospect,lead_id").eq("id", reservationId).single();
  assertResult(saved.error);
  if (!saved.data) throw new Error("Special paid intake is unavailable");
  const prospect = saved.data.prospect as SpecialProspect;
  const buyerEmail = session.customer_details?.email || session.customer_email || prospect.email;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Special kickoff email is not configured");
  const sessionId = session.id as string;
  await deliverPaymentEmail({
    supabase: db, sessionId, purpose: "september-special:owner", apiKey,
    payload: {
      from: "The LeadFlow Pro <leadflow@theleadflowpro.com>",
      to: ["hello@theleadflowpro.com"],
      subject: "PAID: $1,497 September special. Schedule onboarding.",
      text: [
        "A September special payment is verified: $1,497 one time.",
        "$500 is the client's ad budget; $997 covers services.", "",
        `Name: ${prospect.full_name}`, `Business: ${prospect.business_name}`,
        `Email: ${buyerEmail}`, `Phone: ${prospect.phone}`, `City: ${prospect.business_city}`, "",
        "Next: contact the client, confirm the location is within 50 miles of Longview, and book onboarding and the two-hour commercial shoot.",
        "Deliver: website, 100 Facebook business-page posts across 30 days, 30-day automated email follow-up series, 10 custom images, 5 short reels, and one commercial video.",
        `CRM: https://www.theleadflowpro.com/admin/leads/${saved.data.lead_id}`,
      ].join("\n"),
    },
  });
  await deliverPaymentEmail({
    supabase: db, sessionId, purpose: "september-special:buyer", apiKey,
    payload: {
      from: "The LeadFlow Pro <leadflow@theleadflowpro.com>",
      to: [buyerEmail], reply_to: "hello@theleadflowpro.com",
      subject: "Your $1,497 LeadFlow special is paid. Next: onboarding.",
      text: [
        "Your payment is confirmed and your spot is reserved.", "",
        "$1,497 one time: $500 toward your ads and $997 for the services below. No automatic renewal.", "",
        "Your package includes:",
        "- A business website.",
        "- 100 posts for your Facebook business page across 30 days.",
        "- A 30-day automated email follow-up series.",
        "- 10 customized business images and 5 short reels.",
        "- One commercial video with a two-hour on-site session, within 50 miles of Longview, Texas.", "",
        "Next: reply with the best time for your kickoff call, your Facebook business-page link, and your business location. We will confirm access and the launch schedule with you.",
        "Please do not email passwords. We will arrange account access during onboarding.", "",
        "You keep your delivered website, content and follow-up series. Results depend on your business, market, offer and ad performance; no lead or revenue total is guaranteed.", "",
        "Ryan Nichols", "The LeadFlow Pro", "hello@theleadflowpro.com",
      ].join("\n"),
    },
  });
}

/** Only called after the existing webhook's signature verification. */
export async function handleSpecialWebhook(db: SupabaseClient, eventType: string, session: Stripe.Checkout.Session) {
  if (session.metadata?.kind !== PURCHASE_KIND) return false;
  if (eventType === "checkout.session.completed" || eventType === "checkout.session.async_payment_succeeded") {
    if (session.payment_status === "paid") await recordSpecialSession(db, session);
  } else if (eventType === "checkout.session.async_payment_failed") {
    // Delayed methods retain their slot after Checkout completes while payment
    // is pending. Only a signed terminal failure AND the current Stripe state
    // can free it; a late failure event must never release a paid customer's slot.
    const current = await getStripe().checkout.sessions.retrieve(session.id, { expand: ["payment_intent"] });
    if (current.payment_status === "paid") {
      await recordSpecialSession(db, current);
      return true;
    }
    const intent = current.payment_intent;
    if (!canReleaseFailedSpecialPayment(current, typeof intent === "object" ? intent : null)) {
      throw new Error("Special payment failure is not yet final");
    }
    const id = current.metadata?.reservation_id;
    if (current.metadata?.kind !== PURCHASE_KIND || !id || !UUID_PATTERN.test(id)) {
      throw new Error("Special failed payment did not match a reservation");
    }
    const { error } = await db.rpc("september_special_expire", { p_id: id, p_session_id: current.id });
    assertResult(error);
  } else if (eventType === "checkout.session.expired") {
    const id = session.metadata?.reservation_id;
    if (!id || !UUID_PATTERN.test(id) || session.status !== "expired") {
      throw new Error("Special expiry event did not match a reservation");
    }
    const { error } = await db.rpc("september_special_expire", { p_id: id, p_session_id: session.id });
    assertResult(error);
  }
  return true;
}

async function createOrRecoverSession(db: SupabaseClient, stripe: Stripe, row: Reservation) {
  let session: Stripe.Checkout.Session;
  if (row.stripe_session_id) {
    session = await stripe.checkout.sessions.retrieve(row.stripe_session_id);
  } else {
    // Stripe keeps idempotency results for at least 24 hours. Never recreate an
    // unknown older attempt after that window; retain the slot for reconciliation.
    if (Date.now() - Date.parse(row.created_at) >= 23 * 60 * 60 * 1000) {
      throw new SpecialCheckoutError("needs_review", 503);
    }
    try {
      session = await stripe.checkout.sessions.create(checkoutParams(row), {
        idempotencyKey: `september-special:${row.id}`,
      });
    } catch (error) {
      // A definitive validation rejection creates no payable session. A timeout,
      // 5xx, or idempotency conflict is ambiguous and MUST retain its slot.
      if (error && typeof error === "object" && "type" in error &&
          error.type === "StripeInvalidRequestError" && "statusCode" in error && error.statusCode === 400) {
        await expireReservation(db, row);
      }
      throw new SpecialCheckoutError("checkout_failed", 503);
    }
    const attached = await db.rpc("september_special_attach", {
      p_id: row.id, p_session_id: session.id,
      p_expires_at: new Date(session.expires_at * 1000).toISOString(),
    });
    // Never release a slot if storing the new session ID failed. Its Stripe URL
    // may exist; the same idempotency key recovers it on a subsequent retry.
    assertResult(attached.error);
    row.stripe_session_id = session.id;
  }
  if (session.status === "expired") {
    await expireReservation(db, row);
  } else if (session.status === "complete" && session.payment_status === "paid") {
    await recordSpecialSession(db, session);
  }
  return session;
}

async function reconcileExpiredHolds(db: SupabaseClient, stripe: Stripe) {
  const { data, error } = await db.from("september_special_reservations")
    .select("id,status,prospect,stripe_session_id,created_at,expires_at")
    .in("status", ["creating", "open"]).lte("expires_at", new Date().toISOString()).limit(CAPACITY);
  assertResult(error);
  for (const row of (data || []) as Reservation[]) {
    try { await createOrRecoverSession(db, stripe, row); }
    catch {
      // Fail closed: still count an uncertain slot. Never log prospect data.
      console.error("September special hold reconciliation needs retry");
    }
  }
}

export async function specialAvailability() {
  const db = createServiceClient();
  await reconcileExpiredHolds(db, getStripe());
  const { count, error } = await db.from("september_special_reservations")
    .select("id", { count: "exact", head: true }).neq("status", "expired");
  assertResult(error);
  const availableSpots = Math.max(0, CAPACITY - (count ?? CAPACITY));
  return { availableSpots, startsAt: STARTS_AT, endsAt: ENDS_AT, status: specialStatus(Date.now(), availableSpots) };
}

export async function startSpecialCheckout(prospect: SpecialProspect) {
  if (specialStatus(Date.now(), CAPACITY) !== "open") {
    throw new SpecialCheckoutError(Date.now() < Date.parse(STARTS_AT) ? "upcoming" : "expired");
  }
  const db = createServiceClient();
  const stripe = getStripe();
  await reconcileExpiredHolds(db, stripe);
  const reserved = await db.rpc("september_special_reserve", { p_request_id: prospect.request_id, p_prospect: prospect });
  assertResult(reserved.error);
  if (!reserved.data || reserved.data.error) throw new SpecialCheckoutError(reserved.data?.error || "unavailable");
  const row = reserved.data as Reservation;
  if (row.status === "paid") throw new SpecialCheckoutError("already_paid");
  if (row.status === "expired") throw new SpecialCheckoutError("hold_expired");
  const session = await createOrRecoverSession(db, stripe, row);
  if (session.status !== "open" || !session.url) {
    throw new SpecialCheckoutError(session.payment_status === "paid" ? "already_paid" : "hold_expired");
  }
  // Reservation and Stripe creation both precede the deadline. A slow request
  // crossing it is expired before its URL is exposed; an earlier URL may finish.
  if (Date.now() >= Date.parse(ENDS_AT)) {
    const expired = await stripe.checkout.sessions.expire(session.id);
    if (expired.status === "expired") await expireReservation(db, row);
    throw new SpecialCheckoutError("expired");
  }
  return { url: session.url, expiresAt: new Date(session.expires_at * 1000).toISOString() };
}

/** Cancel only the exact unpaid checkout whose two opaque identifiers the caller holds. */
export async function cancelSpecialCheckout(requestId: string, sessionId: string) {
  if (!UUID_PATTERN.test(requestId) || !/^cs_[a-zA-Z0-9_]{10,240}$/.test(sessionId)) {
    throw new SpecialCheckoutError("invalid_checkout", 400);
  }
  const db = createServiceClient();
  const found = await db.from("september_special_reservations")
    .select("id,status,prospect,stripe_session_id,created_at,expires_at")
    .eq("id", requestId).eq("stripe_session_id", sessionId).maybeSingle();
  assertResult(found.error);
  if (!found.data) throw new SpecialCheckoutError("invalid_checkout", 404);
  const row = found.data as Reservation;
  if (row.status === "paid") throw new SpecialCheckoutError("already_paid");
  if (row.status === "expired") return { released: true };
  const stripe = getStripe();
  let session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.status === "complete" && session.payment_status === "paid") {
    await recordSpecialSession(db, session);
    throw new SpecialCheckoutError("already_paid");
  }
  if (session.status === "open") session = await stripe.checkout.sessions.expire(sessionId);
  if (session.status !== "expired") throw new SpecialCheckoutError("needs_review", 409);
  await expireReservation(db, row);
  return { released: true };
}
