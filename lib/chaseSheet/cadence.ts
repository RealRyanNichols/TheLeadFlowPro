// When each touch lands.
//
// A quote is chased on a schedule that depends on how big it is and how
// urgent the work is. A small job gets five touches in three weeks; a large,
// planned job gets seven patient touches over five weeks; an urgent repair
// gets the same seven, compressed. After the last touch the file is closed
// politely, and two revival touches sit further out for the quotes that went
// quiet, timed to the season.
//
// Two rules never bend: nothing lands on a Sunday, and two touches never land
// on the same day. Pure functions, no clock, so every rule is testable.

import { getTrade, type Trade } from "./trades";

export type Urgency = "urgent" | "soon" | "planned";
export type Channel = "text" | "call" | "email";

/** What a touch is for. The message library writes one message per role. */
export type StepRole =
  | "landed"
  | "call"
  | "question"
  | "proof"
  | "reason"
  | "schedule"
  | "close"
  | "revive"
  | "last";

export type PlannedStep = {
  /** 1-based position in the sequence. */
  step: number;
  role: StepRole;
  channel: Channel;
  /** Days after the quote was sent, before the Sunday rule. */
  day: number;
  /** YYYY-MM-DD the touch lands on. */
  on: string;
  /** Why this touch exists, for the owner. */
  job: string;
};

export type Band = "small" | "standard" | "large";

const ROLE_JOB: Record<StepRole, string> = {
  landed: "Confirms the quote arrived and opens the door while it is fresh.",
  call: "The one real conversation. Most quotes close on this call or never.",
  question: "One easy question that restarts a stalled thread without pressure.",
  proof: "A similar job, done well. Confidence, not pressure.",
  reason: "Something true about the trade that makes waiting cost more than deciding.",
  schedule: "The honest start window. If the slot is real, offer it.",
  close: "The polite last word. It wins a surprising share on its own, and it ends cleanly.",
  revive: "A seasonal reason to reopen a quiet quote, weeks later.",
  last: "The final revival. After this the quote is archived unless they answer.",
};

const ROLE_CHANNEL: Record<StepRole, Channel> = {
  landed: "text",
  call: "call",
  question: "text",
  proof: "text",
  reason: "text",
  schedule: "call",
  close: "text",
  revive: "text",
  last: "text",
};

type Template = { role: StepRole; day: number }[];

const SEQUENCES: Record<Band, Record<Urgency, Template>> = {
  small: {
    urgent: [
      { role: "landed", day: 1 },
      { role: "call", day: 2 },
      { role: "question", day: 4 },
      { role: "schedule", day: 7 },
      { role: "close", day: 12 },
    ],
    soon: [
      { role: "landed", day: 1 },
      { role: "call", day: 3 },
      { role: "question", day: 6 },
      { role: "schedule", day: 10 },
      { role: "close", day: 16 },
    ],
    planned: [
      { role: "landed", day: 1 },
      { role: "call", day: 3 },
      { role: "question", day: 7 },
      { role: "schedule", day: 12 },
      { role: "close", day: 21 },
    ],
  },
  standard: {
    urgent: [
      { role: "landed", day: 1 },
      { role: "call", day: 2 },
      { role: "question", day: 4 },
      { role: "proof", day: 6 },
      { role: "reason", day: 9 },
      { role: "schedule", day: 12 },
      { role: "close", day: 18 },
    ],
    soon: [
      { role: "landed", day: 1 },
      { role: "call", day: 3 },
      { role: "question", day: 6 },
      { role: "proof", day: 10 },
      { role: "reason", day: 15 },
      { role: "schedule", day: 22 },
      { role: "close", day: 30 },
    ],
    planned: [
      { role: "landed", day: 1 },
      { role: "call", day: 3 },
      { role: "question", day: 7 },
      { role: "proof", day: 12 },
      { role: "reason", day: 18 },
      { role: "schedule", day: 26 },
      { role: "close", day: 35 },
    ],
  },
  large: {
    urgent: [
      { role: "landed", day: 1 },
      { role: "call", day: 2 },
      { role: "question", day: 5 },
      { role: "proof", day: 8 },
      { role: "reason", day: 12 },
      { role: "schedule", day: 16 },
      { role: "close", day: 24 },
    ],
    soon: [
      { role: "landed", day: 1 },
      { role: "call", day: 3 },
      { role: "question", day: 7 },
      { role: "proof", day: 12 },
      { role: "reason", day: 18 },
      { role: "schedule", day: 26 },
      { role: "close", day: 36 },
    ],
    planned: [
      { role: "landed", day: 1 },
      { role: "call", day: 4 },
      { role: "question", day: 8 },
      { role: "proof", day: 14 },
      { role: "reason", day: 21 },
      { role: "schedule", day: 30 },
      { role: "close", day: 42 },
    ],
  },
};

