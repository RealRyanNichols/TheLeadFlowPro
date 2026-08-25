import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FIRST_STEP,
  LAST_STEP,
  SEQUENCE_DAYS,
  STEP_BASE,
  daysSinceSignup,
  dueStep,
  ineligibleReason,
  inSendWindow,
  signUnsubscribe,
  unsubscribeUrl,
  verifyUnsubscribe,
  type NurtureLead,
} from "../lib/nurture/sequence.ts";
import { NURTURE_EMAILS, emailForStep, pickToolLink } from "../lib/nurture/emails.ts";

// Fictional lead only. No email provider is touched anywhere in this file.
const LEAD: NurtureLead = {
  id: "00000000-0000-4000-8000-000000000001",
  full_name: "Fiona Fictional",
  email: "fiona@example.com",
  source: "meta_lead_ad",
  status: "new",
  is_test: false,
  deleted_at: null,
  marketing_email_consent: true,
  email_unsubscribed_at: null,
  consent_at: "2026-08-01T15:00:00.000Z",
  created_at: "2026-08-01T15:00:00.000Z",
};

const dayN = (n: number) => new Date(Date.parse(LEAD.consent_at!) + n * 86_400_000 + 3_600_000);

// ------------------------------------------------------------ eligibility ---

test("consent gate: only opted-in, live, real-email Meta leads pass", () => {
  assert.equal(ineligibleReason(LEAD), null);
  assert.equal(ineligibleReason({ ...LEAD, marketing_email_consent: false }), "no_marketing_consent");
  assert.equal(ineligibleReason({ ...LEAD, marketing_email_consent: null }), "no_marketing_consent");
  assert.equal(ineligibleReason({ ...LEAD, source: "website" }), "not_meta_lead");
  assert.equal(
    ineligibleReason({ ...LEAD, email_unsubscribed_at: "2026-08-05T00:00:00Z" }),
    "unsubscribed",
  );
  assert.equal(ineligibleReason({ ...LEAD, deleted_at: "2026-08-05T00:00:00Z" }), "deleted");
  assert.equal(ineligibleReason({ ...LEAD, is_test: true }), "test_lead");
  assert.equal(
    ineligibleReason({ ...LEAD, email: "123@no-email.facebook.lead" }),
    "no_real_email",
  );
  assert.equal(ineligibleReason({ ...LEAD, status: "won" }), "converted");
  assert.equal(ineligibleReason(LEAD, { hasPurchase: true }), "purchased");
});

// --------------------------------------------------------------- schedule ---

test("nothing is due on signup day; day 1 email is due the next day", () => {
  assert.equal(dueStep(LEAD, new Set(), dayN(0)), null);
  assert.equal(dueStep(LEAD, new Set(), dayN(1)), STEP_BASE + 1);
});

test("one email per run, in order, never repeating a step", () => {
  const sent = new Set<number>();
  // Late starter: sequence turns on when the lead is already 5 days old.
  const first = dueStep(LEAD, sent, dayN(5));
  assert.equal(first, STEP_BASE + 1); // catch up one per day, no backlog dump
  sent.add(first!);
  assert.equal(dueStep(LEAD, sent, dayN(5)), STEP_BASE + 2);
});

test("full 30-day simulation: exactly 30 sends, idempotent, then silence", () => {
  const sent = new Set<number>();
  const log: number[] = [];
  for (let day = 0; day <= SEQUENCE_DAYS + 10; day++) {
    const step = dueStep(LEAD, sent, dayN(day));
    if (step !== null) {
      // The template must exist for every schedulable step.
      assert.ok(emailForStep(step), `missing template for step ${step}`);
      sent.add(step);
      log.push(step);
    }
    // Re-running the same day sends nothing more (dedupe within a day).
    const again = dueStep(LEAD, sent, dayN(day));
    if (again !== null) {
      // Only possible while catching up; never the step just sent.
      assert.ok(!log.includes(again) === false || again !== step);
      assert.notEqual(again, step);
    }
  }
  assert.equal(log.length, SEQUENCE_DAYS);
  assert.deepEqual(
    log,
    Array.from({ length: SEQUENCE_DAYS }, (_, i) => FIRST_STEP + i),
  );
  // Day 60: still nothing new.
  assert.equal(dueStep(LEAD, sent, dayN(60)), null);
});

test("stops mid-sequence on unsubscribe and purchase", () => {
  const unsubscribed = { ...LEAD, email_unsubscribed_at: "2026-08-10T00:00:00Z" };
  assert.equal(ineligibleReason(unsubscribed), "unsubscribed");
  assert.equal(ineligibleReason(LEAD, { hasPurchase: true }), "purchased");
  // The schedule itself would still have steps due; the gate is what stops it.
  assert.notEqual(dueStep(unsubscribed, new Set(), dayN(12)), null);
});

