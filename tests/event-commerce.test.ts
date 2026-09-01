import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  normalizeWorkshopError,
  workshopCalendarUrl,
  workshopSalesReadiness,
  type WorkshopEventRow,
  type WorkshopPolicies,
} from "../lib/eventCommerce.ts";

const EVENT: WorkshopEventRow = {
  id: "44a7f680-1693-48f2-9ba6-0555645878fc",
  slug: "east-texas-ai-operator-workshop",
  title: "ChatGPT for Business Owners: Live in Longview",
  description: null,
  venue: "The LeadFlow Pro at Premier Dental Academy of Longview",
  city: "Longview, Texas",
  starts_at: "2026-09-10T23:30:00.000Z",
  duration_minutes: 90,
  price_usd: 97,
  capacity: 10,
  is_published: true,
  sales_status: "draft",
  instructor_name: "Ryan Nichols",
};

const POLICIES: WorkshopPolicies = {
  exact_address: "Private paid-attendee address",
  recording_consent_text: "Recording terms approved.",
  cancellation_policy: "Cancellation terms approved.",
  seat_transfer_policy: "Seat transfer terms approved.",
};

describe("workshop sales readiness", () => {
  const now = new Date("2026-09-01T12:00:00.000Z");

  it("blocks an unpublished event", () => {
    const result = workshopSalesReadiness({ ...EVENT, is_published: false }, POLICIES, now);
    assert.equal(result.ready, false);
    assert.ok(result.blockers.includes("Publish the event"));
  });

  it("blocks an undated or past event", () => {
    assert.ok(workshopSalesReadiness({ ...EVENT, starts_at: null }, POLICIES, now).blockers.includes("Set a future date"));
    assert.ok(workshopSalesReadiness({ ...EVENT, starts_at: "2026-08-31T23:30:00.000Z" }, POLICIES, now).blockers.includes("Set a future date"));
  });

  it("blocks zero, negative, and invalid prices", () => {
    for (const price of [0, -97, Number.NaN]) {
      assert.ok(workshopSalesReadiness({ ...EVENT, price_usd: price }, POLICIES, now).blockers.includes("Set a valid paid ticket price"));
    }
  });

  it("blocks incomplete buyer policies", () => {
    const result = workshopSalesReadiness(EVENT, { ...POLICIES, cancellation_policy: "" }, now);
    assert.equal(result.ready, false);
    assert.ok(result.blockers.includes("Finish cancellation policy"));
  });

  it("blocks sales without a private arrival address", () => {
    const result = workshopSalesReadiness(EVENT, { ...POLICIES, exact_address: "" }, now);
    assert.ok(result.blockers.includes("Set the private arrival address"));
  });

  it("allows a fully configured future event to be opened by an admin", () => {
    assert.deepEqual(workshopSalesReadiness(EVENT, POLICIES, now), { ready: true, blockers: [] });
  });
});

describe("workshop payment and privacy safeguards", () => {
  const commerceSql = readFileSync("supabase/migrations/20260825194939_workshop_event_commerce.sql", "utf8");
  const hardeningSql = readFileSync("supabase/migrations/20260901084011_workshop_admin_and_fulfillment_hardening.sql", "utf8");
  const webhook = readFileSync("app/api/stripe-webhook/route.ts", "utf8");
  const publicPage = readFileSync("app/events/[slug]/page.tsx", "utf8");

  it("serializes seat claims and fails closed when the final seat is gone", () => {
    assert.match(commerceSql, /for update/i);
    assert.match(commerceSql, /sold_out/i);
    assert.match(commerceSql, /hold_expires_at/i);
  });

  it("keeps repeated Stripe fulfillment idempotent", () => {
    assert.match(commerceSql, /stripe_checkout_session_id = p_stripe_checkout_session_id/i);
    assert.match(webhook, /workshop_registration:/);
    assert.match(webhook, /23505/);
  });

  it("releases expired Stripe Checkout holds", () => {
    assert.match(webhook, /checkout\.session\.expired/);
    assert.match(webhook, /workshop_release_hold/);
  });

  it("keeps private details behind service-only RPCs", () => {
    assert.match(commerceSql, /grant execute on function public\.workshop_confirmation_details\(uuid\)[\s\S]*to service_role/i);
    assert.match(hardeningSql, /from public, anon, authenticated/);
    assert.doesNotMatch(publicPage, /2800 Gilmer/i);
  });

  it("does not grant automatic sales SMS consent", () => {
    assert.match(webhook, /sms_consent: false/);
    assert.doesNotMatch(webhook, /sendSms|sendSMS|sales text/i);
  });
});

describe("workshop attendee helpers", () => {
  it("maps sold-out and closed registrations to safe responses", () => {
    assert.deepEqual(normalizeWorkshopError("sold_out"), { status: 409, message: "This workshop is sold out." });
    assert.deepEqual(normalizeWorkshopError("workshop_not_open"), { status: 409, message: "Registration is not open yet." });
  });

  it("includes the optional clinic in the calendar duration", () => {
    const url = workshopCalendarUrl(EVENT);
    assert.ok(url);
    const dates = new URL(url).searchParams.get("dates");
    assert.equal(dates, "20260910T233000Z/20260911T013000Z");
  });
});
