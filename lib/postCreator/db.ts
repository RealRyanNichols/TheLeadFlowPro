import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";
import { parseProfile } from "./profile";
import type {
  Account,
  AccountStatus,
  BrandProfile,
  GenerationStatus,
  PostCreatorPlan,
  ReserveInput,
  ReserveResult,
  SettleInput,
  UsageCounts,
} from "./types";

// Post Creator's data layer. Every function takes the client it should use,
// and every query filters by the account email in code. The four tables are
// service role only (no browser policy at all): the only way to a row is
// through a server route that has already verified the signed cookie. RLS is
// enabled with no policies as the backstop.
//
// The rules that must hold under concurrency live in the database functions
// (supabase/migrations/20260924150000_post_creator.sql): recording a purchase,
// reserving and settling an AI write, and the durable rate limit. This file
// only calls them and reads their answers. Every database error throws.

export type Db = SupabaseClient<any, any, any>;

const ACCOUNTS = "post_creator_accounts";

export function serviceDb(): Db | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) return null;
  return createSupabaseClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function fail(where: string, error: { message?: string; code?: string } | null): never {
  throw new Error(`${where}: ${error?.code ?? ""} ${error?.message ?? "unknown database error"}`.trim());
}

function str(value: unknown, max = 500): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function strOrNull(value: unknown, max = 500): string | null {
  return typeof value === "string" && value ? value.slice(0, max) : null;
}

function count(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** A whole number for an integer column, or null. */
function intOrNull(value: number | null): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : null;
}

/* --------------------------------- accounts -------------------------------- */

export function parseAccount(row: Record<string, unknown>): Account {
  const plan: PostCreatorPlan = row.plan === "lifetime" ? "lifetime" : "monthly";
  const status: AccountStatus = row.status === "past_due" ? "past_due" : row.status === "canceled" ? "canceled" : "active";
  const epoch = Number(row.access_epoch);
  const keyVersion = Number(row.key_version ?? 0);
  return {
    email: str(row.email, 200),
    plan,
    status,
    currentPeriodEnd: strOrNull(row.current_period_end, 64),
    cancelAt: strOrNull(row.cancel_at, 64),
    stripeCustomerId: strOrNull(row.stripe_customer_id, 200),
    stripeSubscriptionId: strOrNull(row.stripe_subscription_id, 200),
    firstSessionId: str(row.first_session_id, 220),
    lastSessionId: strOrNull(row.last_session_id, 220),
    firstClaimedAt: strOrNull(row.first_claimed_at, 64),
    accessEpoch: Number.isInteger(epoch) && epoch >= 0 ? epoch : 0,
    // A value that cannot be read opens nothing: no key derives from -1.
    keyVersion: Number.isInteger(keyVersion) && keyVersion >= 0 ? keyVersion : -1,
    stripeEventAt: Number(row.stripe_event_at) || 0,
    stripeSyncedAt: strOrNull(row.stripe_synced_at, 64),
    pastDueSince: strOrNull(row.past_due_since, 64),
    moneyBackAt: strOrNull(row.money_back_at, 64),
    replacedSubscriptionId: strOrNull(row.replaced_subscription_id, 200),
    monthlyUntil: strOrNull(row.monthly_until, 64),
    profile: parseProfile(row.profile),
    createdAt: typeof row.created_at === "string" ? row.created_at : new Date(0).toISOString(),
  };
}

export async function getAccount(db: Db, email: string): Promise<Account | null> {
  const { data, error } = await db.from(ACCOUNTS).select("*").eq("email", email).maybeSingle();
  if (error) fail("getAccount", error);
  return data ? parseAccount(data) : null;
}

export async function findAccountByStripe(db: Db, column: "stripe_subscription_id" | "stripe_customer_id", value: string): Promise<Account | null> {
  const { data, error } = await db.from(ACCOUNTS).select("*").eq(column, value).limit(1).maybeSingle();
  if (error) fail("findAccountByStripe", error);
  return data ? parseAccount(data) : null;
}

export type PurchaseRecord = {
  email: string;
  plan: PostCreatorPlan;
  sessionId: string;
  customerId: string | null;
  subscriptionId: string | null;
  /** Unix seconds of the Stripe event, for ordering. */
  eventAt: number;
};

/**
 * A paid checkout, through post_creator_record_purchase. Each checkout is
 * applied once, ever: a retry, a revisited success link, or an older checkout
 * replayed after a newer one reads the account and changes nothing. A new
 * email gets an account created by this session; a later checkout on an
 * existing email applies the plan rules (an owned one payment plan never
 * downgrades) and gives the account a fresh access_epoch, which signs every
 * device out. `createdByThisSession` is what the claim route needs: only the
 * checkout that created the account may sign a browser in. `account` is null
 * when the checkout was applied before and the account has since been
 * deleted on request.
 */
