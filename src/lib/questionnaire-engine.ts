import type { LeadSignalScoreCard } from "@/lib/leadflow-scoring";

export type QuestionnaireQuestionType =
  | "single_select"
  | "multi_select"
  | "short_text"
  | "long_text"
  | "number_range"
  | "budget_range"
  | "location"
  | "industry"
  | "url"
  | "file_upload"
  | "consent_checkbox"
  | "seller_selection_checkbox"
  | "rating_scale"
  | "priority_ranking";

export type QuestionnaireOption = {
  id: string;
  label: string;
  value?: string | number | boolean;
  tags?: string[];
  score?: number;
};

export type QuestionnaireCondition = {
  questionId: string;
  operator: "equals" | "not_equals" | "includes" | "not_includes" | "exists" | "gt" | "gte" | "lt" | "lte";
  value?: string | number | boolean;
};

export type QuestionnaireQuestion = {
  id: string;
  type: QuestionnaireQuestionType;
  label: string;
  helperText?: string;
  required?: boolean;
  options?: QuestionnaireOption[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  tags?: string[];
  scoreWeight?: number;
  showIf?: QuestionnaireCondition[];
};

export type QuestionnaireStep = {
  id: string;
  title: string;
  description?: string;
  questions: QuestionnaireQuestion[];
};

export type QuestionnaireDefinition = {
  toolSlug: string;
  toolType: string;
  vertical: string;
  title: string;
  description: string;
  valuePreview: string;
  steps: QuestionnaireStep[];
  defaultTags?: string[];
  recommendedActions?: Array<{
    minScore: number;
    action: string;
  }>;
};

export type QuestionnaireAnswerValue =
  | string
  | number
  | boolean
  | string[]
  | Array<{ id: string; label: string }>
  | { label?: string; value?: string | number | boolean; [key: string]: unknown }
  | null;

export type QuestionnaireAnswerMap = Record<string, QuestionnaireAnswerValue>;

export type QuestionnaireIdentity = {
  name?: string;
  email?: string;
  company?: string;
};

export type QuestionnaireConsent = {
  status: "not_requested" | "anonymous_only" | "single_seller" | "named_sellers" | "aggregate_only" | "declined";
  routeData: boolean;
  selectedSellers?: string[];
  noticeVersion: string;
};

export type QuestionnaireAttribution = {
  sourceUrl: string;
  sourcePath: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
};

export type QuestionnaireScore = {
  score: number;
  confidence: "low" | "medium" | "high";
  tags: string[];
  suppressionStatus: "clear" | "needs_review" | "suppressed";
  recommendedNextAction: string;
};

export type QuestionnaireExportProfile = {
  response_id: string;
  anonymous_user_id: string;
  identity_id: string | null;
  tool_slug: string;
  vertical: string;
  tags: string[];
  score: number;
  confidence: QuestionnaireScore["confidence"];
  source_url: string;
  consent_status: QuestionnaireConsent["status"];
  suppression_status: QuestionnaireScore["suppressionStatus"];
  recommended_next_action: string;
  lead_scores?: LeadSignalScoreCard;
};

const sensitivePattern =
  /\b(ssn|social security|driver'?s license|bank account|routing number|credit card|medical record|diagnosis|minor child|under 18|race|ethnicity|religion|sexual orientation|political persuasion)\b/i;

function isSelectedOption(value: QuestionnaireAnswerValue, optionId: string) {
  if (Array.isArray(value)) {
    return value.some((item) => (typeof item === "string" ? item === optionId : item.id === optionId));
  }
  return value === optionId;
}

export function getVisibleQuestions(step: QuestionnaireStep, answers: QuestionnaireAnswerMap) {
  return step.questions.filter((question) => shouldShowQuestion(question, answers));
}

export function shouldShowQuestion(question: QuestionnaireQuestion, answers: QuestionnaireAnswerMap) {
  if (!question.showIf?.length) return true;

  return question.showIf.every((condition) => {
    const value = answers[condition.questionId];
    if (condition.operator === "exists") return value !== undefined && value !== null && value !== "";
    if (condition.operator === "equals") return value === condition.value;
    if (condition.operator === "not_equals") return value !== condition.value;
    if (condition.operator === "includes") return isSelectedOption(value, String(condition.value));
    if (condition.operator === "not_includes") return !isSelectedOption(value, String(condition.value));
    if (typeof value !== "number" || typeof condition.value !== "number") return false;
    if (condition.operator === "gt") return value > condition.value;
    if (condition.operator === "gte") return value >= condition.value;
    if (condition.operator === "lt") return value < condition.value;
    if (condition.operator === "lte") return value <= condition.value;
    return false;
  });
}

export function validateStep(step: QuestionnaireStep, answers: QuestionnaireAnswerMap) {
  const missing = getVisibleQuestions(step, answers).filter((question) => {
    if (!question.required) return false;
    const value = answers[question.id];
    return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
  });

  return {
    ok: missing.length === 0,
    missingQuestionIds: missing.map((question) => question.id),
  };
}

export function scoreQuestionnaire(definition: QuestionnaireDefinition, answers: QuestionnaireAnswerMap): QuestionnaireScore {
  const tags = new Set(definition.defaultTags ?? []);
  let score = 16;
  let answered = 0;
  let taggedAnswers = 0;
  let needsReview = false;

  for (const step of definition.steps) {
    for (const question of step.questions) {
      const value = answers[question.id];
      if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) continue;
      answered += 1;
      question.tags?.forEach((tag) => tags.add(tag));
      score += question.scoreWeight ?? 3;

      for (const option of question.options ?? []) {
        const selected = isSelectedOption(value, option.id);
        if (!selected) continue;
        option.tags?.forEach((tag) => tags.add(tag));
        score += option.score ?? 0;
        taggedAnswers += option.tags?.length ?? 0;
      }

      if (typeof value === "string" && sensitivePattern.test(value)) {
        needsReview = true;
      }
    }
  }

  const confidence: QuestionnaireScore["confidence"] =
    answered >= 8 || taggedAnswers >= 6 ? "high" : answered >= 4 || taggedAnswers >= 3 ? "medium" : "low";

  const suppressionStatus: QuestionnaireScore["suppressionStatus"] = needsReview ? "needs_review" : "clear";
  const recommendedNextAction =
    [...(definition.recommendedActions ?? [])]
      .sort((a, b) => b.minScore - a.minScore)
      .find((action) => score >= action.minScore)?.action ??
    (needsReview ? "manual_review_before_routing" : "show_relevant_next_step");

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    confidence,
    tags: Array.from(tags),
    suppressionStatus,
    recommendedNextAction,
  };
}

