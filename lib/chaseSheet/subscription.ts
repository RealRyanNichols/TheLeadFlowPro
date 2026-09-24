import type { SupabaseClient } from "@supabase/supabase-js";
import { deliverPaymentEmail } from "@/lib/paymentEmailDelivery";
import { customerIdOf, planFromSubscription, type StripeSubscriptionLike } from "@/lib/hq/stripe";
import { BUSINESS } from "@/lib/site/business";
import { chaseLicenseKey, chaseSecrets, purchaseFromSession, type ChaseCheckoutSession } from "./access";
import * as db from "./db";
import { statusFromStripe } from "./plan";
import { CHASE_SHEET, isChaseSheetKind } from "./product";

// The Stripe side of Chase Sheet, called from the shared webhook.
//
//   ensureChaseSheetPaid       a paid checkout (monthly or lifetime): the
//                              account row, the receipt with the key, the
//                              owner alert. Idempotent through the ledger.
//   handleChaseSheetSubscription   every customer.subscription.* event for
//                              the monthly plan keeps the account's status
//                              in step with Stripe. Out-of-order events lose.
//   applyChaseSheetMoneyBack   a refund or dispute on either plan locks the
//                              sheet; a dispute won reopens it.

const SITE = BUSINESS.siteUrl;

export async function ensureChaseSheetPaid(supabase: SupabaseClient, session: ChaseCheckoutSession, eventAt = Math.floor(Date.now() / 1000)) {
  const purchase = purchaseFromSession(session);
  if (!purchase) throw new Error("Paid Chase Sheet checkout requires amount, mode, or currency review");
  const { account, created } = await db.recordPurchase(supabase, {
    email: purchase.email,
    plan: purchase.plan,
    sessionId: purchase.sessionId,
    customerId: purchase.customerId,
    subscriptionId: purchase.subscriptionId,
    eventAt,
  });

  // A lifetime purchase on top of a live monthly plan: stop the monthly plan
  // at the end of its paid period so the buyer is never charged for both.
  let endedMonthly = false;
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (purchase.plan === "lifetime" && account.stripeSubscriptionId && stripeKey) {
    endedMonthly = await cancelAtPeriodEnd(stripeKey, account.stripeSubscriptionId);
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const secrets = chaseSecrets();
  if (!resendKey || secrets.length === 0) throw new Error("Chase Sheet receipt delivery is not configured");
  const key = chaseLicenseKey(purchase.email, secrets[0]);
  const send = (recipient: "internal" | "buyer", payload: object) =>
    deliverPaymentEmail({ supabase, sessionId: purchase.sessionId, purpose: `chase-sheet:${recipient}`, payload, apiKey: resendKey });

  const planLine = purchase.plan === "monthly"
    ? `${CHASE_SHEET.monthlyLabel}. It renews on the same date each month until you cancel from inside the sheet; it stops at the end of the paid month.`
    : `${CHASE_SHEET.lifetimeLabel}. Nothing renews and there is nothing to cancel.`;

  const results = await Promise.allSettled([
    send("internal", {
      from: `${BUSINESS.name} <${BUSINESS.email.hello}>`,
      to: [BUSINESS.email.hello],
      subject: `💰 CHASE SHEET ${purchase.plan === "monthly" ? "MONTHLY" : "LIFETIME"}: ${purchase.email}`,
      text: [
        `${CHASE_SHEET.name} was purchased (${purchase.plan}).`,
        `Buyer: ${purchase.email}`,
        `Stripe session: ${purchase.sessionId}`,
        created ? "New account." : "Existing account updated.",
        endedMonthly ? "Their monthly plan was set to end at the close of the paid period." : "",
        "",
        "The key and the sheet link were emailed to the buyer through the ledger.",
        `Purchases: ${SITE}/admin/purchases`,
      ].filter(Boolean).join("\n"),
    }),
    send("buyer", {
      from: `${BUSINESS.operator} <${BUSINESS.email.hello}>`,
      to: [purchase.email],
      reply_to: BUSINESS.email.hello,
      subject: `Your ${CHASE_SHEET.name} is open. Here is your key.`,
      text: [
        `${CHASE_SHEET.name} is yours.`,
        "",
        "It is already open in the browser you bought it in. This email is how you",
        "open it on your phone and anywhere else, so keep it.",
        "",
        `Your key: ${key}`,
        "",
        `Open the sheet: ${SITE}${CHASE_SHEET.appPath}`,
        `Open it on another device: ${SITE}${CHASE_SHEET.appPath}?email=${encodeURIComponent(purchase.email)}&key=${encodeURIComponent(key)}`,
        "",
        "Three minutes to set up:",
        "1. Put in your business name, your trade, and how you talk to customers.",
        "2. Add the quotes you have out right now: name, number, job, amount, the day you sent it.",
        "3. Tomorrow morning, open the sheet and send what it hands you. Each message is",
        "   written for that quote and sends from your own phone with one tap.",
        "",
        `Plan: ${planLine}`,
        endedMonthly ? "Your earlier monthly plan has been set to end at the close of its paid period, so you will not be charged for both." : "",
        "",
        "Nothing is sent for you. You read every message, you tap send, and your",
        "customers' details never leave your sheet.",
        "",
        "If anything does not open, reply to this email and I will sort it out.",
        "",
        "Ryan Nichols",
        BUSINESS.name,
        BUSINESS.phone.display,
      ].filter((line, i, all) => !(line === "" && all[i - 1] === "")).join("\n"),
    }),
  ]);
  if (results.some((r) => r.status === "rejected")) throw new Error("A Chase Sheet receipt delivery remains retryable");
}

async function cancelAtPeriodEnd(stripeKey: string, subscriptionId: string): Promise<boolean> {
  try {
    const r = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ cancel_at_period_end: "true" }).toString(),
      signal: AbortSignal.timeout(8000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

type StripeEvent = { type?: unknown; created?: unknown; data?: { object?: unknown } };

/** True when the event was a Chase Sheet subscription event and was handled here. */
export async function handleChaseSheetSubscription(client: db.Db, event: StripeEvent): Promise<boolean> {
  const type = typeof event.type === "string" ? event.type : "";
  if (!type.startsWith("customer.subscription.")) return false;
  const sub = (event.data?.object && typeof event.data.object === "object" ? event.data.object : {}) as StripeSubscriptionLike;
  const metadata = (sub.metadata && typeof sub.metadata === "object" ? sub.metadata : {}) as Record<string, unknown>;
  if (metadata.kind !== CHASE_SHEET.monthlyKind) return false;
  const eventAt = typeof event.created === "number" && Number.isFinite(event.created) ? Math.floor(event.created) : Math.floor(Date.now() / 1000);

  let account: Awaited<ReturnType<typeof db.getAccount>> = null;
  if (typeof sub.id === "string") account = await db.findAccountByStripe(client, "stripe_subscription_id", sub.id);
  if (!account) {
    const customerId = customerIdOf(sub);
    if (customerId) account = await db.findAccountByStripe(client, "stripe_customer_id", customerId);
  }
  // Handled as far as we can: an event for a subscription with no account is
  // not a reason to make Stripe retry forever.
  if (!account) return true;
  if (eventAt < account.stripeEventAt) return true;
  // A lifetime account is never governed by a subscription's status.
  if (account.plan === "lifetime") return true;

  const plan = planFromSubscription(type === "customer.subscription.deleted" ? { ...sub, status: "canceled" } : sub);
  await db.updatePlan(client, account.email, {
    status: statusFromStripe(type === "customer.subscription.deleted" ? { ...sub, status: "canceled" } : sub),
    currentPeriodEnd: plan.current_period_end,
    cancelAt: plan.cancel_at,
    subscriptionId: typeof sub.id === "string" ? sub.id : account.stripeSubscriptionId,
    customerId: customerIdOf(sub) ?? account.stripeCustomerId,
    eventAt,
  });
  return true;
}

/**
 * A paid renewal invoice. The subscription.updated event normally carries the
 * new period; this keeps the sheet open even when that event never arrives.
 */
export async function markChaseSheetRenewed(client: db.Db, subscriptionId: string, eventAt = Math.floor(Date.now() / 1000)): Promise<void> {
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
 * A refund, dispute, failed async payment, or dispute won on a Chase Sheet
 * purchase. Called by the webhook after it has moved the purchases row.
 */
export async function applyChaseSheetMoneyBack(client: db.Db, purchase: { email: string | null; kind: string | null }, restored: boolean): Promise<void> {
  if (!purchase.email || !purchase.kind || !isChaseSheetKind(purchase.kind)) return;
  const account = await db.getAccount(client, purchase.email.toLowerCase());
  if (!account) return;
  await db.setStatus(client, account.email, restored ? "active" : "canceled");
}
