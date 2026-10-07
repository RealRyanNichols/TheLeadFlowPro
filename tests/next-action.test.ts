import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTION_LABELS,
  ACTION_ORDER,
  buildNextActions,
  isAutomatedAuthor,
  leadPace,
  nextActionLine,
  touchesFromHistory,
  type NextActionLead,
  type NextActionTouch,
  type TouchKind,
} from "../lib/nextAction.ts";
import { copyProblems } from "../lib/hq/copy.ts";

// The next action on every open lead, over fictional rows. Nothing here reads
// a database or a clock: NOW is fixed and every name is made up.

const NOW = new Date("2026-10-07T18:00:00.000Z"); // Wed Oct 7, 1:00 PM Central
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();
const daysAgo = (d: number) => hoursAgo(d * 24);
const hoursAhead = (h: number) => hoursAgo(-h);
const id = (n: number) => `0a1b2c3d-0000-4000-8000-${String(n).padStart(12, "0")}`;

function lead(n: number, overrides: Partial<NextActionLead> = {}): NextActionLead {
  return {
    id: id(n),
    created_at: hoursAgo(1),
    full_name: "Riley Example",
    business_name: "Example Dirt Work (fictional)",
    phone: "(903) 555-0142",
    email: "riley@example.test",
    status: "new",
    priority: "high",
    source: "meta_lead_ad",
    campaign: "scott_contractor_tx_2026_10",
    group: "priority",
    service: "dirt_work_excavation_grading",
    ad_id: null,
    series: "contractor_owner",
    can_text: false,
    can_email: true,
    next_follow_up_at: null,
    is_test: false,
    expected_value_cents: null,
    ...overrides,
  };
}

const touch = (n: number, kind: TouchKind, at: string): NextActionTouch => ({ lead_id: id(n), at, kind });
const only = (leads: NextActionLead[], touches: NextActionTouch[] = [], extra: Partial<Parameters<typeof buildNextActions>[0]> = {}) =>
  buildNextActions({ leads, touches, now: NOW, ...extra });

test("a new priority lead with no call: call 1 of 25, due five minutes after the form", () => {
  const board = only([lead(1)], [], { welcomed: new Set([id(1)]) });
  assert.equal(board.rows.length, 1);
  const row = board.rows[0];
  assert.equal(row.kind, "first_call");
  assert.equal(row.headline, "Call 1 of 25");
  assert.equal(row.planId, "full");
  assert.equal(row.due, true);
  assert.equal(Date.parse(row.dueAt!) - Date.parse(row.lead.created_at), 5 * 60_000);
  assert.equal(row.callsMade, 0);
  assert.equal(row.callsPlanned, 25);
  assert.equal(row.emailsSent, 1);
  assert.equal(row.emailsPlanned, 81);
  assert.equal(row.position, "Calls 0 of 25 · Emails 1 of 81 · Day 0");
  assert.match(row.why, /Riley Example at Example Dirt Work \(fictional\) came in 1 hour ago and no call is on the record\. Priority lead\./);
  // No texting consent on this lead: no text script is handed out.
  assert.deepEqual(row.templateKeys, ["call.first", "voicemail.1", "email.1"]);
  assert.equal(row.href, `/admin/call-sheet/${id(1)}`);
  assert.deepEqual(board.due, board.rows);
});

test("a note written by software is history, not a follow-up: the lead still owes a first call", () => {
  const rows = touchesFromHistory({
    calls: [],
    messages: [],
    notes: [
      { lead_id: id(1), created_at: hoursAgo(0.5), author: "Codex · Patrick-requested Fieldy review" },
      { lead_id: id(1), created_at: hoursAgo(0.4), author: "Claude (Quo log)" },
      { lead_id: id(1), created_at: hoursAgo(0.3), author: "brain" },
    ],
    activity: [],
  });
  assert.deepEqual(rows, []);
  assert.equal(only([lead(1)], rows).rows[0].kind, "first_call");

  // A person's note is a touch, signed or not.
  const human = touchesFromHistory({ calls: [], messages: [], notes: [{ lead_id: id(1), created_at: hoursAgo(0.2), author: "Patrick Grabbs" }, { lead_id: id(1), created_at: hoursAgo(0.1) }], activity: [] });
  assert.equal(human.length, 2);
  for (const who of ["Codex · review", "claude for Amanda", "Brain", "Ryan Nichols (automatic first text)", "Claude (Quo log)"]) assert.equal(isAutomatedAuthor(who), true, who);
  for (const who of ["ryan", "Ryan Nichols", "Patrick Grabbs", "", null, undefined, "Claudette Example"]) assert.equal(isAutomatedAuthor(who), false, String(who));
});

