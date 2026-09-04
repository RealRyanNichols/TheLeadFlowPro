import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  deliverEventConfirmation,
  eventSaleBlocker,
  getOrCreateEventCheckout,
  isCheckoutPaymentEvent,
  missingEventPaymentConfig,
  validateEventPayment,
  type EventStripeSession,
} from "../lib/eventPayments.ts";

const offer = {
  id: "event-one",
  slug: "workshop",
  title: "Hands-on workshop",
  price_usd: 97,
  is_published: true,
  registration_closed: false,
  date_confirmed: true,
  starts_at: "2026-09-17T23:30:00Z",
};
const registration = {
  id: "registration-one",
  email: "attendee@example.test",
  access_token: "a".repeat(48),
  stripe_session_id: null as string | null,
};
const session = (
  patch: Partial<EventStripeSession> = {},
): EventStripeSession => ({
  id: "cs_one",
  status: "open",
  url: "https://checkout.stripe.com/c/pay/cs_one",
  amount_total: 9700,
  currency: "usd",
  payment_status: "unpaid",
  metadata: {
    kind: "event",
    registration_id: registration.id,
    event_id: offer.id,
    ticket_amount_cents: "9700",
  },
  ...patch,
});

describe("workshop launch and fulfillment rules", () => {
  it("requires all four fulfillment settings before accepting checkout", () => {
    assert.equal(
      missingEventPaymentConfig({ STRIPE_SECRET_KEY: "configured" }).length,
      3,
    );
    assert.equal(
      missingEventPaymentConfig({ STRIPE_SECRET_KEY: " [SENSITIVE] " }).length,
      4,
    );
    assert.deepEqual(
      missingEventPaymentConfig({
        STRIPE_SECRET_KEY: "key",
        STRIPE_WEBHOOK_SECRET: "signing",
        SUPABASE_SERVICE_ROLE_KEY: "service",
        RESEND_API_KEY: "email",
      }),
      [],
    );
  });
  it("distinguishes closure, sell-out, missing availability, and an ended date", () => {
    const open = { sold_out: false, registration_open: true };
    const now = Date.parse("2026-09-04T18:00:00Z");
    assert.equal(eventSaleBlocker(offer, open, now), null);
    assert.match(
      eventSaleBlocker({ ...offer, registration_closed: true }, open, now)!,
      /not open/,
    );
    assert.match(
      eventSaleBlocker(
        offer,
        { sold_out: true, registration_open: false },
        now,
      )!,
      /sold out/,
    );
    assert.match(eventSaleBlocker(offer, null, now)!, /could not confirm/);
    assert.match(
      eventSaleBlocker(offer, open, Date.parse("2026-09-18T00:00:00Z"))!,
      /ended/,
    );
    assert.match(
      eventSaleBlocker({ ...offer, date_confirmed: false }, open, now)!,
      /finalized/,
    );
  });
  it("fulfills instant and delayed success, but never pending or failed event types", () => {
    assert.equal(isCheckoutPaymentEvent("checkout.session.completed"), true);
    assert.equal(
      isCheckoutPaymentEvent("checkout.session.async_payment_succeeded"),
      true,
    );
    assert.equal(
      isCheckoutPaymentEvent("checkout.session.async_payment_failed"),
      false,
    );
    assert.equal(isCheckoutPaymentEvent("checkout.session.expired"), false);
  });
  it("rejects mismatched registrations, second paid sessions, and unsupported amounts", () => {
    const saved = {
      id: registration.id,
      event_id: offer.id,
      stripe_session_id: "cs_one",
      status: "pending",
    };
    assert.doesNotThrow(() => validateEventPayment(session(), saved));
    assert.throws(
      () => validateEventPayment(session({ id: "cs_other" }), saved),
      /payment review/,
    );
    assert.throws(
      () => validateEventPayment(session({ amount_total: 0 }), saved),
      /amount or currency/,
    );
    assert.throws(
      () => validateEventPayment(session({ amount_total: 9600 }), saved),
      /snapshot/,
    );
    assert.throws(
      () => validateEventPayment(session({ currency: "eur" }), saved),
      /amount or currency/,
    );
    assert.throws(
      () => validateEventPayment(session(), { ...saved, status: "refunded" }),
      /closed registration/,
    );
    assert.throws(
      () =>
        validateEventPayment(session(), { ...saved, event_id: "other-event" }),
      /does not match/,
    );
  });
});