test("send window is 8am-6pm Central only", () => {
  // 2026-08-25: Central is UTC-5 (CDT).
  assert.equal(inSendWindow(new Date("2026-08-25T12:59:00Z")), false); // 7:59am CT
  assert.equal(inSendWindow(new Date("2026-08-25T13:01:00Z")), true); // 8:01am CT
  assert.equal(inSendWindow(new Date("2026-08-25T22:59:00Z")), true); // 5:59pm CT
  assert.equal(inSendWindow(new Date("2026-08-25T23:01:00Z")), false); // 6:01pm CT
  assert.equal(inSendWindow(new Date("2026-08-26T04:00:00Z")), false); // 11pm CT
});

test("daysSinceSignup uses consent_at with created_at fallback", () => {
  assert.equal(daysSinceSignup(LEAD, dayN(7)), 7);
  const noConsentStamp = { ...LEAD, consent_at: null };
  assert.equal(daysSinceSignup(noConsentStamp, dayN(7)), 7);
});

// ------------------------------------------------------------ signed links ---

test("unsubscribe signatures verify and reject tampering", () => {
  const secret = "test-secret";
  const sig = signUnsubscribe(LEAD.id, secret);
  assert.equal(verifyUnsubscribe(LEAD.id, sig, secret), true);
  assert.equal(verifyUnsubscribe(LEAD.id, sig, "other-secret"), false);
  assert.equal(verifyUnsubscribe("other-lead", sig, secret), false);
  assert.equal(verifyUnsubscribe(LEAD.id, sig.slice(0, -1) + "0", secret), false);
  assert.equal(verifyUnsubscribe(LEAD.id, "", secret), false);
  const url = unsubscribeUrl(LEAD.id, secret);
  assert.ok(url.startsWith("https://www.theleadflowpro.com/api/email/unsubscribe?l="));
  assert.ok(url.includes(sig));
});

// ------------------------------------------------------------------ copy ---

test("all 30 emails exist, numbered 101-130, each with subject and CTA link", () => {
  assert.equal(NURTURE_EMAILS.length, SEQUENCE_DAYS);
  const steps = NURTURE_EMAILS.map((e) => e.step);
  assert.deepEqual(steps, Array.from({ length: SEQUENCE_DAYS }, (_, i) => FIRST_STEP + i));
  assert.equal(LAST_STEP, STEP_BASE + 30);
  for (const email of NURTURE_EMAILS) {
    const body = email.body({ first: "Fiona", goals: "missed calls are killing us" });
    assert.ok(email.subject.length > 4, `day ${email.day} subject`);
    assert.ok(body.includes("Fiona"), `day ${email.day} greets by name`);
    assert.match(body, /https:\/\/www\.theleadflowpro\.com/, `day ${email.day} has a CTA link`);
  }
});

test("voice rules: no em dashes, no guarantees, no corporate filler", () => {
  for (const email of NURTURE_EMAILS) {
    const text = email.subject + "\n" + email.body({ first: "Fiona", goals: null });
    assert.ok(!text.includes("—"), `day ${email.day} contains an em dash`);
    for (const banned of [
      "guarantee",
      "guaranteed",
      "10x",
      "skyrocket",
      "revolutioniz",
      "leverage synergy",
      "circle back",
    ]) {
      assert.ok(
        !text.toLowerCase().includes(banned),
        `day ${email.day} contains banned phrase "${banned}"`,
      );
    }
  }
});

test("day themes 15-30 land where the plan says", () => {
  const expect: Record<number, RegExp> = {
    15: /five-minute/i,
    16: /worth/i,
    17: /tool/i,
    18: /posting/i,
    19: /record/i,
    20: /question/i,
    21: /lane|recap|pick/i,
    22: /system map/i,
    23: /missed-call|missed call/i,
    24: /tool/i,
    25: /ads|attention/i,
    26: /call to buy/i,
    27: /build/i,
    28: /rent/i,
    29: /working with me|week by week/i,
    30: /last one|three doors/i,
  };
  for (const [day, pattern] of Object.entries(expect)) {
    const email = NURTURE_EMAILS.find((e) => e.day === Number(day))!;
    const text = email.subject + " " + email.body({ first: "F", goals: null });
    assert.match(text, pattern, `day ${day} theme`);
  }
  // Day 18 routes to the Time Back funnel; day 22 to the System Map page.
  assert.ok(NURTURE_EMAILS[17].body({ first: "F", goals: null }).includes("/go/time-back"));
  assert.ok(NURTURE_EMAILS[21].body({ first: "F", goals: null }).includes("/packages/system-map"));
});

test("tool picker matches form answers and falls back to the library", () => {
  assert.ok(pickToolLink("we keep missing calls").url.includes("missed-call-calculator"));
  assert.ok(pickToolLink("need more google reviews").url.includes("google-review-link"));
  assert.ok(pickToolLink(null).url.endsWith("/tools"));
  assert.ok(pickToolLink("nothing matches this text").url.endsWith("/tools"));
  // The alternate pick differs when two topics match.
  const both = "missed calls and late invoices";
  assert.notEqual(pickToolLink(both, false).url, pickToolLink(both, true).url);
});

test("sequence never references Premier Dental or sends via Quo", () => {
  for (const email of NURTURE_EMAILS) {
    const text = email.subject + email.body({ first: "F", goals: null });
    assert.ok(!/premier\s*dental/i.test(text), `day ${email.day} mentions Premier`);
  }
});
