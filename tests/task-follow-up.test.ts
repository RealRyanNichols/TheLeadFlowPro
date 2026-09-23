// The older task screens and the Sales Desk date box must not erase or move a
// call back the Call Closer stored in leads.next_follow_up_at. The helpers run
// against a fake leads table that applies the filters they send, so "only
// while it is still the time that task set" is checked in the database's
// terms, not by reading a value first. Fixed clocks, fictional data.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { planCallOutcome, type CallOutcome, type NextStepRequest } from "../lib/callCloser.ts";
import { SAMPLE_CALL_LEAD, SAMPLE_NOW } from "../lib/callCloserFixtures.ts";
import { formatCentral, quickCallbackChoices } from "../lib/businessTime.ts";
import { copyProblems } from "../lib/hq/copy.ts";
import { diagnosticReviewDueDate, stampDiagnosticFollowUp } from "../lib/diagnosticFollowUp.ts";
import {
  TASK_FOLLOW_UP_TIME,
  clearTaskFollowUp,
  followUpDay,
  followUpDayEdit,
  moveTaskFollowUp,
  setTaskFollowUpIfEmpty,
  taskFollowUpAt,
  taskFollowUpValues,
} from "../lib/taskFollowUp.ts";

type Lead = { id: string; next_follow_up_at: string | null };
/** A lead_activity row, as the Call Closer or another screen wrote it. */
type Activity = { lead_id: string; kind: string; detail: string; created_at: string };
type Client = Parameters<typeof clearTaskFollowUp>[0];
/** The fake answers only the calls the helpers make; the cast says so to the type checker. */
const asClient = (db: ReturnType<typeof fakeLeads>) => db as unknown as Client;

/** When the task in these tests was created: Mon, Sep 21, 2026 at 10:00 AM CDT. */
const TASK_CREATED = "2026-09-21T15:00:00.000Z";

function likeToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".");
  return new RegExp(`^${escaped}$`, "s");
}

/** A read of lead_activity that applies the filters sent (eq, in, ilike, order, limit). */
function activityRead(activity: Activity[], reads: string[]) {
  let out = activity.slice();
  const chain = {
    select() {
      return chain;
    },
    eq(col: string, v: unknown) {
      reads.push(`eq ${col}`);
      out = out.filter((r) => (r as Record<string, unknown>)[col] === v);
      return chain;
    },
    in(col: string, list: unknown[]) {
      reads.push(`in ${col}`);
      out = out.filter((r) => list.includes((r as Record<string, unknown>)[col]));
      return chain;
    },
    ilike(col: string, pattern: string) {
      reads.push(`ilike ${col}`);
      out = out.filter((r) => likeToRegExp(pattern).test(String((r as Record<string, unknown>)[col])));
      return chain;
    },
    order(col: string, o: { ascending?: boolean }) {
      const sign = o?.ascending === false ? -1 : 1;
      out.sort((a, b) => String((a as Record<string, unknown>)[col]).localeCompare(String((b as Record<string, unknown>)[col])) * sign);
      return chain;
    },
    limit(n: number) {
      out = out.slice(0, n);
      return chain;
    },
    then(resolve: (v: unknown) => unknown) {
      return Promise.resolve({ data: out, error: null }).then(resolve);
    },
  };
  return chain;
}

