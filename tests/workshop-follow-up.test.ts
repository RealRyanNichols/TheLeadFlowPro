import assert from "node:assert/strict";
import test from "node:test";
import { copyProblems } from "../lib/hq/copy.ts";
import { PRICES, usd } from "../lib/site/prices.ts";
import {
  WORKSHOP_FOLLOW_UP_SEQUENCE,
  WORKSHOP_FOLLOW_UP_STEPS,
  canSendWorkshopFollowUp,
  eligibleWorkshopFollowUpSteps,
  workshopFollowUpDedupeKey,
  type FollowUpContext,
} from "../lib/workshopFollowUp.ts";

const CTX: FollowUpContext = {
  first: "Dana",
  worksheetUrl: "https://www.theleadflowpro.com/downloads/worksheet-example.pdf",
  unsubscribeUrl: "https://www.theleadflowpro.com/unsubscribe?token=example",
};

test("the sequence is a documented, unactivated draft with three steps in the 300 range", () => {
  assert.equal(WORKSHOP_FOLLOW_UP_SEQUENCE.activated, false);
  assert.deepEqual(
    WORKSHOP_FOLLOW_UP_STEPS.map((s) => [s.step, s.key, s.day]),
    [
      [301, "same_night", 0],
      [302, "day_2", 2],
      [303, "day_7", 7],
    ],
  );
  for (const field of ["trigger", "eligibility", "exclusions", "stopConditions", "quietHours", "delivery", "owner", "analyticsEvent"] as const) {
    assert.ok(WORKSHOP_FOLLOW_UP_SEQUENCE[field].length > 10, field);
  }
});

test("every step passes the copy rules and stays short", () => {
  for (const step of WORKSHOP_FOLLOW_UP_STEPS) {
    const body = step.body(CTX);
    assert.deepEqual(copyProblems(`${step.subject}\n${body}`), [], `${step.key}: ${copyProblems(body).join("; ")}`);
    assert.ok(body.startsWith("Dana,"), step.key);
    assert.ok(body.length < 1600, `${step.key} runs long (${body.length} chars)`);
    assert.ok(body.includes("(903) 500-8898"), step.key);
    for (const banned of ["sold out", "% ", "roas", "guarantee", "testimonial"]) {
      assert.ok(!body.toLowerCase().includes(banned), `${step.key} says "${banned}"`);
    }
  }
});

test("marketing steps carry the unsubscribe link and the transactional step does not sell", () => {
  const [night, dayTwo, daySeven] = WORKSHOP_FOLLOW_UP_STEPS;
  assert.equal(night.kind, "transactional");
  assert.ok(!night.body(CTX).includes("Unsubscribe:"));
  assert.ok(!night.body(CTX).includes("$"));
  assert.ok(night.body(CTX).includes(CTX.worksheetUrl!));
  for (const step of [dayTwo, daySeven]) {
    assert.equal(step.kind, "marketing");
    assert.ok(step.body(CTX).includes(`Unsubscribe: ${CTX.unsubscribeUrl}`), step.key);
  }
});

test("the day-2 email makes exactly one offer, priced from the registry", () => {
  const dayTwo = WORKSHOP_FOLLOW_UP_STEPS[1];
  const content = dayTwo.body({ ...CTX, dayTwoOffer: "content_engine" });
  assert.ok(content.includes(usd(PRICES.freeBuildContentEngine)));
  assert.ok(!content.includes(usd(PRICES.websiteLaunchTotal)));
  assert.equal((content.match(/\$/g) ?? []).length, 1);

  const launch = dayTwo.body({ ...CTX, dayTwoOffer: "website_launch" });
  assert.ok(launch.includes(usd(PRICES.websiteLaunchTotal)));
  assert.ok(launch.includes(usd(PRICES.websiteLaunchDeposit)));
  assert.ok(!launch.includes(usd(PRICES.freeBuildContentEngine)));
});

test("the same-night step cannot send without the worksheet link", () => {
  const night = WORKSHOP_FOLLOW_UP_STEPS[0];
  assert.equal(canSendWorkshopFollowUp(night, CTX), true);
  assert.equal(canSendWorkshopFollowUp(night, { ...CTX, worksheetUrl: null }), false);
  assert.equal(canSendWorkshopFollowUp(night, { ...CTX, worksheetUrl: "   " }), false);
  const dayTwo = WORKSHOP_FOLLOW_UP_STEPS[1];
  assert.equal(canSendWorkshopFollowUp(dayTwo, { ...CTX, unsubscribeUrl: "" }), false);
});

test("eligibility honours attendance, consent, unsubscribe, replies, purchases, and the event state", () => {
  const base = {
    registrationStatus: "attended",
    email: "dana@example.com",
    marketingConsent: true,
    unsubscribed: false,
    doNotContact: false,
    replied: false,
    purchasedDayTwoOffer: false,
    handledByRyan: false,
    eventIsPast: true,
  };
  assert.deepEqual(eligibleWorkshopFollowUpSteps(base).map((s) => s.step), [301, 302, 303]);
  assert.deepEqual(eligibleWorkshopFollowUpSteps({ ...base, marketingConsent: false }).map((s) => s.step), [301]);
  assert.deepEqual(eligibleWorkshopFollowUpSteps({ ...base, unsubscribed: true }).map((s) => s.step), [301]);
  assert.deepEqual(eligibleWorkshopFollowUpSteps({ ...base, purchasedDayTwoOffer: true }).map((s) => s.step), [301, 303]);
  for (const status of ["paid", "no_show", "cancelled", "refunded", "transferred", "overbooked", "pending"]) {
    assert.deepEqual(eligibleWorkshopFollowUpSteps({ ...base, registrationStatus: status }), [], status);
  }
  assert.deepEqual(eligibleWorkshopFollowUpSteps({ ...base, eventIsPast: false }), []);
  assert.deepEqual(eligibleWorkshopFollowUpSteps({ ...base, replied: true }), []);
  assert.deepEqual(eligibleWorkshopFollowUpSteps({ ...base, doNotContact: true }), []);
  assert.deepEqual(eligibleWorkshopFollowUpSteps({ ...base, handledByRyan: true }), []);
  assert.deepEqual(eligibleWorkshopFollowUpSteps({ ...base, email: null }), []);
});

test("the dedupe key is unique per attendee and step and carries the template version", () => {
  const a = workshopFollowUpDedupeKey("reg-1", 301);
  const b = workshopFollowUpDedupeKey("reg-1", 302);
  const c = workshopFollowUpDedupeKey("reg-2", 301);
  assert.notEqual(a, b);
  assert.notEqual(a, c);
  assert.ok(a.startsWith("workshop-follow-up-v1:chatgpt-for-business-owners-longview:"));
});
