// src/app/api/leaderboard/buy/route.ts — create a Stripe Checkout Session.
//
// Body: { publicName, city, category?, websiteUrl?, socialUrl?, email?, dollars }
// Returns: { url } — redirect the user there.
// No webhook required: success page verifies the session and upserts points.

import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import {
  clampDollars,
  currentWeekStart,
  isValidCategory,
  isValidEastTexasCity,
  leaderboardGivebackCents,
  normalizePublicUrl,
  resolveGivebackTarget,
  sanitizeName,
} from "@/lib/leaderboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.theleadflowpro.com";

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const publicName = sanitizeName(String(body.publicName || ""));
  if (!publicName || publicName.length < 2) {
    return NextResponse.json({ error: "Business or display name required (2+ chars)" }, { status: 400 });
  }

  const city = body.city ? String(body.city) : null;
  if (city && !isValidEastTexasCity(city)) {
    return NextResponse.json({ error: "Pick an East Texas city from the list" }, { status: 400 });
  }

  const category = body.category ? String(body.category) : null;
  if (category && !isValidCategory(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const websiteUrl = normalizePublicUrl(body.websiteUrl);
  const socialUrl = normalizePublicUrl(body.socialUrl);
  const imageUrl = normalizePublicUrl(body.imageUrl);
  if (body.websiteUrl && !websiteUrl) {
    return NextResponse.json({ error: "Website must be a valid public link" }, { status: 400 });
  }
  if (body.socialUrl && !socialUrl) {
    return NextResponse.json({ error: "Social link must be a valid public link" }, { status: 400 });
  }
  if (body.imageUrl && !imageUrl) {
    return NextResponse.json({ error: "Image link must be a valid public link" }, { status: 400 });
  }
  const email      = body.email      ? String(body.email).toLowerCase().trim() : null;

  const dollars = clampDollars(Number(body.dollars));
  const givebackCents = leaderboardGivebackCents(dollars);
  const givebackTarget = resolveGivebackTarget(body.givebackTargetId, body.givebackTargetNote);
  const weekStart = currentWeekStart();

  let session;
  try {
    session = await stripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: dollars,
          price_data: {
            currency: "usd",
            unit_amount: 100, // $1 each
            product_data: {
              name: `East TX Top 10 — ${publicName}`,
              description: `${dollars} ranking points for the week of ${weekStart.toISOString().slice(0, 10)}.${city ? ` ${city}, TX.` : ""} 70% of leaderboard vote proceeds are reserved for East Texas organizations, charity events, or local causes. Giveback preference: ${givebackTarget.shortLabel}. Sponsored placement on www.theleadflowpro.com/leaderboard.`,
            },
          },
        },
      ],
      success_url: `${SITE_URL}/leaderboard/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/leaderboard?canceled=1`,
      allow_promotion_codes: false,
      billing_address_collection: "auto",
      customer_email: email || undefined,
      metadata: {
        type: "leaderboard_point",
        publicName,
        city: city || "",
        category: category || "",
        websiteUrl: websiteUrl || "",
        socialUrl: socialUrl || "",
        imageUrl: imageUrl || "",
        dollars: String(dollars),
        givebackCents: String(givebackCents),
        givebackRate: "0.70",
        givebackTargetId: givebackTarget.id,
        givebackTargetLabel: givebackTarget.label,
        givebackTargetNote: givebackTarget.note,
        weekStart: weekStart.toISOString(),
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