function fakeLeads(rows: Lead[], activity: Activity[] = []) {
  const writes: { value: unknown; filters: [string, string, unknown][] }[] = [];
  const activityReads: string[] = [];
  return {
    writes,
    activityReads,
    from(table: string) {
      // The only other table the helpers read: the lead's timeline, to find the newest Call Closer save.
      if (table === "lead_activity") return activityRead(activity, activityReads);
      assert.equal(table, "leads");
      let value: unknown;
      const filters: [string, string, unknown][] = [];
      const chain = {
        update(patch: { next_follow_up_at: unknown }) {
          assert.deepEqual(Object.keys(patch), ["next_follow_up_at"], "only the follow-up time is written");
          value = patch.next_follow_up_at;
          return chain;
        },
        eq(col: string, v: unknown) {
          filters.push(["eq", col, v]);
          return chain;
        },
        is(col: string, v: unknown) {
          filters.push(["is", col, v]);
          return chain;
        },
        select() {
          writes.push({ value, filters });
          assert.ok(
            filters.some(([, col]) => col === "next_follow_up_at"),
            "every write is conditional on the value in the database",
          );
          const hit = rows.filter((r) =>
            // eq and is null both mean "the stored value is exactly this".
            filters.every(([, col, v]) => ((r as Record<string, unknown>)[col] ?? null) === v),
          );
          for (const r of hit) r.next_follow_up_at = value as string | null;
          return Promise.resolve({ data: hit.map((r) => ({ id: r.id })), error: null });
        },
      };
      return chain;
    },
  };
}

/** The Call Closer's own call back: Talked, call back Thu, Sep 24 at 3:00 PM Central. */
function callCloserCallback(): string {
  const plan = planCallOutcome({
    lead: SAMPLE_CALL_LEAD,
    request: {
      outcome: "call_back",
      idempotencyKey: "0f6d7c1a-2b3e-4f5a-8b9c-1d2e3f4a5b6c",
      note: null,
      offers: [],
      meeting: null,
      callback: { localDate: "2026-09-24", time: "15:00" },
      lostReason: null,
    },
    actorName: "Ryan",
    now: SAMPLE_NOW,
    priorAttempts: 0,
  });
  assert.ok(plan.ok);
  return String(plan.leadPatch.next_follow_up_at);
}

test("a task's follow-up time is 9:00 AM Central on its due day, whatever the browser's zone", () => {
  assert.equal(TASK_FOLLOW_UP_TIME, "09:00");
  assert.equal(taskFollowUpAt("2026-09-22"), "2026-09-22T14:00:00.000Z"); // CDT
  assert.equal(taskFollowUpAt("2026-11-03"), "2026-11-03T15:00:00.000Z"); // CST
  const values = taskFollowUpValues("2026-09-22");
  assert.equal(values[0], "2026-09-22T14:00:00.000Z");
  assert.ok(values.includes(new Date("2026-09-22T09:00:00").toISOString()), "older screens wrote 9:00 AM on the browser clock");
  assert.deepEqual(taskFollowUpValues(null), []);
  assert.deepEqual(taskFollowUpValues("not a date"), []);
});

test("completing an unrelated task leaves a Call Closer call back alone", async () => {
  const promised = callCloserCallback();
  assert.equal(promised, "2026-09-24T20:00:00.000Z");
  const rows: Lead[] = [
    { id: "promised", next_follow_up_at: promised },
    { id: "task_set", next_follow_up_at: taskFollowUpAt("2026-09-22") },
  ];
  const db = fakeLeads(rows);

  // "Review Business Growth Diagnostic and follow up", due Tuesday, ticked done.
  const kept = await clearTaskFollowUp(asClient(db), "promised", "2026-09-22", TASK_CREATED);
  assert.deepEqual(kept, { changed: false, value: null, error: null });
  assert.equal(rows[0].next_follow_up_at, promised, "the Thursday 3:00 PM call back survives");

  // The follow-up that task itself set is cleared, as before.
  const cleared = await clearTaskFollowUp(asClient(db), "task_set", "2026-09-22", TASK_CREATED);
  assert.equal(cleared.changed, true);
  assert.equal(rows[1].next_follow_up_at, null);

  // A task with no due date set nothing, so it clears nothing and writes nothing.
  const before = db.writes.length;
  assert.equal((await clearTaskFollowUp(asClient(db), "promised", null, TASK_CREATED)).changed, false);
  assert.equal(db.writes.length, before);
  assert.equal(rows[0].next_follow_up_at, promised);
});