export async function recordPurchase(
  db: Db,
  p: PurchaseRecord,
): Promise<{ account: Account | null; created: boolean; createdByThisSession: boolean }> {
  const { data, error } = await db.rpc("post_creator_record_purchase", {
    p_email: p.email,
    p_plan: p.plan,
    p_session_id: p.sessionId,
    p_customer_id: p.customerId,
    p_subscription_id: p.subscriptionId,
    p_event_at: p.eventAt,
  });
  if (error) fail("recordPurchase", error);
  const out = record(data);
  if (out && out.account === null) return { account: null, created: false, createdByThisSession: false };
  const row = record(out?.account);
  if (!out || !row) throw new Error("recordPurchase: the database returned no account");
  return { account: parseAccount(row), created: out.created === true, createdByThisSession: out.created_by_this_session === true };
}

/**
 * Marks the creating checkout as claimed and returns the account's epoch for
 * the cookie, or null. Exactly one row changes only when this session created
 * the account, no browser has claimed it yet, and no later checkout has been
 * applied (a later checkout moves last_session_id for good and signs every
 * device out, including one that had not arrived yet). The guard trigger
 * allows first_claimed_at to go from null to a value once.
 */
export async function claimFirstCookie(db: Db, email: string, sessionId: string, now: Date = new Date()): Promise<number | null> {
  const { data, error } = await db
    .from(ACCOUNTS)
    .update({ first_claimed_at: now.toISOString() })
    .eq("email", email)
    .eq("first_session_id", sessionId)
    .eq("last_session_id", sessionId)
    .is("first_claimed_at", null)
    .select("access_epoch");
  if (error) fail("claimFirstCookie", error);
  const rows = Array.isArray(data) ? data : [];
  if (rows.length !== 1) return null;
  const epoch = Number((rows[0] as Record<string, unknown>).access_epoch);
  return Number.isInteger(epoch) && epoch >= 0 ? epoch : null;
}

export type PlanPatch = {
  status: AccountStatus;
  currentPeriodEnd: string | null;
  cancelAt: string | null;
  /** When the plan went past due (see pastDueSinceFor in ./plan), or null once it is not. */
  pastDueSince: string | null;
  subscriptionId?: string | null;
  customerId?: string | null;
  eventAt: number;
};

/**
 * Writes what Stripe says about the plan. The ordering check is in the query
 * itself: the row changes only when its stripe_event_at is not newer than
 * this event, so two deliveries racing on two servers can never let the older
 * one land last.
 */
export async function updatePlan(db: Db, email: string, patch: PlanPatch): Promise<void> {
  const row: Record<string, unknown> = {
    status: patch.status,
    current_period_end: patch.currentPeriodEnd,
    cancel_at: patch.cancelAt,
    past_due_since: patch.pastDueSince,
    stripe_event_at: patch.eventAt,
  };
  if (patch.subscriptionId !== undefined) row.stripe_subscription_id = patch.subscriptionId;
  if (patch.customerId !== undefined) row.stripe_customer_id = patch.customerId;
  const { error } = await db.from(ACCOUNTS).update(row).eq("email", email).lte("stripe_event_at", patch.eventAt);
  if (error) fail("updatePlan", error);
}

/**
 * A refund or a dispute closed the plan (`closed`), or a dispute was won.
 * Closing stamps money_back_at, which no Stripe event clears, and moves
 * stripe_event_at up to `eventAt` so an older event can never land after it.
 * A dispute won clears the stamp and opens the plan again.
 */
export async function setMoneyBack(db: Db, email: string, change: { closed: boolean; at: Date; eventAt: number }): Promise<void> {
  const row = change.closed
    ? { status: "canceled", money_back_at: change.at.toISOString(), stripe_event_at: change.eventAt }
    : { status: "active", money_back_at: null };
  const { error } = await db.from(ACCOUNTS).update(row).eq("email", email);
  if (error) fail("setMoneyBack", error);
}

/**
 * Whether another paid purchase of this kind backs the account: a purchases
 * row for the same email and kind, still paid, other than `exceptKey`.
 */
export async function hasOtherPaidPurchase(db: Db, email: string, kind: string, exceptKey: string): Promise<boolean> {
  const { data, error } = await db
    .from("purchases")
    .select("stripe_session_id")
    .eq("email", email)
    .eq("kind", kind)
    .eq("status", "paid")
    .neq("stripe_session_id", exceptKey)
    .limit(1);
  if (error) fail("hasOtherPaidPurchase", error);
  return Array.isArray(data) && data.length > 0;
}

