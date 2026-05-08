import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordSitePulseEvent } from "@/lib/site-pulse";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FOCUS_OPTIONS = new Set([
  "live-pulse",
  "community-connector",
  "client-tools",
  "east-texas-giveback",
  "content-engine",
  "where-needed",
]);

function originFrom(req: NextRequest) {
  return req.headers.get("origin") || process.env.NEXTAUTH_URL || "https://www.theleadflowpro.com";
}

function pickStr(v: FormDataEntryValue | null, max = 1000): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function amountCentsFrom(raw: string | null) {
  const amount = Number(raw);
  if (!Number.isFinite(amount)) return 2500;
  return Math.min(500000, Math.max(500, Math.round(amount * 100)));
}

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_form" }, { status: 400 });
  }

  const displayName = pickStr(form.get("displayName"), 120);
  const email = pickStr(form.get("email"), 200)?.toLowerCase() || null;
  const comment = pickStr(form.get("comment"), 1200);
  const focusRaw = pickStr(form.get("focus"), 80) || "where-needed";
  const focus = FOCUS_OPTIONS.has(focusRaw) ? focusRaw : "where-needed";
  const amountCents = amountCentsFrom(pickStr(form.get("amount"), 20));
  const showPublic = form.get("showPublic") === "yes";
  const visitorId = pickStr(form.get("visitorId"), 80);

  if (!email || !/.+@.+\..+/.test(email)) {
    return NextResponse.json({ ok: false, error: "A valid email is required." }, { status: 400 });
  }

  const donation = await (prisma as any).supportDonation.create({
    data: {
      displayName,
      email,
      focus,
      comment,
      amountCents,
      showPublic,
      status: "pending",
    },
  });

  if (visitorId) {
    try {
      await recordSitePulseEvent({
        visitorId,
        path: "/support",
        eventType: "cta_checkout",
        source: "support-donation",
        target: focus,
        value: Math.round(amountCents / 100),
      });
    } catch {
      // Never block support checkout because analytics failed.
    }
  }

  const origin = originFrom(req);
  const checkout = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            name: "Support The LeadFlow Pro",
            description: "A voluntary contribution toward Ryan Nichols and The LeadFlow Pro vision.",
            metadata: {
              app: "leadflowpro",
              kind: "support-donation",
              focus,
            },
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/support?donation=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/support?donation=cancelled`,
    billing_address_collection: "auto",
    metadata: {
      app: "leadflowpro",
      kind: "support-donation",
      donationId: donation.id,
      focus,
      showPublic: String(showPublic),
      ...(visitorId ? { visitorId } : {}),
    },
    payment_intent_data: {
      metadata: {
        app: "leadflowpro",
        kind: "support-donation",
        donationId: donation.id,
        focus,
        showPublic: String(showPublic),
        ...(visitorId ? { visitorId } : {}),
      },
    },
    custom_text: {
      submit: {
        message:
          "This is a voluntary support payment for The LeadFlow Pro vision, not a purchase of a specific service or guaranteed result.",
      },
    },
  });

  if (!checkout.url) {
    return NextResponse.json({ ok: false, error: "checkout_url_missing" }, { status: 500 });
  }

  await (prisma as any).supportDonation.update({
    where: { id: donation.id },
    data: { stripeSessionId: checkout.id },
  });

  return NextResponse.redirect(checkout.url, { status: 303 });
}
