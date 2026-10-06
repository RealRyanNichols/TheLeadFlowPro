import assert from "node:assert/strict";
import test from "node:test";
import {
  adSummary,
  bottleneckLine,
  businessCounts,
  moneyBoard,
  parseWindow,
  promisesDue,
  proposalsOnTable,
  reportingWindowStart,
  sourceCounts,
  type BoardLead,
} from "../lib/commandCenter.ts";
import * as commandCenterLib from "../lib/commandCenter.ts";
import type { CallSheetTouch } from "../lib/callSheet.ts";

// The money board's arithmetic, over fictional rows. Every number the command
// center prints is one of these functions; none of them reads anything.

const NOW = new Date("2026-10-06T15:00:00.000Z"); // 10:00 AM Central
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();
const daysAgo = (d: number) => hoursAgo(d * 24);
const id = (n: number) => `0a1b2c3d-0000-4000-8000-${String(n).padStart(12, "0")}`;

function lead(overrides: Partial<BoardLead> & { id: string }): BoardLead {
  return {
    created_at: hoursAgo(2),
    full_name: "Riley Example",
    business_name: "Example Dirt Work (fictional)",
    email: "riley@example.test",
    phone: "(903) 555-0142",
    interest: "done_for_you",
    status: "new",
    source: "meta_lead_ad",
    utm_source: null,
    best_contact_method: "call",
    sms_consent: true,
    sms_unsubscribed_at: null,
    is_test: false,
    next_follow_up_at: null,
    priority: null,
    expected_value_cents: null,
    last_contacted_at: null,
    owner: null,
    ...overrides,
  };
}

const touch = (lead_id: string, kind: CallSheetTouch["kind"], at: string): CallSheetTouch => ({ lead_id, at, kind });

test("parseWindow: 28 when asked, 7 for anything else", () => {
  assert.equal(parseWindow("28"), 28);
  assert.equal(parseWindow(["28"]), 28);
  assert.equal(parseWindow(28), 28);
  for (const junk of [undefined, null, "", "7", "30", "280", "twenty", {}]) assert.equal(parseWindow(junk), 7, String(junk));
});

test("sourceCounts groups every Meta spelling as one channel and labels the rest", () => {
  const counts = sourceCounts([
    lead({ id: id(1), source: "meta_lead_ad" }),
    lead({ id: id(2), source: "facebook-lead-ad" }),
    lead({ id: id(3), source: null, utm_source: "facebook" }),
    lead({ id: id(4), source: "website" }),
    lead({ id: id(5), source: null, utm_source: null }),
  ]);
  assert.deepEqual(counts, [
    { key: "meta_lead_ad", label: "Facebook lead form", count: 3 },
    { key: "unknown", label: "Source not recorded", count: 1 },
    { key: "website", label: "Website form", count: 1 },
  ]);
});

