import type { SupabaseClient } from "@supabase/supabase-js";
import { deliverPaymentEmail } from "@/lib/paymentEmailDelivery";
import { customerIdOf, planFromSubscription, type StripeSubscriptionLike } from "@/lib/hq/stripe";
import { classifyStripeInvoice } from "@/lib/stripeInvoiceEvents";
import { postCreatorLicenseKey, postCreatorSecrets, purchaseFromSession, type PostCreatorCheckoutSession } from "./access";
import * as db from "./db";
import {
  buyerReceipt,
  endedMonthlyOwnerAlert,
  moneyBackOwnerAlert,
  overlapBuyerNotice,
  overlapOwnerAlert,
  ownerSaleAlert,
  replacedMonthlyBuyerNotice,
  replacedMonthlyOwnerAlert,
  subscriptionEndedOwnerAlert,
  type ResendPayload,
} from "./emails";
import { pastDueSinceFor, statusFromStripe } from "./plan";
import { POST_CREATOR, isPostCreatorKind, postCreatorPlanForKind } from "./product";

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
//   applyPostCreatorMoneyBack      a refund or dispute closes the plan it paid
//                                  for (and cancels a monthly subscription in
//                                  Stripe); a dispute won reopens it.
//   postCreatorFirstInvoiceCheckout
//                                  money back on a subscription's first
//                                  invoice finds the checkout it belongs to.
//
// Every email payload is built from the purchase, the key, and ids only
// (lib/postCreator/emails.ts), never from whether the row was new or from
// what Stripe answered, so a retry always matches the ledger's first attempt.

/** Ledger purposes. Each one is sent at most once per Stripe object. */
export const POST_CREATOR_PURPOSES = {
  buyer: "post-creator:buyer",
  internal: "post-creator:internal",
  overlapBuyer: "post-creator:overlap:buyer",
  overlapInternal: "post-creator:overlap:internal",
  endedMonthlyInternal: "post-creator:ended-monthly:internal",
  replacedMonthlyBuyer: "post-creator:replaced-monthly:buyer",
  replacedMonthlyInternal: "post-creator:replaced-monthly:internal",
  subscriptionEnded: "post-creator:subscription-ended:internal",
  moneyBackInternal: "post-creator:money-back:internal",
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
  // Applied before, and the account was deleted on request since: nothing to
  // open and nobody to tell.
  if (!account) return;

  // The buyer is never charged for two plans. A checkout that took over from
  // a monthly subscription still running stops that subscription (the
  // database names it in replaced_subscription_id): one payment over a
  // monthly plan (ended-monthly), or a second monthly checkout (replaced).
  // A monthly checkout on an account that owns the one payment plan stops
  // the new subscription (overlap). Each decision reads the row after the
  // write and holds only while this checkout is the account's latest, which
  // a retry of it leaves unchanged, so a retry makes the same decision and
  // the same emails, and a checkout replayed after a newer one decides
  // nothing.
  const latest = account.lastSessionId === purchase.sessionId;
  const replacedId = latest ? account.replacedSubscriptionId : null;
  const endedMonthlyId = purchase.plan === "lifetime" ? replacedId : null;
  const secondMonthlyId = purchase.plan === "monthly" ? replacedId : null;
  const overlapId = latest && purchase.plan === "monthly" && account.plan === "lifetime" ? purchase.subscriptionId : null;
  if (replacedId) await retireSubscription(replacedId, deps.fetcher);
  if (overlapId) await cancelAtPeriodEnd(overlapId, deps.fetcher);

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const secrets = postCreatorSecrets();
  if (!apiKey || secrets.length === 0) throw new Error("Post Creator receipt delivery is not configured");
  const key = postCreatorLicenseKey(purchase.email, secrets[0], account.keyVersion);
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
  if (secondMonthlyId) {
    sends.push(send(P.replacedMonthlyBuyer, replacedMonthlyBuyerNotice({ email: purchase.email })));
    sends.push(send(P.replacedMonthlyInternal, replacedMonthlyOwnerAlert({ ...ids, subscriptionId: secondMonthlyId })));
  }

  const results = await Promise.allSettled(sends);
  if (results.some((r) => r.status === "rejected")) throw new Error("A Post Creator receipt delivery remains retryable");
}

const STRIPE_SUBSCRIPTIONS = "https://api.stripe.com/v1/subscriptions/";

function stripeKey(): string | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) console.error("Post Creator could not stop a subscription: no STRIPE_SECRET_KEY");
  return key || null;
}

