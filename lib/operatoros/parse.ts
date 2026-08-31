import {
  OPERATOR_RISK_LEVELS,
  type OperatorDecision,
  type OperatorEvidence,
  type OperatorOutcome,
  type OperatorRecommendedAction,
  type OperatorRiskLevel,
} from "./types.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => stringValue(item)).filter(Boolean).slice(0, 20);
}

function riskValue(value: unknown): OperatorRiskLevel {
  return OPERATOR_RISK_LEVELS.includes(value as OperatorRiskLevel)
    ? (value as OperatorRiskLevel)
    : "yellow";
}

function outcomeValue(value: unknown): OperatorOutcome {
  return value === "complete" || value === "needs_approval" || value === "blocked"
    ? value
    : "needs_approval";
}

export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidate = fenced || trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const first = candidate.indexOf("{");
    const last = candidate.lastIndexOf("}");
    if (first < 0 || last <= first) throw new Error("Provider response did not contain a JSON object");
    return JSON.parse(candidate.slice(first, last + 1));
  }
}

export function normalizeOperatorDecision(value: unknown): OperatorDecision {
  if (!isRecord(value)) throw new Error("Provider response was not an object");

  const actions: OperatorRecommendedAction[] = Array.isArray(value.recommended_actions)
    ? value.recommended_actions
        .filter(isRecord)
        .map((action) => ({
          title: stringValue(action.title, "Recommended action"),
          description: stringValue(action.description, "Review this action before proceeding."),
          action_type: stringValue(action.action_type, "review_required")
            .toLowerCase()
            .replace(/[^a-z0-9_]+/g, "_")
            .replace(/^_+|_+$/g, "") || "review_required",
          risk_level: riskValue(action.risk_level),
          payload: isRecord(action.payload) ? action.payload : {},
        }))
        .slice(0, 12)
    : [];

  const evidence: OperatorEvidence[] = Array.isArray(value.evidence)
    ? value.evidence
        .filter(isRecord)
        .map((item) => ({
          label: stringValue(item.label, "Evidence"),
          value:
            typeof item.value === "number" || typeof item.value === "string"
              ? item.value
              : JSON.stringify(item.value ?? ""),
          source: stringValue(item.source) || undefined,
        }))
        .slice(0, 20)
    : [];

  const rawConfidence = typeof value.confidence === "number" ? value.confidence : 0.5;
  const confidence = Math.min(1, Math.max(0, rawConfidence > 1 ? rawConfidence / 100 : rawConfidence));

  return {
    summary: stringValue(value.summary, "The worker returned no summary."),
    outcome: outcomeValue(value.outcome),
    confidence,
    findings: stringArray(value.findings),
    recommended_actions: actions,
    evidence,
  };
}

export function parseOperatorDecision(text: string): OperatorDecision {
  return normalizeOperatorDecision(extractJsonObject(text));
}