test("history rows become touches by the same rules every time", () => {
  const touches = touchesFromHistory({
    calls: [
      { lead_id: id(1), started_at: hoursAgo(9), direction: "outgoing", outcome: "completed", duration_seconds: 120, scope_status: "company" },
      { lead_id: id(1), started_at: hoursAgo(8), direction: "outgoing", outcome: "completed", duration_seconds: 8, scope_status: "company" },
      { lead_id: id(1), started_at: hoursAgo(7), direction: "outgoing", outcome: "no_answer" },
      { lead_id: id(1), started_at: hoursAgo(6), direction: "incoming", outcome: "missed" },
      { lead_id: id(1), started_at: hoursAgo(5), direction: "incoming", outcome: "completed", duration_seconds: 300 },
      // Scoped out of the company by the Quo layer: not about this lead.
      { lead_id: id(1), started_at: hoursAgo(4), direction: "outgoing", outcome: "answered", scope_status: "noise" },
      { lead_id: null, started_at: hoursAgo(4), direction: "outgoing", outcome: "answered" },
    ],
    messages: [
      { lead_id: id(1), direction: "out", channel: "sms", created_at: hoursAgo(3.5), delivered: true, author: "Ryan Nichols (automatic first text)" },
      { lead_id: id(1), direction: "out", channel: "sms", created_at: hoursAgo(3.4), delivered: true, author: "Ryan Nichols" },
      { lead_id: id(1), direction: "out", channel: "sms", created_at: hoursAgo(3.3), delivered: false, author: "Ryan Nichols" },
      { lead_id: id(1), direction: "out", channel: "email", created_at: hoursAgo(3.2), delivered: true },
      { lead_id: id(1), direction: "in", channel: "sms", created_at: hoursAgo(3.1) },
      { lead_id: id(1), direction: "in", channel: "note", created_at: hoursAgo(3.0) },
    ],
    notes: [],
    activity: [
      { lead_id: id(1), kind: "sales", detail: "Proposal sent. Follow up Fri, Oct 9 at 9:00 AM. Outcome: proposal_sent. Ref 0123456789abcdefghij", created_at: hoursAgo(2) },
      // A stage change on the Sales Desk is not a call.
      { lead_id: id(1), kind: "sales", detail: "Priority changed to high.", created_at: hoursAgo(1.9) },
      { lead_id: id(1), kind: "stage_change", detail: "Outcome: booked.", created_at: hoursAgo(1.8) },
    ],
  });
  assert.deepEqual(
    touches.map((t) => t.kind),
    ["call_out_answered", "call_out_missed", "call_out_missed", "call_in_missed", "call_in_answered", "proposal_sent", "text_auto", "text_out", "email_out", "text_in", "note"],
  );
});

test("a call logged by Quo and by hand inside thirty minutes is one attempt, and the person's word on it wins", () => {
  const touches = touchesFromHistory({
    calls: [{ lead_id: id(1), started_at: hoursAgo(2), direction: "outgoing", outcome: "completed", duration_seconds: 20 }],
    messages: [],
    notes: [],
    activity: [
      { lead_id: id(1), kind: "call", detail: "Call: talked, call back Thu, Oct 8 at 10:00 AM. Outcome: call_back. Ref 0123456789abcdefghij", created_at: hoursAgo(1.9) },
      // Three hours later is a different call.
      { lead_id: id(1), kind: "call", detail: "Call: no answer. Try again Thu. Outcome: no_answer. Ref abcdefghij0123456789", created_at: hoursAgo(-1) },
    ],
  });
  assert.deepEqual(touches.map((t) => t.kind), ["call_out_answered", "call_out_missed"]);
});

