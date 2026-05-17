import { NextResponse } from "next/server";
import { OFFERS, type OfferSlug } from "@/lib/offers";
import { offerCheckoutShape } from "@/lib/offer-checkout";
import { cleanE164UsPhone, parseSmsOptOut } from "@/lib/phone";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.theleadflowpro.com";

function cleanEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email.slice(0, 240);
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const slug = String(body.slug || "").trim() as OfferSlug;
  const offer = OFFERS[slug];
  if (!offer) return NextResponse.json({ error: "Unknown offer" }, { status: 404 });

  const shape = offerCheckoutShape(slug);
  if (!shape) return NextResponse.json({ error: "Offer is not checkout-ready" }, { status: 400 });

  const email = cleanEmail(body.email);
  if (!email) return NextResponse.json({ error: "Valid email required for Stripe" }, { status: 400 });

  const smsOptOut = parseSmsOptOut(body.smsOptOut);
  const phone = smsOptOut ? null : cleanE164UsPhone(body.phone);
  if (!smsOptOut && !phone) {
    return NextResponse.json({ error: "Mobile must be E.164 format, like +19031234567" }, { status: 400 });
  }

  const origin = req.headers.get("origin") || SITE_URL;
  const productName = `The LeadFlow Pro - ${offer.hero.h1Lead.replace(/\s+/g, " ").trim()}`.slice(0, 250);
  const recurring = shape.recurring
    ? { recurring: { interval: shape.recurring, interval_count: shape.intervalCount ?? 1 } }
    : {};
  const metadata = {
    type: "offer_purchase",
    offerSlug: slug,
    offerName: offer.metaTitle.replace(/\s*·\s*The LeadFlow Pro$/, ""),
    buyerPhone: phone || "",
    smsOptOut: smsOptOut ? "true" : "false",
  };

  try {
    const session = await stripe().checkout.sessions.create({
      mode: shape.recurring ? "subscription" : "payment",
      customer_email: email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: shape.amountCents,
            product_data: {
              name: productName,
              description: offer.metaDescription.slice(0, 500),
              metadata: { slug, app: "leadflowpro-offers" },
            },
            ...recurring,
          },
        },
      ],
      success_url: `${origin}/offers/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/offers/${slug}?checkout=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      metadata,
      ...(shape.recurring
        ? { subscription_data: { metadata } }
        : { payment_intent_data: { metadata } }),
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Stripe error" },
      { status: 500 },
    );
  }
}
