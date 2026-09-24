import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { touchesFromRows, type CallSheetLead, type CallSheetTouch } from "../lib/callSheet.ts";
import { copyProblems } from "../lib/hq/copy.ts";
import { INBOUND_AUTO_REPLY } from "../lib/quo.ts";
import { SPEED_TARGET_HOURS, SPEED_WINDOW_DAYS, speedToLead, speedToLeadLine, type SpeedToLead } from "../lib/speedToLead.ts";

// Fixed clock: Tuesday 2026-09-22 at 10:00 AM CDT. Every lead is fictional.
const NOW = new Date("2026-09-22T15:00:00.000Z");
const HOUR = 3_600_000;
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * HOUR).toISOString();
const plus = (iso: string, h: number) => new Date(Date.parse(iso) + h * HOUR).toISOString();

function lead(overrides: Partial<CallSheetLead> & { id: string }): CallSheetLead {
  return {
    created_at: hoursAgo(30),
    full_name: `Sample ${overrides.id}`,
    business_name: "Sample Pressure Washing (fictional)",
    email: `${overrides.id}@example.test`,
    phone: "(903) 555-0100",
    interest: "free_website_program",
    status: "new",
    source: "meta_lead_ad",
    utm_source: "facebook",
    best_contact_method: "phone",
    sms_consent: false,
    sms_unsubscribed_at: null,
    is_test: false,
    next_follow_up_at: null,
    ...overrides,
  };
}

test("counts reached, still inside, and missed across the window, with the call sheet's touch rules", () => {
  const leads = [
    lead({ id: "note", created_at: hoursAgo(50) }),
    lead({ id: "call", created_at: hoursAgo(100) }),
    lead({ id: "text", created_at: hoursAgo(70) }),
    lead({ id: "late", created_at: hoursAgo(120) }),
    lead({ id: "never", created_at: hoursAgo(60) }),
    lead({ id: "rejected_send", created_at: hoursAgo(40) }),
    lead({ id: "only_their_reply", created_at: hoursAgo(40) }),
    lead({ id: "fresh", created_at: hoursAgo(3) }),
    lead({ id: "fresh_reached", created_at: hoursAgo(5) }),
    // Won and lost still count: they were new leads this week.
    lead({ id: "won", status: "won", created_at: hoursAgo(90) }),
  ];
  const touches: CallSheetTouch[] = [
    { lead_id: "note", at: plus(hoursAgo(50), 2), kind: "note" },
    { lead_id: "call", at: plus(hoursAgo(100), 20), kind: "call" },
    { lead_id: "text", at: plus(hoursAgo(70), 1), kind: "message_out" },
    { lead_id: "late", at: plus(hoursAgo(120), 30), kind: "call" },
    { lead_id: "only_their_reply", at: plus(hoursAgo(40), 1), kind: "message_in" },
    { lead_id: "only_their_reply", at: plus(hoursAgo(40), 2), kind: "call_in" },
    { lead_id: "fresh_reached", at: plus(hoursAgo(5), 1), kind: "call" },
    { lead_id: "won", at: plus(hoursAgo(90), 4), kind: "call" },
  ];
  // A text the provider rejected, and the automatic text-back, never become touches:
  // touchesFromRows drops them before they get here.
  const software = touchesFromRows({
    notes: [],
    calls: [],
    messages: [
      { lead_id: "rejected_send", direction: "out", channel: "sms", body: "Hi Sam, Ryan here. Thursday at 2 work for you?", created_at: plus(hoursAgo(40), 1), delivered: false },
      { lead_id: "rejected_send", direction: "out", channel: "sms", body: INBOUND_AUTO_REPLY, created_at: plus(hoursAgo(40), 1), delivered: true },
    ],
  });
  assert.deepEqual(software, [], "neither is a touch");

  const s = speedToLead(leads, [...touches, ...software], NOW);
  assert.deepEqual(s, {
    windowDays: SPEED_WINDOW_DAYS,
    leads: 10,
    reachedIn24h: 5, // note, call, text, fresh_reached, won
    stillInside24h: 1, // fresh
    missed: 4, // late, never, rejected_send, only_their_reply
    partial: false,
  });
  assert.equal(s.leads, s.reachedIn24h + s.stillInside24h + s.missed);
});

test("the 24 hour line: exactly 24 hours counts as reached, one minute later does not", () => {
  const created = hoursAgo(48);
  const leads = [lead({ id: "on_the_line", created_at: created }), lead({ id: "a_minute_late", created_at: created })];
  const touches: CallSheetTouch[] = [
    { lead_id: "on_the_line", at: plus(created, SPEED_TARGET_HOURS), kind: "call" },
    { lead_id: "a_minute_late", at: plus(created, SPEED_TARGET_HOURS + 1 / 60), kind: "call" },
  ];
  const s = speedToLead(leads, touches, NOW);
  assert.equal(s.reachedIn24h, 1);
  assert.equal(s.missed, 1);

  // The earliest touch decides, whatever order the rows arrive in.
  const reordered = speedToLead(leads, [...touches].reverse().concat([{ lead_id: "a_minute_late", at: plus(created, 2), kind: "note" }]), NOW);
  assert.equal(reordered.reachedIn24h, 2);

  // A lead exactly 24 hours old with no touch has run out of time: missed, not still inside.
  const edge = speedToLead([lead({ id: "edge", created_at: hoursAgo(SPEED_TARGET_HOURS) })], [], NOW);
  assert.deepEqual([edge.stillInside24h, edge.missed], [0, 1]);
  const inside = speedToLead([lead({ id: "inside", created_at: hoursAgo(SPEED_TARGET_HOURS - 1 / 60) })], [], NOW);
  assert.deepEqual([inside.stillInside24h, inside.missed], [1, 0]);
});

