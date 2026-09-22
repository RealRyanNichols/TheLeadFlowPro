import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ADS_CENTS, CAPACITY, ENDS_AT, PRICE_CENTS, PURCHASE_KIND, SERVICE_CENTS, STARTS_AT,
  canReleaseFailedSpecialPayment, paidSpecialReservation, parseSpecialProspect, specialStatus,
} from "../lib/septemberSpecial.ts";

const requestId = "33333333-3333-4333-8333-333333333333";
const prospect = {
  request_id: requestId, full_name: "Test Owner", email: "OWNER@EXAMPLE.COM",
  phone: "903-555-0100", business_name: "Test Business", business_city: "Longview",
  offer_terms_accepted: true, within_service_area: true,
};

describe("September special purchase boundaries", () => {
  it("charges $1,497 once with an exact $500/$997 split", () => {
    assert.equal(PRICE_CENTS, 149700);
    assert.equal(ADS_CENTS, 50000);
    assert.equal(SERVICE_CENTS, 99700);
    assert.equal(ADS_CENTS + SERVICE_CENTS, PRICE_CENTS);
    assert.equal(CAPACITY, 5);
  });
  it("opens inclusively at 6pm Central and blocks new checkout at the deadline", () => {
    assert.equal(specialStatus(Date.parse(STARTS_AT) - 1, 5), "upcoming");
    assert.equal(specialStatus(Date.parse(STARTS_AT), 5), "open");
    assert.equal(specialStatus(Date.parse(ENDS_AT) - 1, 1), "open");
    assert.equal(specialStatus(Date.parse(ENDS_AT), 5), "expired");
    assert.equal(specialStatus(Date.parse(ENDS_AT) + 1, 0), "expired");
    assert.equal(specialStatus(Date.parse(STARTS_AT), 0), "sold_out");
  });
  it("validates intake without inventing marketing or SMS consent", () => {
    const parsed = parseSpecialProspect(prospect);
    assert.equal(parsed?.email, "owner@example.com");
    assert.equal(parsed?.marketing_email_consent, false);
    assert.equal(parseSpecialProspect({ ...prospect, marketing_email_consent: "true" })?.marketing_email_consent, false);
    assert.equal(parseSpecialProspect({ ...prospect, offer_terms_accepted: false }), null);
    assert.equal(parseSpecialProspect({ ...prospect, within_service_area: false }), null);
    assert.equal(parseSpecialProspect({ ...prospect, request_id: "invalid" }), null);
    assert.equal(parseSpecialProspect({ ...prospect, email: "not-an-email" }), null);
    assert.equal(parseSpecialProspect({ ...prospect, website_url: "javascript:alert(1)" }), null);
    assert.equal(parseSpecialProspect({ ...prospect, phone: "123" }), null);
  });
  it("rejects unpaid, wrong amount, currency, subscription and unrelated signed sessions", () => {
    const session = {
      id: "cs_test_valid", mode: "payment", status: "complete", payment_status: "paid",
      amount_total: PRICE_CENTS, currency: "usd",
      metadata: { kind: PURCHASE_KIND, reservation_id: requestId },
    };
    assert.equal(paidSpecialReservation(session), requestId);
    for (const patch of [
      { amount_total: 1000 }, { amount_total: "149700" }, { currency: "eur" },
      { mode: "subscription" }, { payment_status: "unpaid" }, { status: "open" },
      { metadata: { kind: "other", reservation_id: requestId } },
      { metadata: { kind: PURCHASE_KIND, reservation_id: "invalid" } },
    ]) assert.equal(paidSpecialReservation({ ...session, ...patch }), null);
  });
  it("keeps pending BNPL capacity and never frees a paid slot on a late failure", () => {
    const pending = { status: "complete", payment_status: "unpaid", metadata: { kind: PURCHASE_KIND } };
    assert.equal(canReleaseFailedSpecialPayment(pending, { status: "processing" }), false);
    assert.equal(canReleaseFailedSpecialPayment(pending, { status: "requires_action" }), false);
    assert.equal(canReleaseFailedSpecialPayment(pending, { status: "requires_payment_method" }), false);
    assert.equal(canReleaseFailedSpecialPayment(pending, { status: "requires_payment_method", last_payment_error: { code: "payment_failed" } }), true);
    assert.equal(canReleaseFailedSpecialPayment(pending, { status: "canceled" }), true);
    assert.equal(canReleaseFailedSpecialPayment({ ...pending, payment_status: "paid" }, { status: "canceled" }), false);
  });
});
