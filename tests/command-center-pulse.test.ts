import assert from "node:assert/strict";
import test from "node:test";
import { agoLabel, hoursSince, pulse } from "../lib/commandCenterPulse.ts";
import type { BoardLead, BoardPurchase } from "../lib/commandCenter.ts";
import type { CallSheetCallRow, CallSheetMessageRow } from "../lib/callSheet.ts";
import { INBOUND_AUTO_REPLY } from "../lib/quo.ts";

// The pulse: when each lane last moved, and whether the gap is a problem.
// Fictional rows only; nothing here reads anything.

const NOW = new Date("2026-10-06T15:00:00.000Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();
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

const call = (lead_id: string | null, started_at: string, overrides: Partial<CallSheetCallRow> = {}): CallSheetCallRow => ({ lead_id, started_at, direction: "outgoing", outcome: "completed", scope_status: "company", ...overrides });
const text = (lead_id: string, direction: "in" | "out", body: string, created_at: string, overrides: Partial<CallSheetMessageRow> = {}): CallSheetMessageRow => ({ lead_id, direction, channel: "sms", body, created_at, ...overrides });
const paid = (created_at: string, status = "paid"): BoardPurchase => ({ id: `p-${created_at}`, kind: "agency_payment", amount_cents: 750_000, status, created_at });

const byKey = (rows: ReturnType<typeof pulse>) => Object.fromEntries(rows.map((r) => [r.key, r]));

test("hoursSince and agoLabel: whole hours, then days, and a plain 'never' for no row", () => {
  assert.equal(hoursSince(hoursAgo(0.5), NOW), 0);
  assert.equal(hoursSince(hoursAgo(5.9), NOW), 5);
  assert.equal(hoursSince(null, NOW), null);
  assert.equal(hoursSince("not a date", NOW), null);
  assert.equal(hoursSince(new Date(NOW.getTime() + 3_600_000).toISOString(), NOW), 0, "a clock ahead of ours is 0, never negative");
  assert.equal(agoLabel(null), "never in the rows read");
  assert.equal(agoLabel(0), "under an hour ago");
  assert.equal(agoLabel(1), "1 hour ago");
  assert.equal(agoLabel(47), "47 hours ago");
  assert.equal(agoLabel(48), "2 days ago");
  assert.equal(agoLabel(24 * 9 + 3), "9 days ago");
});

test("a healthy week: every lane has a heartbeat and nothing warns", () => {
  const rows = pulse({
    leads: [lead({ id: id(1), created_at: hoursAgo(3) }), lead({ id: id(2), created_at: hoursAgo(30), source: "website" })],
    calls: [call(id(2), hoursAgo(20))],
    messages: [text(id(1), "in", "Yes, call me after 3", hoursAgo(4)), text(id(1), "out", "Will do, talk at 3:15.", hoursAgo(3.5))],
    purchases: [paid(hoursAgo(50))],
    now: NOW,
    metaCampaignActive: true,
  });
  assert.deepEqual(
    rows.map((r) => r.key),
    ["lead_any", "lead_meta", "lead_site", "call_had", "text_in", "paid"],
  );
  assert.ok(rows.every((r) => !r.warn), rows.filter((r) => r.warn).map((r) => r.key).join(","));
  const p = byKey(rows);
  assert.equal(p.lead_any.hoursAgo, 3);
  assert.equal(p.lead_meta.hoursAgo, 3);
  assert.equal(p.lead_site.hoursAgo, 30);
  assert.equal(p.call_had.hoursAgo, 20);
  assert.equal(p.text_in.hoursAgo, 4);
  assert.equal(p.paid.hoursAgo, 50);
  assert.match(p.text_in.note, /has a human reply after it/);
});

test("a campaign delivering with no Meta lead in two days is the alarm; with no campaign running it is not", () => {
  const leads = [lead({ id: id(1), created_at: hoursAgo(60) })];
  const active = byKey(pulse({ leads, calls: [], messages: [], purchases: [], now: NOW, metaCampaignActive: true }));
  assert.equal(active.lead_meta.warn, true);
  assert.match(active.lead_meta.note, /A campaign is delivering and no Meta lead has landed in two days/);
  const paused = byKey(pulse({ leads, calls: [], messages: [], purchases: [], now: NOW, metaCampaignActive: false }));
  assert.equal(paused.lead_meta.warn, false);
  assert.match(paused.lead_meta.note, /No campaign is delivering right now/);
  // Meta not read: judged on our records alone, a week of quiet is the line.
  const unread = byKey(pulse({ leads, calls: [], messages: [], purchases: [], now: NOW, metaCampaignActive: null }));
  assert.equal(unread.lead_meta.warn, false);
  const weekQuiet = byKey(pulse({ leads: [lead({ id: id(1), created_at: hoursAgo(24 * 8) })], calls: [], messages: [], purchases: [], now: NOW, metaCampaignActive: null }));
  assert.equal(weekQuiet.lead_meta.warn, true);
  assert.match(weekQuiet.lead_meta.note, /No Meta lead in a week/);
});

test("the silent failures from the recordings: no lead in three days, no logged call in three days, no checkout in 28 days", () => {
  const p = byKey(
    pulse({
      leads: [lead({ id: id(1), created_at: hoursAgo(24 * 4) })],
      calls: [call(id(1), hoursAgo(24 * 5))],
      messages: [],
      purchases: [paid(hoursAgo(24 * 29))],
      now: NOW,
      metaCampaignActive: null,
    }),
  );
  assert.equal(p.lead_any.warn, true);
  assert.match(p.lead_any.note, /Check the ads, the forms, and the lead poll/);
  assert.equal(p.call_had.warn, true);
  assert.match(p.call_had.note, /No logged call in three days/);
  assert.equal(p.paid.warn, true);
  assert.match(p.paid.note, /Nothing on the verified cash ledger in 28 days/);
  assert.equal(p.lead_site.warn, false, "the site lane informs, it never warns on its own");
});

test("no rows at all: every lane says never, and the lanes that must move warn", () => {
  const p = byKey(pulse({ leads: [], calls: [], messages: [], purchases: [], now: NOW, metaCampaignActive: null }));
  for (const key of ["lead_any", "lead_meta", "lead_site", "call_had", "text_in", "paid"] as const) {
    assert.equal(p[key].at, null, key);
    assert.equal(p[key].hoursAgo, null, key);
  }
  assert.equal(p.lead_any.warn, true);
  assert.equal(p.call_had.warn, true);
  assert.equal(p.paid.warn, true);
  assert.equal(p.text_in.warn, false, "no inbound text is nothing owed");
  assert.equal(p.lead_meta.warn, false, "no Meta lead ever and Meta unread is not yet an alarm");
});

test("a text from a lead with no human text after it is a reply owed; the software's own texts do not clear it", () => {
  const inbound = text(id(1), "in", "Can you call me tomorrow?", hoursAgo(5));
  const owed = byKey(pulse({ leads: [lead({ id: id(1) })], calls: [], messages: [inbound], purchases: [], now: NOW, metaCampaignActive: null }));
  assert.equal(owed.text_in.warn, true);
  assert.match(owed.text_in.note, /That is a reply owed/);
  // The automatic reply the line sends to every inbound text is not a person.
  const autoReply = text(id(1), "out", INBOUND_AUTO_REPLY, hoursAgo(4.9));
  const stillOwed = byKey(pulse({ leads: [lead({ id: id(1) })], calls: [], messages: [inbound, autoReply], purchases: [], now: NOW, metaCampaignActive: null }));
  assert.equal(stillOwed.text_in.warn, true, "an automated text is not an answer");
  // A person typed back: cleared.
  const human = text(id(1), "out", "Yes. 10 AM work?", hoursAgo(4));
  const cleared = byKey(pulse({ leads: [lead({ id: id(1) })], calls: [], messages: [inbound, autoReply, human], purchases: [], now: NOW, metaCampaignActive: null }));
  assert.equal(cleared.text_in.warn, false);
  // A rejected send does not count as an answer.
  const bounced = text(id(1), "out", "Yes. 10 AM work?", hoursAgo(4), { delivered: false });
  const bouncedOwed = byKey(pulse({ leads: [lead({ id: id(1) })], calls: [], messages: [inbound, bounced], purchases: [], now: NOW, metaCampaignActive: null }));
  assert.equal(bouncedOwed.text_in.warn, true);
  // Under two hours old is not yet owed.
  const fresh = byKey(pulse({ leads: [lead({ id: id(1) })], calls: [], messages: [text(id(1), "in", "Call me", hoursAgo(1))], purchases: [], now: NOW, metaCampaignActive: null }));
  assert.equal(fresh.text_in.warn, false);
});

test("only a call somebody had counts for the call lane: missed inbound calls and calls out of scope do not", () => {
  const p = byKey(
    pulse({
      leads: [lead({ id: id(1), created_at: hoursAgo(24 * 2) })],
      calls: [
        call(id(1), hoursAgo(2), { direction: "incoming", outcome: "missed" }),
        call(id(1), hoursAgo(3), { scope_status: "personal" }),
        call(null, hoursAgo(4)),
        call(id(1), hoursAgo(24 * 4)),
      ],
      messages: [],
      purchases: [],
      now: NOW,
      metaCampaignActive: null,
    }),
  );
  assert.equal(p.call_had.hoursAgo, 24 * 4);
  assert.equal(p.call_had.warn, true);
});

test("only a paid checkout moves the paid lane", () => {
  const p = byKey(pulse({ leads: [], calls: [], messages: [], purchases: [paid(hoursAgo(1), "pending"), paid(hoursAgo(2), "failed"), paid(hoursAgo(10), "COMPLETED")], now: NOW, metaCampaignActive: null }));
  assert.equal(p.paid.hoursAgo, 10);
  assert.equal(p.paid.warn, false);
});
