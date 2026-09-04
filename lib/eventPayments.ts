/** Workshop payment rules, kept independent of Next.js for failure-path tests. */
export const EVENT_PAYMENT_ENV_KEYS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RESEND_API_KEY",
] as const;

export function missingEventPaymentConfig(
  env: Record<string, string | undefined>,
) {
  return EVENT_PAYMENT_ENV_KEYS.filter((key) => {
    const value = env[key]?.trim();
    return !value || /^\[SENSITIVE\]$/i.test(value);
  });
}

export function isCheckoutPaymentEvent(type: unknown): boolean {
  return (
    type === "checkout.session.completed" ||
    type === "checkout.session.async_payment_succeeded"
  );
}

export type EventCheckoutOffer = {
  id: string;
  slug: string;
  title: string;
  price_usd: number | string;
  is_published: boolean;
  registration_closed: boolean;
  date_confirmed: boolean;
  starts_at: string | null;
};

export function eventSaleBlocker(
  event: EventCheckoutOffer,
  availability: { registration_open: boolean; sold_out: boolean } | null,
  now = Date.now(),
): string | null {
  if (!event.is_published)
    return "This event is not available for registration.";
  if (
    !event.date_confirmed ||
    !event.starts_at ||
    !Number.isFinite(Date.parse(event.starts_at))
  ) {
    return "The workshop date is being finalized. Registration will open once it is confirmed.";
  }
  if (Date.parse(event.starts_at) <= now)
    return "Registration for this workshop has ended.";
  if (event.registration_closed)
    return "Registration for this workshop is not open right now.";
  if (availability?.sold_out)
    return "This workshop is sold out. Nothing was charged.";
  if (!availability?.registration_open)
    return "We could not confirm seat availability. Please try again.";
  const cents = Math.round(Number(event.price_usd) * 100);
  if (!Number.isSafeInteger(cents) || cents <= 0)
    return "Online payment is not available for this workshop.";
  return null;
}

export type EventStripeSession = {
  id: string;
  status: "open" | "complete" | "expired";
  url: string | null;
  amount_total: number | null;
  currency: string | null;
  payment_status: string;
  metadata: Record<string, string> | null;
  payment_intent?: { status?: string } | string | null;
};

type CheckoutRegistration = {
  id: string;
  email: string;
  access_token: string;
  stripe_session_id: string | null;
};

type CheckoutDependencies = {
  retrieve: (sessionId: string) => Promise<EventStripeSession>;
  create: (
    params: URLSearchParams,
    idempotencyKey: string,
  ) => Promise<EventStripeSession>;
  persist: (
    sessionId: string,
    previousSessionId: string | null,
  ) => Promise<void>;
};

function assertRegistrationSession(
  session: EventStripeSession,
  registrationId: string,
  eventId: string,
) {
  if (
    !session.id?.startsWith("cs_") ||
    session.metadata?.kind !== "event" ||
    session.metadata.registration_id !== registrationId ||
    session.metadata.event_id !== eventId
  ) {
    throw new Error(
      "The saved checkout could not be verified. Please contact the workshop team.",
    );
  }
}

function checkoutUrl(session: EventStripeSession): string {
  const url = session.url ? new URL(session.url) : null;
  if (url?.protocol !== "https:" || url.hostname !== "checkout.stripe.com") {
    throw new Error(
      "Secure checkout did not open. Your registration is saved; please try again.",
    );
  }
  return url.toString();
}

/**
 * Store the active Stripe session in the existing registration column. A lost
 * HTTP response reuses the same session; an expired/failed one gets a stable
 * next-attempt key. Never offer a second payment while the first is processing.
 */