test("moneyBoard: reached means a human touch; the software's own messages never count", () => {
  const leads = [
    // Reached by a note 3 hours after it came in.
    lead({ id: id(1), created_at: daysAgo(2) }),
    // Only the automatic first text and welcome email: not reached, still waiting.
    lead({ id: id(2), created_at: daysAgo(1) }),
    // Reached, but 30 hours later: counts as reached, not inside 24h.
    lead({ id: id(3), created_at: daysAgo(3), status: "contacted" }),
    // Older than the 7-day window, in the proposal stage with a value: counted in proposals, not in leads in.
    lead({ id: id(4), created_at: daysAgo(20), status: "proposal", expected_value_cents: 750_000 }),
    // Called two hours in, then replied by text: reached, and a reply owed.
    lead({ id: id(5), created_at: daysAgo(5), status: "contacted" }),
    // Closed after a note: reached (a person did the work), but not open, so never waiting.
    lead({ id: id(6), created_at: daysAgo(4), status: "lost" }),
  ];
  const touches: CallSheetTouch[] = [
    touch(id(1), "note", new Date(Date.parse(daysAgo(2)) + 3 * 3_600_000).toISOString()),
    touch(id(3), "call", new Date(Date.parse(daysAgo(3)) + 30 * 3_600_000).toISOString()),
    touch(id(4), "note", daysAgo(6)),
    touch(id(5), "call", new Date(Date.parse(daysAgo(5)) + 2 * 3_600_000).toISOString()),
    touch(id(5), "message_in", daysAgo(1)),
    touch(id(6), "note", new Date(Date.parse(daysAgo(4)) + 12 * 3_600_000).toISOString()),
  ];
  const board = moneyBoard({
    leads,
    touches,
    purchases: [
      { id: "p1", kind: "agency_payment", amount_cents: 750_000, status: "paid", created_at: daysAgo(1) },
      { id: "p2", kind: "chase_sheet", amount_cents: 2_000, status: "pending", created_at: daysAgo(1) },
      { id: "p3", kind: "chase_sheet", amount_cents: 9_700, status: "paid", created_at: daysAgo(10) },
    ],
    notes: [
      { author: "Ryan", created_at: daysAgo(2) },
      { author: "Pat", created_at: daysAgo(1) },
      { author: "Pat", created_at: daysAgo(1) },
      { author: null, created_at: daysAgo(9) },
    ],
    calls: [
      { started_at: daysAgo(3), direction: "outgoing", outcome: "completed" },
      { started_at: daysAgo(2), direction: "incoming", outcome: "missed" },
      { started_at: daysAgo(1), direction: "outgoing", outcome: "completed", scope_status: "personal" },
    ],
    now: NOW,
    days: 7,
  });
  assert.equal(board.leadsIn, 5, "six leads, one older than the window");
  assert.equal(board.reached, 4, "the note, the late call, the early call, and the note on the lost lead");
  assert.equal(board.reachedIn24h, 3, "the late call came 30 hours in");
  assert.equal(board.reachedPct, 80);
  assert.equal(board.untouched, 1, "only the lead with nothing but software messages");
  assert.equal(board.repliesOwed, 1, "lead 5's text is the last thing on its thread");
  assert.deepEqual(board.stages, { contacted: 2, booked: 0, proposal: 1 });
  assert.deepEqual(board.proposalsOut, { count: 1, cents: 750_000, valued: 1 });
  assert.deepEqual(board.paid, { count: 1, cents: 750_000, bySource: [{ key: "agency_payment", label: "agency payment", count: 1, cents: 750_000 }] }, "pending and out-of-window payments are not paid in this window");
  assert.deepEqual(board.notesByAuthor, [
    { author: "Pat", count: 2 },
    { author: "Ryan", count: 1 },
  ]);
  assert.equal(board.callsHad, 1, "a missed inbound call and a personal-scope call are not calls somebody had");
  assert.deepEqual(
    board.bySource.map((s) => `${s.label}:${s.count}`),
    ["Facebook lead form:5"],
  );
});

test("moneyBoard: the 28-day window widens leads in and paid without changing open-stage counts", () => {
  const leads = [lead({ id: id(1), created_at: daysAgo(20) }), lead({ id: id(2), created_at: daysAgo(2), status: "call_booked" })];
  const seven = moneyBoard({ leads, touches: [], purchases: [{ id: "p", kind: "x", amount_cents: 500, status: "paid", created_at: daysAgo(10) }], notes: [], calls: [], now: NOW, days: 7 });
  const month = moneyBoard({ leads, touches: [], purchases: [{ id: "p", kind: "x", amount_cents: 500, status: "paid", created_at: daysAgo(10) }], notes: [], calls: [], now: NOW, days: 28 });
  assert.equal(seven.leadsIn, 1);
  assert.equal(month.leadsIn, 2);
  assert.equal(seven.paid.count, 0);
  assert.equal(month.paid.count, 1);
  assert.equal(seven.stages.booked, month.stages.booked);
  assert.equal(seven.untouched, 1);
  assert.equal(month.untouched, 2);
});

