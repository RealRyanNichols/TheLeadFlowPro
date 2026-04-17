import { NextRequest, NextResponse } from "next/server";
import { stripe, priceIdFor, type StripePriceKey } from "@/lib/stripe";
import { PLANS, BOOSTERS } from "@/lib/pricing";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const SUBSCRIPTION_KEYS = new Set<StripePriceKey>(["starter", "growth", "pro", "agency"]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const key = body?.key as StripePriceKey | undefined;
    if (!key) return NextResponse.json({ error: "Missing 'key'" }, { status: 400 });

    const isSubscription = SUBSCRIPTION_KEYS.has(key);
    const plan = PLANS.find((p) => p.id === key);
    const booster = BOOSTERS.find((b) => b.id === key);
    if (!plan && !booster) return NextResponse.json({ error: "Unknown key" }, { status: 400 });

    const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL || "https://www.theleadflowpro.com";

    // Look up the signed-in user so every checkout is tied to their account.
    // Unauth visitors get bounced to signup — we never want an orphan payment.
    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "Please sign in before upgrading.", redirect: `/signup?next=/dashboard/billing` },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, stripeCustomerId: true }
    });
    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Make sure every user has a Stripe customer attached. Normally signup
    // creates one, but older rows or OAuth-first signups may not.
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe().customers.create({
        email: user.email,
        metadata: { app: "leadflowpro", userId: user.id }
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId }
      });
    }

    const checkout = await stripe().checkout.sessions.create({
      mode: isSubscription ? "subscription" : "payment",
      customer: customerId,
      line_items: [{ price: priceIdFor(key), quantity: 1 }],
      success_url: `${origin}/dashboard/billing?checkout=success&item=${key}`,
      cancel_url:  `${origin}/dashboard/billing?checkout=cancel`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        key,
        kind: isSubscription ? "plan" : "booster"
      },
      ...(isSubscription
        ? { subscription_data: { metadata: { userId: user.id, key } } }
        : { payment_intent_data: { metadata: { userId: user.id, key, kind: "booster" } } })
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Stripe error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
