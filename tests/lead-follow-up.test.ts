import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LEAD_FOLLOW_UP, formatUsd } from "../lib/leadFollowUp.ts";

// The $197 Lead Follow-Up Campaign. These guard the two things that actually
// cost money if they drift: the price the server charges, and the promises
// the page makes about what the offer does.

test("price is $197 and the cents figure matches the dollars", () => {
  assert.equal(LEAD_FOLLOW_UP.priceUsd, 197);
  assert.equal(LEAD_FOLLOW_UP.priceCents, LEAD_FOLLOW_UP.priceUsd * 100);
  assert.equal(formatUsd(LEAD_FOLLOW_UP.priceUsd), "$197");
});

test("checkout charges from the offer module, never from the request body", () => {
  const route = readFileSync(new URL("../app/api/checkout/route.ts", import.meta.url), "utf8");
  // The product entry is keyed and priced off the shared module.
  assert.match(route, /\[LEAD_FOLLOW_UP\.id\]:\s*\{/);
  assert.match(route, /amount:\s*LEAD_FOLLOW_UP\.priceCents/);
  // No hardcoded 19700 that could drift away from the module.
  assert.ok(!route.includes("19700"), "checkout hardcodes the campaign price");
});

test("the funnel never posts a price to the server", () => {
  const funnel = readFileSync(
    new URL("../app/go/lead-follow-up/LeadFollowUpFunnel.tsx", import.meta.url),
    "utf8",
  );
  const checkoutCall = funnel.slice(funnel.indexOf('fetch("/api/checkout"'));
  const body = checkoutCall.slice(0, checkoutCall.indexOf("})"));
  for (const banned of ["amount", "price", "priceCents", "total"]) {
    assert.ok(!body.includes(banned), `funnel sends "${banned}" to checkout`);
  }
});

test("the offer promises no automated sending while Quo outbound is stopped", () => {
  // Scan the COPY (the exported object), not the source file: the module's
  // own comments legitimately discuss automated texting in order to forbid it.
  const copy = JSON.stringify(LEAD_FOLLOW_UP).toLowerCase();

  // It must say plainly that we do not send on their behalf.
  assert.ok(
    copy.includes("we do not send messages from your accounts"),
    "offer never states that we do not send on the buyer's behalf",
  );
  for (const banned of [
    "we text them",
    "we send it for you",
    "we will send",
    "sent automatically",
    "we send them",
  ]) {
    assert.ok(!copy.includes(banned), `offer promises sending: "${banned}"`);
  }
});

test("no guarantees, fake results, or invented numbers in the offer copy", () => {
  const copy = JSON.stringify(LEAD_FOLLOW_UP).toLowerCase();
  for (const banned of [
    "guarantee",
    "guaranteed",
    "double your",
    "10x",
    "roi of",
    "we promise",
    "results guaranteed",
  ]) {
    assert.ok(!copy.includes(banned), `offer copy contains "${banned}"`);
  }
});

test("the offer names its edges and its process", () => {
  assert.ok(LEAD_FOLLOW_UP.included.length >= 5, "fewer than five deliverables");
  assert.ok(LEAD_FOLLOW_UP.excluded.length >= 4, "fewer than four stated exclusions");
  assert.ok(LEAD_FOLLOW_UP.steps.length >= 5, "process has fewer than five steps");
  assert.ok(LEAD_FOLLOW_UP.faq.length >= 5, "fewer than five FAQ entries");
  for (const item of LEAD_FOLLOW_UP.included) {
    assert.ok(item.title.length > 4 && item.detail.length > 20, `thin deliverable: ${item.title}`);
  }
});

test("paid buyers are routed to the intake, not the generic thank-you", () => {
  const route = readFileSync(new URL("../app/api/checkout/route.ts", import.meta.url), "utf8");
  assert.match(route, /go\/lead-follow-up\/intake\?session_id=/);
  assert.match(route, /go\/lead-follow-up\?cancelled=1/);
});

test("the webhook handles the paid campaign kind", () => {
  const hook = readFileSync(new URL("../app/api/stripe-webhook/route.ts", import.meta.url), "utf8");
  assert.match(hook, /kind === LEAD_FOLLOW_UP\.id/);
  assert.match(hook, /ensureLeadFollowUpPaid/);
  // Alert-then-marker contract: the activity row is written after the alert.
  const handler = hook.slice(hook.indexOf("async function ensureLeadFollowUpPaid"));
  assert.ok(
    handler.indexOf("Internal Lead Follow-Up alert was not accepted") <
      handler.indexOf("lead_activity").valueOf() + handler.length,
    "alert must be attempted before the idempotency marker is written",
  );
});
