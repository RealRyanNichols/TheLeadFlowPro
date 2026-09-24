// Post Creator AI writing: the switches, the model, and the daily spend cap.
//
// AI writing spends API credits, so it runs only when every switch agrees:
// POST_CREATOR_AI_ENABLED is exactly "true", a dedicated Anthropic key is set
// (never the shared ANTHROPIC_API_KEY), the model and effort are ones this
// code knows, and a daily spend cap is set. Anything else is off, with the
// first reason found. Checkout opens only when AI writing is on as well, so
// nothing is ever sold that cannot be delivered.
//
// Pure: every function takes the environment it reads, so the tests can run
// the whole matrix without touching process.env.

import { AI_OFF_LINE } from "../product";
import type { AiOffReason, AiStatusView } from "../types";

export type Env = Record<string, string | undefined>;

export type ModelId = "claude-opus-5" | "claude-sonnet-5" | "claude-haiku-4-5";

/**
 * What the writer needs to know about a model: its price in dollars per
 * million tokens (the same number as micro-dollars per token), whether it
 * takes an effort setting, whether refusal fallbacks are sent, and the
 * shortest prompt it caches.
 */
export type ModelProfile = {
  id: ModelId;
  inPerMTok: number;
  outPerMTok: number;
  supportsEffort: boolean;
  sendFallbacks: boolean;
  cacheMinTokens: number;
};

export const MODEL_PROFILES: Record<ModelId, ModelProfile> = {
  "claude-opus-5": { id: "claude-opus-5", inPerMTok: 5, outPerMTok: 25, supportsEffort: true, sendFallbacks: true, cacheMinTokens: 512 },
  "claude-sonnet-5": { id: "claude-sonnet-5", inPerMTok: 2, outPerMTok: 10, supportsEffort: true, sendFallbacks: false, cacheMinTokens: 1024 },
  // The system prompt is shorter than Haiku's cache minimum, so it never caches.
  "claude-haiku-4-5": { id: "claude-haiku-4-5", inPerMTok: 1, outPerMTok: 5, supportsEffort: false, sendFallbacks: false, cacheMinTokens: 4096 },
};

export const DEFAULT_MODEL: ModelId = "claude-opus-5";

/** The beta that lets a refused request be finished by a fallback model in the same call. */
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

/** The output ceiling for one write, thinking included. The reservation is priced at this. */
export const AI_MAX_TOKENS = 4000;

/** How long one model call may take. The write route's maxDuration (120 s) leaves room around it. */
export const AI_TIMEOUT_MS = 100_000;

export type AiOn = { on: true; model: ModelProfile; effort: "low" | "medium" | null; capMicroUsd: number };
export type AiStatus = AiOn | { on: false; reason: AiOffReason };

function isModelId(x: string): x is ModelId {
  return Object.prototype.hasOwnProperty.call(MODEL_PROFILES, x);
}

/** A cap in dollars: up to three digits and two decimals, above 0 and at most 500. */
const CAP = /^\d{1,3}(\.\d{1,2})?$/;
const MAX_CAP_USD = 500;

/**
 * Whether AI writing may run, checked in this order: the switch, the key, the
 * model, the effort, then the daily spend cap. The first one that fails is
 * the reason it is off.
 */
export function aiWritingStatus(env: Env): AiStatus {
  if (env.POST_CREATOR_AI_ENABLED !== "true") return { on: false, reason: "switched_off" };
  if (!env.POST_CREATOR_ANTHROPIC_API_KEY?.trim()) return { on: false, reason: "no_api_key" };

  const modelId = env.POST_CREATOR_MODEL || DEFAULT_MODEL;
  if (!isModelId(modelId)) return { on: false, reason: "unknown_model" };
  const model = MODEL_PROFILES[modelId];

  const rawEffort = env.POST_CREATOR_EFFORT;
  let effort: "low" | "medium";
  if (rawEffort === undefined || rawEffort === "" || rawEffort === "low") effort = "low";
  else if (rawEffort === "medium") effort = "medium";
  else return { on: false, reason: "bad_effort" };

  const rawCap = env.POST_CREATOR_DAILY_SPEND_CAP_USD ?? "";
  if (!CAP.test(rawCap)) return { on: false, reason: "no_spend_cap" };
  const capUsd = Number(rawCap);
  if (!(capUsd > 0) || capUsd > MAX_CAP_USD) return { on: false, reason: "no_spend_cap" };

  return { on: true, model, effort: model.supportsEffort ? effort : null, capMicroUsd: Math.round(capUsd * 1e6) };
}

/** What the buyer app is told. Never the reason: that is for the operator, not the buyer. */
export function aiStatusView(s: AiStatus): AiStatusView {
  return s.on ? { on: true, message: "AI writing is on." } : { on: false, message: AI_OFF_LINE };
}

/**
 * Whether checkout may sell Post Creator: the sales switch is exactly "true",
 * AI writing is on, and Stripe, the service database, and Resend (the key
 * email) are all configured.
 */
export function postCreatorSalesOpen(env: Env): boolean {
  if (env.POST_CREATOR_SALES_OPEN !== "true") return false;
  if (!aiWritingStatus(env).on) return false;
  return ["STRIPE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY", "RESEND_API_KEY"].every((name) => Boolean(env[name]?.trim()));
}
