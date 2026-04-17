/**
 * Run once to create every LeadFlow Pro product + price in your Stripe
 * account (Real Ryan Nichols LLC). Prints the env vars you need to paste
 * into .env and Vercel at the end. Safe to re-run — it looks up existing
 * products by metadata.slug before creating.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/stripe-bootstrap.ts
 *   STRIPE_SECRET_KEY=sk_live_... npx tsx scripts/stripe-bootstrap.ts   # real money
 */
import Stripe from "stripe";
import { PLANS, BOOSTERS } from "../src/lib/pricing";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY env var not set. Aborting.");
  process.exit(1);
}

const stripe = new Stripe(key);

const MODE = key.startsWith("sk_live_") ? "LIVE" : "TEST";

async function upsertProduct(slug: string, name: string, description: string) {
  // list all, filter by metadata.slug (Stripe has no metadata search in list)
  const existing = await stripe.products.list({ limit: 100, active: true });
  const found = existing.data.find((p) => p.metadata?.slug === slug);
  if (found) {
    console.log(`  · product exists: ${name} (${found.id})`);
    return found;
  }
  const created = await stripe.products.create({
    name,
    description,
    metadata: { slug, app: "leadflowpro" }
  });
  console.log(`  + product created: ${name} (${created.id})`);
  return created;
}

async function upsertPrice(productId: string, amountUsd: number, recurring: boolean, slug: string) {
  const prices = await stripe.prices.list({ product: productId, limit: 10, active: true });
  const target = prices.data.find(
    (p) => p.unit_amount === Math.round(amountUsd * 100)
      && ((!!p.recurring) === recurring)
      && p.currency === "usd"
  );
  if (target) {
    console.log(`  · price exists: $${amountUsd}${recurring ? "/mo" : ""} (${target.id})`);
    return target;
  }
  const created = await stripe.prices.create({
    product: productId,
    unit_amount: Math.round(amountUsd * 100),
    currency: "usd",
    ...(recurring ? { recurring: { interval: "month" } } : {}),
    metadata: { slug, app: "leadflowpro" }
  });
  console.log(`  + price created: $${amountUsd}${recurring ? "/mo" : ""} (${created.id})`);
  return created;
}

async function main() {
  console.log(`\n=== Stripe bootstrap — ${MODE} mode ===\n`);

  const envLines: string[] = [];
  envLines.push(`# Paste into .env (local) AND Vercel → Settings → Environment Variables`);
  envLines.push(`STRIPE_SECRET_KEY=${MODE === "LIVE" ? "sk_live_..." : "sk_test_..."}`);
  envLines.push(`STRIPE_WEBHOOK_SECRET=whsec_...   # from Developers → Webhooks → Signing secret`);
  envLines.push(`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${MODE === "LIVE" ? "pk_live_..." : "pk_test_..."}`);
  envLines.push(``);
  envLines.push(`# --- Plan price IDs ---`);

  for (const plan of PLANS) {
    if (plan.priceMonthly === 0) continue;
    console.log(`Plan: ${plan.name} ($${plan.priceMonthly}/mo)`);
    const product = await upsertProduct(
      `plan-${plan.id}`,
      `LeadFlow Pro — ${plan.name}`,
      plan.blurb
    );
    const price = await upsertPrice(product.id, plan.priceMonthly, true, `plan-${plan.id}`);
    envLines.push(`STRIPE_PRICE_${plan.id.toUpperCase()}=${price.id}`);
  }

  envLines.push(``);
  envLines.push(`# --- Booster (one-time) price IDs ---`);

  for (const b of BOOSTERS) {
    console.log(`Booster: ${b.name} ($${b.priceUsd})`);
    const product = await upsertProduct(
      `booster-${b.id}`,
      `LeadFlow Pro — ${b.name}`,
      b.oneLiner
    );
    const price = await upsertPrice(product.id, b.priceUsd, false, `booster-${b.id}`);
    const envKey = `STRIPE_PRICE_${b.id.toUpperCase().replace(/-/g, "_")}`;
    envLines.push(`${envKey}=${price.id}`);
  }

  console.log(`\n\n=== DONE ===`);
  console.log(`\nCopy these lines into your .env (local) AND Vercel env vars:\n`);
  console.log(envLines.join("\n"));
  console.log(``);
}

main().catch((e) => { console.error(e); process.exit(1); });
