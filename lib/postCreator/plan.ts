// Post Creator: plan decisions and the Chicago calendar, pure so the tests
// can cover every branch without a database or a clock.
//
// A one payment account is entitled while its status is active (a refund
// flips it). A monthly account is entitled while Stripe says active, or
// past_due inside the grace window, or canceled-at-period-end with the date
// still ahead. A monthly account whose paid period ended with no newer event is
// "stale" and the server asks Stripe directly, at most once an hour.
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

/** When a past-due monthly account loses access, in epoch milliseconds, or null with no period on record. */
export function graceEnd(account: Account): number | null {
  if (!account.currentPeriodEnd) return null;
  const end = new Date(account.currentPeriodEnd).getTime();
  return Number.isNaN(end) ? null : end + POST_CREATOR.pastDueGraceDays * DAY_MS;
}

export function decideEntitlement(account: Account | null, now: Date = new Date()): { entitled: boolean; reason: EntitlementReason } {
  if (!account) return { entitled: false, reason: "no_account" };
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
    return grace === null || grace > t ? { entitled: true, reason: "ok" } : { entitled: false, reason: "past_due" };
  }
  return { entitled: false, reason: "canceled" };
}

/**
 * A monthly account whose paid period ended more than a day ago with no newer
 * event, and that has not been checked against Stripe in the last hour.
 */
export function looksStale(account: Account, now: Date = new Date()): boolean {
  if (account.plan !== "monthly" || !account.stripeSubscriptionId) return false;
  if (account.status === "canceled") return false;
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

/** What the browser is told. Never the Stripe ids. */
export function accountView(account: Account): AccountView {
  const grace = account.plan === "monthly" && account.status === "past_due" ? graceEnd(account) : null;
  return {
    email: account.email,
    plan: account.plan,
    status: account.status,
    renewsOn: account.plan === "monthly" && !account.cancelAt && account.status !== "canceled" ? account.currentPeriodEnd : null,
    endsOn: account.cancelAt ?? (account.status === "canceled" ? account.currentPeriodEnd : null),
    graceEndsOn: grace === null ? null : new Date(grace).toISOString(),
    // The same test the billing route applies, so the button never leads to "nothing to manage".
    canManageBilling: account.plan === "monthly" && /^cus_[A-Za-z0-9]+$/.test(account.stripeCustomerId ?? ""),
  };
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
    triesLeftToday: Math.max(0, limits.triesPerDay - counts.triesDay),
    resetsMonthOn: chicagoParts(now).nextMonthStart,
  };
}
