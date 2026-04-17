import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { BOOSTERS } from "@/lib/pricing";
import type { PlanId } from "@/lib/pricing";

export const runtime = "nodejs";

// Stripe webhook receiver.
// In Stripe Dashboard → Developers → Webhooks, add:
//   https://www.theleadflowpro.com/api/webhooks/stripe
// Subscribe to: checkout.session.completed, customer.subscription.updated,
//               customer.subscription.deleted, invoice.payment_failed
// Put the signing secret in STRIPE_WEBHOOK_SECRET.

// Map Stripe Price IDs back to our internal plan keys. Env vars are the
// single source of truth, set by scripts/stripe-bootstrap.ts.
function planIdFromPriceId(priceId: string): PlanId | null {
  if (priceId === process.env.STRIPE_PRICE_STARTER) return "starter";
  if (priceId === process.env.STRIPE_PRICE_GROWTH)  return "growth";
  if (priceId === process.env.STRIPE_PRICE_PRO)     return "pro";
  if (priceId === process.env.STRIPE_PRICE_AGENCY)  return "agency";
  return null;
}

// Booster SKU → credits to grant on the User row.
const BOOSTER_CREDITS: Record<string, { aiActionsBonus?: number; smsBonus?: number }> = {
  "ai-100":  { aiActionsBonus: 100 },
  "ai-500":  { aiActionsBonus: 500 },
  "sms-250": { smsBonus: 250 }
  // adcopy-50, audience-scan, priority-ai are service-level grants, not raw
  // credits — they'll be tracked in a separate entitlements table later.
};

async function findUserForEvent(
  userId: string | null | undefined,
  customerId: string | null | undefined
) {
  if (userId) {
    const byId = await prisma.user.findUnique({ where: { id: userId } });
    if (byId) return byId;
  }
  if (customerId) {
    const byStripe = await prisma.user.findUnique({ where: { stripeCustomerId: customerId } });
    if (byStripe) return byStripe;
  }
  return null;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId =
    session.client_reference_id ||
    (session.metadata?.userId as string | undefined) ||
    null;
  const customerId = typeof session.customer === "string"
    ? session.customer
    : session.customer?.id ?? null;

  const user = await findUserForEvent(userId, customerId);
  if (!user) {
    console.warn("Stripe webhook: no user found for session", session.id);
    return;
  }

  // Always make sure the customer id is pinned to the user.
  if (customerId && user.stripeCustomerId !== customerId) {
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId }
    });
  }

  const kind = session.metadata?.kind;
  const key = session.metadata?.key;

  // Booster (one-time purchase) — grant credits.
  if (kind === "booster" && key) {
    const booster = BOOSTERS.find((b) => b.id === key);
    const credits = BOOSTER_CREDITS[key] ?? {};
    if (booster && (credits.aiActionsBonus || credits.smsBonus)) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          ...(credits.aiActionsBonus
            ? { aiActionsBonus: { increment: credits.aiActionsBonus } }
            : {}),
          ...(credits.smsBonus
            ? { smsBonus: { increment: credits.smsBonus } }
            : {})
        }
      });
    }
    return;
  }

  // Subscription plan — the subscription.updated event will populate the
  // full plan details, but set the plan immediately so the UI reflects it.
  if (kind === "plan" && key) {
    await prisma.user.update({
      where: { id: user.id },
      data: { plan: key as PlanId }
    });
  }
}

async function handleSubscriptionChange(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const userId = (sub.metadata?.userId as string | undefined) || null;

  const user = await findUserForEvent(userId, customerId);
  if (!user) {
    console.warn("Stripe webhook: no user found for subscription", sub.id);
    return;
  }

  const item = sub.items.data[0];
  const priceId = item?.price.id ?? null;
  const plan = priceId ? planIdFromPriceId(priceId) : null;
  const periodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000)
    : null;

  // If the subscription is gone (canceled/expired), drop to free.
  const isActive = sub.status === "active" || sub.status === "trialing";

  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: isActive && plan ? plan : "free",
      stripeSubscriptionId: isActive ? sub.id : null,
      stripePriceId: isActive ? priceId : null,
      stripeCurrentPeriodEnd: isActive ? periodEnd : null,
      // Monthly renewal — reset usage counters (but keep booster bonuses).
      ...(isActive ? { aiActionsUsed: 0, smsUsed: 0 } : {})
    }
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string"
    ? invoice.customer
    : invoice.customer?.id ?? null;
  if (!customerId) return;

  const user = await prisma.user.findUnique({ where: { stripeCustomerId: customerId } });
  if (!user) return;

  // Don't auto-downgrade on first failure — Stripe will retry via the smart
  // retry schedule. Just log for now; future work: email the user, dashboard
  // banner. When all retries exhaust, subscription.deleted fires and we drop
  // to free in handleSubscriptionChange.
  console.warn(`Invoice ${invoice.id} failed for user ${user.id}`);
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig, secret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "bad signature";
    return NextResponse.json({ error: `Invalid signature: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }
  } catch (err: unknown) {
    // Return 500 so Stripe retries. Log the full error.
    console.error("Stripe webhook handler failed:", err);
    const message = err instanceof Error ? err.message : "handler error";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
