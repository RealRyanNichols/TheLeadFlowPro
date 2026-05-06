// src/app/api/admin/stripe-offers-init/route.ts
//
// One-time admin endpoint to create Stripe Products + Prices + Payment Links
// for every offer in /lib/offers.ts. Idempotent — re-running it won't create
// duplicates; it looks up existing products by metadata.slug first.
//
// Auth: requires `x-admin-secret` header to match ADMIN_INIT_SECRET env var.
//
// Usage (after deploy):
//   curl -X POST https://theleadflowpro.com/api/admin/stripe-offers-init \
//        -H "x-admin-secret: $ADMIN_INIT_SECRET"
//
// Response shape:
//   {
//     ok: true,
//     mode: "LIVE" | "TEST",
//     results: [
//       { slug: "decision-sprint", productId: "prod_...", priceId: "price_...", paymentLinkUrl: "https://buy.stripe.com/..." },
//       ...
//     ]
//   }

import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { OFFER_LIST, type Offer } from "@/lib/offers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60; // Stripe API can be slow when creating 30+ entities

/**
 * Maps an offer to the Stripe pricing shape.
 *
 * Recurring offers (light-retainer, power-bundle, fb-ads, monthly-operator)
 * → monthly recurring Price.
 *
 * annual-advisor → quarterly recurring at $18,750 (matches "paid quarterly"
 * cadence from the offer copy).
 *
 * sprint-4-week → one-time charged 50% at start, 50% at week 2. For Payment
 * Link purposes we just create a single $9,997 one-time charge — payment
 * splitting is invoiced manually for engagements at this tier.
 *
 * Everything else → one-time.
 */
function priceShape(offer: Offer): {
  amountCents: number;
  recurring: "month" | "year" | null;
  intervalCount?: number;
} {
  switch (offer.slug) {
    case "quick-look":         return { amountCents:    4700, recurring: null };
    case "decision-sprint":    return { amountCents:    9000, recurring: null };
    case "business-audit":     return { amountCents:   49700, recurring: null };
    case "working-session":    return { amountCents:  299700, recurring: null };
    case "sprint-4-week":      return { amountCents:  999700, recurring: null };
    case "light-retainer":     return { amountCents:  199700, recurring: "month" };
    case "power-bundle":       return { amountCents:  149700, recurring: "month" };
    case "fb-ads":             return { amountCents:  149700, recurring: "month" }; // Flat management fee. Meta spend is paid directly by client.
    case "monthly-operator":   return { amountCents:  499700, recurring: "month" };
    case "annual-advisor":     return { amountCents: 1875000, recurring: "month", intervalCount: 3 }; // quarterly = every 3 months
    default:                   return { amountCents:    9000, recurring: null };
  }
}

async function upsertProduct(slug: string, name: string, description: string) {
  const s = stripe();
  // Search by metadata.slug. Stripe's search API requires the search-feature
  // beta; safer to list+filter.
  const list = await s.products.list({ limit: 100, active: true });
  const existing = list.data.find((p) => p.metadata?.slug === slug && p.metadata?.app === "leadflowpro-offers");
  if (existing) return existing;
  return s.products.create({
    name,
    description: description.slice(0, 500), // Stripe caps description at 500
    metadata: { slug, app: "leadflowpro-offers" },
  });
}

async function upsertPrice(productId: string, slug: string, shape: ReturnType<typeof priceShape>) {
  const s = stripe();
  const list = await s.prices.list({ product: productId, limit: 20, active: true });
  const target = list.data.find((p) => {
    if (p.unit_amount !== shape.amountCents) return false;
    if (p.currency !== "usd") return false;
    if (shape.recurring === null) return !p.recurring;
    if (!p.recurring) return false;
    if (p.recurring.interval !== shape.recurring) return false;
    if ((p.recurring.interval_count ?? 1) !== (shape.intervalCount ?? 1)) return false;
    return true;
  });
  if (target) return target;

  return s.prices.create({
    product: productId,
    unit_amount: shape.amountCents,
    currency: "usd",
    metadata: { slug, app: "leadflowpro-offers" },
    ...(shape.recurring
      ? {
          recurring: {
            interval: shape.recurring,
            interval_count: shape.intervalCount ?? 1,
          },
        }
      : {}),
  });
}

