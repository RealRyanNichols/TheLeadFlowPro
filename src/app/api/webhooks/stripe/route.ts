import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { BOOSTERS } from "@/lib/pricing";
import type { PlanId } from "@/lib/pricing";
import { addBusinessDays, deliveryDueDate, getOfferWorkload } from "@/lib/workload";
import { TOOL_CHALLENGE_DEPOSIT } from "@/lib/challenge-deposit";

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

async function findOrCreateUserForCheckout(
  userId: string | null | undefined,
  customerId: string | null | undefined,
  email: string | null | undefined,
  name: string | null | undefined,
) {
  const existing = await findUserForEvent(userId, customerId);
  if (existing) return existing;

  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail || !/.+@.+\..+/.test(normalizedEmail)) return null;

  const byEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (byEmail) {
    if (customerId && byEmail.stripeCustomerId !== customerId) {
      try {
        return await prisma.user.update({
          where: { id: byEmail.id },
          data: {
            stripeCustomerId: customerId,
            ...(name && !byEmail.name ? { name } : {}),
          },
        });
      } catch {
        return byEmail;
      }
    }
    if (name && !byEmail.name) {
      return prisma.user.update({ where: { id: byEmail.id }, data: { name } });
    }
    return byEmail;
  }

  try {
    return await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name || null,
        stripeCustomerId: customerId || null,
      },
    });
  } catch {
    return prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name || null,
      },
    });
  }
}

function metadataOfferSlug(metadata: Stripe.Metadata | null | undefined): string | null {
  return (
    (metadata?.slug as string | undefined) ||
    (metadata?.offerSlug as string | undefined) ||
    (metadata?.offer as string | undefined) ||
    null
  );
}

