// Post Creator: the product record.
//
// A free idea machine for local business social posts, plus paid AI writing
// that drafts the post in the owner's voice from a saved business profile.
// Nothing is posted by us: the owner reads every draft, fills in the blanks,
// and posts it from their own accounts.
//
// Leaf module: safe in client components, tests, and scripts. The prices come
// from lib/site/prices.ts, so a page and a checkout can never disagree, and
// every buyer-facing line about the AI allowance is built here from the same
// numbers the write route meters against.

import { PRICES, usd, usdPerMonth } from "../site/prices";
import type { PostCreatorPlan } from "./types";

export const POST_CREATOR = {
  name: "Post Creator",
  /** The public page title and H1. */
  longName: "Social Media Post Creator",
  /** purchases.kind and Stripe metadata.kind for the monthly plan. */
  monthlyKind: "post_creator_monthly",
  /** purchases.kind and Stripe metadata.kind for the one payment plan. */
  lifetimeKind: "post_creator_lifetime",
  /** The kind the license key is derived from. One key opens either plan. */
  accessKind: "post_creator",
  monthlyUsd: PRICES.postCreatorMonthly,
  lifetimeUsd: PRICES.postCreatorLifetime,
  monthlyLabel: usdPerMonth(PRICES.postCreatorMonthly),
  lifetimeLabel: `${usd(PRICES.postCreatorLifetime)} once`,
  path: "/post-creator",
  appPath: "/post-creator/app",
  termsPath: "/post-creator/terms",
  claimPath: "/api/post-creator/claim",
  /** Days AI writing stays on after a failed renewal while Stripe retries the card. */
  pastDueGraceDays: 7,
  /** How long after checkout the buying browser can be signed in once. */
  claimWindowHours: 24,
  /** The most services a profile or the idea machine takes. */
  maxServices: 5,
  /**
   * AI writing allowances. Days and months are America/Chicago. A write counts
   * only when at least one clean draft is delivered; the extra tries cover the
   * ones that fail. The cost ceiling is per account per month.
   */
  ai: {
    monthly: { perDay: 20, perMonth: 100, costCeilingUsd: 15 },
    lifetime: { perDay: 10, perMonth: 50, costCeilingUsd: 9 },
    extraTriesPerDay: 5,
    extraTriesPerMonth: 20,
    maxPlatformsPerWrite: 3,
    noteMaxChars: 300,
    /** A reservation older than this is expired and never counted. */
    staleReservationMinutes: 5,
  },
} as const;

export function isPostCreatorKind(kind: string): kind is "post_creator_monthly" | "post_creator_lifetime" {
  return kind === POST_CREATOR.monthlyKind || kind === POST_CREATOR.lifetimeKind;
}

export function postCreatorPlanForKind(kind: string): PostCreatorPlan | null {
  if (kind === POST_CREATOR.monthlyKind) return "monthly";
  if (kind === POST_CREATOR.lifetimeKind) return "lifetime";
  return null;
}

export function postCreatorKindForPlan(plan: PostCreatorPlan): string {
  return plan === "monthly" ? POST_CREATOR.monthlyKind : POST_CREATOR.lifetimeKind;
}

export function postCreatorPriceUsd(plan: PostCreatorPlan): number {
  return plan === "monthly" ? POST_CREATOR.monthlyUsd : POST_CREATOR.lifetimeUsd;
}

/** What the buyer sees on the checkout line. */
export function postCreatorCheckoutName(plan: PostCreatorPlan): string {
  return plan === "monthly"
    ? `${POST_CREATOR.name} | monthly | The LeadFlow Pro`
    : `${POST_CREATOR.name} | one payment | The LeadFlow Pro`;
}

/** What the write route meters one account against. */
export type AiLimits = {
  perDay: number;
  perMonth: number;
  triesPerDay: number;
  triesPerMonth: number;
  costCeilingMicroUsd: number;
  maxPlatforms: number;
};

export function aiLimitsFor(plan: PostCreatorPlan): AiLimits {
  const p = POST_CREATOR.ai[plan];
  return {
    perDay: p.perDay,
    perMonth: p.perMonth,
    triesPerDay: p.perDay + POST_CREATOR.ai.extraTriesPerDay,
    triesPerMonth: p.perMonth + POST_CREATOR.ai.extraTriesPerMonth,
    costCeilingMicroUsd: p.costCeilingUsd * 1_000_000,
    maxPlatforms: POST_CREATOR.ai.maxPlatformsPerWrite,
  };
}

