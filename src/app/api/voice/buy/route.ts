// src/app/api/voice/buy/route.ts
//
// Cast a money-weighted vote on a Voice topic. $1 = 1 weight unit on YES or NO.

import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { clampVoiceDollars } from "@/lib/voice";
import { sanitizeName } from "@/lib/leaderboard";
import { cleanE164UsPhone, parseSmsOptOut } from "@/lib/phone";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://theleadflowpro.com";

function cleanEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email.slice(0, 240);
}

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }

  const slug = String(body.slug || "").trim();
  if (!slug) return NextResponse.json({ error: "topic slug required" }, { status: 400 });

  const side = String(body.side || "").toLowerCase();
  if (side !== "yes" && side !== "no") {
    return NextResponse.json({ error: "side must be 'yes' or 'no'" }, { status: 400 });
  }

  const dollars = clampVoiceDollars(Number(body.dollars));
  const displayName = body.displayName ? sanitizeName(String(body.displayName)) : null;
  const city  = body.city  ? String(body.city).slice(0, 80) : null;
  const email = cleanEmail(body.email);
  if (!email) {
    return NextResponse.json({ error: "Valid email required for Stripe" }, { status: 400 });
  }

  const smsOptOut = parseSmsOptOut(body.smsOptOut);
  const buyerPhone = smsOptOut ? null : cleanE164UsPhone(body.phone);
  if (!smsOptOut && !buyerPhone) {
    return NextResponse.json({ error: "Mobile must be E.164 format, like +19031234567" }, { status: 400 });
  }

  const topic = await prisma.voiceTopic.findUnique({ where: { slug } });
  if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  if (topic.status !== "open") return NextResponse.json({ error: "Topic is closed" }, { status: 400 });
  if (topic.closesAt < new Date()) return NextResponse.json({ error: "Topic has expired" }, { status: 400 });

  let session;
  try {
    session = await stripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        quantity: dollars,
        price_data: {
          currency: "usd",
          unit_amount: 100,
          product_data: {
            name: `East TX Voice — ${side.toUpperCase()} on "${topic.question.slice(0, 60)}"`,
            description: `${dollars} weight units on the ${side.toUpperCase()} side. Money-weighted public sentiment voting.`,
          },
        },
      }],
      success_url: `${SITE_URL}/voice/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/voice/${slug}?canceled=1`,
      billing_address_collection: "auto",
      customer_email: email,
      metadata: {
        type: "voice_vote",
        topicId: topic.id,
        topicSlug: slug,
        side,
        displayName: displayName || "",
        city: city || "",
        dollars: String(dollars),
        buyerPhone: buyerPhone || "",
        smsOptOut: smsOptOut ? "true" : "false",
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
