import { NextRequest, NextResponse } from "next/server";
import { TOOL_CHALLENGE_DEPOSIT } from "@/lib/challenge-deposit";
import { recordSitePulseEvent } from "@/lib/site-pulse";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function originFrom(req: NextRequest) {
  return (
    req.headers.get("origin") ||
    process.env.NEXTAUTH_URL ||
    "https://www.theleadflowpro.com"
  );
}

async function visitorIdFrom(req: NextRequest) {
  if (req.method === "POST") {
    try {
      const form = await req.formData();
      const value = form.get("visitorId");
      if (typeof value === "string" && value.trim()) return value.trim().slice(0, 80);
    } catch {
      return null;
    }
  }
  return req.nextUrl.searchParams.get("visitorId")?.slice(0, 80) ?? null;
}

async function createCheckout(req: NextRequest) {
  const origin = originFrom(req);
  const visitorId = await visitorIdFrom(req);
  const successUrl = `${origin}/book?source=tool-build-deposit&deposit=paid&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/challenge?deposit=cancelled`;

  if (visitorId) {
    try {
      await recordSitePulseEvent({
        visitorId,
        path: "/challenge",
        eventType: "cta_checkout",
        source: "tool-challenge-deposit",
        target: TOOL_CHALLENGE_DEPOSIT.slug,
        value: 250,
      });
    } catch {
      // Checkout should never fail because analytics did.
    }
  }

  const checkout = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: TOOL_CHALLENGE_DEPOSIT.amountCents,
          product_data: {
            name: TOOL_CHALLENGE_DEPOSIT.label,
            description: TOOL_CHALLENGE_DEPOSIT.description,
            metadata: {
              app: "leadflowpro",
              slug: TOOL_CHALLENGE_DEPOSIT.slug,
              kind: TOOL_CHALLENGE_DEPOSIT.kind,
            },
          },
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    billing_address_collection: "required",
    phone_number_collection: { enabled: true },
    invoice_creation: { enabled: true },
    metadata: {
      app: "leadflowpro",
      slug: TOOL_CHALLENGE_DEPOSIT.slug,
      kind: TOOL_CHALLENGE_DEPOSIT.kind,
      reserveHours: String(TOOL_CHALLENGE_DEPOSIT.reserveHours),
      source: "challenge-page",
      ...(visitorId ? { visitorId } : {}),
    },
    payment_intent_data: {
      metadata: {
        app: "leadflowpro",
        slug: TOOL_CHALLENGE_DEPOSIT.slug,
        kind: TOOL_CHALLENGE_DEPOSIT.kind,
        reserveHours: String(TOOL_CHALLENGE_DEPOSIT.reserveHours),
        source: "challenge-page",
        ...(visitorId ? { visitorId } : {}),
      },
    },
    custom_text: {
      submit: {
        message:
          "$250 reserves a build slot and credits toward your custom tool or website work. Real Ryan Nichols LLC engagements use Texas-law terms, mutual NDA language where needed, and no specific outcome guarantees.",
      },
    },
  });

  if (!checkout.url) {
    return NextResponse.json({ ok: false, error: "checkout_url_missing" }, { status: 500 });
  }

  return NextResponse.redirect(checkout.url, { status: 303 });
}

export async function GET(req: NextRequest) {
  try {
    return await createCheckout(req);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe checkout failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    return await createCheckout(req);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe checkout failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

