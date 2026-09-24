// TLFP Credits: the one place the rules live. Client-safe (imports only the
// prices leaf). The server side is lib/tlfp.ts; the database side is
// supabase/migrations/20260923000000_tlfp_credits.sql.
//
// What a credit is: $1 of LeadFlow Pro services, redeemable only with The
// LeadFlow Pro. No cash value. Not transferable. Not sold as an investment and
// never traded. A closed loop by design: the balance cap keeps every account
// under the $2,000 line, so this stays a store-credit program, not a payment
// instrument.

import { PRICES } from "@/lib/site/prices";

export const TLFP_CREDITS = {
  name: "TLFP Credits",
  shortName: "credits",
  /** The Stripe checkout kind and purchases.kind for a pack. */
  purchaseKind: "tlfp_credit_pack",
  /** 1 credit = 100 cents of services. */
  creditValueCents: 100,
  /** A balance never reaches $2,000. tlfp_post in the database enforces it too. */
  maxBalance: 1999,
  /** Holding this many unlocks the perks in TLFP_PERKS. */
  holderThreshold: 500,
  path: "/tlfp",
  termsPath: "/tlfp/terms",
  /** Referral landing: /r/<code> sets this cookie, then sends the visitor to /tlfp. */
  referralCookie: "tlfp_ref",
  referralCookieDays: 30,
  /** Stripe Checkout sessions live 24 hours. A hold older than this is returned. */
  holdReleaseHours: 26,
} as const;

export type TlfpPack = {
  id: string;
  name: string;
  /** Dollars paid, from lib/site/prices.ts. */
  priceUsd: number;
  /** Credits added to the balance. Always more than the dollars paid. */
  credits: number;
  blurb: string;
};

export const TLFP_PACKS: readonly TlfpPack[] = [
  {
    id: "starter",
    name: "Starter pack",
    priceUsd: PRICES.tlfpPackStarter,
    credits: 300,
    blurb: "Covers a workshop seat, a Pro Kit or two, and a head start on a System Map.",
  },
  {
    id: "builder",
    name: "Builder pack",
    priceUsd: PRICES.tlfpPackBuilder,
    credits: 625,
    blurb: "Covers a System Map outright, with credits left over. Crosses the holder line.",
  },
  {
    id: "founder",
    name: "Founder pack",
    priceUsd: PRICES.tlfpPackFounder,
    credits: 1300,
    blurb: "The most bonus we give. Built for a business that already knows it is building this year.",
  },
];

export function findPack(id: unknown): TlfpPack | null {
  if (typeof id !== "string") return null;
  return TLFP_PACKS.find((pack) => pack.id === id) ?? null;
}

/** "20% more" for a $250 pack that carries 300 credits. */
export function packBonusPercent(pack: TlfpPack): number {
  return Math.round(((pack.credits - pack.priceUsd) / pack.priceUsd) * 100);
}

export type TlfpEarnRule = {
  id: "course_completed" | "event_attended" | "referral_purchase";
  label: string;
  /** Fixed credits, or a percentage of the referred buyer's first purchase. */
  credits?: number;
  percentOfPurchase?: number;
  how: string;
};

export const TLFP_EARN_RULES: readonly TlfpEarnRule[] = [
  {
    id: "course_completed",
    label: "Finish a course",
    credits: 100,
    how: "Posted the moment your completion letter is issued.",
  },
  {
    id: "event_attended",
    label: "Show up at a workshop",
    credits: 25,
    how: "Posted when attendance is marked after the event.",
  },
  {
    id: "referral_purchase",
    label: "Refer a business that buys",
    percentOfPurchase: 10,
    how: "Share your link. When they make their first purchase, 10% of it lands in your balance.",
  },
];

export function earnRule(id: TlfpEarnRule["id"]): TlfpEarnRule {
  const rule = TLFP_EARN_RULES.find((r) => r.id === id);
  if (!rule) throw new Error(`Unknown TLFP earn rule: ${id}`);
  return rule;
}

/** What a holder (500+ credits) gets on top of spending power. */
export const TLFP_PERKS: readonly string[] = [
  "Every Pro Kit unlocked while you hold the balance",
  "First pick of workshop seats before they open to the public",
  "Priority on the build calendar",
];

/**
 * Credits a referrer earns when someone they sent makes a first purchase.
 * Whole credits, floor, never more than the cap allows (the database caps it
 * again at post time).
 */
export function referralCredits(amountCents: number): number {
  const rule = earnRule("referral_purchase");
  if (!Number.isFinite(amountCents) || amountCents <= 0) return 0;
  return Math.floor((amountCents / TLFP_CREDITS.creditValueCents) * ((rule.percentOfPurchase ?? 0) / 100));
}

/** Cents a number of credits is worth at checkout. */
export function creditsToCents(credits: number): number {
  return Math.max(0, Math.floor(credits)) * TLFP_CREDITS.creditValueCents;
}

/**
 * How many credits can go against a checkout: never more than the balance,
 * never more than the amount due. Whole credits only.
 */
export function redeemableCredits(balance: number, amountCents: number): number {
  const byAmount = Math.floor(Math.max(0, amountCents) / TLFP_CREDITS.creditValueCents);
  return Math.max(0, Math.min(Math.floor(balance), byAmount));
}

/** True when adding these credits would push the balance past the cap. */
export function wouldExceedCap(balance: number, add: number): boolean {
  return balance + add > TLFP_CREDITS.maxBalance;
}

/** Checkout kinds that accept credits. Each one fulfils on metadata, not on an exact total. */
export const TLFP_REDEEMABLE_KINDS: ReadonlySet<string> = new Set([
  "system_map",
  "package_full",
  "package_deposit",
  "build_deposit",
  "timeback_order",
  "tool_studio_order",
]);

export function formatCredits(n: number): string {
  return `${Math.round(n).toLocaleString("en-US")} ${Math.abs(Math.round(n)) === 1 ? "credit" : "credits"}`;
}
