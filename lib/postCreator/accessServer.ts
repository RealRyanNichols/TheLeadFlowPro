import "server-only";
import { cookies } from "next/headers";
import { planFromSubscription, type StripeSubscriptionLike } from "@/lib/hq/stripe";
import { POST_CREATOR_COOKIE, postCreatorSecrets, verifyIdentity } from "./access";
import * as db from "./db";
import { decideEntitlement, looksStale, statusFromStripe } from "./plan";
import type { Account, Entitlement } from "./types";

// The server side of Post Creator access: who is asking, and whether they are
// still entitled today. The decisions themselves live in ./plan and are pure.
//
// Identity is the signed cookie and nothing else. There is deliberately no
// fallback to a site login: anyone can sign up for a login with any email, so
// a login is not proof of having paid. A cookie whose epoch no longer matches
// the account (a later checkout, or a manual sign-out) is treated as signed
// out, even though its signature is fine.

/**
 * Ask Stripe for the subscription and set the plan from the answer. Used when
 * a monthly account looks stale, so an unregistered webhook never locks a
 * paying buyer out or keeps a lapsed one in. The check is stamped whatever
 * Stripe said, so a slow or failing Stripe is asked at most once an hour.
 */
async function syncFromStripe(client: db.Db, account: Account, stripeKey: string): Promise<Account> {
  const now = new Date();
  try {
    const id = account.stripeSubscriptionId;
    if (id) {
      const r = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${stripeKey}` },
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      });
      const sub = r.ok ? ((await r.json()) as StripeSubscriptionLike) : null;
      if (sub && (!sub.id || sub.id === id)) {
        const plan = planFromSubscription(sub);
        await db.updatePlan(client, account.email, {
          status: statusFromStripe(sub),
          currentPeriodEnd: plan.current_period_end,
          cancelAt: plan.cancel_at,
          eventAt: Math.max(account.stripeEventAt, Math.floor(now.getTime() / 1000)),
        });
      }
    }
  } catch {
    // Stripe or the database is unreachable: decide from what is on record.
  }
  try {
    await db.markSynced(client, account.email, now);
    return (await db.getAccount(client, account.email)) ?? account;
  } catch {
    return account;
  }
}

/**
 * Who the cookie proves, and whether that account may use the paid parts
 * right now. In order: no valid cookie is a visitor; no service key is
 * unconfigured; no row is no_account; a stale epoch is signed_out; then the
 * plan decides. A database error throws.
 */
export async function getEntitlement(): Promise<Entitlement> {
  const store = await cookies();
  const identity = verifyIdentity(store.get(POST_CREATOR_COOKIE)?.value, postCreatorSecrets());
  if (!identity) return { email: null, account: null, entitled: false, reason: "visitor" };
  const email = identity.e;
  const client = db.serviceDb();
  if (!client) return { email, account: null, entitled: false, reason: "unconfigured" };
  let account = await db.getAccount(client, email);
  if (!account) return { email, account: null, entitled: false, reason: "no_account" };
  if (identity.n !== account.accessEpoch) return { email: null, account: null, entitled: false, reason: "signed_out" };
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (stripeKey && looksStale(account)) account = await syncFromStripe(client, account, stripeKey);
  const decision = decideEntitlement(account);
  return { email, account, entitled: decision.entitled, reason: decision.reason };
}
