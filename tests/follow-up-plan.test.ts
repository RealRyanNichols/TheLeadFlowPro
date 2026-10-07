import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  CALL_PLANS,
  CALL_WINDOW,
  EMAIL_SERIES,
  FULL_CALL_PLAN,
  LIGHT_CALL_PLAN,
  PROPOSAL_FOLLOW_UP_DAYS,
  STANDARD_CALL_PLAN,
  companionCounts,
  dayNumber,
  inCallWindow,
  intoCallWindow,
  nextAttempt,
  planIdFor,
  proposalFollowUpDue,
  scheduleFor,
  seriesForStep,
  seriesLength,
} from "../lib/followUpPlan.ts";
import { CONTRACTOR_CAMPAIGN, CONTRACTOR_FIRST_STEP, CONTRACTOR_LAST_STEP, contractorSendDays } from "../lib/contractorSeries.ts";
import { NURTURE_CAMPAIGN, NURTURE_FIRST_STEP, NURTURE_LAST_STEP, WORKSHOP_FIRST_STEP, WORKSHOP_LAST_STEP } from "../lib/nurture.ts";
import { RENT_RECEIPT_CAMPAIGN, RENT_RECEIPT_FIRST_STEP, RENT_RECEIPT_LAST_STEP } from "../lib/nurtureRentReceipt.ts";
import { centralDate, centralHour, formatCentral, weekdayOf } from "../lib/businessTime.ts";

// The follow-up plan as data: how many calls, on which days, inside which
// hours, and where the automatic email series start and stop. Fictional
// instants only; nothing here reads a clock.

const at = (iso: string) => new Date(iso);

test("the full plan is 25 call attempts over 90 days, numbered in order, never going backwards", () => {
  assert.equal(FULL_CALL_PLAN.length, 25);
  assert.deepEqual(FULL_CALL_PLAN.map((s) => s.n), Array.from({ length: 25 }, (_, i) => i + 1));
  for (let i = 1; i < FULL_CALL_PLAN.length; i += 1) assert.ok(FULL_CALL_PLAN[i].day >= FULL_CALL_PLAN[i - 1].day, `step ${i + 1}`);
  assert.equal(FULL_CALL_PLAN[0].day, 0);
  assert.equal(FULL_CALL_PLAN[24].day, 90);
  // Front loaded: three tries on the day the form comes in, two the next day, one a day through day 5.
  assert.equal(FULL_CALL_PLAN.filter((s) => s.day === 0).length, 3);
  assert.equal(FULL_CALL_PLAN.filter((s) => s.day === 1).length, 2);
  assert.equal(FULL_CALL_PLAN.filter((s) => s.day <= 5).length, 9);
  assert.deepEqual(companionCounts("full"), { voicemail: 6, text: 5, email: 4 });
});

test("the standard plan is 9 attempts over three weeks and the light plan is 3", () => {
  assert.equal(STANDARD_CALL_PLAN.length, 9);
  assert.equal(STANDARD_CALL_PLAN[8].day, 21);
  assert.equal(LIGHT_CALL_PLAN.length, 3);
  for (const plan of Object.values(CALL_PLANS)) {
    assert.deepEqual(plan.steps.map((s) => s.n), plan.steps.map((_, i) => i + 1), plan.id);
    assert.equal(plan.steps[0].slot, "now", `${plan.id} starts with a call right away`);
    assert.deepEqual(plan.steps[0].with, [], `${plan.id}: nothing is left behind on the very first ring`);
  }
});

test("who gets which plan: Pat's groups and the priority a person set", () => {
  assert.equal(planIdFor({ group: "priority", priority: "high" }), "full");
  assert.equal(planIdFor({ group: "funding_review", priority: "normal" }), "full");
  assert.equal(planIdFor({ group: "standard", priority: "normal" }), "full");
  assert.equal(planIdFor({ group: "fit_check", priority: "low" }), "light");
  assert.equal(planIdFor({ group: null, priority: "low" }), "light");
  assert.equal(planIdFor({ group: null, priority: "normal" }), "standard");
  assert.equal(planIdFor({}), "standard");
  // A person marking a fit-check lead high has decided it is worth the full plan.
  assert.equal(planIdFor({ group: "fit_check", priority: "high" }), "full");
  assert.equal(planIdFor({ group: null, priority: "hot" }), "full");
});