describe("event checkout retries", () => {
  it("concurrent initial requests use one Stripe operation and persist before returning the payment URL", async () => {
    const operations = new Map<string, EventStripeSession>();
    const order: string[] = [];
    const create = async (params: URLSearchParams, key: string) => {
      assert.equal(params.get("customer_email"), registration.email);
      assert.equal(
        params.get("line_items[0][price_data][unit_amount]"),
        "9700",
      );
      assert.equal(params.has("allow_promotion_codes"), false);
      assert.equal(params.has("payment_method_types"), false);
      assert.equal(key.includes(registration.email), false);
      assert.equal(key.includes(registration.access_token), false);
      if (!operations.has(key)) operations.set(key, session());
      order.push("create");
      return operations.get(key)!;
    };
    const deps = {
      retrieve: async () => session(),
      create,
      persist: async () => {
        order.push("persist");
      },
    };
    const results = await Promise.all([
      getOrCreateEventCheckout(registration, offer, deps),
      getOrCreateEventCheckout(registration, offer, deps),
    ]);
    assert.equal(operations.size, 1);
    assert.equal(results[0].sessionId, results[1].sessionId);
    assert.equal(order.filter((v) => v === "persist").length, 2);
  });
  it("reuses an open saved session without creating another checkout", async () => {
    let creates = 0;
    const result = await getOrCreateEventCheckout(
      { ...registration, stripe_session_id: "cs_one" },
      offer,
      {
        retrieve: async () => session(),
        create: async () => {
          creates++;
          return session();
        },
        persist: async () => {},
      },
    );
    assert.equal(creates, 0);
    assert.equal(result.url, session().url);
  });
  it("sends a processing or paid session to the portal instead of taking another payment", async () => {
    for (const paymentStatus of ["unpaid", "paid"]) {
      const result = await getOrCreateEventCheckout(
        { ...registration, stripe_session_id: "cs_one" },
        offer,
        {
          retrieve: async () =>
            session({
              status: "complete",
              payment_status: paymentStatus,
              payment_intent: { status: "processing" },
            }),
          create: async () => {
            throw new Error("Must not create");
          },
          persist: async () => {},
        },
      );
      assert.match(result.url, /\/confirmed\?t=/);
    }
  });
  it("expired and failed sessions receive a stable next-attempt key", async () => {
    for (const previous of [
      session({ status: "expired" }),
      session({
        status: "complete",
        payment_intent: { status: "requires_payment_method" },
      }),
    ]) {
      let keyUsed = "";
      const result = await getOrCreateEventCheckout(
        { ...registration, stripe_session_id: "cs_one" },
        offer,
        {
          retrieve: async () => previous,
          create: async (_, key) => {
            keyUsed = key;
            return session({
              id: "cs_two",
              url: "https://checkout.stripe.com/c/pay/cs_two",
            });
          },
          persist: async (id, previousId) => {
            assert.equal(id, "cs_two");
            assert.equal(previousId, "cs_one");
          },
        },
      );
      assert.equal(keyUsed, `workshop:${registration.id}:cs_one`);
      assert.equal(result.sessionId, "cs_two");
    }
  });
  it("does not return a payable URL when persistence fails; a retry uses the same key", async () => {
    const keys: string[] = [];
    const deps = {
      retrieve: async () => session(),
      create: async (_: URLSearchParams, key: string) => {
        keys.push(key);
        return session();
      },
      persist: async () => {
        throw new Error("Database unavailable");
      },
    };
    await assert.rejects(
      getOrCreateEventCheckout(registration, offer, deps),
      /Database unavailable/,
    );
    await assert.rejects(
      getOrCreateEventCheckout(registration, offer, deps),
      /Database unavailable/,
    );
    assert.equal(keys[0], keys[1]);
  });
  it("fails closed for a changed amount, foreign session, or non-Stripe URL", async () => {
    for (const invalid of [
      session({ amount_total: 5000 }),
      session({
        metadata: {
          kind: "event",
          registration_id: "other",
          event_id: offer.id,
        },
      }),
      session({ url: "https://example.test/pay" }),
    ]) {
      await assert.rejects(
        getOrCreateEventCheckout(
          { ...registration, stripe_session_id: "cs_one" },
          offer,
          {
            retrieve: async () => invalid,
            create: async () => session(),
            persist: async () => {},
          },
        ),
      );
    }
  });
});

describe("confirmation delivery truth", () => {
  it("missing configuration never sends or marks confirmation", async () => {
    const calls: string[] = [];
    await assert.rejects(
      deliverEventConfirmation({
        alreadySent: false,
        configured: false,
        sendInternal: async () => {
          calls.push("internal");
        },
        sendAttendee: async () => {
          calls.push("attendee");
        },
        markSent: async () => {
          calls.push("marked");
        },
      }),
      /not configured/,
    );
    assert.deepEqual(calls, []);
  });
  it("provider failure prevents a false success marker", async () => {
    const calls: string[] = [];
    await assert.rejects(
      deliverEventConfirmation({
        alreadySent: false,
        configured: true,
        sendInternal: async () => {
          calls.push("internal");
        },
        sendAttendee: async () => {
          calls.push("attendee");
          throw new Error("Resend 429");
        },
        markSent: async () => {
          calls.push("marked");
        },
      }),
      /Resend 429/,
    );
    assert.deepEqual(calls, ["internal", "attendee"]);
  });
  it("marks only after both accepts and skips an already-confirmed retry", async () => {
    const calls: string[] = [];
    const deps = {
      configured: true,
      sendInternal: async () => {
        calls.push("internal");
      },
      sendAttendee: async () => {
        calls.push("attendee");
      },
      markSent: async () => {
        calls.push("marked");
      },
    };
    await deliverEventConfirmation({ ...deps, alreadySent: false });
    await deliverEventConfirmation({ ...deps, alreadySent: true });
    assert.deepEqual(calls, ["internal", "attendee", "marked"]);
  });
});
