import assert from "node:assert/strict";
import test from "node:test";
import {
  type QueueLead,
  dialHref,
  formatPhone,
  formatValue,
  isUrgentTimeline,
  lastTouchOf,
  prettyTimeline,
  rankLead,
  rankQueue,
  waitedLabel,
  whyLine,
} from "../lib/salesQueue";

const NOW = Date.parse("2026-09-16T12:00:00.000Z");
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function lead(overrides: Partial<QueueLead> = {}): QueueLead {
  return {
    id: "lead-1",
    created_at: new Date(NOW - 30 * DAY).toISOString(),
    full_name: "Pat Example",
    business_name: "Example Roofing",
    email: "pat@example.com",
    phone: "+19035550101",
    status: "new",
    priority: "normal",
    timeline: null,
    interest: "website",
    goals: "Need a new site before the fall push",
    industry: "roofing",
    next_follow_up_at: null,
    last_contacted_at: null,
    expected_value_cents: null,
    owner: null,
    source: "meta_lead_ad",
    sms_consent: true,
    sms_unsubscribed_at: null,
    ...overrides,
  };
}

test("somebody who just texted outranks everything else", () => {
  const texted = lead({ id: "texted" });
  const urgentNew = lead({ id: "urgent", timeline: "this_week" });
  const overdue = lead({
    id: "overdue",
    status: "contacted",
    next_follow_up_at: new Date(NOW - 2 * DAY).toISOString(),
  });

  const ranked = rankQueue(
    [overdue, urgentNew, texted],
    { texted: { at: NOW - 2 * HOUR, kind: "text" } },
    NOW,
  );

  assert.deepEqual(
    ranked.map((r) => r.lead.id),
    ["texted", "urgent", "overdue"],
  );
  assert.equal(ranked[0].tier, 1);
  assert.match(ranked[0].reason, /Texted you in the last 24 hours/);
});

test("an inbound older than 24 hours stops being tier 1", () => {
  const stale = rankLead(lead(), { "lead-1": { at: NOW - 25 * HOUR, kind: "text" } }, NOW);
  assert.notEqual(stale.tier, 1);
});

test("a call and a text read differently in the reason line", () => {
  const called = rankLead(lead(), { "lead-1": { at: NOW - HOUR, kind: "call" } }, NOW);
  assert.equal(called.tier, 1);
  assert.match(called.reason, /Called you/);
});

test("the urgency tier only fires for a new lead in a hurry", () => {
  assert.equal(rankLead(lead({ timeline: "this_week" }), {}, NOW).tier, 2);
  assert.equal(rankLead(lead({ timeline: "next_90_days" }), {}, NOW).tier, 5);
  assert.equal(rankLead(lead({ timeline: "just_looking_right_now" }), {}, NOW).tier, 5);
  // Same urgency, but already in conversation, so it is not an unanswered new lead.
  assert.notEqual(rankLead(lead({ status: "contacted", timeline: "this_week" }), {}, NOW).tier, 2);
});

test("urgency survives the free-text timeline answer that exists in production", () => {
  assert.equal(
    isUrgentTimeline("Proposal sent August 31, 2026 Central Time; requested a 20-minute review this week."),
    true,
  );
  assert.equal(isUrgentTimeline("next_90_days"), false);
  assert.equal(isUrgentTimeline(null), false);
});

test("a proposal only goes quiet after three days", () => {
  const twoDays = lead({
    status: "proposal",
    last_contacted_at: new Date(NOW - 2 * DAY).toISOString(),
  });
  const fourDays = lead({
    status: "proposal",
    last_contacted_at: new Date(NOW - 4 * DAY).toISOString(),
  });
  assert.equal(rankLead(twoDays, {}, NOW).tier, 5);
  assert.equal(rankLead(fourDays, {}, NOW).tier, 4);
});

test("an overdue follow-up beats a quiet proposal", () => {
  const overdue = rankLead(
    lead({ status: "contacted", next_follow_up_at: new Date(NOW - DAY).toISOString() }),
    {},
    NOW,
  );
  const quiet = rankLead(
    lead({ status: "proposal", last_contacted_at: new Date(NOW - 9 * DAY).toISOString() }),
    {},
    NOW,
  );
  assert.ok(overdue.tier < quiet.tier);
});

test("a follow-up in the future is not past due", () => {
  const future = rankLead(
    lead({ status: "contacted", next_follow_up_at: new Date(NOW + DAY).toISOString() }),
    {},
    NOW,
  );
  assert.notEqual(future.tier, 3);
});

test("closed leads never appear in the queue", () => {
  const ranked = rankQueue(
    [lead({ id: "won", status: "won" }), lead({ id: "lost", status: "lost" }), lead({ id: "open" })],
    {},
    NOW,
  );
  assert.deepEqual(ranked.map((r) => r.lead.id), ["open"]);
});