test("they reached out and nothing has gone back: answer them, ahead of everything else", () => {
  const board = only(
    [lead(1), lead(2, { created_at: hoursAgo(30) })],
    [touch(2, "call_out_missed", hoursAgo(20)), touch(2, "text_in", hoursAgo(2))],
  );
  assert.equal(board.rows[0].lead.id, id(2));
  assert.equal(board.rows[0].kind, "reply");
  assert.equal(board.rows[0].headline, "Answer them now");
  assert.match(board.rows[0].why, /sent a message 2 hours ago and nothing has gone back since/);
  assert.deepEqual(board.rows[0].templateKeys, ["reply"]);
  assert.equal(nextActionLine(board), "1 person has reached out and is waiting on an answer. Start there.");

  // A missed call from them reads as a call, and a call back after it clears the reply.
  const missed = only([lead(3)], [touch(3, "call_in_missed", hoursAgo(1))]);
  assert.match(missed.rows[0].why, /called and nobody picked up/);
  const answered = only([lead(3)], [touch(3, "call_in_missed", hoursAgo(3)), touch(3, "call_out_missed", hoursAgo(1))]);
  assert.equal(answered.rows[0].kind, "call_attempt");
});

test("unanswered calls count against the plan, and a text is only suggested with consent", () => {
  const created = daysAgo(1);
  // Four attempts: the next is call 5 of 25, which carries a text on the plan.
  const touches = [1, 2, 3, 4].map((i) => touch(1, "call_out_missed", new Date(Date.parse(created) + i * 3_600_000).toISOString()));
  const noConsent = only([lead(1, { created_at: created })], touches).rows[0];
  assert.equal(noConsent.kind, "call_attempt");
  assert.equal(noConsent.headline, "Call 5 of 25");
  assert.equal(noConsent.callsMade, 4);
  assert.deepEqual(noConsent.companions, []);
  assert.deepEqual(noConsent.templateKeys, ["call.attempt"]);
  assert.match(noConsent.why, /has had 4 attempts and no conversation yet\. No text: there is no texting consent on file\./);

  const consent = only([lead(1, { created_at: created, can_text: true })], touches).rows[0];
  assert.deepEqual(consent.companions, ["text"]);
  assert.deepEqual(consent.templateKeys, ["call.attempt", "text.2"]);
  assert.match(consent.why, /No answer: leave text\./);

  // Call 2 of 25 is the double dial: voicemail 1, and an email, right behind the first call.
  const second = only([lead(2, { created_at: hoursAgo(1) })], [touch(2, "call_out_missed", hoursAgo(0.5))]).rows[0];
  assert.equal(second.headline, "Call 2 of 25");
  assert.deepEqual(second.templateKeys, ["call.attempt", "voicemail.1", "email.1"]);
  assert.match(second.why, /No answer: leave voicemail and email\./);
  assert.equal(Date.parse(second.dueAt!) - Date.parse(hoursAgo(0.5)), 2 * 60_000);
});

test("a conversation with nothing scheduled asks for the next step", () => {
  const row = only([lead(1, { created_at: daysAgo(2), status: "contacted" })], [touch(1, "call_out_missed", daysAgo(1.9)), touch(1, "call_out_answered", daysAgo(1))]).rows[0];
  assert.equal(row.kind, "set_next_step");
  assert.equal(row.conversations, 1);
  assert.equal(row.callsMade, 2);
  assert.equal(row.due, true, "a day after the conversation it is due");
  assert.deepEqual(row.templateKeys, ["next_step"]);
  // Inside the first day it is listed, not yet late.
  const fresh = only([lead(2, { status: "contacted" })], [touch(2, "call_in_answered", hoursAgo(0.5))]).rows[0];
  assert.equal(fresh.kind, "set_next_step");
  assert.equal(fresh.due, false);
});

