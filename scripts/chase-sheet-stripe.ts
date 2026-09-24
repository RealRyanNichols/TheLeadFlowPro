// Create the Chase Sheet product, prices, and hosted Payment Links in Stripe.
//
// Run: STRIPE_SECRET_KEY=sk_... npm run chasesheet:stripe
//
// The pages sell through /api/checkout and need none of this. These links are
// for selling from a text, a post, or an email. They carry the same metadata
// (kind, plan) and the same after-payment redirect as the page checkout, so a
// sale through a link is fulfilled by the webhook and the claim route exactly
// like a sale through the page.
//
// Idempotent: the product is found by its metadata before anything is
// created, and a price or link that already exists is reused. Prints the two
// links. Never prints the key.

import { CHASE_SHEET } from "../lib/chaseSheet/product.ts";
import { BUSINESS } from "../lib/site/business.ts";

const key = process.env.STRIPE_SECRET_KEY?.trim();
if (!key) {
  console.error("STRIPE_SECRET_KEY is not set. Export it in this shell (never commit it) and run again.");
  process.exit(1);
}

type StripeList<T> = { data: T[] };
type Product = { id: string; name: string; metadata?: Record<string, string> };
type Price = { id: string; unit_amount: number; recurring?: { interval: string } | null; metadata?: Record<string, string>; active: boolean };
type PaymentLink = { id: string; url: string; metadata?: Record<string, string>; active: boolean };

async function stripe<T>(method: "GET" | "POST", path: string, params?: URLSearchParams): Promise<T> {
  const r = await fetch(`https://api.stripe.com/v1/${path}${method === "GET" && params ? `?${params}` : ""}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: method === "POST" ? params?.toString() : undefined,
  });
  const body = (await r.json()) as T & { error?: { message?: string } };
  if (!r.ok) throw new Error(`${method} ${path}: ${body.error?.message ?? r.status}`);
  return body;
}

const PRODUCT_TAG = "chase_sheet";

async function findOrCreateProduct(): Promise<Product> {
  const found = await stripe<StripeList<Product>>("GET", "products/search", new URLSearchParams({ query: `metadata["leadflow_product"]:"${PRODUCT_TAG}" AND active:"true"`, limit: "1" }));
  if (found.data[0]) return found.data[0];
  return stripe<Product>(
    "POST",
    "products",
    new URLSearchParams({
      name: `${CHASE_SHEET.name} | The LeadFlow Pro`,
      description: CHASE_SHEET.tagline,
      "metadata[leadflow_product]": PRODUCT_TAG,
      url: `${BUSINESS.siteUrl}${CHASE_SHEET.path}`,
    }),
  );
}

async function findOrCreatePrice(product: Product, plan: "monthly" | "lifetime"): Promise<Price> {
  const prices = await stripe<StripeList<Price>>("GET", "prices", new URLSearchParams({ product: product.id, active: "true", limit: "100" }));
  const wantedAmount = (plan === "monthly" ? CHASE_SHEET.monthlyUsd : CHASE_SHEET.lifetimeUsd) * 100;
  const existing = prices.data.find((p) => p.unit_amount === wantedAmount && (plan === "monthly" ? p.recurring?.interval === "month" : !p.recurring));
  if (existing) return existing;
  const params = new URLSearchParams({
    product: product.id,
    currency: "usd",
    unit_amount: String(wantedAmount),
    "metadata[plan]": plan,
    "metadata[kind]": plan === "monthly" ? CHASE_SHEET.monthlyKind : CHASE_SHEET.lifetimeKind,
  });
  if (plan === "monthly") params.set("recurring[interval]", "month");
  return stripe<Price>("POST", "prices", params);
}

async function findOrCreateLink(price: Price, plan: "monthly" | "lifetime"): Promise<PaymentLink> {
  const kind = plan === "monthly" ? CHASE_SHEET.monthlyKind : CHASE_SHEET.lifetimeKind;
  const links = await stripe<StripeList<PaymentLink>>("GET", "payment_links", new URLSearchParams({ active: "true", limit: "100" }));
  const existing = links.data.find((l) => l.metadata?.kind === kind);
  if (existing) return existing;
  const params = new URLSearchParams({
    "line_items[0][price]": price.id,
    "line_items[0][quantity]": "1",
    "metadata[kind]": kind,
    "metadata[plan]": plan,
    "after_completion[type]": "redirect",
    "after_completion[redirect][url]": `${BUSINESS.siteUrl}${CHASE_SHEET.claimPath}?session_id={CHECKOUT_SESSION_ID}`,
    allow_promotion_codes: "true",
  });
  if (plan === "monthly") {
    params.set("subscription_data[metadata][kind]", kind);
    params.set("subscription_data[metadata][plan]", plan);
  }
  return stripe<PaymentLink>("POST", "payment_links", params);
}

const product = await findOrCreateProduct();
const monthlyPrice = await findOrCreatePrice(product, "monthly");
const lifetimePrice = await findOrCreatePrice(product, "lifetime");
const monthlyLink = await findOrCreateLink(monthlyPrice, "monthly");
const lifetimeLink = await findOrCreateLink(lifetimePrice, "lifetime");

console.log(`Product: ${product.id} (${product.name})`);
console.log(`Monthly price: ${monthlyPrice.id} (${CHASE_SHEET.monthlyLabel})`);
console.log(`Lifetime price: ${lifetimePrice.id} (${CHASE_SHEET.lifetimeLabel})`);
console.log("");
console.log(`Monthly link:  ${monthlyLink.url}`);
console.log(`Lifetime link: ${lifetimeLink.url}`);
console.log("");
console.log("Both links redirect to the claim route after payment, so the buyer lands in the sheet with the cookie set.");
console.log("Paste them into EXTERNAL_LINKS (lib/site/external-links.ts) if the pages should offer them too.");
