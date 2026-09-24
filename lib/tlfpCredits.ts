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

// Founding 100. The first 100 distinct emails whose first qualifying paid
// purchase clears after this ships get a numbered seat and a one-time
// founding bonus by what they bought. Seat holders then earn a standing
// rebate on every paid purchase, and an Operations Partner month pays a
// monthly bonus. All of it is credits today: posted to the same ledger,
// under the same 1,999 cap. The seat counter lives in the database
// (supabase/migrations/20260924200000_tlfp_founding.sql), which refuses seat
// 101 on its own; tests/tlfp-founding.test.ts checks the numbers match.
//
// The numbers are the client playbook's proposal (2026-09-24). Ryan confirms
// them, and picks the rebate (5 or 10), before this goes live.

export type FoundingTierId = "build" | "learn" | "operations";

export type FoundingTier = {
  id: FoundingTierId;
  label: string;
  /** Posted once, when the seat is claimed. */
  oneTimeCredits: number;
  /** Posted on every paid month of this tier, for any seat holder. */
  monthlyCredits: number;
  /** purchases.kind values (or invoice kinds) that count as this tier. */
  kinds: readonly string[];
  /** The cash paid on the purchase must be at least this many cents to claim a seat. */
  minPaidCents: number;
};

export const TLFP_FOUNDING = {
  name: "Founding 100",
  /** Seats, ever. The migration's check constraint holds the same number. */
  seats: 100,
  /**
   * The day the program opens (UTC). Set it to the merge date. An email with a
   * qualifying paid purchase before this day is an existing client and does
   * not take a seat; the terms print this date.
   */
  startsAt: "2026-09-24",
  /** Standing rebate for a seat holder, as a percentage of cash paid. Ryan picks 5 or 10. */
  rebatePercent: 5,
  /** Kinds that never earn a rebate or claim a seat: buying credits with credits' own bonus. */
  rebateExcludedKinds: ["tlfp_credit_pack"] as readonly string[],
  /**
   * The value sentence for anything founding a client sees. No price talk,
   * ever. "Send" joins when earned credits can be claimed as TLFP; until
   * then credits stay on the email that earned them (terms, section 2).
   */
  valueLine: "A dollar of our work each. Yours to spend or hold.",
} as const;

export const TLFP_FOUNDING_TIERS: readonly FoundingTier[] = [
  {
    id: "build",
    label: "Build client",
    oneTimeCredits: 1000,
    monthlyCredits: 0,
    // Deposits and full payments on a build, a one-time agency scope, a Tool
    // Studio build, and a Sales Desk or Stripe dashboard invoice.
    kinds: ["build_deposit", "package_deposit", "package_full", "agency_payment", "tool_studio_order", "stripe_invoice"],
    // The Website Launch deposit is the smallest real build start.
    minPaidCents: PRICES.websiteLaunchDeposit * 100,
  },
  {
    id: "learn",
    label: "Learn It",
    oneTimeCredits: 250,
    monthlyCredits: 0,
    // learn_it has no live checkout; the paid Operator Academy courses are the
    // training sold today.
    kinds: ["learn_it", "chatgpt_operator_course", "operator_academy_all_access"],
    minPaidCents: 1,
  },
  {
    id: "operations",
    label: "Operations Partner",
    oneTimeCredits: 0,
    monthlyCredits: 100,
    // A monthly agency retainer: month one on the checkout, every month after on its invoice.
    kinds: ["agency_payment"],
    minPaidCents: 1,
  },
];

export function foundingTier(id: FoundingTierId): FoundingTier {
  const tier = TLFP_FOUNDING_TIERS.find((t) => t.id === id);
  if (!tier) throw new Error(`Unknown founding tier: ${id}`);
  return tier;
}

/**
 * Which founding tier a paid purchase counts as, or null. A monthly agency
 * retainer is an Operations Partner month; a one-time agency payment is a
 * build. Cash paid is what counts: a checkout covered by credits claims no
 * seat and earns no rebate.
 */
