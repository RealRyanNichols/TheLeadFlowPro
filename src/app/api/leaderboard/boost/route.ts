// src/app/api/leaderboard/boost/route.ts
//
// Buy a boost-message slot. Your message scrolls in the live leaderboard
// ticker for a duration based on amount:
//   $5  → 1 hour
//   $20 → 6 hours
//   $50 → 24 hours
// Anyone can boost any name (e.g., your customer hyping you).

import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import {
  isValidEastTexasCity,
  sanitizeName,
} from "@/lib/leaderboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://theleadflowpro.com";

const TIERS: Record<number, { hours: number; label: string }> = {
  5:  { hours: 1,  label: "1-hour boost" },
  20: { hours: 6,  label: "6-hour boost" },
  50: { hours: 24, label: "24-hour boost" },
};

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }

  const publicName = sanitizeName(String(body.publicName || ""));
  if (!publicName || publicName.length < 2) {
    return NextResponse.json({ error: "Business or display name required" }, { status: 400 });
  }
  const message = String(body.message || "").trim().slice(0, 80);
  if (!message || message.length < 5) {
    return NextResponse.json({ error: "Boost message (5-80 chars) required" }, { status: 400 });
  }
  const dollars = Number(body.dollars);
  if (![5, 20, 50].includes(dollars)) {
    return NextResponse.json({ error: "Choose $5, $20, or $50 boost" }, { status: 400 });
  }
  const city = body.city ? String(body.city) : null;
  if (city && !isValidEastTexasCity(city)) {
    return NextResponse.json({ error: "Pick an East Texas city" }, { status: 400 });
  }
  const imageUrl   = body.imageUrl   ? String(body.imageUrl).slice(0, 400)   : null;
  const websiteUrl = body.websiteUrl ? String(body.websiteUrl).slice(0, 200) : null;
  const email      = body.email      ? String(body.email).toLowerCase().trim() : null;

  const tier = TIERS[dollars];

  let session;
  try {
    session = await stripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: dollars * 100,
            product_data: {
              name: `East TX Top 10 — ${tier.label} for ${publicName}`,
              description: `${tier.hours}-hour scrolling boost message in the live leaderboard ticker. "${message}"`,
            },
          },
        },
      ],
      success_url: `${SITE_URL}/leaderboard/boost-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/leaderboard?canceled=1`,
      billing_address_collection: "auto",
      customer_email: email || undefined,
      metadata: {
        type: "leaderboard_boost",
        publicName,
        city: city || "",
        message,
        imageUrl: imageUrl || "",
        websiteUrl: websiteUrl || "",
        dollars: String(dollars),
        hours: String(tier.hours),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Stripe error" },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: session.url }, { status: 200 });
}