test("rescheduling a task moves only the follow-up time it set, or fills an empty one", async () => {
  const promised = callCloserCallback();
  const rows: Lead[] = [
    { id: "promised", next_follow_up_at: promised },
    { id: "task_set", next_follow_up_at: taskFollowUpAt("2026-09-22") },
    { id: "empty", next_follow_up_at: null },
  ];
  const db = fakeLeads(rows);

  const untouched = await moveTaskFollowUp(asClient(db), "promised", "2026-09-22", "2026-09-25", TASK_CREATED);
  assert.equal(untouched.changed, false);
  assert.equal(rows[0].next_follow_up_at, promised);

  const moved = await moveTaskFollowUp(asClient(db), "task_set", "2026-09-22", "2026-09-25", TASK_CREATED);
  assert.deepEqual(moved, { changed: true, value: "2026-09-25T14:00:00.000Z", error: null });
  assert.equal(rows[1].next_follow_up_at, "2026-09-25T14:00:00.000Z");

  const filled = await moveTaskFollowUp(asClient(db), "empty", null, "2026-09-25", TASK_CREATED);
  assert.equal(filled.changed, true);
  assert.equal(rows[2].next_follow_up_at, "2026-09-25T14:00:00.000Z");

  // Clearing the task's date clears only the time it set.
  const clearedDate = await moveTaskFollowUp(asClient(db), "task_set", "2026-09-25", "", TASK_CREATED);
  assert.deepEqual(clearedDate, { changed: true, value: null, error: null });
  assert.equal((await moveTaskFollowUp(asClient(db), "promised", "2026-09-25", "", TASK_CREATED)).changed, false);
  assert.equal(rows[0].next_follow_up_at, promised);
});

test("the Sales Desk date box: Central day on screen, no write when unchanged, and a date change keeps the promised time", () => {
  // Talked, call back Thu, Sep 24 at 7:30 PM Central, stored as Fri 00:30Z.
  const evening = "2026-09-25T00:30:00.000Z";
  assert.equal(followUpDay(evening), "2026-09-24", "the box shows the Central day, not the UTC one");
  assert.equal(followUpDay(null), "");
  assert.equal(followUpDay("garbage"), "");

  // Tabbing through the box writes nothing.
  assert.deepEqual(followUpDayEdit(evening, "2026-09-24"), { write: false });
  const promised = callCloserCallback();
  assert.deepEqual(followUpDayEdit(promised, followUpDay(promised)), { write: false });
  // A half-typed date writes nothing either.
  assert.deepEqual(followUpDayEdit(promised, "2026-09-2"), { write: false });

  // Moving the day keeps the time of day that was promised, in Central.
  assert.deepEqual(followUpDayEdit(promised, "2026-09-25"), { write: true, value: "2026-09-25T20:00:00.000Z" });
  assert.deepEqual(followUpDayEdit(evening, "2026-09-28"), { write: true, value: "2026-09-29T00:30:00.000Z" });
  // Across the November change the wall clock holds: 3:00 PM CDT becomes 3:00 PM CST.
  assert.deepEqual(followUpDayEdit(promised, "2026-11-03"), { write: true, value: "2026-11-03T21:00:00.000Z" });
  // Nothing stored: 9:00 AM Central. Cleared: null.
  assert.deepEqual(followUpDayEdit(null, "2026-09-25"), { write: true, value: "2026-09-25T14:00:00.000Z" });
  assert.deepEqual(followUpDayEdit(promised, ""), { write: true, value: null });
});