test("test records, leads outside the window, and unreadable dates are not counted", () => {
  const leads = [
    lead({ id: "real", created_at: hoursAgo(30) }),
    lead({ id: "test", is_test: true, created_at: hoursAgo(30) }),
    lead({ id: "old", created_at: hoursAgo(24 * 7 + 1) }),
    lead({ id: "edge_of_window", created_at: hoursAgo(24 * 7) }),
    lead({ id: "bad", created_at: "not a date" }),
  ];
  const s = speedToLead(leads, [{ lead_id: "test", at: hoursAgo(29), kind: "call" }], NOW);
  assert.equal(s.leads, 2, "real and the lead exactly at the window edge");
  assert.equal(s.reachedIn24h, 0, "a touch on a test record never counts");
  assert.equal(s.missed, 2);

  // A wider window picks the older lead up.
  assert.equal(speedToLead(leads, [], NOW, { windowDays: 30 }).leads, 3);
  // A nonsense window falls back to the default.
  assert.equal(speedToLead(leads, [], NOW, { windowDays: 0 }).windowDays, SPEED_WINDOW_DAYS);
  assert.equal(speedToLead(leads, [], NOW, { windowDays: Number.NaN }).windowDays, SPEED_WINDOW_DAYS);
});

test("leads still inside their first day are neither a win nor a miss", () => {
  const leads = [lead({ id: "a", created_at: hoursAgo(1) }), lead({ id: "b", created_at: hoursAgo(23) }), lead({ id: "c", created_at: hoursAgo(2) })];
  const s = speedToLead(leads, [{ lead_id: "c", at: hoursAgo(1), kind: "message_out" }], NOW);
  assert.deepEqual([s.leads, s.reachedIn24h, s.stillInside24h, s.missed], [3, 1, 2, 0]);
});

test("the partial flag is carried through and said out loud", () => {
  const leads = [lead({ id: "a" })];
  assert.equal(speedToLead(leads, [], NOW).partial, false);
  const s = speedToLead(leads, [], NOW, { partial: true });
  assert.equal(s.partial, true);
  assert.ok(speedToLeadLine(s).endsWith(" Partial: some history did not load."));
  assert.equal(speedToLeadLine({ ...s, leads: 0, missed: 0 }), "No new leads in the last 7 days. Partial: some history did not load.");
});

test("the line reads exactly as the call sheet shows it", () => {
  const base: SpeedToLead = { windowDays: 7, leads: 9, reachedIn24h: 4, stillInside24h: 2, missed: 3, partial: false };
  assert.equal(speedToLeadLine(base), "Last 7 days: a person reached out to 4 of 9 new leads within 24 hours. 2 are still inside their first 24 hours.");
  assert.equal(speedToLeadLine({ ...base, stillInside24h: 1, missed: 4 }), "Last 7 days: a person reached out to 4 of 9 new leads within 24 hours. 1 is still inside their first 24 hours.");
  assert.equal(speedToLeadLine({ ...base, stillInside24h: 0, missed: 5 }), "Last 7 days: a person reached out to 4 of 9 new leads within 24 hours.");
  assert.equal(
    speedToLeadLine({ windowDays: 7, leads: 1, reachedIn24h: 0, stillInside24h: 0, missed: 1, partial: false }),
    "Last 7 days: a person reached out to 0 of 1 new lead within 24 hours.",
  );
  assert.equal(speedToLeadLine({ ...base, windowDays: 1 }), "Last 1 day: a person reached out to 4 of 9 new leads within 24 hours. 2 are still inside their first 24 hours.");
});

test("no leads in the window gives its own line", () => {
  const s = speedToLead([], [], NOW);
  assert.deepEqual(s, { windowDays: 7, leads: 0, reachedIn24h: 0, stillInside24h: 0, missed: 0, partial: false });
  assert.equal(speedToLeadLine(s), "No new leads in the last 7 days.");
  assert.equal(speedToLeadLine(speedToLead([], [], NOW, { windowDays: 30 })), "No new leads in the last 30 days.");
});

test("every line passes the copy rules, and the module is pure", () => {
  const samples: SpeedToLead[] = [
    { windowDays: 7, leads: 0, reachedIn24h: 0, stillInside24h: 0, missed: 0, partial: false },
    { windowDays: 7, leads: 0, reachedIn24h: 0, stillInside24h: 0, missed: 0, partial: true },
    { windowDays: 7, leads: 1, reachedIn24h: 1, stillInside24h: 0, missed: 0, partial: false },
    { windowDays: 7, leads: 9, reachedIn24h: 4, stillInside24h: 2, missed: 3, partial: true },
    { windowDays: 30, leads: 47, reachedIn24h: 2, stillInside24h: 1, missed: 44, partial: false },
  ];
  for (const s of samples) {
    const line = speedToLeadLine(s);
    assert.deepEqual(copyProblems(line), [], line);
    assert.ok(!line.includes("$"), line);
  }
  const source = readFileSync(join(process.cwd(), "lib/speedToLead.ts"), "utf8");
  for (const banned of ["fetch(", "lib/quo", "leadNotify", "supabase", "sendEmail", "sendSms", "new Date()", "Date.now("]) {
    assert.ok(!source.includes(banned), `lib/speedToLead.ts must not use ${banned}`);
  }
  const imports = source.match(/^import .*$/gm) ?? [];
  assert.deepEqual(imports, ['import type { CallSheetLead, CallSheetTouch } from "@/lib/callSheet";'], "type-only import, nothing loads at runtime");
  assert.ok(!/[\u2013\u2014]/.test(source), "house style: no em or en dashes");
});
