// src/lib/stripe-links.ts
//
// Hardcoded Stripe Payment Link URLs for every offer.
//
// These were created on 2026-05-05 in the Real Ryan Nichols LLC / The LeadFlow
// Pro Stripe account (a DBA of Longview Training Center) by
// /sessions/focused-bold-ride/private/create-stripe-links.sh, which is
// idempotent against metadata.slug + metadata.app="leadflowpro-offers".
//
// Re-run that script to regenerate (it will skip everything that already exists
// and only create what's missing).
//
// Payment Link URLs are public by design — they're checkout pages anyone can
// visit. Safe to commit. Safe to share.
//
// To override per-offer (e.g. for a one-off promo), set STRIPE_LINK_<SLUG>
// env var in Vercel and offers.ts buyHref() will prefer that.

import type { OfferSlug } from "./offers";

export const STRIPE_PAYMENT_LINKS: Partial<Record<OfferSlug, string>> = {
  "quick-look":       "https://buy.stripe.com/fZudR852y7IM5WgaIK5AQ00",
  "decision-sprint":  "https://buy.stripe.com/dRmdR852yd361G07wy5AQ01",
  "business-audit":   "https://buy.stripe.com/8x28wObqW8MQ0BWg345AQ02",
  "working-session":  "https://buy.stripe.com/8x2dR89iObZ270kaIK5AQ03",
  "sprint-4-week":    "https://buy.stripe.com/5kQaEW7aG6EIckE4km5AQ04",
  "light-retainer":   "https://buy.stripe.com/bJe8wO9iO5AEfwQ0465AQ05",
  "power-bundle":     "https://buy.stripe.com/aFa7sK8eKd3684o3gi5AQ06",
  "fb-ads":           "https://buy.stripe.com/eVq5kCamSfbe1G018a5AQ07",
  "monthly-operator": "https://buy.stripe.com/00w4gy0MibZ22K44km5AQ08",
  "annual-advisor":   "https://buy.stripe.com/9B64gycv00gkfwQcQS5AQ09",
};

export function stripeLinkFor(slug: OfferSlug): string | null {
  return STRIPE_PAYMENT_LINKS[slug] ?? null;
}
