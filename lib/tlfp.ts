import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  TLFP_CREDITS,
  TLFP_FOUNDING,
  earnRule,
  foundingRebateCredits,
  foundingTierFor,
  referralCredits,
  type FoundingTierId,
  type TlfpPack,
} from "@/lib/tlfpCredits";

// The server side of TLFP Credits. Every write goes through the database
// functions in supabase/migrations/20260923000000_tlfp_credits.sql, which
// own idempotency (unique ref), the balance cap, and the funds check. Nothing
// in this file edits a balance directly, and nothing here runs in the browser.

export type TlfpPostResult = {
  ok: boolean;
  duplicate?: boolean;
  applied?: number;
  requested?: number;
  balance?: number;
  error?: "balance_cap" | "insufficient" | "hold_missing" | string;
  status?: "posted" | "held" | "released";
  id?: string;
  referral_code?: string;
};

export type TlfpLedgerRow = {
  id: string;
  delta: number;
  reason: string;
  status: "posted" | "held" | "released";
  memo: string | null;
  amount_cents: number | null;
  created_at: string;
};

export type TlfpFoundingSeat = {
  seatNo: number;
  tier: FoundingTierId;
  bonusApplied: number;
  claimedAt: string;
};

export type TlfpAccountView = {
  email: string;
  balance: number;
  held: number;
  referralCode: string;
  history: TlfpLedgerRow[];
  /** The Founding 100 seat on this email, or null. */
  founding: TlfpFoundingSeat | null;
};

export type TlfpReason =
  | "pack_purchase"
  | "pack_refund"
  | "pack_restore"
  | "course_completed"
  | "event_attended"
  | "referral_purchase"
  | "redeem"
  | "admin_grant"
  | "admin_adjust"
  | "founding_bonus"
  | "founding_monthly"
  | "founding_rebate"
  | "founding_reversed"
  | "founding_restored";

/** The founding awards a refund takes back. */
export const FOUNDING_AWARD_REASONS: readonly TlfpReason[] = ["founding_bonus", "founding_monthly", "founding_rebate"];

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 254) : "";
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !value.includes("@no-email.");
}

function asResult(data: unknown, error: { message?: string; code?: string } | null): TlfpPostResult {
  if (error) throw new Error(`TLFP ledger call failed: ${error.code ?? error.message ?? "unknown"}`);
  if (!data || typeof data !== "object") throw new Error("TLFP ledger call returned nothing");
  return data as TlfpPostResult;
}

/** Find or create the account for an email; attaches the user id when known. */
export async function ensureTlfpAccount(
  service: SupabaseClient,
  email: string,
  userId: string | null = null,
): Promise<{ email: string; referral_code: string; user_id: string | null }> {
  const { data, error } = await service.rpc("tlfp_ensure_account", {
    p_email: normalizeEmail(email),
    p_user_id: userId,
  });
  if (error) throw new Error(`TLFP account failed: ${error.code ?? error.message}`);
  return data as { email: string; referral_code: string; user_id: string | null };
}

export async function postCredits(
  service: SupabaseClient,
  input: {
    email: string;
    delta: number;
    reason: TlfpReason;
    ref: string;
    memo?: string;
    amountCents?: number | null;
    stripeSessionId?: string | null;
    actor?: string;
    status?: "posted" | "held";
    requireFunds?: boolean;
  },
): Promise<TlfpPostResult> {
  const { data, error } = await service.rpc("tlfp_post", {
    p_email: normalizeEmail(input.email),
    p_delta: Math.trunc(input.delta),
    p_reason: input.reason,
    p_ref: input.ref.slice(0, 200),
    p_memo: input.memo?.slice(0, 500) ?? null,
    p_amount_cents: input.amountCents ?? null,
    p_stripe_session_id: input.stripeSessionId ?? null,
    p_actor: input.actor ?? "system",
    p_status: input.status ?? "posted",
    p_require_funds: input.requireFunds ?? true,
  });
  return asResult(data, error);
}

