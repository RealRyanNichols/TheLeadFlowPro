import { PRICES, usd } from "./prices";

export type ManagedPlanId = "foundation" | "recommended" | "structured";

export type ManagedPlan = {
  id: ManagedPlanId;
  name: string;
  amountUsd: number;
  /** First month is paid upfront; no second setup fee is added. */
  firstMonthUsd: number;
  badge?: string;
  description: string;
  billingNote: string;
  cta: string;
};

/**
 * Owner direction, October 3, 2026, supplies amounts and included ad spend.
 * These are public planning expectations, never a checkout catalog. Existing
 * customer payments keep their own terms. First-month bundling is the chosen
 * presentation recommendation, to ratify in the written scope before billing:
 * onboarding, the agreed build, and the proposal's advertising allocation.
 * No extra setup payment is added.
 */
export const MANAGED_COMMERCIAL_TERMS = {
  startingUpfrontUsd: PRICES.managedStartingUpfront,
  minimumMonthlyUsd: PRICES.managedMonthlyMinimum,
  structuredPlanUsd: PRICES.managedStructuredPlan,
  upfrontTreatment: "first_month",
  adSpendTreatment: "included",
} as const;

export const MANAGED_PLANS: readonly ManagedPlan[] = [
  {
    id: "recommended",
    name: "Growth",
    amountUsd: MANAGED_COMMERCIAL_TERMS.startingUpfrontUsd,
    firstMonthUsd: MANAGED_COMMERCIAL_TERMS.startingUpfrontUsd,
    badge: "Most chosen",
    description:
      "Our most chosen plan. Connect the marketing, follow-up, and systems around the way your business needs to grow.",
    billingNote:
      "Your first month is paid upfront. Onboarding, the agreed build, and the advertising allocation are included.",
    cta: "Find my starting plan",
  },
  {
    id: "foundation",
    name: "Focused",
    amountUsd: MANAGED_COMMERCIAL_TERMS.minimumMonthlyUsd,
    firstMonthUsd: MANAGED_COMMERCIAL_TERMS.startingUpfrontUsd,
    description:
      "Focused monthly work around the priorities and advertising allocation in your agreed scope. The minimum ongoing engagement.",
    billingNote:
      "The initial month covers onboarding, the agreed build, and its advertising allocation. Ongoing service follows the monthly scope.",
    cta: "Discuss the foundation",
  },
  {
    id: "structured",
    name: "Structured",
    amountUsd: MANAGED_COMMERCIAL_TERMS.structuredPlanUsd,
    firstMonthUsd: MANAGED_COMMERCIAL_TERMS.structuredPlanUsd,
    description:
      "For a business with more moving parts, more capacity to support, or a broader build. We define the plan before the work begins.",
    billingNote:
      "Your first month is paid upfront. We define the work, capacity, advertising allocation, and delivery in writing.",
    cta: "Scope the larger plan",
  },
];

/** Owner-supplied acquisition planning targets, not audited historical results. */
export const ACQUISITION_PLANNING_TARGETS = [
  {
    industry: "Farm & agricultural work",
    outcome: "Acquired job",
    amountUsd: PRICES.farmAcquiredJobPlanningTarget,
  },
  {
    industry: "Real estate & mortgage",
    outcome: "Completed deal",
    amountUsd: PRICES.propertyCompletedDealPlanningTarget,
  },
] as const;

export function acquisitionPlanningExplanation(): string {
  return "Our planning targets are estimates, not extra charges or promised outcomes. A lead or appointment is not an acquired job or completed deal. Your plan includes its agreed advertising allocation alongside the work and build; the full package price does not translate into a promised number of outcomes.";
}

export function managedPlanPrice(plan: ManagedPlan): {
  amount: string;
  unit: string;
} {
  return {
    amount: usd(plan.amountUsd),
    unit: plan.id === "foundation" ? "/ month minimum" : "/ month",
  };
}

export function managedUpfrontSummary(): string {
  return `Expect ${usd(MANAGED_COMMERCIAL_TERMS.startingUpfrontUsd)} upfront.`;
}

export function managedMonthlySummary(): string {
  return `Ongoing service starts at ${usd(MANAGED_COMMERCIAL_TERMS.minimumMonthlyUsd)}/month.`;
}

export function managedBillingExplanation(): string {
  return "Your upfront payment covers the first month, including onboarding, the agreed build, and the advertising allocation. It is not a second setup fee. Your proposal names the ongoing monthly scope and billing dates.";
}

export function managedAdvertisingExplanation(): string {
  return "Advertising spend is included in the plan. Your proposal names the advertising allocation, the work it supports, and the billing dates. Work or custom builds beyond the approved scope receive a separate written quote.";
}
