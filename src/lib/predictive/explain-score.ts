export type PredictiveScoreLabel = "Very High" | "High" | "Medium" | "Low" | "Very Low" | "Unknown";
export type PredictiveConfidence = "high" | "medium" | "low" | "unknown";

export type PredictiveScoreComponent = {
  key: PredictiveScoreKey;
  label: string;
  value: number | null;
  scoreLabel: PredictiveScoreLabel;
  explanation: string;
  featuresUsed: string[];
  missingFeatures: string[];
  confidenceLevel: PredictiveConfidence;
  cautionNote?: string;
};

export type PredictiveScoreKey =
  | "buyer_intent_score"
  | "urgency_score"
  | "contactability_score"
  | "source_reliability_score"
  | "freshness_score"
  | "buyer_fit_score"
  | "revenue_potential_score"
  | "compliance_readiness_score"
  | "marketplace_value_score";

export const predictiveScoreLabels: Record<PredictiveScoreKey, string> = {
  buyer_intent_score: "Buyer intent score",
  urgency_score: "Urgency score",
  contactability_score: "Contactability score",
  source_reliability_score: "Source reliability score",
  freshness_score: "Freshness score",
  buyer_fit_score: "Buyer fit score",
  revenue_potential_score: "Revenue potential score",
  compliance_readiness_score: "Compliance readiness score",
  marketplace_value_score: "Marketplace value score",
};

export function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function scoreLabelFor(value: number | null | undefined): PredictiveScoreLabel {
  if (value === null || value === undefined || !Number.isFinite(value)) return "Unknown";
  if (value >= 90) return "Very High";
  if (value >= 75) return "High";
  if (value >= 50) return "Medium";
  if (value >= 25) return "Low";
  return "Very Low";
}

export function confidenceFromFeatureCount(featuresUsed: string[], missingFeatures: string[]): PredictiveConfidence {
  if (featuresUsed.length === 0) return "unknown";
  const total = featuresUsed.length + missingFeatures.length;
  const ratio = total ? featuresUsed.length / total : 0;
  if (ratio >= 0.72 && featuresUsed.length >= 4) return "high";
  if (ratio >= 0.45 && featuresUsed.length >= 2) return "medium";
  return "low";
}

export function scoreComponent(input: {
  key: PredictiveScoreKey;
  value: number | null;
  explanation: string;
  featuresUsed: string[];
  missingFeatures?: string[];
  cautionNote?: string;
}): PredictiveScoreComponent {
  const missingFeatures = input.missingFeatures || [];
  return {
    key: input.key,
    label: predictiveScoreLabels[input.key],
    value: input.value === null ? null : clampScore(input.value),
    scoreLabel: scoreLabelFor(input.value),
    explanation: input.explanation,
    featuresUsed: input.featuresUsed,
    missingFeatures,
    confidenceLevel: confidenceFromFeatureCount(input.featuresUsed, missingFeatures),
    cautionNote: input.cautionNote,
  };
}

export function scoreRange(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "unknown";
  if (value >= 90) return "90-100";
  if (value >= 75) return "75-89";
  if (value >= 50) return "50-74";
  if (value >= 25) return "25-49";
  return "0-24";
}