async function checkoutOfferSlug(session: Stripe.Checkout.Session): Promise<string | null> {
  const sessionSlug = metadataOfferSlug(session.metadata);
  if (sessionSlug) return sessionSlug;

  const paymentLinkId =
    typeof session.payment_link === "string"
      ? session.payment_link
      : session.payment_link?.id ?? null;
  if (paymentLinkId) {
    try {
      const paymentLink = await stripe().paymentLinks.retrieve(paymentLinkId);
      const paymentLinkSlug = metadataOfferSlug(paymentLink.metadata);
      if (paymentLinkSlug) return paymentLinkSlug;
    } catch (err) {
      console.warn("Stripe webhook: payment link metadata lookup failed", {
        session: session.id,
        paymentLinkId,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  try {
    const lineItems = await stripe().checkout.sessions.listLineItems(session.id, {
      limit: 10,
      expand: ["data.price.product"],
    });
    for (const item of lineItems.data) {
      const priceSlug = metadataOfferSlug(item.price?.metadata);
      if (priceSlug) return priceSlug;

      const product = item.price?.product;
      if (product && typeof product !== "string" && "metadata" in product) {
        const productSlug = metadataOfferSlug(product.metadata);
        if (productSlug) return productSlug;
      }
    }
  } catch (err) {
    console.warn("Stripe webhook: line item metadata lookup failed", {
      session: session.id,
      error: err instanceof Error ? err.message : "unknown",
    });
  }

  return null;
}

async function createOfferWorkOrderFromCheckout(
  session: Stripe.Checkout.Session,
  user: Awaited<ReturnType<typeof findUserForEvent>> | null,
  customerId: string | null,
) {
  const offerSlug = await checkoutOfferSlug(session);
  const workload = getOfferWorkload(offerSlug);
  if (!offerSlug || !workload) return false;

  const marker = `stripe_session:${session.id}`;
  try {
    const existing = await (prisma as any).workOrder.findFirst({
      where: { notes: { contains: marker } },
      select: { id: true },
    });
    if (existing) return true;

    const buyerEmail =
      session.customer_details?.email ||
      session.customer_email ||
      user?.email ||
      null;
    const buyerName =
      session.customer_details?.name ||
      user?.name ||
      null;
    const createdAt = new Date((session.created || Math.floor(Date.now() / 1000)) * 1000);
    const dueAt = deliveryDueDate(createdAt, workload);
    const clientName =
      buyerName ||
      buyerEmail ||
      `Stripe buyer ${session.id.slice(-6)}`;

    await (prisma as any).workOrder.create({
      data: {
        clientName,
        publicLabel: `${workload.label} client`,
        offerSlug,
        title: workload.label,
        status: "intake_needed",
        estimatedHours: workload.reserveHours,
        completedHours: 0,
        deliveryGuaranteeDays: workload.deliveryMaxDays,
        dueAt,
        notes: [
          marker,
          customerId ? `stripe_customer:${customerId}` : null,
          buyerEmail ? `buyer_email:${buyerEmail}` : null,
          user?.id ? `user_id:${user.id}` : null,
          `payment_status:${session.payment_status || "unknown"}`,
          "Auto-created from Stripe checkout so Ryan's capacity meter reflects paid work.",
        ].filter(Boolean).join("\n"),
      },
    });
    return true;
  } catch (err) {
    // Do not fail the Stripe webhook because the optional operations table has
    // not been pushed yet. Stripe retries should be reserved for payment sync.
    console.warn("Stripe webhook: offer work order not created", {
      session: session.id,
      offerSlug,
      error: err instanceof Error ? err.message : "unknown",
    });
    return false;
  }
}

async function createToolChallengeDepositWorkOrderFromCheckout(
  session: Stripe.Checkout.Session,
  user: Awaited<ReturnType<typeof findUserForEvent>> | null,
  customerId: string | null,
) {
  const kind = session.metadata?.kind;
  const slug = session.metadata?.slug;
  if (kind !== TOOL_CHALLENGE_DEPOSIT.kind && slug !== TOOL_CHALLENGE_DEPOSIT.slug) {
    return false;
  }

  const marker = `stripe_session:${session.id}`;
  try {
    const existing = await (prisma as any).workOrder.findFirst({
      where: { notes: { contains: marker } },
      select: { id: true },
    });
    if (existing) return true;

    const buyerEmail =
      session.customer_details?.email ||
      session.customer_email ||
      user?.email ||
      null;
    const buyerName =
      session.customer_details?.name ||
      user?.name ||
      null;
    const createdAt = new Date((session.created || Math.floor(Date.now() / 1000)) * 1000);
    const clientName =
      buyerName ||
      buyerEmail ||
      `Tool build deposit ${session.id.slice(-6)}`;

    await (prisma as any).workOrder.create({
      data: {
        clientName,
        publicLabel: TOOL_CHALLENGE_DEPOSIT.publicLabel,
        offerSlug: TOOL_CHALLENGE_DEPOSIT.slug,
        title: TOOL_CHALLENGE_DEPOSIT.title,
        status: "intake_needed",
        estimatedHours: TOOL_CHALLENGE_DEPOSIT.reserveHours,
        completedHours: 0,
        deliveryGuaranteeDays: TOOL_CHALLENGE_DEPOSIT.deliveryGuaranteeDays,
        dueAt: addBusinessDays(createdAt, TOOL_CHALLENGE_DEPOSIT.deliveryGuaranteeDays),
        notes: [
          marker,
          customerId ? `stripe_customer:${customerId}` : null,
          buyerEmail ? `buyer_email:${buyerEmail}` : null,
          user?.id ? `user_id:${user.id}` : null,
          session.metadata?.visitorId ? `visitor_id:${session.metadata.visitorId}` : null,
          `payment_status:${session.payment_status || "unknown"}`,
          "$250 tool challenge deposit. Credits toward custom app, automation, or website work.",
          "Auto-created from Stripe checkout so Ryan's capacity meter reflects paid build-slot deposits.",
        ].filter(Boolean).join("\n"),
      },
    });
    return true;
  } catch (err) {
    console.warn("Stripe webhook: tool challenge deposit work order not created", {
      session: session.id,
      error: err instanceof Error ? err.message : "unknown",
    });
    return false;
  }
}

async function handleSupportDonationCheckout(session: Stripe.Checkout.Session) {
  if (session.metadata?.kind !== "support-donation") return false;

  const donationId = session.metadata?.donationId || null;
  const customerEmail = session.customer_details?.email || session.customer_email || null;
  const customerName = session.customer_details?.name || null;

  try {
    const where = donationId
      ? { id: donationId }
      : session.id
        ? { stripeSessionId: session.id }
        : null;
    if (!where) return true;

    await (prisma as any).supportDonation.update({
      where,
      data: {
        status: "paid",
        paidAt: new Date((session.created || Math.floor(Date.now() / 1000)) * 1000),
        stripeSessionId: session.id,
        ...(customerEmail ? { email: customerEmail.toLowerCase() } : {}),
        ...(customerName ? { displayName: customerName } : {}),
      },
    });
  } catch (err) {
    console.warn("Stripe webhook: support donation not updated", {
      session: session.id,
      donationId,
      error: err instanceof Error ? err.message : "unknown",
    });
  }

  try {
    await recordDonationPulse(session);
  } catch {
    // Do not fail Stripe because analytics failed.
  }

  return true;
}

async function recordDonationPulse(session: Stripe.Checkout.Session) {
  const visitorId = session.metadata?.visitorId;
  if (!visitorId) return;
  const amount = typeof session.amount_total === "number" ? Math.round(session.amount_total / 100) : 0;
  const { recordSitePulseEvent } = await import("@/lib/site-pulse");
  await recordSitePulseEvent({
    visitorId,
    path: "/support",
    eventType: "purchase_complete",
    source: "support-donation",
    target: session.metadata?.focus || "where-needed",
    value: amount,
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (await handleSupportDonationCheckout(session)) {
    return;
  }

  const userId =
    session.client_reference_id ||
    (session.metadata?.userId as string | undefined) ||
    null;
  const customerId = typeof session.customer === "string"
    ? session.customer
    : session.customer?.id ?? null;

  const checkoutEmail = session.customer_details?.email || session.customer_email || null;
  const checkoutName = session.customer_details?.name || null;
  const user = await findOrCreateUserForCheckout(userId, customerId, checkoutEmail, checkoutName);
  const workOrderCreated =
    await createToolChallengeDepositWorkOrderFromCheckout(session, user, customerId) ||
    await createOfferWorkOrderFromCheckout(session, user, customerId);

  if (!user && !workOrderCreated) {
    console.warn("Stripe webhook: no user found for session", session.id);
    return;
  }

  // Always make sure the customer id is pinned to the user.
  if (user && customerId && user.stripeCustomerId !== customerId) {
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId }
    });
  }

  const kind = session.metadata?.kind;
  const key = session.metadata?.key;

  // Booster (one-time purchase) — grant credits.
  if (kind === "booster" && key) {
    if (!user) return;
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
    if (!user) return;
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
