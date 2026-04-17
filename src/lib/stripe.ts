import Stripe from "stripe";

// Lazy so the module can be imported in environments without the key set
// (tests, build-time page rendering, etc).
let _stripe: Stripe | null = null;
export function stripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  _stripe = new Stripe(key, { apiVersion: "2024-12-18.acacia" });
  return _stripe;
}

// --- Price ID registry ---
// Populated by scripts/stripe-bootstrap.ts. Values pulled from env so the
// script output is the single source of truth.
export const STRIPE_PRICE_IDS = {
  // recurring
  starter:      process.env.STRIPE_PRICE_STARTER      || "",
  growth:       process.env.STRIPE_PRICE_GROWTH       || "",
  pro:          process.env.STRIPE_PRICE_PRO          || "",
  agency:       process.env.STRIPE_PRICE_AGENCY       || "",
  // one-time boosters
  "ai-100":        process.env.STRIPE_PRICE_AI_100        || "",
  "ai-500":        process.env.STRIPE_PRICE_AI_500        || "",
  "sms-250":       process.env.STRIPE_PRICE_SMS_250       || "",
  "adcopy-50":     process.env.STRIPE_PRICE_ADCOPY_50     || "",
  "audience-scan": process.env.STRIPE_PRICE_AUDIENCE_SCAN || "",
  "priority-ai":   process.env.STRIPE_PRICE_PRIORITY_AI   || ""
} as const;

export type StripePriceKey = keyof typeof STRIPE_PRICE_IDS;

export function priceIdFor(key: StripePriceKey): string {
  const id = STRIPE_PRICE_IDS[key];
  if (!id) throw new Error(`Missing Stripe price ID for "${key}". Run scripts/stripe-bootstrap.ts and paste the printed env vars into .env.`);
  return id;
}
