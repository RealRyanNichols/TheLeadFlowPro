import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { planFromSubscription, type StripeSubscriptionLike } from "@/lib/hq/stripe";
import { CHASE_COOKIE, chaseSecrets, normalizeEmail, verifyIdentity } from "./access";
import * as db from "./db";
import { decideEntitlement, looksStale, statusFromStripe, type EntitlementReason } from "./plan";
import type { Account } from "./types";

// The server side of access: who is asking (the signed cookie, or a signed-in
// account with the same email), and whether they are still entitled today.
// The decisions themselves live in lib/chaseSheet/plan.ts and are pure.

export type Entitlement = {
  /** The email the request proved, or null for a visitor. */
  email: string | null;
  account: Account | null;
  entitled: boolean;
  reason: EntitlementReason;
  /** True when the email came from a signed-in account rather than the cookie. */
  fromLogin: boolean;
};

export async function readIdentityEmail(): Promise<{ email: string | null; fromLogin: boolean }> {
  const store = await cookies();
  const identity = verifyIdentity(store.get(CHASE_COOKIE)?.value, chaseSecrets());
  if (identity) return { email: identity.e, fromLogin: false };
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const email = normalizeEmail(user?.email);
    if (email) return { email, fromLogin: true };
  } catch {
    // No session or Supabase unreachable: a visitor.
  }
  return { email: null, fromLogin: false };
}

/**
 * Ask Stripe for the subscription and set the plan from the answer. Used
 * when a monthly account looks stale, so an unregistered webhook never locks
 * a paying customer out or keeps a lapsed one in.
 */
async function syncFromStripe(client: db.Db, account: Account, stripeKey: string): Promise<Account> {
  if (!account.stripeSubscriptionId) return account;
  try {
    const r = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(account.stripeSubscriptionId)}`, {
      headers: { Authorization: `Bearer ${stripeKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return account;
    const sub = (await r.json()) as StripeSubscriptionLike;
    const plan = planFromSubscription(sub);
    await db.updatePlan(client, account.email, {
      status: statusFromStripe(sub),
      currentPeriodEnd: plan.current_period_end,
      cancelAt: plan.cancel_at,
      eventAt: Math.max(account.stripeEventAt, Math.floor(Date.now() / 1000)),
    });
    return (await db.getAccount(client, account.email)) ?? account;
  } catch {
    return account;
  }
}

export async function getEntitlement(): Promise<Entitlement> {
  const { email, fromLogin } = await readIdentityEmail();
  if (!email) return { email: null, account: null, entitled: false, reason: "visitor", fromLogin };
  const client = db.serviceDb();
  if (!client) return { email, account: null, entitled: false, reason: "unconfigured", fromLogin };
  let account = await db.getAccount(client, email);
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (account && stripeKey && looksStale(account)) account = await syncFromStripe(client, account, stripeKey);
  const decision = decideEntitlement(account);
  return { email, account, entitled: decision.entitled, reason: decision.reason, fromLogin };
}
