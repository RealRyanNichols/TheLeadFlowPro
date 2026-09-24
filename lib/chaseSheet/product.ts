// Chase Sheet: the product record.
//
// Every open quote a business has sent, chased every day, from the owner's own
// phone. The engine decides which quote gets a touch today, writes the exact
// words for that touch in the owner's trade and tone, and keeps a ledger of
// what the chasing won. Nothing is sent by the server: the owner taps a text,
// call, or email link and sends it themselves, from their own number.
//
// Leaf module: safe in client components, tests, and scripts. The numbers
// come from lib/site/prices.ts, so a page and a checkout can never disagree.

import { PRICES, usd, usdPerMonth } from "../site/prices";

export const CHASE_SHEET = {
  name: "Chase Sheet",
  /** The line under the name everywhere. */
  tagline: "Every open quote. Chased every day. From your own phone.",
  /** purchases.kind and Stripe metadata.kind for the monthly plan. */
  monthlyKind: "chase_sheet_monthly",
  /** purchases.kind and Stripe metadata.kind for the one-time plan. */
  lifetimeKind: "chase_sheet_lifetime",
  /** The kind the license key is derived from. One key opens either plan. */
  accessKind: "chase_sheet",
  monthlyUsd: PRICES.chaseSheetMonthly,
  lifetimeUsd: PRICES.chaseSheetLifetime,
  monthlyLabel: usdPerMonth(PRICES.chaseSheetMonthly),
  lifetimeLabel: `${usd(PRICES.chaseSheetLifetime)} once`,
  path: "/chase-sheet",
  appPath: "/chase-sheet/app",
  termsPath: "/chase-sheet/terms",
  claimPath: "/api/chase-sheet/claim",
  /** Days of access kept after a failed renewal before the sheet locks. */
  pastDueGraceDays: 7,
  /** The most quotes one account can hold open at once. Plenty for a crew; a wall for abuse. */
  maxOpenQuotes: 400,
} as const;

export type ChaseSheetPlan = "monthly" | "lifetime";

export function isChaseSheetKind(kind: string): kind is typeof CHASE_SHEET.monthlyKind | typeof CHASE_SHEET.lifetimeKind {
  return kind === CHASE_SHEET.monthlyKind || kind === CHASE_SHEET.lifetimeKind;
}

export function planForKind(kind: string): ChaseSheetPlan | null {
  if (kind === CHASE_SHEET.monthlyKind) return "monthly";
  if (kind === CHASE_SHEET.lifetimeKind) return "lifetime";
  return null;
}

export function kindForPlan(plan: ChaseSheetPlan): string {
  return plan === "monthly" ? CHASE_SHEET.monthlyKind : CHASE_SHEET.lifetimeKind;
}

export function priceUsdForPlan(plan: ChaseSheetPlan): number {
  return plan === "monthly" ? CHASE_SHEET.monthlyUsd : CHASE_SHEET.lifetimeUsd;
}

/** What the buyer sees on the checkout line. */
export function checkoutNameForPlan(plan: ChaseSheetPlan): string {
  return plan === "monthly"
    ? `${CHASE_SHEET.name} | monthly | The LeadFlow Pro`
    : `${CHASE_SHEET.name} | one payment, yours for good | The LeadFlow Pro`;
}

export const CHASE_SHEET_DISCLAIMER =
  "Chase Sheet writes and schedules your follow-up. You send every message yourself from your own phone or email. Nothing is sent for you, no results are promised, and your customers' details stay in your own sheet.";
