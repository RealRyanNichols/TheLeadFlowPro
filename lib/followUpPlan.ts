// The follow-up plan: what happens to a lead after it arrives, how many
// times, and in what order.
//
// Ryan, October 7, 2026: "an SOP for how many times and what we do when a
// lead comes in, to know they are on their eighth out of 60th email and third
// out of their 25th call." This file is that plan, as data. The next-action
// engine (lib/nextAction.ts) reads it to say "Call 3 of 25" on a lead, and
// docs/lead-follow-up-sop.md prints the same steps in plain words. A test
// keeps the two in step.
//
// What was true before this file (read from the code and the live database
// on Oct 7, 2026):
//   - Emails: the contractor series already sends a welcome plus 80 emails
//     over 180 days (lib/contractorSeries.ts). That part of the plan existed.
//   - Calls: no count, no spacing and no end. The Call Closer's no-answer
//     ladder came back in 1, then 2, then 4 business days, forever.
//   - Texts: one automatic first text, and only with recorded consent.
// So the call plan below is new. It is the owner's to change: every number a
// person sees comes from the arrays in this file and nowhere else.
//
// Pat's process on the recordings (Sep 30 to Oct 2) is the spine: call within
// minutes of the form, text if no answer, never talk money on the first call.
//
// Leaf module: imports only lib/businessTime.ts. It reads no clock, writes
// nothing and contacts nobody.

import { addCalendarDays, centralDate, centralHour, wallClockToInstant, weekdayOf } from "@/lib/businessTime";

export type PlanId = "full" | "standard" | "light";

/** What goes with a call attempt when nobody picks up. A text only ever goes with recorded consent. */
export type Companion = "voicemail" | "text" | "email";

export type CallSlot = "now" | "later" | "morning" | "afternoon";

export type CallStep = {
  /** 1-based position in the plan: the 3 in "Call 3 of 25". */
  n: number;
  /** Calendar days after the lead arrived, in Central time. Day 0 is the day it came in. */
  day: number;
  slot: CallSlot;
  /** What to leave behind when this attempt is not answered. */
  with: readonly Companion[];
  /** A few plain words for the plan table. */
  label: string;
};

function step(n: number, day: number, slot: CallSlot, withList: readonly Companion[], label: string): CallStep {
  return { n, day, slot, with: withList, label };
}

/**
 * The full plan: 25 call attempts over 90 days. For anyone who answered the
 * contractor form, and any lead marked high or hot.
 *
 * The shape is front loaded on purpose. Three tries on the day the form comes
 * in, two the next day, one a day through day 5, then it thins out: three in
 * week two, two a week through week four, one a week through week eleven, and
 * a last call on day 90.
 */
export const FULL_CALL_PLAN: readonly CallStep[] = [
  step(1, 0, "now", [], "First call, inside five minutes"),
  step(2, 0, "now", ["voicemail", "text", "email"], "Call straight back, then leave word three ways"),
  step(3, 0, "later", [], "Same day, a few hours on"),
  step(4, 1, "morning", ["voicemail"], "Next morning"),
  step(5, 1, "afternoon", ["text"], "Next afternoon"),
  step(6, 2, "afternoon", [], "Day 2"),
  step(7, 3, "morning", ["email"], "Day 3"),
  step(8, 4, "afternoon", [], "Day 4"),
  step(9, 5, "morning", ["voicemail", "text"], "Day 5, end of week one"),
  step(10, 7, "afternoon", [], "Week two"),
  step(11, 9, "morning", [], "Week two"),
  step(12, 11, "afternoon", ["voicemail", "email"], "Week two"),
  step(13, 14, "morning", ["text"], "Week three"),
  step(14, 17, "afternoon", [], "Week three"),
  step(15, 21, "morning", [], "Week four"),
  step(16, 24, "afternoon", ["voicemail"], "Week four"),
  step(17, 28, "morning", [], "Week five"),
  step(18, 35, "afternoon", [], "Week six"),
  step(19, 42, "morning", [], "Week seven"),
  step(20, 49, "afternoon", ["text"], "Week eight"),
  step(21, 56, "morning", [], "Week nine"),
  step(22, 63, "afternoon", [], "Week ten"),
  step(23, 70, "morning", [], "Week eleven"),
  step(24, 77, "afternoon", [], "Week twelve"),
  step(25, 90, "morning", ["voicemail", "email"], "Last call"),
];

/** The standard plan: 9 attempts over three weeks. Every other open lead. */
export const STANDARD_CALL_PLAN: readonly CallStep[] = [
  step(1, 0, "now", [], "First call, inside five minutes"),
  step(2, 0, "now", ["voicemail", "text", "email"], "Call straight back, then leave word three ways"),
  step(3, 1, "morning", [], "Next morning"),
  step(4, 2, "afternoon", ["voicemail"], "Day 2"),
  step(5, 4, "morning", ["text"], "Day 4"),
  step(6, 7, "afternoon", [], "Week two"),
  step(7, 10, "morning", ["voicemail", "email"], "Week two"),
  step(8, 14, "afternoon", [], "Week three"),
  step(9, 21, "morning", ["voicemail", "email"], "Last call"),
];

