// Post Creator: plan decisions and the Chicago calendar, pure so the tests
// can cover every branch without a database or a clock.
//
// A one payment account is entitled while its status is active (a refund
// flips it). A monthly account is entitled while Stripe says active, or
// past_due inside the grace window, or canceled-at-period-end with the date
// still ahead. A refund or a dispute closes either plan (money_back_at),
// whatever Stripe says afterwards, until a dispute won or a new checkout. A
// monthly account whose paid period ended with no newer event is "stale" and
// the server asks Stripe directly, at most once an hour.
//
// The claim decision is here too: the browser that completes checkout is
// signed in only when that checkout created the account, only once, and only
// within a day. Every other arrival opens the app with the emailed key.
//
// AI allowances count Chicago days and months, the same calendar the database
// functions use, so the meter a buyer sees matches what the write route checks.

import { planFromSubscription, type StripeSubscriptionLike } from "@/lib/hq/stripe";
import { POST_CREATOR, aiLimitsFor } from "./product";
import type { Account, AccountStatus, AccountView, Allowance, EntitlementReason, PostCreatorPlan, UsageCounts } from "./types";

const DAY_MS = 86_400_000;

/**
 * When a past-due monthly account loses access, in epoch milliseconds: the
 * grace days after the plan went past due. Never counted from
 * current_period_end: Stripe moves that to the end of the unpaid month before
 * it tries the card. A row with no past_due_since falls back to the Stripe
 * event that last changed it; with neither, null (no grace).
 */
export function graceEnd(account: Pick<Account, "pastDueSince" | "stripeEventAt">): number | null {
  const since = account.pastDueSince ? new Date(account.pastDueSince).getTime() : Number.NaN;
  const start = Number.isNaN(since) ? (account.stripeEventAt > 0 ? account.stripeEventAt * 1000 : null) : since;
  return start === null ? null : start + POST_CREATOR.pastDueGraceDays * DAY_MS;
}

/** The start of the subscription's current period, unix seconds, from the top level or the first item. */
export function periodStartOf(sub: unknown): number | null {
  const s = (sub && typeof sub === "object" ? sub : {}) as {
    current_period_start?: unknown;
    items?: { data?: { current_period_start?: unknown }[] };
  };
  const top = s.current_period_start;
  const item = Array.isArray(s.items?.data) ? s.items.data[0]?.current_period_start : undefined;
  for (const v of [top, item]) if (typeof v === "number" && Number.isFinite(v) && v > 0) return Math.floor(v);
  return null;
}

/**
 * past_due_since for a plan Stripe now calls `status`. A plan already past
 * due keeps its date, so Stripe's retries never restart the grace window. A
 * plan that just went past due counts from `eventAt` (unix seconds): the
 * webhook passes the event's own time, which is when the status changed. A
 * Stripe check that finds it past due after the fact passes `periodStart`
 * too, the start of the unpaid period (Stripe opens it at the renewal, just
 * before it tries the card), and the earlier of the two is used. Anything
 * else is null.
 */
export function pastDueSinceFor(
  account: Pick<Account, "status" | "pastDueSince">,
  status: AccountStatus,
  periodStart: number | null,
  eventAt: number,
): string | null {
  if (status !== "past_due") return null;
  if (account.status === "past_due" && account.pastDueSince) return account.pastDueSince;
  const seconds = periodStart !== null && periodStart < eventAt ? periodStart : eventAt;
  return new Date(seconds * 1000).toISOString();
}

export function decideEntitlement(account: Account | null, now: Date = new Date()): { entitled: boolean; reason: EntitlementReason } {
  if (!account) return { entitled: false, reason: "no_account" };
  if (account.moneyBackAt) return { entitled: false, reason: "canceled" };
  if (account.plan === "lifetime") {
    return account.status === "active" ? { entitled: true, reason: "ok" } : { entitled: false, reason: "canceled" };
  }
  const t = now.getTime();
  if (account.status === "active") {
    if (account.cancelAt && new Date(account.cancelAt).getTime() <= t) return { entitled: false, reason: "canceled" };
    return { entitled: true, reason: "ok" };
  }
  if (account.status === "past_due") {
    const grace = graceEnd(account);
    return grace !== null && grace > t ? { entitled: true, reason: "ok" } : { entitled: false, reason: "past_due" };
  }
  return { entitled: false, reason: "canceled" };
}

/**
 * A monthly account whose paid period ended more than a day ago with no newer
 * event, and that has not been checked against Stripe in the last hour.
 */
export function looksStale(account: Account, now: Date = new Date()): boolean {
  if (account.plan !== "monthly" || !account.stripeSubscriptionId) return false;
  if (account.status === "canceled" || account.moneyBackAt) return false;
  if (account.stripeSyncedAt) {
    const synced = new Date(account.stripeSyncedAt).getTime();
    if (!Number.isNaN(synced) && now.getTime() - synced < 3_600_000) return false;
  }
  if (!account.currentPeriodEnd) return account.status === "active" && now.getTime() - new Date(account.createdAt).getTime() > 35 * DAY_MS;
  return new Date(account.currentPeriodEnd).getTime() + DAY_MS < now.getTime();
}

/** Stripe's subscription status folded into the account status. */
export function statusFromStripe(sub: StripeSubscriptionLike): AccountStatus {
  const plan = planFromSubscription(sub);
  if (plan.plan === "active" || plan.plan === "trial") return "active";
  if (plan.plan === "past_due") return "past_due";
  return "canceled";
}

