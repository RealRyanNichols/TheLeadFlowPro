// Post Creator AI writing: one write, metered from start to finish.
//
// 1. Price the request and reserve that much in the database, which checks
//    the account's day and month allowance, its tries, its monthly cost
//    ceiling, and the shared daily spend cap under one lock. Anything but a
//    reservation stops here: no model call, nothing to settle.
// 2. Call the model once. No retries: the buyer taps Try again.
// 3. Settle the reservation exactly once, whatever happened: a write that
//    delivered at least one clean draft counts, and the answer names any
//    requested platform that did not come back clean; anything else is
//    recorded as a failed try at its real cost (0 when the provider turned it
//    away or the connection never opened, the full reservation when a timeout
//    or a dropped connection leaves the bill unknown).
//
// Pure: the database, the model, and the log are passed in, so every path can
// be tested without a network. Logs name the outcome only, never the email,
// the profile, the request, or a draft.

import { allowanceView, chicagoParts, seasonForMonth } from "../plan";
import { aiLimitsFor } from "../product";
import type {
  Allowance,
  BrandProfile,
  ErrorCode,
  ParsedWriteRequest,
  PostCreatorPlan,
  ReserveInput,
  ReserveResult,
  SettleInput,
  SettleOutcome,
  UsageCounts,
  WriteResponse,
} from "../types";
import { AI_MAX_TOKENS, type AiOn } from "./config";
import { actualMicroUsd, reserveMicroUsd, tokenTotals } from "./cost";
import { allowedFactsFor } from "./filter";
import { WRITE_ERROR_STATUS, writeErrorMessage, type MessageContext } from "./messages";
import type { CallModel, ModelResult } from "./model";
import { classifyMessage, parseWriteOutput } from "./parse";
import { buildParams } from "./prompt";

export type WriterInput = {
  email: string;
  /** A keyed hash of the buyer (./userId.ts), sent as metadata.user_id. Never the email. */
  userHash: string;
  plan: PostCreatorPlan;
  profile: BrandProfile;
  request: ParsedWriteRequest;
  ai: AiOn;
  now: Date;
};

export type WriterDeps = {
  reserve(i: ReserveInput): Promise<ReserveResult>;
  settle(i: SettleInput): Promise<void>;
  usage(): Promise<UsageCounts>;
  callModel: CallModel;
  log(message: string): void;
};

type WriteReply = { status: number; body: WriteResponse };

function errorReply(code: ErrorCode, plan: PostCreatorPlan, allowance: Allowance | null, extra: Partial<MessageContext> = {}): WriteReply {
  return {
    status: WRITE_ERROR_STATUS[code],
    body: { ok: false, code, error: writeErrorMessage(code, { ...extra, allowance, plan }), ...(allowance ? { allowance } : {}) },
  };
}

/** The answer when the database said no. None of these reached the model. */
function notReserved(r: Exclude<ReserveResult, { result: "reserved" }>, input: WriterInput): WriteReply {
  const { plan, now } = input;
  switch (r.result) {
    case "duplicate":
      // The same requestId again: the buyer retried after losing the answer.
      if (r.status === "delivered") return errorReply("already_delivered", plan, null);
      if (r.status === "reserved") return errorReply("busy", plan, null);
      return errorReply("duplicate", plan, null);
    case "busy":
      return errorReply("busy", plan, null);
    case "no_account":
      return errorReply("not_found", plan, null);
    case "spend_cap":
      return errorReply("spend_cap", plan, null);
    default:
      // The tries this month decide whether an attempt_limit lifts at midnight or on the 1st.
      return errorReply(r.result, plan, allowanceView(plan, r.counts, now), { triesThisMonth: r.counts.triesMonth });
  }
}

/** What to record and what to answer for one model result. */
type Settled = { outcome: SettleOutcome; delivered: boolean; costMicro: number | null; reply: (a: Allowance | null) => WriteReply };