async function upsertPaymentLink(slug: string, priceId: string) {
  const s = stripe();
  // Find by metadata.slug
  const list = await s.paymentLinks.list({ limit: 100, active: true });
  const existing = list.data.find((pl) => pl.metadata?.slug === slug && pl.metadata?.app === "leadflowpro-offers");
  if (existing) return existing;

  return s.paymentLinks.create({
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { slug, app: "leadflowpro-offers" },
    after_completion: {
      type: "redirect",
      redirect: {
        url: "https://theleadflowpro.com/start/thank-you?source=stripe&slug=" + encodeURIComponent(slug),
      },
    },
    allow_promotion_codes: true,
    billing_address_collection: "required",
    custom_text: {
      submit: {
        message:
          "Texas-law engagement letter + mutual NDA on every paid engagement. We do not promise specific outcomes — what we deliver is the work product described on the sales page.",
      },
    },
  });
}

export async function POST(req: Request) {
  // Auth gate
  const adminSecret = process.env.ADMIN_INIT_SECRET;
  if (!adminSecret) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_INIT_SECRET is not set in Vercel env. Set it first." },
      { status: 503 }
    );
  }
  const provided = req.headers.get("x-admin-secret");
  if (provided !== adminSecret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // STRIPE_SECRET_KEY presence
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return NextResponse.json({ ok: false, error: "STRIPE_SECRET_KEY is not set" }, { status: 503 });
  }
  const mode: "LIVE" | "TEST" = key.startsWith("sk_live_") ? "LIVE" : "TEST";

  const results: {
    slug: string;
    productId: string;
    priceId: string;
    paymentLinkUrl: string;
    paymentLinkId: string;
    amountCents: number;
    recurring: string | null;
  }[] = [];
  const errors: { slug: string; error: string }[] = [];

  for (const offer of OFFER_LIST) {
    try {
      const shape = priceShape(offer);
      const productName = `The LeadFlow Pro — ${offer.hero.h1Lead.replace(/\s+/g, " ").trim()}`.slice(0, 250);
      const description = offer.metaDescription;

      const product = await upsertProduct(offer.slug, productName, description);
      const price = await upsertPrice(product.id, offer.slug, shape);
      const link = await upsertPaymentLink(offer.slug, price.id);

      results.push({
        slug: offer.slug,
        productId: product.id,
        priceId: price.id,
        paymentLinkUrl: link.url,
        paymentLinkId: link.id,
        amountCents: shape.amountCents,
        recurring: shape.recurring
          ? `${shape.recurring}${shape.intervalCount ? `×${shape.intervalCount}` : ""}`
          : null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ slug: offer.slug, error: msg });
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    mode,
    count: results.length,
    results,
    errors,
    note:
      "Copy each paymentLinkUrl into /lib/offers.ts on the matching offer's primaryCta.href, then redeploy. " +
      "This endpoint is idempotent — re-running won't create duplicates as long as metadata.slug is set.",
  });
}

// Allow GET to return a status check (does NOT create anything).
export async function GET(req: Request) {
  const adminSecret = process.env.ADMIN_INIT_SECRET;
  if (!adminSecret) {
    return NextResponse.json({
      ready: false,
      reason: "ADMIN_INIT_SECRET not set in Vercel env. Set that first.",
    });
  }
  const provided = req.headers.get("x-admin-secret");
  if (provided !== adminSecret) {
    return NextResponse.json({
      ready: true,
      authenticated: false,
      reason: "Send POST with x-admin-secret header to create the Payment Links.",
    });
  }
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  return NextResponse.json({
    ready: true,
    authenticated: true,
    stripeKey: stripeKey ? `set (${stripeKey.startsWith("sk_live_") ? "LIVE" : "TEST"})` : "MISSING",
    offerCount: OFFER_LIST.length,
    next: "POST this same URL to create the Stripe Products + Prices + Payment Links.",
  });
}