export function foundingTierFor(purchase: {
  kind: string;
  amountCents: number | null;
  billing?: string | null;
}): FoundingTier | null {
  const kind = purchase.kind;
  const cents = Number(purchase.amountCents);
  if (!Number.isFinite(cents) || cents <= 0) return null;
  if (TLFP_FOUNDING.rebateExcludedKinds.includes(kind)) return null;
  const monthly = purchase.billing === "monthly";
  for (const tier of TLFP_FOUNDING_TIERS) {
    if (!tier.kinds.includes(kind)) continue;
    if (kind === "agency_payment" && (tier.id === "operations") !== monthly) continue;
    if (cents < tier.minPaidCents) continue;
    return tier;
  }
  return null;
}

/** The standing rebate on one paid purchase, whole credits, floor. */
export function foundingRebateCredits(kind: string, amountCents: number | null): number {
  const cents = Number(amountCents);
  if (!Number.isFinite(cents) || cents <= 0) return 0;
  if (TLFP_FOUNDING.rebateExcludedKinds.includes(kind)) return 0;
  return Math.floor((cents / TLFP_CREDITS.creditValueCents) * (TLFP_FOUNDING.rebatePercent / 100));
}

/** "7 of 100 seats taken" arithmetic, never negative. */
export function foundingSeatsLeft(taken: number): number {
  return Math.max(0, TLFP_FOUNDING.seats - Math.max(0, Math.floor(taken)));
}

/** "September 24, 2026", from TLFP_FOUNDING.startsAt, for the terms. */
export function foundingStartLabel(): string {
  return new Date(`${TLFP_FOUNDING.startsAt}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * True when an earlier paid purchase would itself have qualified, which makes
 * the buyer an existing client, not a founder. purchases does not store an
 * agency payment's billing, so any paid agency payment counts (monthly at any
 * amount qualifies).
 */
export function qualifiedBefore(rows: readonly { kind: string | null; amount_cents: number | null }[]): boolean {
  return rows.some((row) =>
    !!row.kind && foundingTierFor({ kind: row.kind, amountCents: row.amount_cents, billing: row.kind === "agency_payment" ? "monthly" : null }) !== null,
  );
}

export type FoundingAwardRow = { id: string; email: string; delta: number; reason: string; stripe_session_id: string | null };
export type FoundingMoveRow = { ref: string; delta: number };
export type FoundingMove = {
  awardId: string;
  email: string;
  key: string | null;
  reason: "founding_reversed" | "founding_restored";
  delta: number;
  ref: string;
};

/** Credits of one founding award currently taken back: its reversals minus its restores, never negative. */
export function foundingNetTaken(awardId: string, moves: readonly FoundingMoveRow[]): number {
  const mine = (prefix: string) =>
    moves.filter((m) => m.ref === `${prefix}:${awardId}` || m.ref.startsWith(`${prefix}:${awardId}:`));
  const taken = mine("founding_reversed").reduce((sum, m) => sum + Math.abs(Number(m.delta)), 0);
  const putBack = mine("founding_restored").reduce((sum, m) => sum + Math.abs(Number(m.delta)), 0);
  return Math.max(0, taken - putBack);
}

/**
 * What a refund, dispute, or dispute won does to the founding awards on the
 * money. Each award's net taken back is its founding_reversed rows minus its
 * founding_restored rows (refs `founding_reversed:<award id>:<event>`). A take
 * back removes what is still on the account; a put back returns what is still
 * taken. `eventTag` names the money-back event (status and charge), so a
 * retry of the same event posts nothing twice while a later event (a refund
 * after a dispute was won) still moves the credits. Pure.
 */
export function foundingReversalPlan(
  awards: readonly FoundingAwardRow[],
  moves: readonly FoundingMoveRow[],
  restore: boolean,
  eventTag: string,
): FoundingMove[] {
  const plan: FoundingMove[] = [];
  for (const award of awards) {
    if (!(award.delta > 0)) continue;
    const netTaken = foundingNetTaken(award.id, moves);
    const amount = restore ? netTaken : Math.max(0, award.delta - netTaken);
    if (amount <= 0) continue;
    const reason = restore ? "founding_restored" : "founding_reversed";
    plan.push({
      awardId: award.id,
      email: award.email,
      key: award.stripe_session_id,
      reason,
      delta: restore ? amount : -amount,
      ref: `${reason}:${award.id}:${eventTag}`.slice(0, 200),
    });
  }
  return plan;
}
