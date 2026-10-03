import { PRICES, usd } from "./prices";

export type ManagedPlanId = "recommended";

export type ManagedPlan = {
  id: ManagedPlanId;
  name: string;
  amountUsd: number;
  initialCampaignUsd: number;
  badge?: string;
  description: string;
  billingNote: string;
  cta: string;
};

/**
 * Owner-approved initial acquisition model, October 3, 2026.
 * One prepaid campaign, with a maximum 90-day delivery window. The written
 * scope defines outcomes, attribution, media allocation, and additional targets.
 * This public catalog does not change existing signed customer agreements.
 * Smaller storefront/product projects use separate scope-based quotes.
 */
export const MANAGED_COMMERCIAL_TERMS = {
  appliesTo: "managed_acquisition",
  startingUpfrontUsd: PRICES.managedStartingUpfront,
  initialCampaignDays: 90,
  upfrontTreatment: "initial_campaign",
  adSpendTreatment: "included",
  farmJobTarget: 15,
  propertyDealPlanningTarget: 5,
  automaticRenewal: false,
} as const;

export const MANAGED_PLANS: readonly ManagedPlan[] = [
  {
    id: "recommended",
    name: "90-Day Campaign",
    amountUsd: MANAGED_COMMERCIAL_TERMS.startingUpfrontUsd,
    initialCampaignUsd: MANAGED_COMMERCIAL_TERMS.startingUpfrontUsd,
    description:
      "One acquisition campaign, starting at the minimum upfront investment. We agree on your industry, territory, outcome target, and delivery scope before work begins.",
    billingNote:
      "Paid upfront for a campaign lasting up to 90 days. Onboarding, the agreed build, and the agreed advertising allocation are included.",
    cta: "Scope my 90-day campaign",
  },
];

/** Owner-supplied commercial planning rates, not audited industry averages. */
export const ACQUISITION_PLANNING_TARGETS = [
  {
    industry: "Farm & agricultural work",
    outcome: "Signed or paid acquired job",
    amountUsd: PRICES.farmAcquiredJobPlanningTarget,
  },
  {
    industry: "Real estate & mortgage",
    outcome: "Completed deal",
    amountUsd: PRICES.propertyCompletedDealPlanningTarget,
  },
] as const;

export function acquisitionPlanningExplanation(): string {
  return `The initial farm/ag campaign targets ${MANAGED_COMMERCIAL_TERMS.farmJobTarget} signed or paid acquired jobs at ${usd(PRICES.farmAcquiredJobPlanningTarget)} per targeted job. Real estate and mortgage use ${usd(PRICES.propertyCompletedDealPlanningTarget)} per targeted completed deal while we dial in the campaign. These are our commercial planning rates, not measured industry averages or guaranteed results. Leads and appointments do not count as acquired jobs or completed deals. Other industries receive an outcome target in their written scope.`;
}

export function managedPlanPrice(plan: ManagedPlan): {
  amount: string;
  unit: string;
} {
  return {
    amount: usd(plan.amountUsd),
    unit: "minimum upfront · up to 90 days",
  };
}

export function managedUpfrontSummary(): string {
  return `Managed acquisition campaigns start at ${usd(MANAGED_COMMERCIAL_TERMS.startingUpfrontUsd)} upfront.`;
}

export function managedCampaignSummary(): string {
  return `One initial campaign. ${usd(MANAGED_COMMERCIAL_TERMS.startingUpfrontUsd)} minimum. Up to ${MANAGED_COMMERCIAL_TERMS.initialCampaignDays} days.`;
}

export function managedBillingExplanation(): string {
  return "Your upfront payment covers the initial campaign, including onboarding, the agreed build, and the agreed advertising allocation. Your written scope defines the start date, outcome target, attribution, and budget treatment. There is no separate setup fee or automatic monthly renewal.";
}

export function managedAdvertisingExplanation(): string {
  return "Advertising spend is included in the agreed campaign scope. Your written proposal sets the advertising allocation and the work it supports. Additional acquisition scope is agreed and paid upfront; it is not an automatic charge when a lead arrives or a job closes.";
}

export function managedCompletionExplanation(): string {
  return "The initial campaign runs until its agreed outcome target is reached or day 90, whichever comes first. A counted farm/ag job requires signed or paid confirmation and agreed attribution; a lead or appointment does not count. If the target is reached on day 45, new acquisition is complete. Every inquiry already captured is still handed over. At day 90, we review results; there is no automatic extension.";
}

export function managedRenewalExplanation(): string {
  return "After the initial campaign, we review results and your capacity to take on more work. When growth supports it, the next engagement scales up from the initial investment. Any additional campaign, budget, outcome target, and price require a new written agreement and approval before payment or work; there is no automatic renewal charge.";
}

export function managedAdditionalScopeExplanation(): string {
  return `The initial campaign starts at ${usd(MANAGED_COMMERCIAL_TERMS.startingUpfrontUsd)}. Add ${usd(PRICES.farmAcquiredJobPlanningTarget)} for each additional acquisition target in other service industries, or ${usd(PRICES.propertyCompletedDealPlanningTarget)} for each additional real estate or mortgage completion target while we dial it in. We confirm the total investment and delivery scope in writing before you pay. Targets are not guaranteed outcomes.`;
}
