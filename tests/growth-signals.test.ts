import assert from "node:assert/strict";
import test from "node:test";
import {
  ATTEMPTS_IN_48H_TARGET,
  MIN_ANSWERS_TO_JUDGE,
  MIN_LEADS_TO_JUDGE,
  VERDICT_LABELS,
  VERDICT_ORDER,
  scorecard,
  waitLabel,
  type AdRow,
  type EmailTotals,
  type ScoreLead,
} from "../lib/growthSignals.ts";
import { buildNextActions, leadPace, type FollowUpGroup, type NextActionLead, type NextActionTouch, type TouchKind } from "../lib/nextAction.ts";
import { copyProblems } from "../lib/hq/copy.ts";

// The scorecard and its signals, over fictional leads and fictional ads.
// No spend figure here is a real one.

const NOW = new Date("2026-10-07T18:00:00.000Z"); // Wed Oct 7, 1:00 PM Central
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();
const id = (n: number) => `0a1b2c3d-0000-4000-8000-${String(n).padStart(12, "0")}`;

function lead(n: number, overrides: Partial<NextActionLead> = {}): NextActionLead {
  return {
    id: id(n), created_at: hoursAgo(30), full_name: `Lead ${n} Example`, business_name: null, phone: "(903) 555-0100", email: `lead${n}@example.test`,
    status: "new", priority: "normal", source: "meta_lead_ad", campaign: "scott_contractor_tx_2026_10", group: "standard", service: null, ad_id: null, series: "contractor_owner",
    can_text: false, can_email: true, next_follow_up_at: null, is_test: false, expected_value_cents: null, ...overrides,
  };
}
const touch = (n: number, kind: TouchKind, at: string): NextActionTouch => ({ lead_id: id(n), at, kind });
const ad = (n: number, overrides: Partial<AdRow> = {}): AdRow => ({ ad_id: `ad-${n}`, ad_name: `Example ad ${n}`, campaign_name: "Example campaign", effective_status: "ACTIVE", spendCents: 10_000, platformLeads: 3, ...overrides });

function card(leads: NextActionLead[], touches: NextActionTouch[], extra: { ads?: AdRow[] | null; email?: EmailTotals | null; days?: number } = {}) {
  const board = buildNextActions({ leads, touches, now: NOW });
  const scoreLeads: ScoreLead[] = leads.map((l) => ({ id: l.id, created_at: l.created_at, status: l.status, group: l.group, source: l.source, ad_id: l.ad_id, expected_value_cents: l.expected_value_cents }));
  return scorecard({ days: extra.days ?? 7, now: NOW, leads: scoreLeads, pace: leadPace(leads, touches), board, ads: extra.ads ?? null, email: extra.email ?? null });
}
const find = (c: ReturnType<typeof card>, signalId: string) => c.signals.find((s) => s.id === signalId);
const kpi = (c: ReturnType<typeof card>, key: string) => c.kpis.find((k) => k.key === key)!;

test("ten leads and no call on the record: the board says exactly that, not that nobody called", () => {
  const groups: FollowUpGroup[] = ["priority", "priority", "priority", "funding_review", "funding_review", "standard", "standard", "fit_check"];
  const leads = [...groups.map((g, i) => lead(i + 1, { group: g })), lead(9, { group: null }), lead(10, { group: null, created_at: hoursAgo(0.5) })];
  const c = card(leads, []);
  assert.equal(kpi(c, "leads").value, "10");
  assert.equal(kpi(c, "speed").value, "0 of 9", "the lead that is half an hour old has not had a fair chance yet");
  assert.equal(kpi(c, "speed").detail, "No call is on the record for any of them.");
  assert.equal(kpi(c, "speed").tone, "warn");
  assert.equal(kpi(c, "reached").value, "0 of 10");
  assert.equal(kpi(c, "priority").value, "3 of 8");
  const s = find(c, "no_call_on_record")!;
  assert.equal(s.verdict, "fix");
  assert.equal(s.title, "No call is on the record for 9 of 9 leads");
  assert.match(s.detail, /Either the calls are not being made, or they are made from a phone this back office cannot see\./);
  // Eight answers is enough to say what the ad is pulling.
  assert.equal(MIN_ANSWERS_TO_JUDGE, 8);
  assert.equal(find(c, "quality_good")?.verdict, "more");
  assert.equal(find(c, "quality_early"), undefined);
  // No ads were read: no ad numbers and no ad verdicts.
  assert.equal(c.kpis.some((k) => k.key === "spend"), false);
});