/** Reserve credits for a checkout that has not paid yet. */
export async function holdCredits(
  service: SupabaseClient,
  input: { email: string; credits: number; ref: string; memo: string },
): Promise<TlfpPostResult> {
  await service.rpc("tlfp_release_stale_holds", {
    p_older_than: `${TLFP_CREDITS.holdReleaseHours} hours`,
  });
  return postCredits(service, {
    email: input.email,
    delta: -Math.abs(Math.trunc(input.credits)),
    reason: "redeem",
    ref: input.ref,
    memo: input.memo,
    status: "held",
    requireFunds: true,
    actor: "checkout",
  });
}

export async function settleHold(
  service: SupabaseClient,
  ref: string,
  outcome: "posted" | "released",
  stripeSessionId: string | null = null,
): Promise<TlfpPostResult> {
  const { data, error } = await service.rpc("tlfp_settle_hold", {
    p_ref: ref.slice(0, 200),
    p_outcome: outcome,
    p_stripe_session_id: stripeSessionId,
  });
  return asResult(data, error);
}

/** The hold ref carried in Stripe metadata as tlfp_hold_ref. */
export function holdRef(id: string): string {
  return `hold:${id}`;
}

/** Credits a paid pack adds. Idempotent on the Stripe session id. */
export async function creditPackPaid(
  service: SupabaseClient,
  input: { email: string; pack: TlfpPack; sessionId: string; amountCents: number | null },
): Promise<TlfpPostResult> {
  return postCredits(service, {
    email: input.email,
    delta: input.pack.credits,
    reason: "pack_purchase",
    ref: `pack:${input.sessionId}`,
    memo: `${input.pack.name}: ${input.pack.credits} credits`,
    amountCents: input.amountCents,
    stripeSessionId: input.sessionId,
    actor: "webhook",
    requireFunds: false,
  });
}

/** A refunded or disputed pack takes its credits back, even below zero. */
export async function creditPackReversed(
  service: SupabaseClient,
  input: { email: string; sessionId: string; restore: boolean },
): Promise<TlfpPostResult | null> {
  const { data: original, error } = await service
    .from("tlfp_ledger")
    .select("delta, memo")
    .eq("ref", `pack:${input.sessionId}`)
    .maybeSingle();
  if (error) throw new Error(`TLFP pack lookup failed: ${error.code}`);
  if (!original) return null;
  return postCredits(service, {
    email: input.email,
    delta: input.restore ? Math.abs(original.delta) : -Math.abs(original.delta),
    reason: input.restore ? "pack_restore" : "pack_refund",
    ref: `${input.restore ? "pack_restore" : "pack_refund"}:${input.sessionId}`,
    memo: input.restore ? "Dispute closed in our favour; pack credits restored" : "Pack refunded or disputed; credits removed",
    stripeSessionId: input.sessionId,
    actor: "webhook",
    requireFunds: false,
  });
}

/** Course completion award, once per learner per course. */
export async function awardCourseCompletion(
  service: SupabaseClient,
  input: { email: string; userId: string; courseId: string; courseSlug: string },
): Promise<TlfpPostResult> {
  const rule = earnRule("course_completed");
  await ensureTlfpAccount(service, input.email, input.userId);
  return postCredits(service, {
    email: input.email,
    delta: rule.credits ?? 0,
    reason: "course_completed",
    ref: `course_completed:${input.userId}:${input.courseId}`,
    memo: `Finished ${input.courseSlug}`,
    actor: "system",
    requireFunds: false,
  });
}

/**
 * The referrer's cut of a referred buyer's first paid checkout. The code came
 * in on the buyer's checkout metadata (from the tlfp_ref cookie). Skips
 * self-referral, unknown codes, and any buyer who already has a paid purchase
 * before this one. Idempotent on the session id.
 */