function fromResult(result: ModelResult, input: WriterInput, settle: SettleInput): Settled {
  const { plan, ai, request, profile } = input;
  if (result.kind === "error") {
    const { kind, billedUnknown } = result.error;
    // null charges the full reservation: the request may have run and been
    // billed. 0 when it cannot have been (turned away with a status, or a
    // connection that never opened).
    const cost = billedUnknown ? null : 0;
    if (kind === "rate_limited") return failed("rate_limited", cost, "rate_limited", plan);
    if (kind === "api" || kind === "config") return failed("provider_error", cost, "provider_error", plan);
    if (kind === "timeout") return failed("timeout", cost, "timeout", plan);
    return failed(kind === "connection" ? "connection" : "unknown", cost, "provider_error", plan);
  }

  const message = result.message;
  const usage = message.usage ?? {};
  const totals = tokenTotals(usage);
  const iterations = usage.iterations ?? [];
  settle.servedModel = typeof message.model === "string" ? message.model : null;
  settle.inputTokens = totals.input;
  settle.outputTokens = totals.output;
  settle.cacheReadTokens = totals.cacheRead;
  settle.cacheWriteTokens = totals.cacheWrite;
  settle.stopReason = message.stop_reason ?? null;
  settle.fellBack = iterations.some((entry) => entry.type === "fallback_message");
  const cost = actualMicroUsd(usage, ai.model, settle.servedModel);

  const outcome = classifyMessage(message);
  if (outcome.kind === "refused") return failed("refused", cost, "refused", plan);
  if (outcome.kind === "max_tokens") return failed("max_tokens", cost, "unusable", plan);
  if (outcome.kind !== "ok") return failed("unusable", cost, "unusable", plan);

  const parsed = parseWriteOutput(outcome.text, request, allowedFactsFor(profile, request));
  if (!parsed.ok) return failed("unusable", cost, "unusable", plan);
  return {
    outcome: "delivered",
    delivered: true,
    costMicro: cost,
    reply: (allowance) => ({
      status: 200,
      body: {
        ok: true,
        drafts: parsed.drafts,
        missing: parsed.missing,
        altHooks: parsed.altHooks,
        photoIdea: parsed.photoIdea,
        trimmed: parsed.trimmed,
        allowance,
      },
    }),
  };
}

function failed(outcome: SettleOutcome, costMicro: number | null, code: ErrorCode, plan: PostCreatorPlan): Settled {
  return { outcome, delivered: false, costMicro, reply: (allowance) => errorReply(code, plan, allowance) };
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

/** One AI write for a buyer whose request, profile, and access are already checked. */
export async function runWrite(input: WriterInput, deps: WriterDeps): Promise<WriteReply> {
  const { email, plan, request, ai, now } = input;
  const limits = aiLimitsFor(plan);
  const season = seasonForMonth(Number(chicagoParts(now).month.slice(5)));
  const { params, inputBytes } = buildParams(request, input.profile, ai, season, input.userHash);
  const reserveMicro = reserveMicroUsd(ai.model, inputBytes, AI_MAX_TOKENS);

  let reserved: ReserveResult;
  try {
    reserved = await deps.reserve({
      email,
      requestId: request.requestId,
      platforms: request.platforms.length,
      perDay: limits.perDay,
      perMonth: limits.perMonth,
      triesPerDay: limits.triesPerDay,
      triesPerMonth: limits.triesPerMonth,
      accountMonthCapMicro: limits.costCeilingMicroUsd,
      reserveMicro,
      capMicro: ai.capMicroUsd,
      model: ai.model.id,
    });
  } catch (error) {
    deps.log(`Post Creator reserve failed: ${describe(error)}`);
    return errorReply("server_error", plan, null);
  }
  if (reserved.result !== "reserved") {
    if (reserved.result === "spend_cap" && reserved.firstHit) deps.log("Post Creator daily AI spend cap reached");
    return notReserved(reserved, input);
  }

  // Filled in as the answer is read. Until then the write is an unknown
  // failure with an unknown cost, which charges the full reservation.
  const settle: SettleInput = {
    id: reserved.id,
    email,
    delivered: false,
    outcome: "unknown",
    costMicro: null,
    servedModel: null,
    inputTokens: null,
    outputTokens: null,
    cacheReadTokens: null,
    cacheWriteTokens: null,
    stopReason: null,
    fellBack: false,
  };
  let settled: Settled = failed("unknown", null, "provider_error", plan);
  try {
    settled = fromResult(await deps.callModel(params), input, settle);
  } catch {
    settled = failed("unknown", null, "provider_error", plan);
  } finally {
    settle.outcome = settled.outcome;
    settle.delivered = settled.delivered;
    settle.costMicro = settled.costMicro;
    try {
      await deps.settle(settle);
    } catch (error) {
      // The row stays reserved and expires in five minutes, charged in full.
      deps.log(`Post Creator settle failed: ${describe(error)}`);
    }
  }
  if (!settled.delivered) deps.log(`Post Creator write failed: ${settled.outcome}`);

  let allowance: Allowance | null = null;
  try {
    allowance = allowanceView(plan, await deps.usage(), now);
  } catch {
    allowance = null;
  }
  return settled.reply(allowance);
}