test("fast first calls are named as something to keep; slow ones as something to fix", () => {
  const leads = [1, 2, 3].map((n) => lead(n, { created_at: hoursAgo(10 + n) }));
  const fast = card(leads, leads.map((l, i) => touch(i + 1, "call_out_missed", new Date(Date.parse(l.created_at) + 3 * 60_000).toISOString())));
  assert.equal(kpi(fast, "speed").value, "3 of 3");
  assert.equal(kpi(fast, "speed").tone, "good");
  assert.equal(find(fast, "speed_good")?.verdict, "keep");
  assert.equal(find(fast, "no_call_on_record"), undefined);

  const slow = card(leads, leads.map((l, i) => touch(i + 1, "call_out_missed", new Date(Date.parse(l.created_at) + 5 * 3_600_000).toISOString())));
  assert.equal(kpi(slow, "speed").value, "0 of 3");
  assert.match(kpi(slow, "speed").detail, /Typical wait to the first call: 5 hours\./);
  assert.equal(find(slow, "speed_slow")?.title, "The first call is coming 5 hours after the form");
  // Two leads is not a pattern either way.
  assert.equal(find(card(leads.slice(0, 2), [touch(1, "call_out_missed", hoursAgo(1)), touch(2, "call_out_missed", hoursAgo(1))]), "speed_slow"), undefined);
});

test("attempts in the first two days are held to the plan", () => {
  assert.equal(ATTEMPTS_IN_48H_TARGET, 5);
  const leads = [1, 2, 3].map((n) => lead(n, { created_at: hoursAgo(72) }));
  const one = card(leads, leads.map((_, i) => touch(i + 1, "call_out_missed", hoursAgo(71))));
  assert.match(find(one, "too_few_attempts")!.title, /getting 1\.0 call attempts in their first two days/);
  const five = card(leads, leads.flatMap((_, i) => [71.9, 71.8, 68, 48, 44].map((h) => touch(i + 1, "call_out_missed", hoursAgo(h)))));
  assert.equal(find(five, "attempts_good")?.verdict, "keep");
  assert.equal(find(five, "too_few_attempts"), undefined);
});

test("replies owed, late follow-ups and old leads past the plan each get their own line", () => {
  const leads = [
    lead(1, { created_at: hoursAgo(50) }),
    lead(2, { created_at: hoursAgo(200), status: "proposal" }),
    lead(3, { created_at: hoursAgo(24 * 45), group: null, series: null }),
  ];
  const c = card(leads, [touch(1, "text_in", hoursAgo(3)), touch(2, "proposal_sent", hoursAgo(150))], { days: 60 });
  assert.equal(find(c, "replies_owed")?.title, "1 person is waiting on an answer");
  assert.equal(find(c, "plan_behind")?.title, "1 follow-up is more than a day late");
  assert.match(find(c, "plan_behind")!.detail, /1 of them is a proposal/);
  assert.equal(find(c, "stale")?.verdict, "watch");
  assert.equal(kpi(c, "proposals").value, "1");
});

test("small numbers get no verdict on lead quality", () => {
  const c = card([lead(1, { group: "priority" }), lead(2, { group: "standard" }), lead(3, { group: null })], []);
  const early = find(c, "quality_early")!;
  assert.equal(early.verdict, "watch");
  assert.equal(early.title, "1 of 2 form leads are priority");
  assert.match(early.action, /Wait for 8 answers/);
  assert.equal(find(c, "quality_good"), undefined);
});

