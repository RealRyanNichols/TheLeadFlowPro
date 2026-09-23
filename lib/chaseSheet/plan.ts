// Plan decisions, pure so the tests can cover every branch without a
// database or a clock.
//
// A lifetime account is entitled while its status is active (a refund flips
// it). A monthly account is entitled while Stripe says active, or past_due
// inside the grace window, or canceled-at-period-end with the date still
// ahead. A monthly account whose paid period ended with no newer event is
// "stale" and the server asks Stripe directly before deciding.

import { planFromSubscription, type StripeSubscriptionLike } from "@/lib/hq/stripe";
import { CHASE_SHEET } from "./product";
import type { Account, AccountStatus, AccountView } from "./types";

export type EntitlementReason = "visitor" | "no_account" | "ok" | "past_due" | "canceled" | "unconfigured";

export function graceEnd(account: Account): number | null {
  if (!account.currentPeriodEnd) return null;
  return new Date(account.currentPeriodEnd).getTime() + CHASE_SHEET.pastDueGraceDays * 86_400_000;
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

/** A monthly account whose paid period ended more than a day ago with no newer event. */
export function looksStale(account: Account, now: Date = new Date()): boolean {
  if (account.plan !== "monthly" || !account.stripeSubscriptionId) return false;
  if (account.status === "canceled") return false;
  if (!account.currentPeriodEnd) return account.status === "active" && now.getTime() - new Date(account.createdAt).getTime() > 35 * 86_400_000;
  return new Date(account.currentPeriodEnd).getTime() + 86_400_000 < now.getTime();
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
  return {
    email: account.email,
    plan: account.plan,
    status: account.status,
    renewsOn: account.plan === "monthly" && !account.cancelAt && account.status !== "canceled" ? account.currentPeriodEnd : null,
    endsOn: account.cancelAt ?? (account.status === "canceled" ? account.currentPeriodEnd : null),
    canManageBilling: account.plan === "monthly" && !!account.stripeCustomerId,
  };
}