test("a promised time: quiet until it comes, a call back once it has, ignored on a lead nobody touched", () => {
  const talked = [touch(1, "call_out_answered", daysAgo(2))];
  const later = only([lead(1, { created_at: daysAgo(3), status: "contacted", next_follow_up_at: hoursAhead(20) })], talked).rows[0];
  assert.equal(later.kind, "wait");
  assert.equal(later.due, false);
  assert.match(later.why, /follow-up is set for Thu, Oct 8 at 9:00 AM/);

  const due = only([lead(1, { created_at: daysAgo(3), status: "contacted", next_follow_up_at: hoursAgo(3) })], talked);
  assert.equal(due.rows[0].kind, "callback");
  assert.equal(due.rows[0].headline, "Call back, as promised");
  assert.equal(Math.round(due.rows[0].overdueHours), 3);
  assert.equal(nextActionLine(due), "1 call you promised is due. Keep your word first.");

  // A touch after the promised time means the promise was kept.
  const kept = only(
    [lead(1, { created_at: daysAgo(3), status: "contacted", next_follow_up_at: hoursAgo(30) })],
    [...talked, touch(1, "call_out_missed", hoursAgo(29))],
  ).rows[0];
  assert.equal(kept.kind, "call_attempt");

  // The diagnostic route stamps new leads with a time of its own. Nobody promised anything.
  const untouched = only([lead(2, { next_follow_up_at: hoursAhead(48) })]).rows[0];
  assert.equal(untouched.kind, "first_call");
});

test("a proposal is followed up five times in two weeks, then it is a decision", () => {
  const sentAt = "2026-10-06T20:00:00.000Z"; // Tue Oct 6, 3:00 PM
  const base = lead(1, { created_at: daysAgo(5), status: "proposal" });
  const first = only([base], [touch(1, "call_out_answered", daysAgo(2)), touch(1, "proposal_sent", sentAt)]).rows[0];
  assert.equal(first.kind, "proposal_follow_up");
  assert.equal(first.headline, "Proposal follow-up 1 of 5");
  assert.equal(first.dueAt, "2026-10-07T15:00:00.000Z"); // Wed 10:00 AM
  assert.equal(first.due, true);
  assert.match(first.why, /has had the proposal since Tue, Oct 6 at 3:00 PM\. Nobody has followed up yet\./);
  assert.deepEqual(first.templateKeys, ["proposal.1"]);

  const second = only([base], [touch(1, "proposal_sent", sentAt), touch(1, "call_out_missed", hoursAgo(1))]).rows[0];
  assert.equal(second.headline, "Proposal follow-up 2 of 5");
  assert.equal(second.due, false);
  assert.match(second.why, /Followed up 1 time so far\./);

  // A date a person set after sending wins over the ladder.
  const promised = only([{ ...base, next_follow_up_at: hoursAhead(50) }], [touch(1, "proposal_sent", sentAt)]).rows[0];
  assert.equal(promised.dueAt, hoursAhead(50));

  // No send date on the record: the row says so instead of inventing one.
  const unknown = only([base], []).rows[0];
  assert.equal(unknown.kind, "proposal_follow_up");
  assert.match(unknown.why, /is at the proposal stage, with no send date on the record\./);

  const five = [1, 2, 3, 4, 5].map((i) => touch(1, "call_out_missed", new Date(Date.parse(sentAt) + i * 3_600_000).toISOString()));
  const decide = only([base], [touch(1, "proposal_sent", sentAt), ...five]).rows[0];
  assert.equal(decide.kind, "proposal_decide");
  assert.deepEqual(decide.templateKeys, ["proposal.decide"]);
});

test("a booked call: get ready before it, log it after", () => {
  const ahead = only([lead(1, { status: "call_booked", next_follow_up_at: hoursAhead(22) })], [touch(1, "call_out_answered", hoursAgo(1))]).rows[0];
  assert.equal(ahead.kind, "booked");
  assert.equal(ahead.due, false);
  assert.deepEqual(ahead.templateKeys, ["booked.prep"]);
  assert.match(ahead.why, /is booked for Thu, Oct 8 at 11:00 AM/);

  const passed = only([lead(1, { status: "call_booked", next_follow_up_at: hoursAgo(4) })], [touch(1, "call_out_answered", daysAgo(1))]).rows[0];
  assert.equal(passed.kind, "booked_passed");
  assert.equal(passed.due, true);
});