/** Stamps the last time the account was checked against Stripe, so a stale account is asked at most once an hour. */
export async function markSynced(db: Db, email: string, now: Date = new Date()): Promise<void> {
  const { error } = await db.from(ACCOUNTS).update({ stripe_synced_at: now.toISOString() }).eq("email", email);
  if (error) fail("markSynced", error);
}

export async function saveProfile(db: Db, email: string, p: BrandProfile): Promise<BrandProfile> {
  const clean = parseProfile(p);
  const { error } = await db.from(ACCOUNTS).update({ profile: clean }).eq("email", email);
  if (error) fail("saveProfile", error);
  return clean;
}

/* -------------------------------- AI metering ------------------------------- */

function countsFrom(out: Record<string, unknown>): UsageCounts {
  return {
    day: str(out.day, 10),
    month: str(out.month, 7),
    usedDay: count(out.used_day),
    usedMonth: count(out.used_month),
    triesDay: count(out.tries_day),
    triesMonth: count(out.tries_month),
  };
}

function isGenerationStatus(value: unknown): value is GenerationStatus {
  return value === "reserved" || value === "delivered" || value === "failed" || value === "expired";
}

/**
 * Reserves one AI write through post_creator_reserve: the account's day and
 * month limits, its tries, its monthly cost ceiling, and the shared daily
 * spend cap, all checked under one lock. An answer this code does not know
 * throws, so a surprise never becomes a model call.
 */
export async function reserveGeneration(db: Db, i: ReserveInput): Promise<ReserveResult> {
  const { data, error } = await db.rpc("post_creator_reserve", {
    p_email: i.email,
    p_request_id: i.requestId,
    p_platforms: i.platforms,
    p_per_day: i.perDay,
    p_per_month: i.perMonth,
    p_tries_per_day: i.triesPerDay,
    p_tries_per_month: i.triesPerMonth,
    p_account_month_cap_micro: i.accountMonthCapMicro,
    p_reserve_micro: i.reserveMicro,
    p_cap_micro: i.capMicro,
    p_model: i.model,
  });
  if (error) fail("reserveGeneration", error);
  const out = record(data) ?? {};
  const result = out.result;
  switch (result) {
    case "reserved": {
      const id = str(out.id, 64);
      if (!id) break;
      return { result, id, counts: countsFrom(out) };
    }
    case "duplicate":
      if (!isGenerationStatus(out.status)) break;
      return { result, status: out.status };
    case "busy":
    case "no_account":
      return { result };
    case "daily_limit":
    case "monthly_limit":
    case "attempt_limit":
    case "account_cost_limit":
      return { result, counts: countsFrom(out) };
    case "spend_cap":
      return { result, firstHit: out.first_hit === true };
  }
  throw new Error(`reserveGeneration: unexpected answer ${String(result ?? "none").slice(0, 40)}`);
}

/**
 * Settles a reservation once through post_creator_settle. A null cost means
 * the cost is unknown (a timeout or a dropped connection), and the database
 * charges the full reservation.
 */
export async function settleGeneration(db: Db, i: SettleInput): Promise<void> {
  const { error } = await db.rpc("post_creator_settle", {
    p_id: i.id,
    p_email: i.email,
    p_delivered: i.delivered,
    p_outcome: i.outcome,
    p_cost_micro: i.costMicro === null ? null : Math.max(0, Math.ceil(i.costMicro)),
    p_served_model: i.servedModel,
    p_input_tokens: intOrNull(i.inputTokens),
    p_output_tokens: intOrNull(i.outputTokens),
    p_cache_read_tokens: intOrNull(i.cacheReadTokens),
    p_cache_write_tokens: intOrNull(i.cacheWriteTokens),
    p_stop_reason: i.stopReason,
    p_fell_back: i.fellBack,
  });
  if (error) fail("settleGeneration", error);
}

/** This Chicago day's and month's writes and tries for one account. */
export async function usageCounts(db: Db, email: string): Promise<UsageCounts> {
  const { data, error } = await db.rpc("post_creator_usage", { p_email: email });
  if (error) fail("usageCounts", error);
  const out = record(data);
  if (!out) throw new Error("usageCounts: the database returned nothing");
  return countsFrom(out);
}

/* -------------------------------- rate limits ------------------------------- */

/**
 * Counts one hit on a durable bucket (see bucketFor in ./access) and returns
 * true while the bucket is within `limit` hits for the current window. Every
 * server instance shares the count, unlike an in-memory map.
 */
export async function hitRateLimit(db: Db, bucket: string, windowSeconds: number, limit: number): Promise<boolean> {
  const { data, error } = await db.rpc("post_creator_hit", { p_bucket: bucket, p_window_seconds: windowSeconds, p_limit: limit });
  if (error) fail("hitRateLimit", error);
  return data === true;
}
