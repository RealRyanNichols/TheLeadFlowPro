// Post Creator AI writing: what one write can cost, before and after.
//
// Before the call, the write reserves a strict upper bound against the shared
// daily spend cap and the account's monthly cost ceiling. Input is counted in
// UTF-8 bytes (a token is never shorter than a byte) plus a fixed overhead,
// priced as a cache write (the dearest way to read input), and the output at
// the full max_tokens. A model that sends refusal fallbacks reserves a second
// hop, priced at no less than the fallback models' rates.
//
// After the call, the real cost comes from usage.iterations: one entry per
// attempt, each priced at the model that ran it. Top-level usage covers only
// the attempt that produced the message, so it undercounts a fallback.
//
// Where inference runs changes the bill. The request sends no inference_geo,
// so the workspace default decides, and US-only inference bills every token
// rate at 1.1x on Claude 4.6 and later models. The reservation cannot know the
// workspace default ahead of time, so it always includes that 1.1x on those
// models; the actual cost applies it when usage.inference_geo says the write
// ran anywhere but "global".
//
// Prices are dollars per million tokens, which is the same number as
// micro-dollars per token, so every amount here is in micro-dollars. The math
// is done in whole numbers and rounded up once, so the bound is exact.

import { MODEL_PROFILES, type ModelProfile } from "./config";

/** Tokens a request carries beyond the text itself: roles, the schema wrapper, formatting. */
export const INPUT_OVERHEAD_TOKENS = 800;

/** Rates per token in micro-dollars, and whether US-only inference bills them at 1.1x. */
export type Price = { in: number; out: number; usOnlyPremium: boolean };

/** US-only inference on a model with usOnlyPremium bills every token rate at 11/10. */
const PREMIUM_NUM = 11;
const PREMIUM_DEN = 10;

/** Anything not listed prices at this, so an unknown model is never cheap. */
const UNKNOWN_PRICE: Price = { in: 10, out: 50, usOnlyPremium: true };

/** A fallback hop is never priced below these rates. */
const FALLBACK_FLOOR: Price = { in: 5, out: 25, usOnlyPremium: true };

const PRICES: Record<string, Price> = {
  ...Object.fromEntries(Object.values(MODEL_PROFILES).map((m) => [m.id, { in: m.inPerMTok, out: m.outPerMTok, usOnlyPremium: m.usOnlyPremium }])),
  // A refusal fallback target.
  "claude-opus-4-8": { in: 5, out: 25, usOnlyPremium: true },
};

export function utf8Bytes(s: string): number {
  return new TextEncoder().encode(s).length;
}

/** The price of a model id. A dated snapshot ("-20260101") prices as its model; anything else unknown at 10 / 50. */
export function priceFor(modelId: string | null | undefined): Price {
  if (!modelId) return UNKNOWN_PRICE;
  return PRICES[modelId] ?? PRICES[modelId.replace(/-\d{8}$/, "")] ?? UNKNOWN_PRICE;
}

/**
 * One attempt at its worst: every input token as a cache write (1.25 x input),
 * every output token used, and US-only inference (1.1x) on a model it applies to.
 */
function hop(p: Price, inputBytes: number, maxTokens: number): number {
  // (bytes + overhead) x in x 5/4 + maxTokens x out, in quarters of a micro-dollar.
  const quarters = (inputBytes + INPUT_OVERHEAD_TOKENS) * p.in * 5 + maxTokens * p.out * 4;
  return p.usOnlyPremium ? Math.ceil((quarters * PREMIUM_NUM) / (4 * PREMIUM_DEN)) : Math.ceil(quarters / 4);
}

/** The most one write can cost, in micro-dollars. What the database reserves before the call. */
export function reserveMicroUsd(model: ModelProfile, inputBytes: number, maxTokens: number): number {
  const p: Price = { in: model.inPerMTok, out: model.outPerMTok, usOnlyPremium: model.usOnlyPremium };
  const first = hop(p, inputBytes, maxTokens);
  if (!model.sendFallbacks) return first;
  const fallback: Price = {
    in: Math.max(p.in, FALLBACK_FLOOR.in),
    out: Math.max(p.out, FALLBACK_FLOOR.out),
    usOnlyPremium: p.usOnlyPremium || FALLBACK_FLOOR.usOnlyPremium,
  };
  return first + hop(fallback, inputBytes, maxTokens);
}

/** One entry of usage.iterations, as far as the cost needs it. */
export type IterationLike = {
  type: string;
  model?: string | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};

/** The usage block of a message, as far as the cost needs it. The SDK's BetaUsage fits it. */
export type UsageLike = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  /** Where the write ran: "global", "us", or null when the API does not say. */
  inference_geo?: string | null;
  iterations?: readonly IterationLike[] | null;
};

/**
 * Whether the write ran somewhere billed at the US-only rate. Any region named
 * other than "global" counts, so a region this code does not know is never
 * priced low. Only a model with usOnlyPremium is affected.
 */
export function ranUsOnly(geo: string | null | undefined): boolean {
  return typeof geo === "string" && geo !== "" && geo !== "global";
}

function n(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

/** One attempt's cost in twentieths of a micro-dollar: input, cache writes at 1.25x, cache reads at 0.1x, output. */
function twentieths(u: Omit<IterationLike, "type">, p: Price): number {
  return (
    n(u.input_tokens) * p.in * 20 +
    n(u.cache_creation_input_tokens) * p.in * 25 +
    n(u.cache_read_input_tokens) * p.in * 2 +
    n(u.output_tokens) * p.out * 20
  );
}

/**
 * What a write actually cost, in micro-dollars, rounded up. Each attempt in
 * usage.iterations is priced at its own model; an entry that names none is
 * the requested model, or the served model for the fallback that answered.
 * Without iterations, the top-level usage is priced at the served model.
 * When usage.inference_geo says the write ran US-only, each attempt on a
 * model with that premium is priced at 1.1x. An attempt declined before any
 * output is not billed but is still counted here, which errs high.
 */
export function actualMicroUsd(usage: UsageLike, requested: ModelProfile, servedModel: string | null): number {
  const iterations = usage.iterations ?? [];
  const usOnly = ranUsOnly(usage.inference_geo);
  // Summed in two-hundredths of a micro-dollar: twentieths times 10, or times 11 at the US-only rate.
  const priced = (u: Omit<IterationLike, "type">, p: Price) => twentieths(u, p) * (usOnly && p.usOnlyPremium ? PREMIUM_NUM : PREMIUM_DEN);
  let total = 0;
  if (iterations.length > 0) {
    for (const entry of iterations) {
      const model = entry.model ?? (entry.type === "fallback_message" ? servedModel : requested.id);
      total += priced(entry, priceFor(model));
    }
  } else {
    total = priced(usage, priceFor(servedModel ?? requested.id));
  }
  return Math.ceil(total / (20 * PREMIUM_DEN));
}

export type TokenTotals = { input: number; output: number; cacheRead: number; cacheWrite: number };

/** Tokens across every attempt (or the top-level usage when there are no iterations), for the ledger. */
export function tokenTotals(usage: UsageLike): TokenTotals {
  const iterations = usage.iterations ?? [];
  const rows: readonly Omit<IterationLike, "type">[] = iterations.length > 0 ? iterations : [usage];
  const totals: TokenTotals = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  for (const u of rows) {
    totals.input += n(u.input_tokens);
    totals.output += n(u.output_tokens);
    totals.cacheRead += n(u.cache_read_input_tokens);
    totals.cacheWrite += n(u.cache_creation_input_tokens);
  }
  return totals;
}