test("calling hours are Monday to Saturday, 9 AM to 7 PM Central, never Sunday", () => {
  assert.deepEqual([...CALL_WINDOW.days], [1, 2, 3, 4, 5, 6]);
  assert.equal(inCallWindow(at("2026-10-07T15:00:00Z")), true); // Wed 10:00 AM CDT
  assert.equal(inCallWindow(at("2026-10-07T13:59:00Z")), false); // Wed 8:59 AM
  assert.equal(inCallWindow(at("2026-10-08T00:00:00Z")), false); // Wed 7:00 PM
  assert.equal(inCallWindow(at("2026-10-10T19:00:00Z")), true); // Sat 2:00 PM
  assert.equal(inCallWindow(at("2026-10-11T19:00:00Z")), false); // Sunday
  // Inside the window: unchanged.
  assert.equal(intoCallWindow(at("2026-10-07T15:00:00Z")).toISOString(), "2026-10-07T15:00:00.000Z");
  // Before opening on a calling day: 9:00 that day.
  assert.equal(formatCentral(intoCallWindow(at("2026-10-07T11:00:00Z"))), "Wed, Oct 7 at 9:00 AM");
  // After closing: 9:00 the next calling day.
  assert.equal(formatCentral(intoCallWindow(at("2026-10-08T02:00:00Z"))), "Thu, Oct 8 at 9:00 AM");
  // Saturday night skips Sunday.
  assert.equal(formatCentral(intoCallWindow(at("2026-10-11T02:00:00Z"))), "Mon, Oct 12 at 9:00 AM");
});

test("calling hours hold across the fall clock change", () => {
  // Sunday Nov 1, 2026 is the fall back. A Saturday night lead is due Monday at 9:00 AM CST (15:00 UTC).
  const due = intoCallWindow(at("2026-11-01T03:30:00Z"));
  assert.equal(due.toISOString(), "2026-11-02T15:00:00.000Z");
  assert.equal(centralHour(due), 9);
});

test("a mid-morning lead: first call in five minutes, the double dial two minutes later, a third try that afternoon", () => {
  const created = at("2026-10-07T15:10:00Z"); // Wed 10:10 AM
  const schedule = scheduleFor(created, "full");
  assert.equal(schedule.length, 25);
  assert.equal(formatCentral(schedule[0]), "Wed, Oct 7 at 10:15 AM");
  assert.equal(formatCentral(schedule[1]), "Wed, Oct 7 at 10:17 AM");
  assert.equal(formatCentral(schedule[2]), "Wed, Oct 7 at 2:10 PM");
  assert.equal(formatCentral(schedule[3]), "Thu, Oct 8 at 10:00 AM");
  assert.equal(formatCentral(schedule[4]), "Thu, Oct 8 at 3:30 PM");
  // Day 4 would be Sunday Oct 11: it moves to Monday.
  assert.equal(FULL_CALL_PLAN[7].day, 4);
  assert.equal(formatCentral(schedule[7]), "Mon, Oct 12 at 3:30 PM");
  assert.equal(centralDate(schedule[24]), "2027-01-05");
  for (let i = 1; i < schedule.length; i += 1) assert.ok(schedule[i].getTime() > schedule[i - 1].getTime(), `step ${i + 1} is after step ${i}`);
  for (const due of schedule.filter((_, i) => i !== 1)) {
    assert.ok(inCallWindow(due), formatCentral(due));
    assert.notEqual(weekdayOf(centralDate(due)), 0, "never a Sunday");
  }
});

test("a lead that arrives at night is called at 9 the next calling day, with the double dial right behind it", () => {
  const created = at("2026-10-08T03:00:00Z"); // Wed 10:00 PM
  const schedule = scheduleFor(created, "full");
  assert.equal(formatCentral(schedule[0]), "Thu, Oct 8 at 9:00 AM");
  assert.equal(formatCentral(schedule[1]), "Thu, Oct 8 at 9:02 AM");
  // The same-day third try and the day-1 tries never stack on top of the first call.
  assert.equal(formatCentral(schedule[2]), "Thu, Oct 8 at 11:02 AM");
  assert.ok(schedule[3].getTime() > schedule[2].getTime());
  assert.ok(schedule[4].getTime() > schedule[3].getTime());
  for (const planId of ["full", "standard", "light"] as const) {
    const s = scheduleFor(created, planId);
    for (let i = 1; i < s.length; i += 1) assert.ok(s[i].getTime() > s[i - 1].getTime(), `${planId} step ${i + 1}`);
  }
});