test("bottleneckLine puts replies owed first, then untouched leads, then proposals, then an empty window", () => {
  const base = moneyBoard({ leads: [], touches: [], purchases: [], notes: [], calls: [], now: NOW, days: 7 });
  assert.match(bottleneckLine(base), /No new leads in 7 days/);
  assert.match(bottleneckLine({ ...base, repliesOwed: 2, untouched: 5 }), /^2 leads are waiting on a reply/);
  assert.match(bottleneckLine({ ...base, untouched: 1, leadsIn: 3 }), /^1 of the last 7 days' leads has never heard from a person/);
  assert.match(bottleneckLine({ ...base, leadsIn: 3, reached: 3, proposalsOut: { count: 2, cents: 0, valued: 0 } }), /^2 proposals out and nothing paid/);
  assert.match(bottleneckLine({ ...base, leadsIn: 3, reached: 3 }), /Book the sit-down/);
  assert.match(bottleneckLine({ ...base, leadsIn: 3, reached: 3, paid: { count: 1, cents: 1, bySource: [] } }), /^1 paid in 7 days/);
});

test("paid is grouped by where the money came from, with the cash ledger's source names", () => {
  const board = moneyBoard({
    leads: [],
    touches: [],
    purchases: [
      { id: "a", kind: "checkout", amount_cents: 750_000, status: "paid", created_at: daysAgo(1) },
      { id: "b", kind: "manual_check", amount_cents: 85_000, status: "paid", created_at: daysAgo(2) },
      { id: "c", kind: "manual_check", amount_cents: 50_000, status: "paid", created_at: daysAgo(3) },
      { id: "d", kind: "invoice", amount_cents: 100_000, status: "paid", created_at: daysAgo(4) },
    ],
    notes: [],
    calls: [],
    now: NOW,
    days: 7,
  });
  assert.equal(board.paid.count, 4);
  assert.equal(board.paid.cents, 985_000);
  assert.deepEqual(board.paid.bySource, [
    { key: "checkout", label: "Stripe checkout", count: 1, cents: 750_000 },
    { key: "manual_check", label: "check recorded by hand", count: 2, cents: 135_000 },
    { key: "invoice", label: "paid Stripe invoice", count: 1, cents: 100_000 },
  ]);
  assert.equal(commandCenterLib.cashSourceLabel("manual_ach"), "ach recorded by hand");
  assert.equal(commandCenterLib.cashSourceLabel("stripe_invoice"), "paid Stripe invoice");
  assert.equal(commandCenterLib.cashSourceLabel(null), "payment");
});

test("promisesDue: only touched, open leads whose promised time is at or before the end of today, overdue first", () => {
  const endOfToday = new Date("2026-10-07T04:59:00.000Z"); // 11:59 PM Central
  const leads = [
    lead({ id: id(1), status: "contacted", next_follow_up_at: hoursAgo(30) }), // overdue, touched
    lead({ id: id(2), status: "contacted", next_follow_up_at: new Date(NOW.getTime() + 2 * 3_600_000).toISOString() }), // later today, touched
    lead({ id: id(3), status: "contacted", next_follow_up_at: new Date(NOW.getTime() + 30 * 3_600_000).toISOString() }), // tomorrow
    lead({ id: id(4), status: "new", next_follow_up_at: hoursAgo(5) }), // never touched: the diagnostic stamp, not a promise
    lead({ id: id(5), status: "won", next_follow_up_at: hoursAgo(5) }), // closed
    lead({ id: id(1), status: "contacted", next_follow_up_at: hoursAgo(30) }), // duplicate row
  ];
  const touches = [touch(id(1), "call", hoursAgo(40)), touch(id(2), "note", hoursAgo(20)), touch(id(3), "note", hoursAgo(20)), touch(id(5), "note", hoursAgo(20))];
  const due = promisesDue(leads, touches, NOW, endOfToday);
  assert.deepEqual(
    due.map((p) => [p.lead.id, p.overdueHours > 0]),
    [
      [id(1), true],
      [id(2), false],
    ],
  );
  assert.equal(due[0].overdueHours, 30);
});

test("proposalsOnTable: open proposals, quietest first, with the value typed on them", () => {
  const leads = [
    lead({ id: id(1), status: "proposal", expected_value_cents: 750_000 }),
    lead({ id: id(2), status: "proposal", expected_value_cents: null, last_contacted_at: daysAgo(9) }),
    lead({ id: id(3), status: "proposal", expected_value_cents: 100_000 }),
    lead({ id: id(4), status: "contacted", expected_value_cents: 999 }),
  ];
  const touches = [touch(id(1), "note", daysAgo(2)), touch(id(1), "message_in", daysAgo(1))];
  const rows = proposalsOnTable(leads, touches, NOW);
  assert.deepEqual(
    rows.map((r) => [r.lead.id, r.cents, r.quietDays]),
    [
      [id(3), 100_000, null],
      [id(2), null, 9],
      [id(1), 750_000, 2],
    ],
  );
});

test("businessCounts: 7 and 28 day lead counts and the last lead per business", () => {
  const rows = [
    { key: "a", created_at: daysAgo(1) },
    { key: "a", created_at: daysAgo(10) },
    { key: "b", created_at: daysAgo(40) },
    { key: "a", created_at: "not a date" },
  ];
  const out = businessCounts(rows, [{ key: "a", name: "A", href: "/a" }, { key: "b", name: "B", href: "/b" }, { key: "c", name: "C", href: "/c" }], NOW);
  assert.deepEqual(
    out.map((r) => [r.key, r.leads7, r.leads28, r.lastLeadAt !== null]),
    [
      ["a", 1, 2, true],
      ["b", 0, 0, true],
      ["c", 0, 0, false],
    ],
  );
});

test("adSummary: spend, clicks and leads over the reporting window, cost per lead both ways, per campaign", () => {
  assert.equal(reportingWindowStart("2026-10-06", 7), "2026-09-30");
  assert.equal(reportingWindowStart("2026-10-06", 28), "2026-09-09");
  assert.equal(reportingWindowStart("2026-03-01", 7), "2026-02-23");
  const rows = [
    { date: "2026-10-06", campaign_id: "c1", campaign_name: "LFP | Scott Video", spend: 47.77, impressions: 1045, link_clicks: 19, platform_leads: 2 },
    { date: "2026-10-05", campaign_id: "c1", campaign_name: "LFP | Scott Video", spend: 50, impressions: 1200, link_clicks: 21, platform_leads: 1 },
    { date: "2026-10-01", campaign_id: "c2", campaign_name: "LFP | Mall Video", spend: 10.5, impressions: 300, link_clicks: 4, platform_leads: 0 },
    { date: "2026-09-20", campaign_id: "c2", campaign_name: "LFP | Mall Video", spend: 100, impressions: 3000, link_clicks: 40, platform_leads: 3 },
    { date: "2026-10-07", campaign_id: "c1", campaign_name: "LFP | Scott Video", spend: 999, impressions: 1, link_clicks: 1, platform_leads: 1 },
  ];
  const week = adSummary(rows, 7, "2026-10-06", 4);
  assert.equal(week.spendCents, 10827);
  assert.equal(week.linkClicks, 44);
  assert.equal(week.platformLeads, 3);
  assert.equal(week.costPerPlatformLeadCents, 3609);
  assert.equal(week.costPerCrmLeadCents, 2707);
  assert.deepEqual(
    week.campaigns.map((c) => [c.id, c.spendCents, c.platformLeads, c.costPerPlatformLeadCents]),
    [
      ["c1", 9777, 3, 3259],
      ["c2", 1050, 0, null],
    ],
  );
  const month = adSummary(rows, 28, "2026-10-06", 0);
  assert.equal(month.spendCents, 20827);
  assert.equal(month.costPerCrmLeadCents, null, "no leads in our records means no cost per lead, not infinity");
  assert.equal(adSummary([], 7, "2026-10-06", 2).costPerPlatformLeadCents, null);
});

test("breakEven: the live counter from typed costs, paid money and the campaign price", () => {
  const { breakEven, parseUsd } = commandCenterLib;
  assert.equal(parseUsd("1352.21"), 135221);
  assert.equal(parseUsd("$1,352"), 135200);
  assert.equal(parseUsd(""), null);
  assert.equal(parseUsd(undefined), null);
  assert.equal(parseUsd("lots"), null);
  assert.equal(parseUsd("-5"), null);
  const short = breakEven({ monthlyCostsCents: 135221, paidCents: 0, pricePerClientCents: 750_000 });
  assert.deepEqual([short.clientsToCover, short.clientsRemaining, short.marginCents], [1, 1, -135221]);
  const covered = breakEven({ monthlyCostsCents: 135221, paidCents: 750_000, pricePerClientCents: 750_000 });
  assert.deepEqual([covered.clientsToCover, covered.clientsRemaining, covered.marginCents], [1, 0, 614779]);
  const big = breakEven({ monthlyCostsCents: 2_000_000, paidCents: 750_000, pricePerClientCents: 750_000 });
  assert.deepEqual([big.clientsToCover, big.clientsRemaining], [3, 2]);
  assert.equal(breakEven({ monthlyCostsCents: 0, paidCents: 0, pricePerClientCents: 0 }).clientsToCover, 0, "a zero price never divides by zero");
});