test("when the plan runs out the calls stop and the emails carry on", () => {
  const created = daysAgo(2);
  const three = [1, 2, 3].map((i) => touch(1, "call_out_missed", new Date(Date.parse(created) + i * 3_600_000).toISOString()));
  const row = only([lead(1, { created_at: created, group: "fit_check", priority: "low" })], three, { emails: [{ lead_id: id(1), step: 601, status: "sent" }, { lead_id: id(1), step: 602, status: "sent" }, { lead_id: id(1), step: 603, status: "failed" }] }).rows[0];
  assert.equal(row.planId, "light");
  assert.equal(row.kind, "email_only");
  assert.equal(row.due, false);
  assert.equal(row.dueAt, null);
  assert.equal(row.position, "Calls 3 of 3 · Emails 2 of 81 · Day 2");
  assert.match(row.why, /has had all 3 call attempts with no conversation\. Stop calling\. The email series keeps going\./);
});

test("an old lead that was never called is listed apart, not put back at call 1 weeks overdue", () => {
  const board = only([
    lead(1, { created_at: daysAgo(40), group: null, priority: "normal", series: null, campaign: "services_menu_2026_09" }),
    lead(2, { created_at: daysAgo(10), group: null, priority: "normal", series: null }),
  ]);
  const stale = board.rows.find((r) => r.lead.id === id(1))!;
  assert.equal(stale.kind, "stale");
  assert.equal(stale.due, false);
  assert.match(stale.why, /came in 40 days ago and no call is on the record\. The standard plan ended on day 21\. Call once, or close it\./);
  assert.deepEqual(stale.templateKeys, ["call.reopen"]);
  // Ten days old on a 21-day plan is still on the plan.
  assert.equal(board.rows.find((r) => r.lead.id === id(2))!.kind, "first_call");
  assert.equal(board.counts.stale, 1);
  assert.equal(board.due.length, 1);
  // A contractor lead is on the 90-day plan, so 40 days is not stale for it.
  assert.equal(only([lead(3, { created_at: daysAgo(40) })]).rows[0].kind, "first_call");
});

test("the email count comes from the send history, and the series is found from the steps when the lead does not name one", () => {
  const emails = [101, 102, 103, 103].map((step) => ({ lead_id: id(1), step, status: "sent" }));
  const row = only([lead(1, { series: null, group: null, priority: "normal", created_at: daysAgo(3) })], [], { emails, welcomed: new Set([id(1)]), emailEvents: [{ lead_id: id(1), kind: "opened" }, { lead_id: id(1), kind: "opened" }, { lead_id: id(1), kind: "clicked" }] }).rows[0];
  assert.equal(row.seriesName, "Website series");
  assert.equal(row.emailsSent, 4, "three different steps plus the welcome; a duplicate step is not counted twice");
  assert.equal(row.emailsPlanned, 31);
  assert.equal(row.opens, 2);
  assert.equal(row.clicks, 1);
  // No series and no welcome on record: nothing is assumed.
  const none = only([lead(2, { series: null, group: null })]).rows[0];
  assert.equal(none.emailsSent, 0);
  assert.equal(none.emailsPlanned, null);
  assert.equal(none.position, "Calls 0 of 25 · Day 0");
});

test("due rows come first, in the order the money is: replies, promises, proposals, first calls, then the plan", () => {
  const board = only(
    [
      lead(1, { created_at: daysAgo(2) }), // attempt due
      lead(2, { created_at: hoursAgo(3), group: "standard", priority: "normal" }), // first call, standard
      lead(3, { created_at: hoursAgo(5) }), // first call, priority, older
      lead(4, { created_at: hoursAgo(2) }), // first call, priority, newest
      lead(5, { created_at: daysAgo(6), status: "proposal" }), // proposal follow-up
      lead(6, { created_at: daysAgo(4), status: "contacted", next_follow_up_at: hoursAgo(2) }), // callback
      lead(7, { created_at: daysAgo(1) }), // reply
      lead(8, { created_at: daysAgo(3), status: "contacted", next_follow_up_at: hoursAhead(30) }), // wait
    ],
    [
      touch(1, "call_out_missed", daysAgo(1.9)),
      touch(5, "proposal_sent", daysAgo(3)),
      touch(6, "call_out_answered", daysAgo(3)),
      touch(7, "text_in", hoursAgo(1)),
      touch(8, "call_out_answered", daysAgo(2)),
    ],
  );
  assert.deepEqual(board.rows.map((r) => r.kind), ["reply", "callback", "proposal_follow_up", "first_call", "first_call", "first_call", "call_attempt", "wait"]);
  assert.deepEqual(board.rows.slice(3, 6).map((r) => r.lead.id), [id(4), id(3), id(2)], "priority before standard, newest first");
  assert.equal(board.due.length, 7);
  assert.equal(board.upcoming.length, 1);
  assert.equal(board.counts.first_call, 3);
  assert.deepEqual(Object.keys(board.counts).sort(), [...ACTION_ORDER].sort());
});

