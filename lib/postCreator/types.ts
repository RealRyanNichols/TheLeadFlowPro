// Shared shapes for Post Creator: the account, the saved business profile, the
// AI allowance, and the JSON every /api/post-creator route sends and takes.
//
// Leaf module: types only, safe in client components.

import type { AngleId, CtaId, PlatformId, TradeId, VoiceId } from "./options";

export type PostCreatorPlan = "monthly" | "lifetime";
export type AccountStatus = "active" | "past_due" | "canceled";
export type EntitlementReason = "visitor" | "no_account" | "ok" | "past_due" | "canceled" | "unconfigured" | "signed_out";

/** What the owner tells the writer about the business. Saved to the account. */
export type BrandProfile = {
  businessName: string;
  town: string;
  trade: TradeId;
  /** The trade in the owner's words. Used when `trade` is "other". */
  tradeLabel: string;
  services: string[];
  difference: string;
  /** Things the owner can back up. The only claims a draft may make. */
  facts: string;
  voice: VoiceId;
  wordsToUse: string;
  wordsToAvoid: string;
  audience: string;
  cta: CtaId;
  /** The one contact detail a draft may carry, in the call to action only. */
  ctaDetail: string;
  samplePost: string;
};

export type Account = {
  email: string;
  plan: PostCreatorPlan;
  status: AccountStatus;
  currentPeriodEnd: string | null;
  cancelAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  /** The checkout that created the account. Write-once in the database. */
  firstSessionId: string;
  lastSessionId: string | null;
  /** When the creating checkout signed a browser in. Set once. */
  firstClaimedAt: string | null;
  /** In every identity cookie; replaced by a fresh value on any later checkout. Never repeats, only goes up. */
  accessEpoch: number;
  /** Which key opens this account (lib/postCreator/access.ts). Raised by hand to revoke a leaked key. */
  keyVersion: number;
  /** Unix seconds of the newest Stripe event applied. */
  stripeEventAt: number;
  stripeSyncedAt: string | null;
  /** When the monthly plan went past due. The grace window counts from here. */
  pastDueSince: string | null;
  /** When a refund or a dispute closed the plan. Only a dispute won or a new checkout clears it. */
  moneyBackAt: string | null;
  /** The monthly subscription the latest checkout took over from, which the webhook stops. */
  replacedSubscriptionId: string | null;
  /** A monthly plan replaced by the one payment plan: when its paid month ends. */
  monthlyUntil: string | null;
  profile: BrandProfile;
  createdAt: string;
};

/** What the browser is told about the plan. Never the Stripe ids. */
export type AccountView = {
  email: string;
  plan: PostCreatorPlan;
  status: AccountStatus;
  renewsOn: string | null;
  endsOn: string | null;
  graceEndsOn: string | null;
  canManageBilling: boolean;
};

export type Entitlement = { email: string | null; account: Account | null; entitled: boolean; reason: EntitlementReason };

/** Chicago day and month keys plus what has been used in each. */
export type UsageCounts = { day: string; month: string; usedDay: number; usedMonth: number; triesDay: number; triesMonth: number };

export type Allowance = {
  plan: PostCreatorPlan;
  perDay: number;
  perMonth: number;
  usedToday: number;
  usedThisMonth: number;
  leftToday: number;
  leftThisMonth: number;
  /** Tries count every write and every failed try, so failures can use them up before the writes. */
  triesLeftToday: number;
  triesLeftThisMonth: number;
  /** YYYY-MM-DD, the first day of the next Chicago month. */
  resetsMonthOn: string;
};

export type AiOffReason = "switched_off" | "no_api_key" | "no_spend_cap" | "unknown_model" | "bad_effort";
export type AiStatusView = { on: boolean; message: string };

export type DraftView = {
  platform: PlatformId;
  text: string;
  hashtags: string[];
  shotList: string[];
  chars: number;
  limit: number | null;
  blanks: string[];
};

export type WriteIdea = { title: string; angle: AngleId | null; hook: string; shot: string };
export type WriteRequestBody = { requestId: string; idea: WriteIdea; platforms: PlatformId[]; note?: string };
export type ParsedWriteRequest = { requestId: string; idea: WriteIdea; platforms: PlatformId[]; note: string };

export type ErrorCode =
  | "bad_request"
  | "too_large"
  | "forbidden"
  | "unauthorized"
  | "lapsed"
  | "unconfigured"
  | "not_found"
  | "key_mismatch"
  | "too_many_tries"
  | "send_failed"
  | "billing_unavailable"
  | "nothing_to_manage"
  | "profile_needed"
  | "ai_off"
  | "spend_cap"
  | "account_cost_limit"
  | "daily_limit"
  | "monthly_limit"
  | "attempt_limit"
  | "busy"
  | "already_delivered"
  | "duplicate"
  | "refused"
  | "unusable"
  | "provider_error"
  | "rate_limited"
  | "timeout"
  | "server_error";

export type ApiError = { ok: false; code: ErrorCode; error: string; field?: string; allowance?: Allowance };
/**
 * A delivered write. `missing` lists the requested platforms, in the order
 * asked, that did not come back clean (left out by the model or thrown out by
 * the filter), so the buyer can be told which ones to write again. The write
 * still counts: a write counts when at least one clean draft comes back.
 */
export type WriteSuccess = {
  ok: true;
  drafts: DraftView[];
  missing: PlatformId[];
  altHooks: string[];
  photoIdea: string;
  trimmed: number;
  allowance: Allowance | null;
};
export type WriteResponse = WriteSuccess | ApiError;

export type SessionView = {
  account: AccountView;
  entitled: boolean;
  reason: EntitlementReason;
  profile: BrandProfile;
  profileReady: boolean;
  allowance: Allowance | null;
  ai: AiStatusView;
  salesOpen: boolean;
};

export type ProfileSaved = { ok: true; profile: BrandProfile; ready: boolean };
export type RestoreOk = { ok: true; next: string } | { ok: true; sent: true };
export type BillingOk = { url: string };

export type GenerationStatus = "reserved" | "delivered" | "failed" | "expired";

export type ReserveInput = {
  email: string;
  requestId: string;
  platforms: number;
  perDay: number;
  perMonth: number;
  triesPerDay: number;
  triesPerMonth: number;
  accountMonthCapMicro: number;
  reserveMicro: number;
  capMicro: number;
  model: string;
};

export type ReserveLimitResult = { result: "daily_limit" | "monthly_limit" | "attempt_limit" | "account_cost_limit"; counts: UsageCounts };

export type ReserveResult =
  | { result: "reserved"; id: string; counts: UsageCounts }
  | { result: "duplicate"; status: GenerationStatus }
  | { result: "busy" }
  | { result: "no_account" }
  | ReserveLimitResult
  | { result: "spend_cap"; firstHit: boolean };

export type SettleOutcome = "delivered" | "refused" | "max_tokens" | "unusable" | "rate_limited" | "provider_error" | "timeout" | "connection" | "unknown";

export type SettleInput = {
  id: string;
  email: string;
  delivered: boolean;
  outcome: SettleOutcome;
  costMicro: number | null;
  servedModel: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cacheReadTokens: number | null;
  cacheWriteTokens: number | null;
  stopReason: string | null;
  fellBack: boolean;
};
