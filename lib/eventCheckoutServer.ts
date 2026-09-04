import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";
import {
  eventSaleBlocker,
  getOrCreateEventCheckout,
  missingEventPaymentConfig,
  type EventCheckoutOffer,
  type EventStripeSession,
} from "@/lib/eventPayments";

/** Called only by the server checkout route; never import from a client component. */
export async function startEventCheckout(
  token: unknown,
): Promise<{ status: number; body: { url?: string; error?: string } }> {
  if (typeof token !== "string" || !/^[a-f0-9]{48}$/.test(token)) {
    return { status: 400, body: { error: "Register before checkout." } };
  }
  if (missingEventPaymentConfig(process.env).length) {
    return {
      status: 503,
      body: {
        error:
          "Online registration is being prepared. No payment has been taken. Please try again shortly.",
      },
    };
  }

  const supabase = createSupabaseClient(
    SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const loaded = await supabase
    .from("event_registrations")
    .select("id,event_id,email,access_token,stripe_session_id,status")
    .eq("access_token", token)
    .maybeSingle();
  if (loaded.error)
    return {
      status: 503,
      body: { error: "We could not load your registration. Please try again." },
    };
  const registration = loaded.data;
  if (!registration)
    return {
      status: 404,
      body: { error: "We could not find that registration." },
    };

  const eventResult = await supabase
    .from("events")
    .select(
      "id,slug,title,price_usd,is_published,registration_closed,date_confirmed,starts_at",
    )
    .eq("id", registration.event_id)
    .maybeSingle();
  const event = eventResult.data as EventCheckoutOffer | null;
  if (eventResult.error || !event)
    return { status: 404, body: { error: "The workshop could not be found." } };
  const portalUrl = `https://www.theleadflowpro.com/events/${event.slug}/confirmed?t=${encodeURIComponent(token)}`;
  if (
    ["paid", "attended", "no_show", "overbooked"].includes(registration.status)
  ) {
    return { status: 200, body: { url: portalUrl } };
  }
  if (registration.status !== "pending") {
    return {
      status: 409,
      body: {
        error:
          "This registration is closed. Please contact the workshop team before paying.",
      },
    };
  }

  const seats = await supabase.rpc("event_availability", {
    p_slug: event.slug,
  });
  const availability =
    !seats.error && (Array.isArray(seats.data) ? seats.data[0] : seats.data);
  const blocker = eventSaleBlocker(event, availability || null);
  if (blocker) return { status: 409, body: { error: blocker } };

  const stripe = async (
    path: string,
    init?: RequestInit,
  ): Promise<EventStripeSession> => {
    const response = await fetch(
      `https://api.stripe.com/v1/checkout/sessions${path}`,
      {
        ...init,
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
          ...init?.headers,
        },
      },
    );
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.id) {
      // Do not expose Stripe messages, customer details, or keys in logs/UI.
      throw new Error(
        "Secure checkout is temporarily unavailable. Your registration is saved; please try again.",
      );
    }
    return result as EventStripeSession;
  };

  try {
    const checkout = await getOrCreateEventCheckout(registration, event, {
      retrieve: (id) =>
        stripe(`/${encodeURIComponent(id)}?expand%5B%5D=payment_intent`),
      create: (params, idempotencyKey) =>
        stripe("", {
          method: "POST",
          headers: { "Idempotency-Key": idempotencyKey },
          body: params.toString(),
        }),
      persist: async (id, previousId) => {
        let update = supabase
          .from("event_registrations")
          .update({
            stripe_session_id: id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", registration.id)
          .eq("status", "pending");
        update = previousId
          ? update.eq("stripe_session_id", previousId)
          : update.is("stripe_session_id", null);
        const saved = await update.select("id");
        if (saved.error)
          throw new Error(
            "Your checkout could not be saved. Please try again before paying.",
          );
        if (!saved.data?.length) {
          // Concurrent retries use the same Stripe key. Accept only the same
          // persisted session; never overwrite a newer attempt or paid seat.
          const current = await supabase
            .from("event_registrations")
            .select("stripe_session_id")
            .eq("id", registration.id)
            .single();
          if (current.error || current.data?.stripe_session_id !== id) {
            throw new Error(
              "Your registration changed while checkout opened. Please reload your registration.",
            );
          }
        }
      },
    });
    return { status: 200, body: { url: checkout.url } };
  } catch (error) {
    return {
      status: 502,
      body: {
        error:
          error instanceof Error
            ? error.message
            : "Secure checkout could not open. Please try again.",
      },
    };
  }
}