export async function awardReferralPurchase(
  service: SupabaseClient,
  input: { buyerEmail: string; code: string; amountCents: number | null; sessionId: string; kind: string },
): Promise<TlfpPostResult | { ok: false; error: string }> {
  const code = input.code.trim().toUpperCase();
  const buyer = normalizeEmail(input.buyerEmail);
  if (!/^[A-Z0-9]{6,12}$/.test(code) || !isEmail(buyer)) return { ok: false, error: "bad_input" };
  const credits = referralCredits(input.amountCents ?? 0);
  if (credits <= 0) return { ok: false, error: "nothing_to_award" };

  const { data: referrer, error } = await service
    .from("tlfp_accounts")
    .select("email")
    .eq("referral_code", code)
    .maybeSingle();
  if (error) throw new Error(`TLFP referrer lookup failed: ${error.code}`);
  if (!referrer) return { ok: false, error: "unknown_code" };
  if (referrer.email === buyer) return { ok: false, error: "self_referral" };

  const { count, error: priorError } = await service
    .from("purchases")
    .select("stripe_session_id", { count: "exact", head: true })
    .ilike("email", buyer)
    .eq("status", "paid")
    .neq("stripe_session_id", input.sessionId);
  if (priorError) throw new Error(`TLFP prior purchase check failed: ${priorError.code}`);
  if ((count ?? 0) > 0) return { ok: false, error: "not_first_purchase" };

  return postCredits(service, {
    email: referrer.email,
    delta: credits,
    reason: "referral_purchase",
    ref: `referral:${input.sessionId}`,
    memo: `Referred buyer's first purchase (${input.kind.replace(/_/g, " ")})`,
    amountCents: input.amountCents,
    stripeSessionId: input.sessionId,
    actor: "webhook",
    requireFunds: false,
  });
}

export type FoundingOutcome = {
  /** The tier this purchase counts as, or null when it does not qualify. */
  tier: FoundingTierId | null;
  /** The buyer's seat, whoever claimed it and when. */
  seatNo: number | null;
  /** True when this purchase is the one that claimed the seat (stable across retries). */
  claimedHere: boolean;
  /** True when this purchase qualified but all seats were already taken. */
  soldOut: boolean;
  /** One-time bonus on the seat (only reported when claimedHere). */
  bonus: number;
  /** Operations Partner month credits posted for this purchase. */
  monthly: number;
  /** Standing rebate credits posted for this purchase. */
  rebate: number;
};

/**
 * Founding 100 on one paid purchase. `key` is the Stripe checkout session or
 * invoice id that paid. Every award carries it as its stripe_session_id, so a
 * refund can find it and take it back, and every ref is built from it, so a
 * retried event posts nothing twice.
 *
 * In order: when the purchase qualifies (lib/tlfpCredits.ts foundingTierFor)
 * and a seat is free, claim one and post its one-time bonus (the database
 * does both in one transaction and refuses seat 101). Then, for any seat
 * holder: an Operations Partner month posts its monthly credits, and every
 * paid purchase posts the standing rebate. All of it under the 1,999 cap.
 */
export async function applyFoundingPerks(
  service: SupabaseClient,
  input: { email: string; kind: string; amountCents: number | null; key: string; billing?: string | null },
): Promise<FoundingOutcome> {
  const email = normalizeEmail(input.email);
  const key = input.key.trim().slice(0, 200);
  const outcome: FoundingOutcome = { tier: null, seatNo: null, claimedHere: false, soldOut: false, bonus: 0, monthly: 0, rebate: 0 };
  if (!isEmail(email) || key.length < 3) return outcome;

  const tier = foundingTierFor({ kind: input.kind, amountCents: input.amountCents, billing: input.billing ?? null });
  outcome.tier = tier?.id ?? null;

  if (tier) {
    const { data, error } = await service.rpc("tlfp_founding_claim", {
      p_email: email,
      p_tier: tier.id,
      p_ref: key,
      p_bonus: tier.oneTimeCredits,
      p_memo: null,
    });
    if (error) throw new Error(`TLFP founding claim failed: ${error.code ?? error.message}`);
    const claim = (data ?? {}) as { ok?: boolean; error?: string; seat_no?: number; ref?: string; bonus_applied?: number };
    if (claim.ok && typeof claim.seat_no === "number") {
      outcome.seatNo = claim.seat_no;
      outcome.claimedHere = claim.ref === key;
      if (outcome.claimedHere) outcome.bonus = Number(claim.bonus_applied ?? 0);
    } else if (claim.error === "sold_out") {
      outcome.soldOut = true;
    } else {
      throw new Error(`TLFP founding claim refused: ${claim.error ?? "unknown"}`);
    }
  }

  if (outcome.seatNo === null && !tier) {
    const { data, error } = await service.from("tlfp_founding_seats").select("seat_no").eq("email", email).maybeSingle();
    if (error) throw new Error(`TLFP founding seat lookup failed: ${error.code}`);
    outcome.seatNo = typeof data?.seat_no === "number" ? data.seat_no : null;
  }
  if (outcome.seatNo === null) return outcome;

  if (tier && tier.monthlyCredits > 0) {
    const month = await postCredits(service, {
      email,
      delta: tier.monthlyCredits,
      reason: "founding_monthly",
      ref: `founding_monthly:${key}`,
      memo: `Founding ${tier.label} month`,
      amountCents: input.amountCents,
      stripeSessionId: key,
      actor: "webhook",
      requireFunds: false,
    });
    outcome.monthly = month.ok ? Number(month.applied ?? 0) : 0;
  }

  const rebate = foundingRebateCredits(input.kind, input.amountCents);
  if (rebate > 0) {
    const back = await postCredits(service, {
      email,
      delta: rebate,
      reason: "founding_rebate",
      ref: `founding_rebate:${key}`,
      memo: `Founding rebate, ${TLFP_FOUNDING.rebatePercent}% back`,
      amountCents: input.amountCents,
      stripeSessionId: key,
      actor: "webhook",
      requireFunds: false,
    });
    outcome.rebate = back.ok ? Number(back.applied ?? 0) : 0;
  }
  return outcome;
}

