// Plan and call: the sheet Ryan asked for on October 3 ("what industries
// have what cost per acquisition, so I could look at my sheet and say it is
// going to cost us this much per close, how many of those do you want?").
//
// Every rate here is the owner's commercial planning rate from
// lib/site/prices.ts and lib/site/managedPlans.ts, the same numbers the
// public pricing page prints. They are planning inputs, never measured
// results and never a promise, and the panel says so. Pure functions.

import { ACQUISITION_PLANNING_TARGETS, MANAGED_COMMERCIAL_TERMS } from "@/lib/site/managedPlans";

export type PlanRow = {
  industry: string;
  outcome: string;
  rateUsd: number;
  /** Outcomes the base campaign targets at this rate. */
  outcomesAtBase: number;
  /** What five more outcomes add, in dollars. */
  fiveMoreUsd: number;
};

export function planRows(): PlanRow[] {
  const base = MANAGED_COMMERCIAL_TERMS.startingUpfrontUsd;
  return ACQUISITION_PLANNING_TARGETS.map((t) => ({
    industry: t.industry,
    outcome: t.outcome,
    rateUsd: t.amountUsd,
    outcomesAtBase: Math.floor(base / t.amountUsd),
    fiveMoreUsd: 5 * t.amountUsd,
  }));
}

export type JobsMath = {
  jobs: number;
  rateUsd: number;
  /** The investment the written scope would carry: the base, or jobs times the rate when that is more. */
  investmentUsd: number;
  /** The base campaign's minimum. */
  baseUsd: number;
  /** Jobs the base alone targets at this rate. */
  jobsAtBase: number;
  /** Client-supplied profit per job, or null when not given. */
  profitPerJobUsd: number | null;
  /** jobs times profit, minus the investment; null without a profit figure. */
  contributionUsd: number | null;
};

/** A whole number from a query value within [min, max], else the fallback. */
export function parseCount(value: unknown, fallback: number, min: number, max: number): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/** Dollars from a query value within [min, max], else null. */
export function parseDollars(value: unknown, min: number, max: number): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const cleaned = String(raw ?? "").replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

/**
 * The call-two arithmetic Pat walks a prospect through: how many jobs they
 * want, what that costs at the planning rate, and, if they say what a job
 * is worth to them, what the campaign would contribute if it hit the target.
 */
export function jobsMath(input: { jobs: number; rateUsd: number; profitPerJobUsd?: number | null }): JobsMath {
  const base = MANAGED_COMMERCIAL_TERMS.startingUpfrontUsd;
  const rate = Math.max(1, Math.round(input.rateUsd));
  const jobs = Math.max(1, Math.round(input.jobs));
  const investment = Math.max(base, jobs * rate);
  const profit = typeof input.profitPerJobUsd === "number" && Number.isFinite(input.profitPerJobUsd) && input.profitPerJobUsd > 0 ? Math.round(input.profitPerJobUsd) : null;
  return {
    jobs,
    rateUsd: rate,
    investmentUsd: investment,
    baseUsd: base,
    jobsAtBase: Math.floor(base / rate),
    profitPerJobUsd: profit,
    contributionUsd: profit === null ? null : jobs * profit - investment,
  };
}

/** The sentence the panel prints under every number. */
export const PLAN_DISCLAIMER =
  "Planning rates from the pricing page, not measured results and not a promise. A target in a written scope counts signed or paid jobs and completed deals, never leads or appointments.";