test("inside the waiting tier the longest wait comes first", () => {
  const recent = lead({ id: "recent", status: "contacted", last_contacted_at: new Date(NOW - DAY).toISOString() });
  const ancient = lead({ id: "ancient", status: "contacted", last_contacted_at: new Date(NOW - 20 * DAY).toISOString() });
  const ranked = rankQueue([recent, ancient], {}, NOW);
  assert.deepEqual(ranked.map((r) => r.lead.id), ["ancient", "recent"]);
});

test("inside the just-reached-out tier the freshest message comes first", () => {
  const older = lead({ id: "older" });
  const newer = lead({ id: "newer" });
  const ranked = rankQueue(
    [older, newer],
    { older: { at: NOW - 8 * HOUR, kind: "text" }, newer: { at: NOW - 10 * 60 * 1000, kind: "text" } },
    NOW,
  );
  assert.deepEqual(ranked.map((r) => r.lead.id), ["newer", "older"]);
});

test("a null last_contacted_at falls back to created_at instead of sinking", () => {
  // 26 of 30 production leads have a null last_contacted_at. Sorting on it
  // directly would bury the oldest neglected leads.
  const never = lead({ last_contacted_at: null, created_at: new Date(NOW - 40 * DAY).toISOString() });
  assert.equal(lastTouchOf(never), Date.parse(never.created_at));
  const ranked = rankQueue([never, lead({ id: "fresh", status: "contacted", last_contacted_at: new Date(NOW - HOUR).toISOString() })], {}, NOW);
  assert.equal(ranked[0].lead.id, never.id);
});

test("hot explains a row but never jumps the queue", () => {
  const hot = rankLead(lead({ priority: "hot" }), {}, NOW);
  const texted = rankLead(lead({ priority: "normal" }), { "lead-1": { at: NOW - HOUR, kind: "text" } }, NOW);
  assert.ok(texted.tier < hot.tier);
  assert.match(hot.reason, /Marked hot/);
});

test("the text button is gated on real consent, not on having a phone", () => {
  assert.equal(rankLead(lead({ sms_consent: true }), {}, NOW).canText, true);
  assert.equal(rankLead(lead({ sms_consent: false }), {}, NOW).canText, false);
  assert.equal(
    rankLead(lead({ sms_consent: true, sms_unsubscribed_at: new Date(NOW).toISOString() }), {}, NOW).canText,
    false,
  );
  assert.equal(rankLead(lead({ phone: null, sms_consent: true }), {}, NOW).canText, false);
});

test("call and text links are dialable from a phone", () => {
  assert.equal(dialHref("+1 (903) 555-0101", "tel"), "tel:+19035550101");
  assert.equal(dialHref("9035550101", "sms"), "sms:+19035550101");
  assert.equal(dialHref("19035550101", "tel"), "tel:+19035550101");
  assert.equal(dialHref("12345", "tel"), null);
  assert.equal(dialHref(null, "tel"), null);
});

test("the why line is never blank, even with no form answer", () => {
  assert.match(whyLine(lead()), /fall push/);
  assert.match(whyLine(lead({ goals: null, interest: "website" })), /Interested in website/);
  assert.match(whyLine(lead({ goals: null, interest: "unsure", industry: null })), /No form answer saved/);
  assert.ok(whyLine(lead({ goals: "x".repeat(400) })).length <= 120);
});

test("timeline chips stay short and free text is left to the why line", () => {
  assert.equal(prettyTimeline("this_week"), "this week");
  assert.equal(prettyTimeline("x".repeat(60)), null);
  assert.equal(prettyTimeline(null), null);
});

test("the waiting clock reads like a person would say it", () => {
  assert.equal(waitedLabel(NOW, NOW), "just now");
  assert.equal(waitedLabel(NOW - 30 * 60 * 1000, NOW), "30 min");
  assert.equal(waitedLabel(NOW - 5 * HOUR, NOW), "5 hr");
  assert.equal(waitedLabel(NOW - DAY, NOW), "1 day");
  assert.equal(waitedLabel(NOW - 9 * DAY, NOW), "9 days");
  assert.equal(waitedLabel(NOW - 70 * DAY, NOW), "2 mo");
});

test("money and phone formatting stay out of the way when empty", () => {
  assert.equal(formatValue(null), null);
  assert.equal(formatValue(0), null);
  assert.equal(formatValue(150000), "$1,500");
  assert.equal(formatPhone("+19035550101"), "(903) 555-0101");
  assert.equal(formatPhone(null), "");
});

test("no em dash reaches the operator in any generated copy", () => {
  const rows = rankQueue(
    [lead({ priority: "hot", timeline: "this_week" }), lead({ id: "b", status: "proposal" })],
    { "lead-1": { at: NOW - HOUR, kind: "call" } },
    NOW,
  );
  for (const row of rows) {
    assert.doesNotMatch(row.reason, /—/);
    assert.doesNotMatch(whyLine(row.lead), /—/);
  }
});