/**
 * A refund or dispute takes back every founding award that rode on the money
 * (bonus, month, rebate); a dispute won puts back what was taken. `keys` are
 * the checkout session or invoice ids the money maps to. Idempotent on the
 * original row, so a retried event moves nothing twice. Returns the credits
 * moved by this call.
 */
export async function reverseFoundingCredits(
  service: SupabaseClient,
  input: { keys: string[]; restore: boolean },
): Promise<number> {
  const keys = [...new Set(input.keys.map((k) => k.trim().slice(0, 200)).filter((k) => k.length >= 3))];
  if (!keys.length) return 0;
  const { data, error } = await service
    .from("tlfp_ledger")
    .select("id, email, delta, stripe_session_id")
    .in("stripe_session_id", keys)
    .in("reason", [...FOUNDING_AWARD_REASONS])
    .eq("status", "posted")
    .gt("delta", 0);
  if (error) throw new Error(`TLFP founding lookup failed: ${error.code}`);

  let moved = 0;
  for (const row of (data ?? []) as { id: string; email: string; delta: number; stripe_session_id: string | null }[]) {
    if (input.restore) {
      const { data: reversal, error: reversalError } = await service
        .from("tlfp_ledger")
        .select("delta")
        .eq("ref", `founding_reversed:${row.id}`)
        .maybeSingle();
      if (reversalError) throw new Error(`TLFP founding reversal lookup failed: ${reversalError.code}`);
      if (!reversal) continue;
      const put = await postCredits(service, {
        email: row.email,
        delta: Math.abs(Number(reversal.delta)),
        reason: "founding_restored",
        ref: `founding_restored:${row.id}`,
        memo: "Dispute closed in our favour; founding credits restored",
        stripeSessionId: row.stripe_session_id,
        actor: "webhook",
        requireFunds: false,
      });
      if (put.ok && !put.duplicate) moved += Number(put.applied ?? 0);
    } else {
      const took = await postCredits(service, {
        email: row.email,
        delta: -Math.abs(Number(row.delta)),
        reason: "founding_reversed",
        ref: `founding_reversed:${row.id}`,
        memo: "Purchase refunded or disputed; founding credits taken back",
        stripeSessionId: row.stripe_session_id,
        actor: "webhook",
        requireFunds: false,
      });
      if (took.ok && !took.duplicate) moved += Math.abs(Number(took.applied ?? 0));
    }
  }
  return moved;
}

/** Founding awards that rode on these keys, summed. For the refund alert; stable across retries. */
export async function foundingAwardedOn(service: SupabaseClient, keys: string[]): Promise<number> {
  const clean = [...new Set(keys.map((k) => k.trim().slice(0, 200)).filter((k) => k.length >= 3))];
  if (!clean.length) return 0;
  const { data, error } = await service
    .from("tlfp_ledger")
    .select("delta")
    .in("stripe_session_id", clean)
    .in("reason", [...FOUNDING_AWARD_REASONS])
    .eq("status", "posted");
  if (error) return 0;
  return ((data ?? []) as { delta: number }[]).reduce((sum, row) => sum + Math.max(0, Number(row.delta)), 0);
}

