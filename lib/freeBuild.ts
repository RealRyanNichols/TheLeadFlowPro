// RETIRED 2026-09-22. The free website build offer is gone: its old page is
// a permanent 301 to /services (next.config.ts), and /api/checkout no longer
// sells these tiers.
//
// This module exists only so a late or replayed Stripe event for a checkout
// session created before retirement is still recorded by the webhook
// (ensureFreeBuildPaid in app/api/stripe-webhook/route.ts), so money is never
// lost silently. Nothing else should import it.
//
// Safe to delete after 2026-10-22, together with the free-build branch in the
// webhook, once no free_build_* session can still be paid or replayed.
//
// The ids, names, and prices are frozen at what those sessions were sold for.
// They are not current prices, so they are not in lib/site/prices.ts.

export type FreeBuildTier = {
  id: "free_build_followup" | "free_build_content" | "free_build_launch";
  name: string;
  priceUsd: number;
  /** The page scope the tier was sold with, quoted in the buyer and owner emails. */
  pages: string;
};

const RETIRED_SCOPE = "Up to five scoped pages, $0 build fee";

export const RETIRED_FREE_BUILD_TIERS: readonly FreeBuildTier[] = [
  { id: "free_build_followup", name: "Free Website + Follow-Up Pack", priceUsd: 197, pages: RETIRED_SCOPE },
  { id: "free_build_content", name: "Free Website + Content Engine", priceUsd: 497, pages: RETIRED_SCOPE },
  { id: "free_build_launch", name: "Free Website + 30-Day Growth Engine", priceUsd: 997, pages: RETIRED_SCOPE },
];

export function findFreeBuildTier(id: string): FreeBuildTier | undefined {
  return RETIRED_FREE_BUILD_TIERS.find((tier) => tier.id === id);
}
