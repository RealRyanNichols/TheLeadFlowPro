/**
 * CANONICAL COST ASSUMPTIONS — read before pricing anything.
 *
 * Every new feature that spends money on Ryan's behalf must:
 *   1) model its per-action cost here
 *   2) be capped on a plan in lib/pricing.ts
 *   3) meter usage in the DB
 *
 * All numbers in USD. Keep these conservative (overestimate the cost).
 * Refresh pricing when Anthropic updates model prices.
 */

// --- Anthropic model pricing (per 1M tokens) ---
export const MODEL_PRICES = {
  haiku: {
    inputPer1M:  1.00,
    outputPer1M: 5.00,
    label: "claude-haiku-4-5"
  },
  sonnet: {
    inputPer1M:  3.00,
    outputPer1M: 15.00,
    label: "claude-sonnet-4-6"
  },
  opus: {
    inputPer1M:  15.00,
    outputPer1M: 75.00,
    label: "claude-opus-4-7"
  }
} as const;

export type Model = keyof typeof MODEL_PRICES;

export function tokenCost(model: Model, inputTokens: number, outputTokens: number) {
  const p = MODEL_PRICES[model];
  return (inputTokens / 1_000_000) * p.inputPer1M +
         (outputTokens / 1_000_000) * p.outputPer1M;
}

// --- Action cost models (conservative estimates) ---
// Each AI-consuming feature declares its typical token shape + model here.
// UI should consult actionCost() before every metered call so Ryan never
// ships a "feature" whose unit economics are underwater.
export const ACTION_SHAPES = {
  // Chatbot turn — system prompt + history + user msg
  chatbot_turn:   { inTok: 2_000, outTok: 300,   defaultModel: "haiku"  as Model },
  // Weekly/daily insight digest across connected socials
  insight_report: { inTok: 8_000, outTok: 1_500, defaultModel: "haiku"  as Model },
  // Ad copy batch (hooks + headlines + body)
  ad_copy_gen:    { inTok: 4_000, outTok: 2_000, defaultModel: "sonnet" as Model },
  // Target audience deep analysis
  audience_scan:  { inTok: 12_000, outTok: 2_500, defaultModel: "sonnet" as Model },
  // Playbook next-step suggestion
  playbook_step:  { inTok: 3_000, outTok: 500,   defaultModel: "haiku"  as Model }
} as const;

export type ActionKind = keyof typeof ACTION_SHAPES;

export function actionCost(kind: ActionKind, model?: Model) {
  const s = ACTION_SHAPES[kind];
  return tokenCost(model ?? s.defaultModel, s.inTok, s.outTok);
}

// --- Non-AI unit costs ---
export const SMS_COST_USD       = 0.0079;   // Twilio outbound (US)
export const EMAIL_COST_USD     = 0.0004;   // Resend / SES
export const STRIPE_FIXED_USD   = 0.30;
export const STRIPE_PCT         = 0.029;
export const HOSTING_PER_USER   = 0.50;     // blended Vercel + Postgres per active user/mo

export function stripeFee(priceUsd: number) {
  if (priceUsd === 0) return 0;
  return priceUsd * STRIPE_PCT + STRIPE_FIXED_USD;
}

// --- Plan-level profit simulator ---
export interface UsageProfile {
  chatbot:  number;
  insight:  number;
  adCopy:   number;
  audience: number;
  playbook: number;
}

export function planMargin(priceUsd: number, usage: UsageProfile) {
  const ai =
    usage.chatbot  * actionCost("chatbot_turn") +
    usage.insight  * actionCost("insight_report") +
    usage.adCopy   * actionCost("ad_copy_gen") +
    usage.audience * actionCost("audience_scan") +
    usage.playbook * actionCost("playbook_step");
  const variable = ai + stripeFee(priceUsd) + HOSTING_PER_USER;
  return { revenue: priceUsd, cost: variable, profit: priceUsd - variable };
}

// --- Overage pricing user sees when they bust a cap ---
// Priced to keep gross margin > 60% even on Sonnet usage.
export const OVERAGE = {
  aiActionCentsEach: 3,     // $0.03 / action over cap
  smsCentsEach:      2,     // $0.02 / SMS (marks up Twilio ~2.5x for risk+support)
  leadCentsEach:     1      // $0.01 / lead ingested over cap
};
