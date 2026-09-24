import type { SupabaseClient } from "@supabase/supabase-js";
import { deliverPaymentEmail } from "@/lib/paymentEmailDelivery";
import { customerIdOf, planFromSubscription, type StripeSubscriptionLike } from "@/lib/hq/stripe";
import { postCreatorLicenseKey, postCreatorSecrets, purchaseFromSession, type PostCreatorCheckoutSession } from "./access";
import * as db from "./db";
import {
  buyerReceipt,
  endedMonthlyOwnerAlert,
  overlapBuyerNotice,
  overlapOwnerAlert,
  ownerSaleAlert,
  subscriptionEndedOwnerAlert,
  type ResendPayload,
} from "./emails";
import { statusFromStripe } from "./plan";
import { POST_CREATOR, isPostCreatorKind } from "./product";

// The Stripe side of Post Creator, called from the shared webhook.
//
//   ensurePostCreatorPaid          a paid checkout (monthly or one payment):
//                                  the account row, the receipt with the key,
//                                  the owner alert, and the plan overlap rules.
//                                  Idempotent through the ledger.
//   handlePostCreatorSubscription  every customer.subscription.* event for the
//                                  monthly plan keeps the account's status in
//                                  step with Stripe. Out-of-order events and
//                                  events from an older subscription lose.
//   markPostCreatorRenewed         a paid renewal invoice reopens a past-due
//                                  account.
//   applyPostCreatorMoneyBack      a refund or dispute locks the account; a
//                                  dispute won reopens it.
//
// Every email payload is built from the purchase, the key, and ids only
// (lib/postCreator/emails.ts), never from whether the row was new or from the
// cancel call's answer, so a retry always matches the ledger's first attempt.

/** Ledger purposes. Each one is sent at most once per Stripe object. */
export const POST_CREATOR_PURPOSES = {
  buyer: "post-creator:buyer",
  internal: "post-creator:internal",
  overlapBuyer: "post-creator:overlap:buyer",
  overlapInternal: "post-creator:overlap:internal",
  endedMonthlyInternal: "post-creator:ended-monthly:internal",
  subscriptionEnded: "post-creator:subscription-ended:internal",
} as const;

const nowSeconds = () => Math.floor(Date.now() / 1000);

export async function ensurePostCreatorPaid(
  supabase: SupabaseClient,
  session: PostCreatorCheckoutSession,
  deps: { eventAt?: number; fetcher?: typeof fetch } = {},
): Promise<void> {
  const purchase = purchaseFromSession(session);
  if (!purchase) throw new Error("Paid Post Creator checkout requires amount, mode, or currency review");
  const { account } = await db.recordPurchase(supabase, {
    email: purchase.email,
    plan: purchase.plan,
    sessionId: purchase.sessionId,
    customerId: purchase.customerId,
    subscriptionId: purchase.subscriptionId,
    eventAt: deps.eventAt ?? purchase.createdAt ?? nowSeconds(),
  });

  // The buyer is never charged for both plans. One payment on top of a
  // monthly plan stops the old subscription at the end of its paid month
  // (ended-monthly). A monthly checkout on an account that already owns the
  // one payment plan stops the new subscription (overlap). Both decisions
  // read the row after the write, which a retry of the same session leaves
  // unchanged, so a retry makes the same decision and the same emails.
  const endedMonthlyId = purchase.plan === "lifetime" ? account.stripeSubscriptionId : null;
  const overlapId = purchase.plan === "monthly" && account.plan === "lifetime" ? purchase.subscriptionId : null;
  if (endedMonthlyId) await cancelAtPeriodEnd(endedMonthlyId, deps.fetcher);
  if (overlapId) await cancelAtPeriodEnd(overlapId, deps.fetcher);

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const secrets = postCreatorSecrets();
  if (!apiKey || secrets.length === 0) throw new Error("Post Creator receipt delivery is not configured");
  const key = postCreatorLicenseKey(purchase.email, secrets[0]);
  const send = (purpose: string, payload: ResendPayload) =>
    deliverPaymentEmail({ supabase, sessionId: purchase.sessionId, purpose, payload, apiKey, fetcher: deps.fetcher });

  const P = POST_CREATOR_PURPOSES;
  const ids = { email: purchase.email, sessionId: purchase.sessionId };
  const sends = [
    send(P.buyer, buyerReceipt({ email: purchase.email, plan: purchase.plan, key })),
    send(P.internal, ownerSaleAlert({ ...ids, plan: purchase.plan })),
  ];
  if (overlapId) {
    sends.push(send(P.overlapBuyer, overlapBuyerNotice({ email: purchase.email })));
    sends.push(send(P.overlapInternal, overlapOwnerAlert({ ...ids, subscriptionId: overlapId })));
  }
  if (endedMonthlyId) sends.push(send(P.endedMonthlyInternal, endedMonthlyOwnerAlert({ ...ids, subscriptionId: endedMonthlyId })));

  const results = await Promise.allSettled(sends);
  if (results.some((r) => r.status === "rejected")) throw new Error("A Post Creator receipt delivery remains retryable");
}

