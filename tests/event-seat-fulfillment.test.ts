import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureEventSeatPaid } from "../lib/eventSeatFulfillment.ts";

function fixture() {
  const registration = {
    id: "registration-one",
    event_id: "event-one",
    status: "pending",
    stripe_session_id: "cs_one",
    full_name: "Workshop Test",
    email: "attendee@example.test",
    business_name: null,
    bottleneck: null,
    access_token: "a".repeat(48),
    seat_number: null as number | null,
    confirmation_sent_at: null as string | null,
    events: {
      id: "event-one",
      slug: "workshop",
      title: "Test workshop",
      starts_at: "2026-09-17T23:30:00Z",
      duration_minutes: 90,
      timezone: "America/Chicago",
      venue: "Test venue",
      city: "Longview",
      clinic_enabled: true,
      instructor_name: "Instructor",
    },
  };
  let claims = 0;
  const client = {
    from: () => {
      let patch: Record<string, unknown> | null = null;
      const query = {
        select: () => query,
        eq: () => query,
        update: (value: Record<string, unknown>) => {
          patch = value;
          return query;
        },
        single: async () => ({ data: { ...registration }, error: null }),
        then: (resolve: (value: unknown) => unknown) => {
          if (patch) Object.assign(registration, patch);
          return Promise.resolve({
            data: [{ id: registration.id }],
            error: null,
          }).then(resolve);
        },
      };
      return query;
    },
    rpc: async (name: string) => {
      if (name === "claim_event_seat") {
        claims++;
        registration.status = "paid";
        registration.seat_number = 1;
        return {
          data: [{ seat_status: "paid", assigned_seat: 1 }],
          error: null,
        };
      }
      return {
        data: [
          {
            exact_address: "Test arrival instructions",
            arrival_notes: "Bring laptop",
          },
        ],
        error: null,
      };
    },
  } as unknown as SupabaseClient;
  const session = {
    id: "cs_one",
    amount_total: 9700,
    currency: "usd",
    payment_status: "paid",
    metadata: {
      kind: "event",
      registration_id: registration.id,
      event_id: registration.event_id,
      ticket_amount_cents: "9700",
    },
  };
  return { client, registration, session, claims: () => claims };
}

describe("paid workshop fulfillment with mocked providers", () => {
  it("records the seat but leaves delivery retryable when email configuration is missing", async () => {
    const originalKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    try {
      const f = fixture();
      await assert.rejects(
        ensureEventSeatPaid(f.client, f.session),
        /not configured/,
      );
      assert.equal(f.registration.status, "paid");
      assert.equal(f.registration.confirmation_sent_at, null);
    } finally {
      if (originalKey === undefined) delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = originalKey;
    }
  });
  it("retries a partial send with stable provider keys and marks only after both accepts", async () => {
    const originalKey = process.env.RESEND_API_KEY;
    const originalFetch = globalThis.fetch;
    process.env.RESEND_API_KEY = "fake-test-provider-key";
    const accepted = new Set<string>();
    const attempts: string[] = [];
    let rejectAttendeeOnce = true;
    globalThis.fetch = async (_input, init) => {
      const key = new Headers(init?.headers).get("Idempotency-Key")!;
      assert.ok(key);
      attempts.push(key);
      if (key.endsWith(":attendee") && rejectAttendeeOnce) {
        rejectAttendeeOnce = false;
        return new Response("{}", { status: 429 });
      }
      accepted.add(key);
      return new Response('{"id":"mock-email"}', { status: 200 });
    };
    try {
      const f = fixture();
      await assert.rejects(
        ensureEventSeatPaid(f.client, f.session),
        /not accepted/,
      );
      assert.equal(f.registration.confirmation_sent_at, null);
      await ensureEventSeatPaid(f.client, f.session);
      assert.ok(f.registration.confirmation_sent_at);
      assert.equal(accepted.size, 2);
      assert.equal(attempts[0], attempts[2]);
      assert.equal(attempts[1], attempts[3]);
      await ensureEventSeatPaid(f.client, f.session);
      assert.equal(attempts.length, 4);
    } finally {
      globalThis.fetch = originalFetch;
      if (originalKey === undefined) delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = originalKey;
    }
  });
  it("never claims a seat for an unpaid checkout", async () => {
    const f = fixture();
    await assert.rejects(
      ensureEventSeatPaid(f.client, { ...f.session, payment_status: "unpaid" }),
      /has not cleared/,
    );
    assert.equal(f.claims(), 0);
  });
  it("rejects a different paid session before claiming or sending", async () => {
    const f = fixture();
    await assert.rejects(
      ensureEventSeatPaid(f.client, { ...f.session, id: "cs_duplicate" }),
      /payment review/,
    );
    assert.equal(f.claims(), 0);
    assert.equal(f.registration.status, "pending");
  });
});