test("the next attempt keeps the plan's spacing from the last one, so a late lead is never asked for nine calls at once", () => {
  const created = at("2026-10-01T15:00:00Z"); // Thu Oct 1, 10:00 AM
  // Nobody has called: step 1 is due when the plan said, six days ago.
  const first = nextAttempt({ createdAt: created, planId: "full", attemptsMade: 0, lastAttemptAt: null });
  assert.equal(first?.step.n, 1);
  assert.equal(formatCentral(first!.dueAt), "Thu, Oct 1 at 10:05 AM");

  // First call finally made Oct 7 at 11:00 AM: the double dial is due two minutes later.
  const lastAttemptAt = at("2026-10-07T16:00:00Z");
  const second = nextAttempt({ createdAt: created, planId: "full", attemptsMade: 1, lastAttemptAt });
  assert.equal(second?.step.n, 2);
  assert.equal(formatCentral(second!.dueAt), "Wed, Oct 7 at 11:02 AM");

  // The third keeps the plan's gap (about four hours), not "overdue since Oct 1".
  const third = nextAttempt({ createdAt: created, planId: "full", attemptsMade: 2, lastAttemptAt: at("2026-10-07T16:02:00Z") });
  assert.equal(third?.step.n, 3);
  assert.equal(centralDate(third!.dueAt), "2026-10-07");
  assert.ok(third!.dueAt.getTime() - Date.parse("2026-10-07T16:02:00Z") >= 3 * 3_600_000);

  // On schedule, the plan's own time stands.
  const onTime = nextAttempt({ createdAt: created, planId: "full", attemptsMade: 3, lastAttemptAt: at("2026-10-01T19:00:00Z") });
  assert.equal(formatCentral(onTime!.dueAt), "Fri, Oct 2 at 10:00 AM");

  // The plan ends.
  assert.equal(nextAttempt({ createdAt: created, planId: "full", attemptsMade: 25, lastAttemptAt }), null);
  assert.equal(nextAttempt({ createdAt: created, planId: "light", attemptsMade: 3, lastAttemptAt }), null);
  // Junk counts are read as zero, not as a crash.
  assert.equal(nextAttempt({ createdAt: created, planId: "full", attemptsMade: -2, lastAttemptAt: null })?.step.n, 1);
});

test("day numbers follow the Central calendar, not 24-hour blocks", () => {
  const created = at("2026-10-07T03:30:00Z"); // Tue Oct 6, 10:30 PM Central
  assert.equal(dayNumber(created, at("2026-10-07T04:00:00Z")), 0); // still Tuesday night
  assert.equal(dayNumber(created, at("2026-10-07T14:00:00Z")), 1); // Wednesday morning
  assert.equal(dayNumber(created, at("2026-10-14T14:00:00Z")), 8);
  assert.equal(dayNumber(at("2026-10-08T14:00:00Z"), created), 0, "never negative");
});