export type FoundingSeatRow = {
  seat_no: number;
  email: string;
  tier: FoundingTierId;
  ref: string;
  bonus_applied: number;
  claimed_at: string;
};

/** Every seat, lowest number first, read with the service role (admin page). */
export async function readFoundingSeats(service: SupabaseClient): Promise<FoundingSeatRow[]> {
  const { data, error } = await service
    .from("tlfp_founding_seats")
    .select("seat_no, email, tier, ref, bonus_applied, claimed_at")
    .order("seat_no", { ascending: true })
    .limit(TLFP_FOUNDING.seats);
  if (error) throw new Error(`TLFP founding seats read failed: ${error.code ?? error.message}`);
  return (data ?? []) as FoundingSeatRow[];
}

/**
 * Seats handed out so far: the highest seat number, because seat numbers are
 * never reissued. Null when the table cannot be read (migration not applied),
 * so a public page hides the count instead of printing a wrong one.
 */
export async function readFoundingSeatsTaken(service: SupabaseClient): Promise<number | null> {
  const { data, error } = await service
    .from("tlfp_founding_seats")
    .select("seat_no")
    .order("seat_no", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return typeof data?.seat_no === "number" ? data.seat_no : 0;
}

/**
 * Balance and history for the logged-in person, read under their own RLS.
 * Returns null when nobody is logged in. Creates the account on first read
 * so a client always has a referral code to share.
 */
export async function getTlfpAccountForCurrentUser(): Promise<TlfpAccountView | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = normalizeEmail(user?.email);
  if (!user || !isEmail(email)) return null;

  let referralCode = "";
  try {
    const service = createServiceClient();
    await service.rpc("tlfp_release_stale_holds", {
      p_older_than: `${TLFP_CREDITS.holdReleaseHours} hours`,
    });
    const account = await ensureTlfpAccount(service, email, user.id);
    referralCode = account.referral_code;
  } catch {
    // Service access missing: still show what the user's own policy can read.
  }

  const [balanceRes, historyRes, seatRes] = await Promise.all([
    supabase.from("tlfp_balances").select("balance, held, referral_code").eq("email", email).maybeSingle(),
    supabase
      .from("tlfp_ledger")
      .select("id, delta, reason, status, memo, amount_cents, created_at")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(12),
    // Errors (the founding migration not applied yet) read as no seat.
    supabase.from("tlfp_founding_seats").select("seat_no, tier, bonus_applied, claimed_at").eq("email", email).maybeSingle(),
  ]);
  const seat = seatRes.error ? null : seatRes.data;

  return {
    email,
    balance: Number(balanceRes.data?.balance ?? 0),
    held: Number(balanceRes.data?.held ?? 0),
    referralCode: referralCode || String(balanceRes.data?.referral_code ?? ""),
    history: (historyRes.data ?? []) as TlfpLedgerRow[],
    founding: seat
      ? {
          seatNo: Number(seat.seat_no),
          tier: seat.tier as FoundingTierId,
          bonusApplied: Number(seat.bonus_applied ?? 0),
          claimedAt: String(seat.claimed_at),
        }
      : null,
  };
}

/** Balance for an email, read with the service role (checkout and access checks). */
export async function readTlfpBalance(service: SupabaseClient, email: string): Promise<number> {
  const { data, error } = await service
    .from("tlfp_balances")
    .select("balance")
    .eq("email", normalizeEmail(email))
    .maybeSingle();
  if (error) throw new Error(`TLFP balance read failed: ${error.code}`);
  return Number(data?.balance ?? 0);
}

/** True when the logged-in person holds enough credits for the holder perks. */
export async function currentUserIsTlfpHolder(supabase: SupabaseClient, email: string | null | undefined): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!isEmail(normalized)) return false;
  const { data } = await supabase.from("tlfp_balances").select("balance").eq("email", normalized).maybeSingle();
  return Number(data?.balance ?? 0) >= TLFP_CREDITS.holderThreshold;
}