test("with enough answers: too many non-owners and too few priority leads both say what to change in the ad", () => {
  const groups: FollowUpGroup[] = ["fit_check", "fit_check", "fit_check", "standard", "standard", "standard", "funding_review", "priority"];
  const c = card(groups.map((g, i) => lead(i + 1, { group: g })), []);
  assert.equal(find(c, "quality_not_owners")?.verdict, "less");
  assert.equal(find(c, "quality_low")?.title, "Only 1 of 8 form leads are priority");
  assert.match(find(c, "quality_low")!.action, /Say the starting investment in the ad/);
});

test("ads: spend, the numbers that matter, and no winner declared on three leads apiece", () => {
  const leads = [lead(1, { group: "priority" }), lead(2, { group: "priority", status: "proposal" }), lead(3)];
  const c = card(leads, [], { ads: [ad(1, { spendCents: 46_836, platformLeads: 8 }), ad(2, { spendCents: 10_686, platformLeads: 3 })] });
  assert.equal(kpi(c, "spend").value, "$575");
  assert.equal(kpi(c, "spend").detail, "11 leads by Meta's count, the last 7 days.");
  assert.equal(kpi(c, "cost_per_priority").value, "$288");
  assert.equal(kpi(c, "cost_per_proposal").value, "$575");
  const early = find(c, "ads_early")!;
  assert.equal(early.verdict, "watch");
  assert.match(early.detail, /"Example ad 1": 8 leads\. "Example ad 2": 3 leads\./);
  assert.equal(find(c, "ad_winner"), undefined);
  assert.equal(MIN_LEADS_TO_JUDGE, 10);
});

test("ads: a real gap over enough leads names the cheaper one, and warns about quality before moving money", () => {
  const c = card([lead(1)], [], { ads: [ad(1, { spendCents: 40_000, platformLeads: 20 }), ad(2, { spendCents: 60_000, platformLeads: 12 })] });
  const winner = find(c, "ad_winner")!;
  assert.equal(winner.verdict, "more");
  assert.match(winner.title, /"Example ad 1" is bringing leads for less/);
  assert.match(winner.detail, /\$20\.00 a lead over 20, against \$50\.00 a lead over 12/);
  assert.match(winner.action, /Check which one brought the priority leads before moving money/);
  // Inside 30 percent of each other: no verdict.
  assert.equal(find(card([lead(1)], [], { ads: [ad(1, { spendCents: 40_000, platformLeads: 20 }), ad(2, { spendCents: 44_000, platformLeads: 20 })] }), "ad_winner"), undefined);
});

test("ads: money spent with nothing back, and nothing running at all", () => {
  const spent = card([lead(1)], [], { ads: [ad(1, { spendCents: 8_000, platformLeads: 0 }), ad(2, { spendCents: 5_000, platformLeads: 0 }), ad(3, { spendCents: 90_000, platformLeads: 0, effective_status: "PAUSED" })] });
  const less = spent.signals.filter((s) => s.id.startsWith("ad_no_leads_"));
  assert.equal(less.length, 1, "only the running ad past the line; a paused ad is already off");
  assert.match(less[0].title, /"Example ad 1" has spent \$80\.00 with no lead/);
  assert.equal(find(spent, "no_ads"), undefined);

  const off = card([lead(1)], [], { ads: [ad(1, { effective_status: "PAUSED" })] });
  assert.equal(find(off, "no_ads")?.verdict, "fix");
  assert.equal(find(card([lead(1)], [], { ads: [] }), "no_ads")?.title, "No ad is running");
});

test("quality by ad waits until the ad is on most leads, then names the ad bringing priority leads", () => {
  const few = card([lead(1, { ad_id: "ad-1" }), lead(2), lead(3), lead(4)], [], { ads: [ad(1)] });
  assert.equal(find(few, "ad_not_recorded")?.title, "The ad is recorded on 1 of 4 Meta leads");

  const groups: [string, FollowUpGroup][] = [
    ["ad-1", "priority"], ["ad-1", "priority"], ["ad-1", "priority"], ["ad-1", "standard"],
    ["ad-2", "standard"], ["ad-2", "standard"], ["ad-2", "funding_review"], ["ad-2", "standard"],
  ];
  const c = card(groups.map(([adId, g], i) => lead(i + 1, { ad_id: adId, group: g })), [], { ads: [ad(1), ad(2)] });
  const top = find(c, "ad_quality_winner")!;
  assert.equal(top.verdict, "more");
  assert.match(top.title, /"Example ad 1" is bringing the priority leads/);
  assert.match(top.detail, /3 of its 4 leads are priority/);
  assert.equal(find(c, "ad_not_recorded"), undefined);
});