test("the email series ranges match the files that send them", () => {
  const byKey = new Map(EMAIL_SERIES.map((s) => [s.key, s]));
  const contractor = byKey.get(CONTRACTOR_CAMPAIGN)!;
  assert.equal(contractor.firstStep, CONTRACTOR_FIRST_STEP);
  assert.equal(contractor.lastStep, CONTRACTOR_LAST_STEP);
  assert.equal(seriesLength(contractor), contractorSendDays().length);
  // The number on the board: the welcome plus the series.
  assert.equal(seriesLength(contractor) + 1, 81);
  assert.equal(contractor.lastDay, Math.max(...contractorSendDays()));

  const freeBuild = byKey.get(NURTURE_CAMPAIGN)!;
  assert.equal(freeBuild.firstStep, NURTURE_FIRST_STEP);
  assert.equal(freeBuild.lastStep, NURTURE_LAST_STEP);

  const rent = byKey.get(RENT_RECEIPT_CAMPAIGN)!;
  assert.equal(rent.firstStep, RENT_RECEIPT_FIRST_STEP);
  assert.equal(rent.lastStep, RENT_RECEIPT_LAST_STEP);

  const workshop = byKey.get("workshop")!;
  assert.equal(workshop.firstStep, WORKSHOP_FIRST_STEP);
  assert.equal(workshop.lastStep, WORKSHOP_LAST_STEP);

  // No step belongs to two series.
  for (const a of EMAIL_SERIES) for (const b of EMAIL_SERIES) if (a !== b) assert.ok(a.lastStep < b.firstStep || b.lastStep < a.firstStep, `${a.key} / ${b.key}`);
  assert.equal(seriesForStep(608)?.key, "contractor_owner");
  assert.equal(seriesForStep(115)?.key, "free_build");
  assert.equal(seriesForStep(999), null);
});

test("proposal follow-ups: five in two weeks, at 10 AM on a calling day", () => {
  assert.deepEqual([...PROPOSAL_FOLLOW_UP_DAYS], [1, 3, 5, 7, 14]);
  const sent = at("2026-10-08T20:00:00Z"); // Thu Oct 8, 3:00 PM
  assert.equal(formatCentral(proposalFollowUpDue(sent, 0)!), "Fri, Oct 9 at 10:00 AM");
  // Day 3 is Sunday Oct 11: Monday instead.
  assert.equal(formatCentral(proposalFollowUpDue(sent, 1)!), "Mon, Oct 12 at 10:00 AM");
  assert.equal(formatCentral(proposalFollowUpDue(sent, 4)!), "Thu, Oct 22 at 10:00 AM");
  assert.equal(proposalFollowUpDue(sent, 5), null);
});

test("the written plan (docs/lead-follow-up-sop.md) prints the same steps this file holds", () => {
  const doc = readFileSync(join(process.cwd(), "docs/lead-follow-up-sop.md"), "utf8");
  const SLOT = { now: "right away", later: "a few hours later", morning: "morning", afternoon: "afternoon" } as const;
  for (const plan of Object.values(CALL_PLANS)) {
    const block = doc.split(`<!-- plan:${plan.id} -->`)[1]?.split(`<!-- /plan:${plan.id} -->`)[0];
    assert.ok(block, `${plan.id} table is in the document`);
    const rows = block.trim().split("\n").slice(2);
    assert.deepEqual(
      rows,
      plan.steps.map((s) => `| ${s.n} | Day ${s.day} | ${SLOT[s.slot]} | ${s.label} | ${s.with.length ? s.with.join(", ") : "nothing"} |`),
      plan.id,
    );
  }
  // The summary table at the top names the calls each companion rides with.
  const callsWith = (c: "voicemail" | "text" | "email") => FULL_CALL_PLAN.filter((s) => s.with.includes(c)).map((s) => s.n);
  const list = (ns: number[]) => `${ns.slice(0, -1).join(", ")} and ${ns[ns.length - 1]}`;
  assert.ok(doc.includes(`| Voicemails | 6 | with calls ${list(callsWith("voicemail"))} |`));
  assert.ok(doc.includes(`| Texts | up to 5 | with calls ${list(callsWith("text"))} |`));
  assert.ok(doc.includes(`| Personal emails | 4 | with calls ${list(callsWith("email"))} |`));
  assert.ok(doc.includes("| Call attempts | 25 | 90 days |"));
  assert.ok(doc.includes("| Automatic emails | 81 | 180 days (a welcome, then 80) |"));
  assert.ok(doc.includes(`on days ${PROPOSAL_FOLLOW_UP_DAYS.slice(0, -1).join(", ")} and ${PROPOSAL_FOLLOW_UP_DAYS[PROPOSAL_FOLLOW_UP_DAYS.length - 1]}`));
  assert.ok(doc.includes(`${CALL_WINDOW.startHour}:00 AM to ${CALL_WINDOW.endHourExclusive - 12}:00 PM Central`));
  assert.ok(!/[\u2014\u2013]/.test(doc), "no long dashes");
});