/**
 * Whether the billing portal has anything to offer: a monthly plan that has
 * not ended, with a Stripe customer on record. A plan closed by a refund or a
 * dispute, or one that ended, has nothing left to manage there. The billing
 * route and the Settings button both use this test.
 */
export function canManageBilling(account: Pick<Account, "plan" | "status" | "moneyBackAt" | "stripeCustomerId">): boolean {
  return (
    account.plan === "monthly" &&
    account.status !== "canceled" &&
    !account.moneyBackAt &&
    /^cus_[A-Za-z0-9]+$/.test(account.stripeCustomerId ?? "")
  );
}

/** What the browser is told. Never the Stripe ids. */
export function accountView(account: Account): AccountView {
  const grace = account.plan === "monthly" && account.status === "past_due" && !account.moneyBackAt ? graceEnd(account) : null;
  const closed = account.status === "canceled" || Boolean(account.moneyBackAt);
  return {
    email: account.email,
    plan: account.plan,
    status: account.moneyBackAt ? "canceled" : account.status,
    renewsOn: account.plan === "monthly" && !account.cancelAt && !closed ? account.currentPeriodEnd : null,
    endsOn: account.cancelAt ?? (closed ? account.currentPeriodEnd : null),
    graceEndsOn: grace === null ? null : new Date(grace).toISOString(),
    // The same test the billing route applies, so the button never leads to "nothing to manage".
    canManageBilling: canManageBilling(account),
  };
}

/**
 * The plan whose AI allowance applies right now. A monthly buyer who moves to
 * the one payment plan keeps the monthly allowance through the Chicago month
 * in which the paid monthly period ends, so paying once never cuts a month
 * already paid for, and writes already used this month are never held
 * against the smaller allowance.
 */
export function meteredPlan(account: Pick<Account, "plan" | "monthlyUntil">, now: Date = new Date()): PostCreatorPlan {
  if (account.plan !== "lifetime" || !account.monthlyUntil) return account.plan;
  const until = new Date(account.monthlyUntil);
  if (Number.isNaN(until.getTime())) return account.plan;
  return chicagoParts(now).month <= chicagoParts(until).month ? "monthly" : "lifetime";
}

/* ----------------------------------- claim ---------------------------------- */

export type ClaimDecision = "sign_in" | "existing" | "used" | "expired";

/**
 * Whether the browser arriving from checkout may be signed in. `now` and
 * `sessionCreatedAt` are unix seconds. Checked in this order: a checkout that
 * did not create the account never signs in (someone else's email, or a
 * second purchase); a checkout more than a day old, or dated more than five
 * minutes ahead, has expired; a checkout that already signed a browser in is
 * used.
 */
export function claimDecision(input: {
  createdByThisSession: boolean;
  firstClaimedAt: string | null;
  sessionCreatedAt: number | null;
  now: number;
}): ClaimDecision {
  if (!input.createdByThisSession) return "existing";
  const created = input.sessionCreatedAt;
  const windowSeconds = POST_CREATOR.claimWindowHours * 3600;
  if (created === null || input.now - created > windowSeconds || created > input.now + 300) return "expired";
  if (input.firstClaimedAt) return "used";
  return "sign_in";
}

/* ------------------------------ chicago calendar ----------------------------- */

const CHICAGO = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" });

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * The Chicago day ("2026-09-24"), month ("2026-09"), and the first day of the
 * next Chicago month ("2026-10-01") for an instant.
 */
export function chicagoParts(now: Date): { day: string; month: string; nextMonthStart: string } {
  const parts = CHICAGO.formatToParts(now);
  const get = (type: "year" | "month" | "day") => Number(parts.find((p) => p.type === type)?.value);
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return {
    day: `${year}-${pad2(month)}-${pad2(day)}`,
    month: `${year}-${pad2(month)}`,
    nextMonthStart: `${nextYear}-${pad2(nextMonth)}-01`,
  };
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** "2026-10-01" as "October 1". Anything that is not a YYYY-MM-DD day comes back unchanged. */
export function monthDayLabel(isoDay: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDay);
  if (!m) return isoDay;
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return isoDay;
  return `${MONTH_NAMES[month - 1]} ${day}`;
}

/** Month 1 to 12. December to February is winter, March to May spring, June to August summer, September to November fall. */
export function seasonForMonth(month: number): "winter" | "spring" | "summer" | "fall" {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "fall";
  return "winter";
}

/* --------------------------------- allowance -------------------------------- */

/** What is left of a plan's AI writes, from the counts the database returned. */
export function allowanceView(plan: PostCreatorPlan, counts: UsageCounts, now: Date): Allowance {
  const limits = aiLimitsFor(plan);
  const leftThisMonth = Math.max(0, limits.perMonth - counts.usedMonth);
  return {
    plan,
    perDay: limits.perDay,
    perMonth: limits.perMonth,
    usedToday: counts.usedDay,
    usedThisMonth: counts.usedMonth,
    leftToday: Math.max(0, Math.min(limits.perDay - counts.usedDay, leftThisMonth)),
    leftThisMonth,
    triesLeftToday: Math.max(0, Math.min(limits.triesPerDay - counts.triesDay, limits.triesPerMonth - counts.triesMonth)),
    triesLeftThisMonth: Math.max(0, limits.triesPerMonth - counts.triesMonth),
    resetsMonthOn: chicagoParts(now).nextMonthStart,
  };
}