export async function getOrCreateEventCheckout(
  registration: CheckoutRegistration,
  event: EventCheckoutOffer,
  dependencies: CheckoutDependencies,
): Promise<{ url: string; sessionId: string }> {
  const site = "https://www.theleadflowpro.com";
  const confirmationUrl = `${site}/events/${event.slug}/confirmed?t=${encodeURIComponent(registration.access_token)}`;
  const amount = Math.round(Number(event.price_usd) * 100);
  if (!Number.isSafeInteger(amount) || amount <= 0)
    throw new Error("The ticket price could not be verified.");

  const previousId = registration.stripe_session_id;
  if (previousId) {
    const existing = await dependencies.retrieve(previousId);
    assertRegistrationSession(existing, registration.id, event.id);
    if (existing.status === "open") {
      if (existing.amount_total !== amount || existing.currency !== "usd") {
        throw new Error(
          "The ticket details have changed. Please contact the workshop team before paying.",
        );
      }
      return { url: checkoutUrl(existing), sessionId: existing.id };
    }
    const intentStatus =
      typeof existing.payment_intent === "object"
        ? existing.payment_intent?.status
        : null;
    const failed =
      existing.payment_status !== "paid" &&
      (intentStatus === "requires_payment_method" ||
        intentStatus === "canceled");
    if (existing.status === "complete" && !failed) {
      // Paid, or a delayed method is processing. The portal reads server state.
      return { url: confirmationUrl, sessionId: existing.id };
    }
    if (existing.status !== "expired" && !failed) {
      throw new Error(
        "Your payment is still being checked. Please wait before trying again.",
      );
    }
  }

  const params = new URLSearchParams({
    mode: "payment",
    success_url: `${confirmationUrl}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${confirmationUrl}&cancelled=1`,
    customer_email: registration.email,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(amount),
    "line_items[0][price_data][product_data][name]": `Seat: ${event.title}`,
    "metadata[kind]": "event",
    "metadata[event_id]": event.id,
    "metadata[event_slug]": event.slug,
    "metadata[registration_id]": registration.id,
    "metadata[ticket_amount_cents]": String(amount),
  });
  // No email/token/other PII in the idempotency key. The first key also covers
  // recovery when Stripe succeeded but our database write or response failed.
  const key = `workshop:${registration.id}:${previousId ?? "initial"}`;
  const created = await dependencies.create(params, key);
  assertRegistrationSession(created, registration.id, event.id);
  if (created.currency !== "usd" || created.amount_total !== amount) {
    throw new Error(
      "The checkout amount could not be verified. Nothing was charged by this request.",
    );
  }
  await dependencies.persist(created.id, previousId);
  return {
    sessionId: created.id,
    url: created.status === "complete" ? confirmationUrl : checkoutUrl(created),
  };
}

export function validateEventPayment(
  session: {
    id?: unknown;
    amount_total?: unknown;
    currency?: unknown;
    metadata?: Record<string, unknown> | null;
  },
  registration: {
    id: string;
    event_id: string;
    stripe_session_id: string | null;
    status: string;
  },
): void {
  if (
    session.metadata?.registration_id !== registration.id ||
    session.metadata?.event_id !== registration.event_id
  ) {
    throw new Error("Paid workshop metadata does not match its registration");
  }
  if (
    registration.stripe_session_id &&
    registration.stripe_session_id !== session.id
  ) {
    throw new Error(
      "Different paid checkout for the same registration requires payment review",
    );
  }
  if (["cancelled", "refunded", "transferred"].includes(registration.status)) {
    throw new Error(
      "Payment for a closed registration requires payment review",
    );
  }
  const paid = Number(session.amount_total);
  const expected = Number(session.metadata?.ticket_amount_cents);
  if (session.currency !== "usd" || !Number.isSafeInteger(paid) || paid <= 0) {
    throw new Error("Paid workshop amount or currency could not be verified");
  }
  if (Number.isFinite(expected) && expected > 0 && paid !== expected) {
    throw new Error("Paid workshop amount differs from the ticket snapshot");
  }
}

/** Keep the payment retryable until both deliveries have been accepted. */
export async function deliverEventConfirmation(options: {
  alreadySent: boolean;
  configured: boolean;
  sendInternal: () => Promise<void>;
  sendAttendee: () => Promise<void>;
  markSent: () => Promise<void>;
}): Promise<void> {
  if (options.alreadySent) return;
  if (!options.configured)
    throw new Error("Workshop confirmation delivery is not configured");
  await options.sendInternal();
  await options.sendAttendee();
  await options.markSent();
}