test("test records, closed leads and leads with no way to reach them are left off, with the reason", () => {
  const board = only([
    lead(1, { is_test: true }),
    lead(2, { status: "won" }),
    lead(3, { status: "lost" }),
    lead(4, { phone: null, email: null }),
    lead(5, { created_at: "not a date" }),
    lead(6),
  ]);
  assert.deepEqual(board.rows.map((r) => r.lead.id), [id(6)]);
  assert.deepEqual(board.excluded.map((e) => e.reason), ["test record", "status won", "status lost", "no phone and no email", "bad created_at"]);
});

test("the sales desk gets its own link to log the outcome", () => {
  const row = only([lead(1)], [], { hrefFor: (leadId) => `/admin/sales/leads/${leadId}` }).rows[0];
  assert.equal(row.href, `/admin/sales/leads/${id(1)}`);
});

test("the line at the top names where the work is", () => {
  assert.equal(nextActionLine(only([])), "No open leads on the board.");
  assert.equal(nextActionLine(only([lead(1), lead(2)])), "2 leads have never had a call. Call the newest one now.");
  assert.equal(
    nextActionLine(only([lead(1, { status: "proposal", created_at: daysAgo(4) })], [touch(1, "proposal_sent", daysAgo(3))])),
    "1 proposal needs a follow-up. That is the closest money on the board.",
  );
  assert.equal(
    nextActionLine(only([lead(1, { status: "contacted", next_follow_up_at: hoursAhead(5) })], [touch(1, "call_out_answered", hoursAgo(1))])),
    "Nothing is due right now. The next one is listed under Coming up.",
  );
});

test("every sentence the board writes passes the house copy rules", () => {
  const board = only(
    [
      lead(1),
      lead(2, { created_at: daysAgo(40), group: null, priority: "normal", series: null }),
      lead(3, { status: "proposal", created_at: daysAgo(9) }),
      lead(4, { status: "call_booked", next_follow_up_at: hoursAgo(4) }),
      lead(5, { status: "call_booked", next_follow_up_at: hoursAhead(4) }),
      lead(6, { created_at: daysAgo(2), group: "fit_check", priority: "low" }),
      lead(7, { created_at: daysAgo(1), can_text: true }),
    ],
    [
      touch(3, "proposal_sent", daysAgo(8)),
      ...[1, 2, 3, 4, 5].map((i) => touch(3, "call_out_missed", daysAgo(8 - i))),
      touch(4, "call_out_answered", daysAgo(1)),
      touch(5, "call_out_answered", hoursAgo(2)),
      ...[1, 2, 3].map((i) => touch(6, "call_out_missed", daysAgo(2 - i * 0.1))),
      touch(7, "call_out_missed", daysAgo(0.9)),
    ],
  );
  assert.equal(board.rows.length, 7);
  for (const row of board.rows) {
    assert.deepEqual(copyProblems(`${row.headline} ${row.why} ${row.position}`), [], row.kind);
    assert.ok(ACTION_LABELS[row.kind]);
  }
  assert.deepEqual(copyProblems(nextActionLine(board)), []);
});

test("the pace of the first call is measured from the form to the first attempt", () => {
  const leads = [lead(1, { created_at: hoursAgo(10) }), lead(2, { created_at: hoursAgo(72) }), lead(3)];
  const pace = leadPace(leads, [
    touch(1, "call_out_missed", hoursAgo(9.95)),
    touch(1, "call_out_answered", hoursAgo(9)),
    touch(2, "text_out", hoursAgo(70)),
    touch(2, "call_out_missed", hoursAgo(20)),
    touch(2, "call_out_missed", hoursAgo(2)),
  ]);
  assert.deepEqual(pace.map((p) => p.minutesToFirstCall), [3, 52 * 60, null]);
  assert.deepEqual(pace.map((p) => p.attemptsIn48h), [2, 0, 0]);
  assert.deepEqual(pace.map((p) => p.talked), [true, false, false]);
});