/**
 * The light plan: 3 attempts. For a fit check (Pat's rule: an employee, or
 * someone looking to hire a contractor) and anything marked low. Enough to
 * find out whether there is a buyer, not enough to burn a morning on.
 */
export const LIGHT_CALL_PLAN: readonly CallStep[] = [
  step(1, 0, "now", [], "First call, inside five minutes"),
  step(2, 1, "morning", ["voicemail", "email"], "Next morning"),
  step(3, 3, "afternoon", ["email"], "Last call"),
];

export type CallPlan = {
  id: PlanId;
  name: string;
  /** Who gets this plan, in one plain line. */
  who: string;
  steps: readonly CallStep[];
};

export const CALL_PLANS: Record<PlanId, CallPlan> = {
  full: {
    id: "full",
    name: "Full plan",
    who: "Anyone who answered the contractor form, and any lead marked high or hot.",
    steps: FULL_CALL_PLAN,
  },
  standard: {
    id: "standard",
    name: "Standard plan",
    who: "Every other open lead.",
    steps: STANDARD_CALL_PLAN,
  },
  light: {
    id: "light",
    name: "Light plan",
    who: "A fit check (an employee, or someone hiring a contractor) and anything marked low.",
    steps: LIGHT_CALL_PLAN,
  },
};

/** How many of each companion a plan carries, for the plan table and the SOP. */
export function companionCounts(planId: PlanId): Record<Companion, number> {
  const counts: Record<Companion, number> = { voicemail: 0, text: 0, email: 0 };
  for (const s of CALL_PLANS[planId].steps) for (const c of s.with) counts[c] += 1;
  return counts;
}

export type PlanCandidate = {
  /** Pat's follow-up group from the contractor form (lib/metaLeadAnswers.ts), when the lead answered it. */
  group?: string | null;
  /** leads.priority: low, normal, high or hot. */
  priority?: string | null;
};

/**
 * Which plan a lead is on. The fit check comes first: a low-fit lead marked
 * high by hand still gets the full plan, because a person decided that.
 */
export function planIdFor(lead: PlanCandidate): PlanId {
  const priority = (lead.priority ?? "").trim();
  if (priority === "high" || priority === "hot") return "full";
  if (lead.group === "fit_check" || priority === "low") return "light";
  if (lead.group === "priority" || lead.group === "funding_review" || lead.group === "standard") return "full";
  return "standard";
}

// ---------------------------------------------------------------- hours --

/**
 * When the plan puts a call on the calendar: Monday to Saturday, 9:00 AM to
 * 7:00 PM Central. Never Sunday. This is a conservative choice for a business
 * calling people back, not a statement of what the law allows. A person who
 * asks for a Sunday call can have one: the Call Closer's own call back time
 * wins over the plan.
 */
export const CALL_WINDOW = { startHour: 9, endHourExclusive: 19, days: [1, 2, 3, 4, 5, 6] as readonly number[] } as const;

const MORNING = "10:00";
const AFTERNOON = "15:30";
const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
/** The first call is due this long after the form arrives. */
export const FIRST_CALL_MINUTES = 5;
/** No answer on the first call: dial again this soon (the double dial). */
export const DOUBLE_DIAL_MINUTES = 2;
/** A lead that arrives mid-morning gets its third try this long after. */
const LATER_HOURS = 4;
/** Two attempts are never planned closer than this, apart from the double dial. */
const MIN_GAP_MS = 2 * HOUR_MS;

function isCallDay(localDate: string): boolean {
  return CALL_WINDOW.days.includes(weekdayOf(localDate));
}

export function inCallWindow(at: Date): boolean {
  const hour = centralHour(at);
  return isCallDay(centralDate(at)) && hour >= CALL_WINDOW.startHour && hour < CALL_WINDOW.endHourExclusive;
}

/** `at` when it is already inside calling hours, otherwise the next time they open. */
export function intoCallWindow(at: Date): Date {
  if (inCallWindow(at)) return at;
  let date = centralDate(at);
  const open = `${String(CALL_WINDOW.startHour).padStart(2, "0")}:00`;
  if (isCallDay(date) && centralHour(at) < CALL_WINDOW.startHour) return wallClockToInstant(date, open);
  for (let i = 0; i < 8; i += 1) {
    date = addCalendarDays(date, 1);
    if (isCallDay(date)) return wallClockToInstant(date, open);
  }
  // Unreachable: eight consecutive days always include a calling day.
  return at;
}

