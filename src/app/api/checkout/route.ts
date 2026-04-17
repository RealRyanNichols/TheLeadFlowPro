import { NextRequest, NextResponse } from "next/server";
import { stripe, priceIdFor, type StripePriceKey } from "@/lib/stripe";
import { PLANS, BOOSTERS } from "@/lib/pricing";

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

    const session = await stripe().checkout.sessions.create({
      mode: isSubscription ? "subscription" : "payment",
      line_items: [{ price: priceIdFor(key), quantity: 1 }],
      success_url: `${origin}/dashboard/billing?checkout=success&item=${key}`,
      cancel_url:  `${origin}/dashboard/billing?checkout=cancel`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      metadata: { key, kind: isSubscription ? "plan" : "booster" }
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Stripe error" }, { status: 500 });
  }
}