// honesty:start
// The only lines in Post Creator allowed to say unlimited, no limit, endless,
// and the like. Each one is about the free idea machine, and each is true: it
// runs in the browser with no meter. AI writing is metered and says so.
export const UNLIMITED_HERO = "Tap for a post idea. Tap again for another. No limit, no sign up, no cost.";
export const UNLIMITED_TITLE = "What unlimited means here";
export function unlimitedBody(coreCount: number): string {
  return `The idea machine is unlimited: press Next idea as often as you like. It runs in your browser, so there is no meter and no account. It keeps your place on this device, so you will not see the same idea twice until you have seen all ${coreCount.toLocaleString("en-US")} for your settings. After that, each idea comes back with a different first line.`;
}
export const UNLIMITED_FINE_PRINT =
  "Clear your browser or switch devices and the idea machine starts a fresh shuffle, so an idea you saw before can show up again.";
export function aiNotUnlimited(): string {
  const m = POST_CREATOR.ai.monthly;
  const l = POST_CREATOR.ai.lifetime;
  return `AI writing is not unlimited. Every AI write costs us money to make, so each plan includes a set number: up to ${m.perMonth} a month and ${m.perDay} a day on the monthly plan, and up to ${l.perMonth} a month and ${l.perDay} a day on the one payment plan. A write that fails does not count.`;
}
export const UNLIMITED_FAQ_Q = "Is the idea machine really free and unlimited?";
export const UNLIMITED_FAQ_A =
  "Yes. No sign up, no card, and no limit on how many times you press Next idea. It runs in your browser, so nothing you type is sent to us.";
export const UNLIMITED_ROW = "Unlimited: press Next idea as often as you like";
export const UNLIMITED_TOOLS_BLURB =
  "A new post idea every tap, with no limit and no sign up, plus a 30 day plan and drafts for five platforms. AI writing in your voice is a separate paid plan.";
export const STILL_UNLIMITED = "The idea machine still works, with no limit.";
// honesty:end

/**
 * The counter line under an idea card. `tradeWords` is "your business" for
 * "other", else the trade label lowercased ("heating and air").
 */
export function ideaCountLine(
  space: { coreCount: number; cardCount: number; monthsAtThreeAWeek: number },
  tradeWords: string,
): string {
  const core = space.coreCount.toLocaleString("en-US");
  const cards = space.cardCount.toLocaleString("en-US");
  const months = space.monthsAtThreeAWeek.toLocaleString("en-US");
  return `${core} different post ideas for ${tradeWords} with these settings, and ${cards} ways to word and shoot them. At three posts a week, that is about ${months} months before an idea comes back on this device.`;
}

export function aiCapLine(plan: PostCreatorPlan): string {
  const p = POST_CREATOR.ai[plan];
  return `AI writing: up to ${p.perMonth} writes a month and ${p.perDay} a day. Each write drafts one post for up to ${POST_CREATOR.ai.maxPlatformsPerWrite} platforms. Unused writes do not carry over.`;
}

export function triesLine(plan: PostCreatorPlan): string {
  const limits = aiLimitsFor(plan);
  return `A write that fails or is declined does not count. To keep costs fair, there is a ceiling of ${limits.triesPerDay} tries a day and ${limits.triesPerMonth} a month, counting the ones that fail.`;
}

export const SPEND_PAUSE_LINE =
  "AI writing also shares one daily budget across all buyers. If it runs out, AI writing pauses for everyone until midnight Central time, and nothing is counted while it is paused. The idea machine keeps working.";

export const COST_LIMIT_LINE =
  "Each account also has a monthly AI cost limit that normal use stays well under. If an account reaches it, AI writing pauses for that account until the 1st.";

export const AI_OFF_LINE = "AI writing is not switched on right now. The idea machine and the month planner still work.";

export const FILTER_LINE =
  "Every AI draft is checked by rules that remove claims, prices, and numbers you did not give us. No check is perfect, so read every draft before you post it.";

export const POST_CREATOR_DISCLAIMER =
  "Post Creator suggests ideas and writes drafts. You read every draft, fill in the details, and post it yourself from your own accounts. Nothing is posted for you, no results are promised, and AI drafts can get things wrong, so check every fact before you post.";