/** Days since the lead arrived, by the Central calendar. Day 0 is the day it came in. */
export function dayNumber(createdAt: Date, now: Date): number {
  const a = Date.parse(`${centralDate(createdAt)}T00:00:00Z`);
  const b = Date.parse(`${centralDate(now)}T00:00:00Z`);
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/**
 * When each attempt on a plan is due for a lead that arrived at `createdAt`.
 * One instant per step, never earlier than the one before it, always inside
 * calling hours. A step that lands on a Sunday moves to Monday.
 */
export function scheduleFor(createdAt: Date, planId: PlanId): Date[] {
  const steps = CALL_PLANS[planId].steps;
  const arrived = centralDate(createdAt);
  const out: Date[] = [];
  for (const s of steps) {
    const before = out[out.length - 1];
    let at: Date;
    if (s.slot === "now") {
      // The double dial follows the first call by two minutes, whenever that was.
      at = before
        ? new Date(before.getTime() + DOUBLE_DIAL_MINUTES * MINUTE_MS)
        : intoCallWindow(new Date(createdAt.getTime() + FIRST_CALL_MINUTES * MINUTE_MS));
    } else if (s.slot === "later") {
      at = intoCallWindow(new Date(createdAt.getTime() + LATER_HOURS * HOUR_MS));
    } else {
      let date = addCalendarDays(arrived, s.day);
      while (!isCallDay(date)) date = addCalendarDays(date, 1);
      at = wallClockToInstant(date, s.slot === "morning" ? MORNING : AFTERNOON);
    }
    if (before && at.getTime() <= before.getTime()) at = intoCallWindow(new Date(before.getTime() + MIN_GAP_MS));
    out.push(at);
  }
  return out;
}

export type NextAttempt = { step: CallStep; dueAt: Date; planned: Date };

/**
 * The next attempt on the plan, and when it is due.
 *
 * `attemptsMade` is how many attempts are on the record. With none, the first
 * step is due when the plan says. After that the plan's own spacing is kept
 * from the last attempt: a lead nobody called for five days does not suddenly
 * owe nine calls in one afternoon. It owes the next one now, and the one after
 * that as far behind it as the plan put them. Null when the plan is finished.
 */
export function nextAttempt(input: {
  createdAt: Date;
  planId: PlanId;
  attemptsMade: number;
  lastAttemptAt: Date | null;
}): NextAttempt | null {
  const steps = CALL_PLANS[input.planId].steps;
  const made = Number.isInteger(input.attemptsMade) && input.attemptsMade > 0 ? input.attemptsMade : 0;
  if (made >= steps.length) return null;
  const schedule = scheduleFor(input.createdAt, input.planId);
  const planned = schedule[made];
  if (made === 0 || !input.lastAttemptAt) return { step: steps[made], dueAt: planned, planned };
  const gap = Math.max(0, planned.getTime() - schedule[made - 1].getTime());
  const spaced = intoCallWindow(new Date(input.lastAttemptAt.getTime() + gap));
  const dueAt = spaced.getTime() > planned.getTime() ? spaced : planned;
  return { step: steps[made], dueAt, planned };
}

// --------------------------------------------------------------- emails --

export type EmailSeries = {
  /** The campaign key the nurture cron tags each send with. */
  key: string;
  name: string;
  /** lead_emails.step range for the series. */
  firstStep: number;
  lastStep: number;
  /** The last send day, counted from the day the lead arrived. */
  lastDay: number;
};

/**
 * The automatic email series, by lead_emails.step range. The copy and the
 * send days live in their own files (lib/contractorSeries.ts, lib/nurture.ts,
 * lib/nurtureRentReceipt.ts); this is only enough to say "Email 8 of 81".
 * tests/follow-up-plan.test.ts fails if a range here drifts from those files.
 */
export const EMAIL_SERIES: readonly EmailSeries[] = [
  { key: "contractor_owner", name: "Contractor series", firstStep: 601, lastStep: 680, lastDay: 180 },
  { key: "rent_receipt", name: "Rent receipt series", firstStep: 501, lastStep: 530, lastDay: 30 },
  { key: "workshop", name: "Workshop countdown", firstStep: 201, lastStep: 204, lastDay: 4 },
  { key: "free_build", name: "Website series", firstStep: 101, lastStep: 130, lastDay: 30 },
];

export function seriesForStep(stepNumber: number): EmailSeries | null {
  return EMAIL_SERIES.find((s) => stepNumber >= s.firstStep && stepNumber <= s.lastStep) ?? null;
}

/** Emails in a series after the welcome. */
export function seriesLength(series: EmailSeries): number {
  return series.lastStep - series.firstStep + 1;
}

// ------------------------------------------------------------ proposals --

/**
 * After a proposal goes out: five follow-ups in two weeks, counted in days
 * from the day it was sent. Then it is a yes, a no, or parked for 30 days.
 * A proposal nobody chases is the most expensive lead on the board.
 */
export const PROPOSAL_FOLLOW_UP_DAYS: readonly number[] = [1, 3, 5, 7, 14];

/** When follow-up `index` (0-based) on a proposal sent at `sentAt` is due: that day at 10:00 AM Central, on a calling day. */
export function proposalFollowUpDue(sentAt: Date, index: number): Date | null {
  const days = PROPOSAL_FOLLOW_UP_DAYS[index];
  if (days === undefined) return null;
  let date = addCalendarDays(centralDate(sentAt), days);
  while (!isCallDay(date)) date = addCalendarDays(date, 1);
  return wallClockToInstant(date, MORNING);
}
