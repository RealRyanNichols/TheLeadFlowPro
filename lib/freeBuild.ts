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
//
// FREE_BUILD_HOSTING_LINE is the other survivor: the old free-build hosting
// sentence, kept only so tests/proposals.test.ts can prove no proposal prints
// it. The retired offers have no pay door, so no proposal can name one, and
// nothing in the app reads this line.

import { PRICES, usdPerMonth } from "@/lib/site/prices";

/**
 * How hosting worked after a free build, in one sentence a proposal prints: the included days first, then the published
 * monthly prices, and nothing renewing on its own.
 */
export const FREE_BUILD_HOSTING_LINE = `The first ${PRICES.hostingIncludedDays} days of managed hosting are included. After that, self-host or export the site, use ${usdPerMonth(PRICES.hostingManagedMonthly)} managed hosting, or choose ${usdPerMonth(PRICES.hostingWithEditsMonthly)} hosting with two minor edits. Nothing renews without written approval.`;

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