/** Stop a subscription at the end of its paid period. Logged, never thrown: the owner alert says to check it in Stripe. */
async function cancelAtPeriodEnd(subscriptionId: string, fetcher: typeof fetch = fetch): Promise<void> {
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeKey) {
    console.error("Post Creator could not stop a subscription: no STRIPE_SECRET_KEY");
    return;
  }
  try {
    const r = await fetcher(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ cancel_at_period_end: "true" }).toString(),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) console.error("Post Creator could not stop a subscription:", r.status);
  } catch (error) {
    console.error("Post Creator could not stop a subscription:", error instanceof Error ? error.message : "unknown");
  }
}

type StripeEvent = { type?: unknown; created?: unknown; data?: { object?: unknown } };

/** True when the event was a Post Creator subscription event and was handled here. */
export async function handlePostCreatorSubscription(
  client: db.Db,
  event: StripeEvent,
  deps: { fetcher?: typeof fetch } = {},
): Promise<boolean> {
  const type = typeof event.type === "string" ? event.type : "";
  if (!type.startsWith("customer.subscription.")) return false;
  const sub = (event.data?.object && typeof event.data.object === "object" ? event.data.object : {}) as StripeSubscriptionLike;
  const metadata = (sub.metadata && typeof sub.metadata === "object" ? sub.metadata : {}) as Record<string, unknown>;
  if (metadata.kind !== POST_CREATOR.monthlyKind) return false;
  const eventAt = typeof event.created === "number" && Number.isFinite(event.created) ? Math.floor(event.created) : nowSeconds();
  const subId = typeof sub.id === "string" ? sub.id : null;

  let account: Awaited<ReturnType<typeof db.getAccount>> = null;
  if (subId) account = await db.findAccountByStripe(client, "stripe_subscription_id", subId);
  if (!account) {
    const customerId = customerIdOf(sub);
    if (customerId) account = await db.findAccountByStripe(client, "stripe_customer_id", customerId);
  }
  // Handled as far as we can: an event for a subscription with no account is
  // not a reason to make Stripe retry forever.
  if (!account) return true;
  // A late event from a subscription this account has moved on from.
  if (account.stripeSubscriptionId && subId !== account.stripeSubscriptionId) return true;
  if (eventAt < account.stripeEventAt) return true;
  // A one payment account is never governed by a subscription's status.
  if (account.plan === "lifetime") return true;

  const deleted = type === "customer.subscription.deleted";
  const current = deleted ? { ...sub, status: "canceled" } : sub;
  const plan = planFromSubscription(current);
  await db.updatePlan(client, account.email, {
    status: statusFromStripe(current),
    currentPeriodEnd: plan.current_period_end,
    cancelAt: plan.cancel_at,
    subscriptionId: subId ?? account.stripeSubscriptionId,
    customerId: customerIdOf(sub) ?? account.stripeCustomerId,
    eventAt,
  });

  // The owner hears when a monthly plan ends. Keyed by the subscription, so
  // Stripe's retries of this event never send it twice.
  if (deleted && subId) {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (apiKey) {
      try {
        await deliverPaymentEmail({
          supabase: client,
          sessionId: subId,
          purpose: POST_CREATOR_PURPOSES.subscriptionEnded,
          payload: subscriptionEndedOwnerAlert({ email: account.email, subscriptionId: subId }),
          apiKey,
          fetcher: deps.fetcher,
        });
      } catch (error) {
        console.error("Post Creator ended alert was not sent:", error instanceof Error ? error.message : "unknown");
      }
    }
  }
  return true;
}

/**
 * A paid renewal invoice. The subscription.updated event normally carries the
 * new period; this keeps AI writing on even when that event never arrives.
 */
export async function markPostCreatorRenewed(client: db.Db, subscriptionId: string, eventAt = nowSeconds()): Promise<void> {
  const account = await db.findAccountByStripe(client, "stripe_subscription_id", subscriptionId);
  if (!account || account.plan !== "monthly" || account.status === "active") return;
  await db.updatePlan(client, account.email, {
    status: "active",
    currentPeriodEnd: account.currentPeriodEnd,
    cancelAt: account.cancelAt,
    eventAt: Math.max(account.stripeEventAt, eventAt),
  });
}

/**
 * A refund, dispute, failed async payment, or dispute won on a Post Creator
 * purchase. Called by the webhook after it has moved the purchases row. Money
 * back on a monthly charge never locks an account that owns the one payment
 * plan: that is the overlap refund the owner makes by hand.
 */
export async function applyPostCreatorMoneyBack(
  client: db.Db,
  purchase: { email: string | null; kind: string | null },
  restored: boolean,
): Promise<void> {
  if (!purchase.email || !purchase.kind || !isPostCreatorKind(purchase.kind)) return;
  const account = await db.getAccount(client, purchase.email.toLowerCase());
  if (!account) return;
  if (purchase.kind === POST_CREATOR.monthlyKind && account.plan === "lifetime") return;
  await db.setStatus(client, account.email, restored ? "active" : "canceled");
}