test("the task screens and the Sales Desk box write the follow-up time only through these helpers", () => {
  const workspace = readFileSync("app/sales/leads/[id]/SalesLeadWorkspace.tsx", "utf8");
  const board = readFileSync("app/sales/follow-ups/FollowUpBoard.tsx", "utf8");
  for (const [name, source] of [
    ["SalesLeadWorkspace", workspace],
    ["FollowUpBoard", board],
  ] as const) {
    assert.ok(!/update\(\{\s*next_follow_up_at:\s*null\s*\}\)/.test(source), `${name} never clears the follow-up time unconditionally`);
    assert.ok(!/T09:00:00`\)/.test(source), `${name} builds no browser-local 9 AM`);
    assert.ok(!/next_follow_up_at\?\.slice\(0, 10\)/.test(source), `${name} shows no UTC day`);
  }
  assert.match(workspace, /clearTaskFollowUp\(/);
  assert.match(workspace, /followUpDayEdit\(/);
  assert.match(workspace, /if \(!edit\.write\) return;/);
  assert.match(board, /clearTaskFollowUp\(/);
  assert.match(board, /moveTaskFollowUp\(/);
  // A new task fills the field only when it is empty, on both screens, and never writes it directly.
  for (const [name, source] of [
    ["SalesLeadWorkspace", workspace],
    ["FollowUpBoard", board],
  ] as const) {
    assert.ok(!/update\(\{\s*next_follow_up_at:/.test(source), `${name} never writes the follow-up time without a condition`);
    assert.match(source, /setTaskFollowUpIfEmpty\(/, `${name} fills the follow-up time only when it is empty`);
    assert.ok(!/taskFollowUpAt\(/.test(source), `${name} does not build a task time to write itself`);
  }
  // Both screens hand the task's creation time over, so a newer Call Closer save wins.
  assert.match(board, /clearTaskFollowUp\(supabase, task\.lead_id, task\.due_date, task\.created_at\)/);
  assert.match(board, /moveTaskFollowUp\(supabase, task\.lead_id, previous, due_date, task\.created_at\)/);
  assert.match(workspace, /task\.due_date,\s*task\.created_at,/);
});

// ---------------------------------------------------------------------------
// The same 9:00 AM instant from both sides. The Call Closer's quick call back
// chips and its Proposal sent follow-up land on 9:00 AM Central, exactly what
// a task due that day stores, so the value alone cannot say whose it is.
// ---------------------------------------------------------------------------

/** One Call Closer save on the lead, as the route writes it: the planned patch and the timeline row. */
function callCloserSave(
  outcome: CallOutcome,
  now: Date,
  extra: Partial<NextStepRequest> = {},
  savedAt = new Date(now.getTime() + 1000).toISOString(),
): { followUp: string | null; activity: Activity } {
  const plan = planCallOutcome({
    lead: { ...SAMPLE_CALL_LEAD, status: "contacted" },
    request: {
      outcome,
      idempotencyKey: `${outcome.replace(/_/g, "-")}-0f6d7c1a-2b3e-4f5a`,
      note: null,
      offers: [],
      meeting: null,
      callback: null,
      lostReason: null,
      ...extra,
    },
    actorName: "Ryan",
    now,
    priorAttempts: 0,
  });
  assert.ok(plan.ok, outcome);
  return {
    followUp: plan.leadPatch.next_follow_up_at ?? null,
    activity: { lead_id: "lead", kind: plan.activity.kind, detail: plan.activity.detail, created_at: savedAt },
  };
}

test("a 9:00 AM call back chip on a task's due day survives finishing or moving that task", async () => {
  // Tue: a follow-up task is added on the board, due Thu, Sep 24.
  const taskCreated = "2026-09-22T16:00:00.000Z";
  // Wed 10:00 AM: the lead asks for a call tomorrow morning, and Ryan taps the first chip.
  const wed = new Date("2026-09-23T15:00:00.000Z");
  const chip = quickCallbackChoices(wed)[0];
  assert.deepEqual([chip.localDate, chip.time], ["2026-09-24", "09:00"]);
  const saved = callCloserSave("call_back", wed, { callback: { localDate: chip.localDate, time: chip.time } });
  assert.equal(saved.followUp, taskFollowUpAt("2026-09-24"), "the same instant a task due Thursday stores");

  const rows: Lead[] = [{ id: "lead", next_follow_up_at: saved.followUp }];
  const db = fakeLeads(rows, [saved.activity]);
  // Thu 8:30 AM the task is ticked done: the promise is still there.
  assert.deepEqual(await clearTaskFollowUp(asClient(db), "lead", "2026-09-24", taskCreated), { changed: false, value: null, error: null });
  assert.equal(rows[0].next_follow_up_at, "2026-09-24T14:00:00.000Z");
  // Moving the task to Tuesday does not carry the promise with it.
  const moved = await moveTaskFollowUp(asClient(db), "lead", "2026-09-24", "2026-09-29", taskCreated);
  assert.equal(moved.changed, false);
  assert.equal(rows[0].next_follow_up_at, "2026-09-24T14:00:00.000Z");
  assert.equal(db.writes.length, 0, "nothing was even tried");
  // It asked the timeline for the Call Closer's own entries only.
  assert.ok(db.activityReads.includes("in kind") && db.activityReads.includes("ilike detail"));

  // The plain case still works: the task set the time and no Call Closer save came after.
  const plain: Lead[] = [{ id: "lead", next_follow_up_at: taskFollowUpAt("2026-09-24") }];
  const plainDb = fakeLeads(plain);
  assert.equal((await clearTaskFollowUp(asClient(plainDb), "lead", "2026-09-24", taskCreated)).changed, true);
  assert.equal(plain[0].next_follow_up_at, null);
});

test("a Proposal sent follow-up that lands on another task's due day survives that task", async () => {
  // Tue 10:00 AM: proposal marked sent. Follow up Thu at 9:00 AM (a kind "sales" timeline entry).
  const saved = callCloserSave("proposal_sent", SAMPLE_NOW, { offers: ["website_launch"] });
  assert.equal(saved.activity.kind, "sales");
  assert.equal(saved.followUp, taskFollowUpAt("2026-09-24"));
  const rows: Lead[] = [{ id: "lead", next_follow_up_at: saved.followUp }];
  // A task due Thursday, added Monday, is finished.
  const db = fakeLeads(rows, [saved.activity]);
  assert.equal((await clearTaskFollowUp(asClient(db), "lead", "2026-09-24", TASK_CREATED)).changed, false);
  assert.equal(rows[0].next_follow_up_at, "2026-09-24T14:00:00.000Z");

  // Any other Sales Desk entry is not a Call Closer save and protects nothing.
  const desk: Activity = { lead_id: "lead", kind: "sales", detail: "Ryan: Priority set to high", created_at: "2026-09-22T16:00:00.000Z" };
  const other: Lead[] = [{ id: "lead", next_follow_up_at: taskFollowUpAt("2026-09-24") }];
  assert.equal((await clearTaskFollowUp(asClient(fakeLeads(other, [desk])), "lead", "2026-09-24", TASK_CREATED)).changed, true);
});

test("a new task never replaces a stored call back, and finishing it later leaves the call back in place", async () => {
  // Tue: Talked, call back Thu at 3:00 PM (saved from the call card).
  const promised = callCloserCallback();
  const saved = callCloserSave("call_back", SAMPLE_NOW, { callback: { localDate: "2026-09-24", time: "15:00" } });
  assert.equal(saved.followUp, promised);
  const rows: Lead[] = [
    { id: "lead", next_follow_up_at: promised },
    { id: "empty", next_follow_up_at: null },
  ];
  const db = fakeLeads(rows, [saved.activity]);
  // Later that day an email follow-up is assigned for Mon, Sep 28 on the board.
  const set = await setTaskFollowUpIfEmpty(asClient(db), "lead", "2026-09-28");
  assert.deepEqual(set, { changed: false, value: "2026-09-28T14:00:00.000Z", error: null });
  assert.equal(rows[0].next_follow_up_at, promised, "Thursday 3:00 PM still brings the lead back");
  // The write was conditional on an empty field, in the database.
  assert.ok(db.writes[0].filters.some(([op, col, v]) => op === "is" && col === "next_follow_up_at" && v === null));
  // Monday the task is done: the call back is untouched.
  assert.equal((await clearTaskFollowUp(asClient(db), "lead", "2026-09-28", "2026-09-22T18:00:00.000Z")).changed, false);
  assert.equal(rows[0].next_follow_up_at, promised);
  // A lead with nothing set gets the task's day at 9:00 AM Central.
  assert.deepEqual(await setTaskFollowUpIfEmpty(asClient(db), "empty", "2026-09-28"), { changed: true, value: "2026-09-28T14:00:00.000Z", error: null });
  assert.equal(rows[1].next_follow_up_at, "2026-09-28T14:00:00.000Z");
  // No due date: nothing to set, nothing written.
  const before = db.writes.length;
  assert.equal((await setTaskFollowUpIfEmpty(asClient(db), "empty", "")).changed, false);
  assert.equal(db.writes.length, before);

  // The other order: a 9:00 AM chip saved Tuesday for Thursday, then a task due Thursday added Wednesday
  // (it filled nothing, the field was set). Finishing that task leaves the promise: the save names that time.
  const chip = quickCallbackChoices(SAMPLE_NOW)[1];
  assert.deepEqual([chip.localDate, chip.time], ["2026-09-24", "09:00"]);
  const early = callCloserSave("call_back", SAMPLE_NOW, { callback: { localDate: chip.localDate, time: chip.time } });
  assert.ok(early.activity.detail.includes(formatCentral(new Date(taskFollowUpAt("2026-09-24")))));
  const later: Lead[] = [{ id: "lead", next_follow_up_at: early.followUp }];
  const laterDb = fakeLeads(later, [early.activity]);
  assert.equal((await setTaskFollowUpIfEmpty(asClient(laterDb), "lead", "2026-09-24")).changed, false);
  assert.equal((await clearTaskFollowUp(asClient(laterDb), "lead", "2026-09-24", "2026-09-23T15:00:00.000Z")).changed, false);
  assert.equal(later[0].next_follow_up_at, "2026-09-24T14:00:00.000Z");
});

test("the diagnostic's follow-up stamp is the review task's own time, so Done clears it and a new date moves it", async () => {
  // Submitted Tue, Sep 22 at 2:37 PM CDT. The review task is due that Central day.
  const submittedAt = "2026-09-22T19:37:00.000Z";
  const due = diagnosticReviewDueDate(submittedAt);
  assert.equal(due, "2026-09-22");
  const rows: Lead[] = [
    { id: "done", next_follow_up_at: null },
    { id: "moved", next_follow_up_at: null },
  ];
  const db = fakeLeads(rows);
  type StampClient = Parameters<typeof stampDiagnosticFollowUp>[0];
  const stampClient = db as unknown as StampClient;
  assert.equal(await stampDiagnosticFollowUp(stampClient, "done", submittedAt), "stamped");
  assert.equal(await stampDiagnosticFollowUp(stampClient, "moved", submittedAt), "stamped");
  assert.equal(rows[0].next_follow_up_at, "2026-09-22T14:00:00.000Z");

  // Pat emails the lead and taps Done on the follow-ups board: nothing is left past due.
  const taskCreated = "2026-09-22T19:37:01.000Z";
  assert.deepEqual(await clearTaskFollowUp(asClient(db), "done", due, taskCreated), { changed: true, value: null, error: null });
  assert.equal(rows[0].next_follow_up_at, null);
  // Or reschedules the review to next Tuesday: the follow-up moves with it.
  const moved = await moveTaskFollowUp(asClient(db), "moved", due, "2026-09-29", taskCreated);
  assert.deepEqual(moved, { changed: true, value: "2026-09-29T14:00:00.000Z", error: null });
  assert.equal(rows[1].next_follow_up_at, "2026-09-29T14:00:00.000Z");
});

test("the kept follow-up message on both screens is plain copy", () => {
  const board = readFileSync("app/sales/follow-ups/FollowUpBoard.tsx", "utf8");
  const workspace = readFileSync("app/sales/leads/[id]/SalesLeadWorkspace.tsx", "utf8");
  for (const source of [board, workspace]) {
    assert.match(source, /The follow-up already set for \$\{formatCentral\(/);
    assert.match(source, /The follow-up time already on the lead stays\./);
  }
  const sample = `Follow-up added for Dana Sample. The follow-up already set for ${formatCentral(new Date("2026-09-24T20:00:00.000Z"))} Central stays.`;
  assert.equal(sample, "Follow-up added for Dana Sample. The follow-up already set for Thu, Sep 24 at 3:00 PM Central stays.");
  assert.deepEqual(copyProblems(sample), []);
});