test("email: opens that are not being recorded, a low open rate, a healthy one, and bounces", () => {
  const leads = [lead(1)];
  assert.equal(find(card(leads, [], { email: { sent: 250, opened: 0, clicked: 0, bounced: 1 } }), "email_opens_missing")?.verdict, "fix");
  // Opens not read at all: nothing is said about them.
  assert.deepEqual(card(leads, [], { email: { sent: 250, opened: null, clicked: null, bounced: null } }).signals.filter((s) => s.id.startsWith("email")), []);
  const low = find(card(leads, [], { email: { sent: 108, opened: 6, clicked: 0, bounced: 0 } }), "email_opens_low")!;
  assert.equal(low.title, "6% of automatic emails show as opened");
  assert.match(low.action, /If tracking only started recently, give it a week first\./);
  assert.equal(find(card(leads, [], { email: { sent: 100, opened: 40, clicked: 5, bounced: 0 } }), "email_opens_good")?.verdict, "keep");
  assert.equal(find(card(leads, [], { email: { sent: 100, opened: 20, clicked: 5, bounced: 9 } }), "email_bounces")?.verdict, "fix");
  // Twenty emails is not enough to call anything.
  assert.deepEqual(card(leads, [], { email: { sent: 20, opened: 0, clicked: 0, bounced: 0 } }).signals.filter((s) => s.id.startsWith("email")), []);
});

test("signals come out in the order the money is, and every line passes the house copy rules", () => {
  const groups: FollowUpGroup[] = ["priority", "priority", "priority", "standard", "standard", "standard", "standard", "standard"];
  const leads = [...groups.map((g, i) => lead(i + 1, { group: g, created_at: hoursAgo(72) })), lead(20, { created_at: hoursAgo(24 * 45), group: null, series: null })];
  const c = card(leads, [touch(1, "text_in", hoursAgo(2))], {
    days: 60,
    ads: [ad(1, { spendCents: 9_000, platformLeads: 0 }), ad(2, { spendCents: 40_000, platformLeads: 20 }), ad(3, { spendCents: 60_000, platformLeads: 12 })],
    email: { sent: 120, opened: 60, clicked: 9, bounced: 0 },
  });
  const verdicts = c.signals.map((s) => s.verdict);
  assert.deepEqual(verdicts, verdicts.slice().sort((a, b) => VERDICT_ORDER.indexOf(a) - VERDICT_ORDER.indexOf(b)));
  assert.ok(new Set(verdicts).size >= 4, verdicts.join(", "));
  for (const s of c.signals) {
    assert.deepEqual(copyProblems(`${s.title} ${s.detail} ${s.action}`), [], s.id);
    assert.ok(VERDICT_LABELS[s.verdict]);
    assert.ok(s.action.length > 20, s.id);
  }
  for (const k of c.kpis) assert.deepEqual(copyProblems(`${k.label} ${k.value} ${k.detail}`), [], k.key);
  assert.equal(new Set(c.signals.map((s) => s.id)).size, c.signals.length, "no signal twice");
});

test("an empty window reads as empty, not as zeros that look like failure", () => {
  const c = card([], []);
  assert.equal(kpi(c, "leads").detail, "None in the last 7 days.");
  assert.equal(kpi(c, "speed").value, "No leads yet");
  assert.equal(kpi(c, "speed").tone, "plain");
  assert.equal(kpi(c, "priority").value, "Not asked");
  assert.deepEqual(c.signals, []);
});

test("waits read the way a person says them", () => {
  assert.equal(waitLabel(0.4), "under a minute");
  assert.equal(waitLabel(1), "1 minute");
  assert.equal(waitLabel(45), "45 minutes");
  assert.equal(waitLabel(300), "5 hours");
  assert.equal(waitLabel(60 * 72), "3 days");
});