/** Stop a subscription at the end of its paid period. Logged, never thrown: the owner alert says to check it in Stripe. */
async function cancelAtPeriodEnd(subscriptionId: string, fetcher: typeof fetch = fetch): Promise<void> {
  const key = stripeKey();
  if (!key) return;
  try {
    const r = await fetcher(`${STRIPE_SUBSCRIPTIONS}${encodeURIComponent(subscriptionId)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ cancel_at_period_end: "true" }).toString(),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) console.error("Post Creator could not stop a subscription:", r.status);
  } catch (error) {
    console.error("Post Creator could not stop a subscription:", error instanceof Error ? error.message : "unknown");
  }
}

/**
 * Cancel a subscription right away. Stripe then stops collecting its open
 * invoices too, so a failed renewal is never retried into a charge. Logged,
 * never thrown: the owner alert says to check it in Stripe.
 */
async function cancelNow(subscriptionId: string, fetcher: typeof fetch = fetch): Promise<void> {
  const key = stripeKey();
  if (!key) return;
  try {
    const r = await fetcher(`${STRIPE_SUBSCRIPTIONS}${encodeURIComponent(subscriptionId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) console.error("Post Creator could not cancel a subscription:", r.status);
  } catch (error) {
    console.error("Post Creator could not cancel a subscription:", error instanceof Error ? error.message : "unknown");
  }
}

/**
 * Stop a monthly subscription an account has moved on from. Stripe is asked
 * what state it is in first: one whose renewal failed (past due, unpaid,
 * incomplete) is cancelled now, so Stripe stops retrying its open invoice and
 * the buyer is never charged for both; one that already ended is left alone;
 * anything else (running, or a lookup that failed) ends at the close of its
 * paid month. Logged, never thrown.
 */
async function retireSubscription(subscriptionId: string, fetcher: typeof fetch = fetch): Promise<void> {
  const key = stripeKey();
  if (!key) return;
  let status = "";
  try {
    const r = await fetcher(`${STRIPE_SUBSCRIPTIONS}${encodeURIComponent(subscriptionId)}`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    if (r.ok) {
      const body = (await r.json().catch(() => null)) as { status?: unknown } | null;
      status = typeof body?.status === "string" ? body.status : "";
    } else {
      console.error("Post Creator could not read a subscription:", r.status);
    }
  } catch (error) {
    console.error("Post Creator could not read a subscription:", error instanceof Error ? error.message : "unknown");
  }
  if (status === "canceled" || status === "incomplete_expired") return;
  if (status === "past_due" || status === "unpaid" || status === "incomplete") return cancelNow(subscriptionId, fetcher);
  return cancelAtPeriodEnd(subscriptionId, fetcher);
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
  const status = statusFromStripe(current);
  await db.updatePlan(client, account.email, {
    status,
    currentPeriodEnd: plan.current_period_end,
    cancelAt: plan.cancel_at,
    // The event's time is when the status changed.
    pastDueSince: pastDueSinceFor(account, status, null, eventAt),
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
    pastDueSince: null,
    eventAt: Math.max(account.stripeEventAt, eventAt),
  });
}

/**
 * The subscription a Post Creator monthly purchase paid into: the checkout
 * session's (cs_) or the renewal invoice's (in_), asked of Stripe. Null when
 * the key is neither or Stripe has no key configured; a failed lookup throws,
 * so the webhook answers 500 and Stripe retries.
 */
async function subscriptionPaidBy(key: string, fetcher: typeof fetch): Promise<string | null> {
  const stripe = process.env.STRIPE_SECRET_KEY?.trim();
  const path = key.startsWith("cs_") ? "checkout/sessions" : key.startsWith("in_") ? "invoices" : null;
  if (!stripe || !path) return null;
  const r = await fetcher(`https://api.stripe.com/v1/${path}/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${stripe}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`Post Creator money back could not read ${path}: ${r.status}`);
  const body = (await r.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) throw new Error(`Post Creator money back could not read ${path}`);
  if (path === "invoices") return classifyStripeInvoice(body).subscriptionId;
  const sub = body.subscription;
  if (typeof sub === "string" && sub) return sub;
  if (sub && typeof sub === "object" && typeof (sub as { id?: unknown }).id === "string") return (sub as { id: string }).id;
  return null;
}

/**
 * The checkout that started a Post Creator monthly subscription, for money
 * back on that subscription's first invoice. The first invoice has no
 * purchases row of its own (the checkout's row is the first month's
 * purchase, and the renewal branch skips first invoices), so without this a
 * refund or dispute of the first month would match nothing and close
 * nothing. Null for any other invoice, or with no Stripe key; a failed
 * lookup throws, so the webhook answers 500 and Stripe retries.
 */
export async function postCreatorFirstInvoiceCheckout(invoiceId: string, fetcher: typeof fetch = fetch): Promise<string | null> {
  const stripe = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripe || !/^in_[A-Za-z0-9_]{4,200}$/.test(invoiceId)) return null;
  const get = async (path: string) => {
    const r = await fetcher(`https://api.stripe.com/v1/${path}`, {
      headers: { Authorization: `Bearer ${stripe}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(`Post Creator first invoice lookup failed: ${r.status}`);
    const body = (await r.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new Error("Post Creator first invoice lookup failed");
    return body;
  };
  const invoice = classifyStripeInvoice(await get(`invoices/${encodeURIComponent(invoiceId)}`));
  if (invoice.family !== "post_creator" || invoice.billingReason !== "subscription_create" || !invoice.subscriptionId) return null;
  const sessions = await get(`checkout/sessions?subscription=${encodeURIComponent(invoice.subscriptionId)}&limit=1`);
  const first = Array.isArray(sessions.data) ? (sessions.data[0] as { id?: unknown; metadata?: { kind?: unknown } | null } | undefined) : undefined;
  const id = typeof first?.id === "string" ? first.id : "";
  if (!/^cs_[A-Za-z0-9_]{8,200}$/.test(id) || first?.metadata?.kind !== POST_CREATOR.monthlyKind) return null;
  return id;
}

/**
 * A refund, dispute, failed async payment, or dispute won on a Post Creator
 * purchase. The webhook calls it before it moves the purchases row, so a
 * failure here is retried with the row still unmoved. It only touches the
 * plan the money paid for:
 *
 * - One payment: the plan closes unless another paid one payment purchase
 *   (or a comp) still backs it, so refunding a duplicate never locks the
 *   buyer out.
 * - Monthly: the plan closes only when the money paid into the subscription
 *   the account runs on today; that subscription, or the older one the money
 *   paid into, is cancelled in Stripe right away, as the terms promise. A
 *   monthly refund on an account that owns the one payment plan changes
 *   nothing: that is the overlap refund the owner makes by hand.
 *
 * Closing stamps money_back_at, which no later Stripe event clears; a
 * dispute won clears it.
 */
export async function applyPostCreatorMoneyBack(
  client: db.Db,
  purchase: { stripe_session_id?: string | null; email: string | null; kind: string | null },
  restored: boolean,
  deps: { fetcher?: typeof fetch; now?: Date } = {},
): Promise<void> {
  if (!purchase.email || !purchase.kind || !isPostCreatorKind(purchase.kind)) return;
  const email = purchase.email.toLowerCase();
  const account = await db.getAccount(client, email);
  if (!account || postCreatorPlanForKind(purchase.kind) !== account.plan) return;
  const now = deps.now ?? new Date();
  const fetcher = deps.fetcher ?? fetch;
  const key = purchase.stripe_session_id ?? "";

  if (restored) {
    if (account.moneyBackAt) await db.setMoneyBack(client, account.email, { closed: false, at: now, eventAt: account.stripeEventAt });
    return;
  }

  let closeSubscription: string | null = null;
  if (account.plan === "lifetime") {
    const comped = account.firstSessionId.startsWith("manual:");
    if (comped || (await db.hasOtherPaidPurchase(client, email, purchase.kind, key))) return;
  } else {
    const paidInto = key ? await subscriptionPaidBy(key, fetcher) : null;
    if (paidInto && paidInto !== account.stripeSubscriptionId) {
      // Money back on a subscription the account has moved on from: stop
      // that one, and leave the plan the buyer runs on today alone.
      await cancelNow(paidInto, fetcher);
      return;
    }
    closeSubscription = account.stripeSubscriptionId;
  }

  const eventAt = Math.max(account.stripeEventAt, Math.floor(now.getTime() / 1000));
  await db.setMoneyBack(client, account.email, { closed: true, at: now, eventAt });
  if (!closeSubscription) return;
  await cancelNow(closeSubscription, fetcher);
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return;
  try {
    await deliverPaymentEmail({
      supabase: client,
      sessionId: closeSubscription,
      purpose: POST_CREATOR_PURPOSES.moneyBackInternal,
      payload: moneyBackOwnerAlert({ email: account.email, subscriptionId: closeSubscription }),
      apiKey,
      fetcher,
    });
  } catch (error) {
    console.error("Post Creator money back alert was not sent:", error instanceof Error ? error.message : "unknown");
  }
}