/** Revival touches, days after the close touch. */
const REVIVAL: { role: StepRole; after: number }[] = [
  { role: "revive", after: 21 },
  { role: "last", after: 45 },
];

/* --------------------------------- dates --------------------------------- */

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return false;
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}

export function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Add whole days to a YYYY-MM-DD date, in UTC so no zone can shift it. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return toIso(new Date(Date.UTC(y, m - 1, d + days)));
}

/** Days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

/** 0 Sunday to 6 Saturday. */
export function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Nothing lands on a Sunday. A Sunday touch moves to Monday. */
export function skipSunday(iso: string): string {
  return weekdayOf(iso) === 0 ? addDays(iso, 1) : iso;
}

/** Today's date in the business's time zone, as YYYY-MM-DD. */
export function todayIn(timezone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return ISO.test(parts) ? parts : toIso(now);
}

/* --------------------------------- bands --------------------------------- */

export function bandFor(amountCents: number, trade: Trade): Band {
  if (amountCents < trade.bands.small) return "small";
  if (amountCents >= trade.bands.large) return "large";
  return "standard";
}

export function isUrgency(value: unknown): value is Urgency {
  return value === "urgent" || value === "soon" || value === "planned";
}

/* --------------------------------- plan ---------------------------------- */

export type PlanInput = {
  /** YYYY-MM-DD the quote went out. */
  sentOn: string;
  amountCents: number;
  urgency: Urgency;
  tradeId: string;
};

/**
 * The full sequence for a quote, revival included, on real dates. Sundays are
 * skipped and a touch that would land on the previous touch's day is pushed
 * one day, so the list is strictly increasing.
 */
export function planSequence(input: PlanInput): PlannedStep[] {
  const trade = getTrade(input.tradeId);
  const band = bandFor(Math.max(0, input.amountCents), trade);
  const template = SEQUENCES[band][input.urgency];
  const closeDay = template[template.length - 1].day;
  const all: { role: StepRole; day: number }[] = [
    ...template,
    ...REVIVAL.map((r) => ({ role: r.role, day: closeDay + r.after })),
  ];

  const out: PlannedStep[] = [];
  let previous: string | null = null;
  all.forEach((entry, index) => {
    let on = skipSunday(addDays(input.sentOn, entry.day));
    if (previous && daysBetween(previous, on) <= 0) on = skipSunday(addDays(previous, 1));
    out.push({
      step: index + 1,
      role: entry.role,
      channel: ROLE_CHANNEL[entry.role],
      day: entry.day,
      on,
      job: ROLE_JOB[entry.role],
    });
    previous = on;
  });
  return out;
}

/** How many touches before the file closes (the revival touches are extra). */
export function coreStepCount(input: PlanInput): number {
  const trade = getTrade(input.tradeId);
  return SEQUENCES[bandFor(Math.max(0, input.amountCents), trade)][input.urgency].length;
}

/**
 * The next touch for a quote that has completed `done` touches. When the
 * owner is behind, the touch is due today rather than in the past, and the
 * one after it is spaced from today so a missed week never turns into three
 * texts in three days.
 */
export function nextTouch(input: PlanInput, done: number, today: string): PlannedStep | null {
  const plan = planSequence(input);
  const step = plan[done];
  if (!step) return null;
  if (daysBetween(today, step.on) >= 0) return step;
  // Overdue: due today. Keep the role and the step number.
  return { ...step, on: today };
}

/** The step after `done` touches, spaced from the day the previous one was actually sent. */
export function touchAfter(input: PlanInput, done: number, lastSentOn: string | null): PlannedStep | null {
  const plan = planSequence(input);
  const step = plan[done];
  if (!step) return null;
  if (!lastSentOn) return step;
  const previous = plan[done - 1];
  const gap = previous ? Math.max(1, daysBetween(previous.on, step.on)) : 1;
  const earliest = skipSunday(addDays(lastSentOn, gap));
  return daysBetween(earliest, step.on) >= 0 ? step : { ...step, on: earliest };
}