export function answerTagsForQuestion(question: QuestionnaireQuestion, value: QuestionnaireAnswerValue) {
  const tags = new Set(question.tags ?? []);
  for (const option of question.options ?? []) {
    const selected = isSelectedOption(value, option.id);
    if (selected) option.tags?.forEach((tag) => tags.add(tag));
  }
  return Array.from(tags);
}

export function answerScoreForQuestion(question: QuestionnaireQuestion, value: QuestionnaireAnswerValue) {
  let score = value === undefined || value === null || value === "" ? 0 : question.scoreWeight ?? 0;
  for (const option of question.options ?? []) {
    const selected = isSelectedOption(value, option.id);
    if (selected) score += option.score ?? 0;
  }
  return score;
}

export function createExportProfile({
  responseId,
  anonymousUserId,
  identityId,
  definition,
  attribution,
  consent,
  score,
  leadScores,
}: {
  responseId: string;
  anonymousUserId: string;
  identityId?: string | null;
  definition: QuestionnaireDefinition;
  attribution: QuestionnaireAttribution;
  consent: QuestionnaireConsent;
  score: QuestionnaireScore;
  leadScores?: LeadSignalScoreCard;
}): QuestionnaireExportProfile {
  const profile: QuestionnaireExportProfile = {
    response_id: responseId,
    anonymous_user_id: anonymousUserId,
    identity_id: identityId ?? null,
    tool_slug: definition.toolSlug,
    vertical: definition.vertical,
    tags: score.tags,
    score: score.score,
    confidence: score.confidence,
    source_url: attribution.sourceUrl,
    consent_status: consent.status,
    suppression_status: score.suppressionStatus,
    recommended_next_action: score.recommendedNextAction,
  };
  if (leadScores) profile.lead_scores = leadScores;
  return profile;
}

export function normalizeAnswerText(value: QuestionnaireAnswerValue) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : item.label || item.id))
      .filter(Boolean)
      .join(", ")
      .slice(0, 1200);
  }
  if (typeof value === "object") return JSON.stringify(value).slice(0, 1200);
  return String(value).slice(0, 1200);
}
