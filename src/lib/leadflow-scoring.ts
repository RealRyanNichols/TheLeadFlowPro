import type {
  QuestionnaireAnswerMap,
  QuestionnaireAnswerValue,
  QuestionnaireAttribution,
  QuestionnaireConsent,
  QuestionnaireDefinition,
} from "@/lib/questionnaire-engine";

export type LeadSignalScoreCategory =
  | "intent"
  | "urgency"
  | "source_proof"
  | "freshness"
  | "buyer_fit"
  | "contactability"
  | "compliance_readiness"
  | "revenue_potential";

export type LeadSignalScoreLabel = "High" | "Medium" | "Low" | "Not scored";
export type LeadSignalConfidence = "high" | "medium" | "low";

export type LeadSignalScore = {
  category: LeadSignalScoreCategory;
  title: string;
  scoreValue: number;
  scoreLabel: LeadSignalScoreLabel;
  explanation: string;
  fieldsUsed: string[];
  fieldsMissing: string[];
  confidenceLevel: LeadSignalConfidence;
  nextRecommendedAction: string;
};

export type LeadSignalScoreCard = {
  modelVersion: "leadflow_signal_score_v1";
  scoreable: boolean;
  overallScore: number;
  overallLabel: LeadSignalScoreLabel;
  overallConfidence: LeadSignalConfidence;
  buyerExplanation: string;
  nextRecommendedAction: string;
  scores: Record<LeadSignalScoreCategory, LeadSignalScore>;
  excludedFields: string[];
  safetyFlags: string[];
  scoringRules: {
    allowedInputs: string[];
    disallowedInputs: string[];
  };
  scoredAt: string;
};

export type LeadSignalScoringInput = {
  definition?: QuestionnaireDefinition;
  answers: QuestionnaireAnswerMap;
  consent?: QuestionnaireConsent;
  attribution?: Partial<QuestionnaireAttribution>;
  identity?: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
  };
  metadata?: Record<string, unknown>;
  responseStatus?: "partial" | "completed" | string;
};

export const leadSignalScoreCategoryDefinitions: Array<{
  category: LeadSignalScoreCategory;
  title: string;
  buyerMeaning: string;
}> = [
  {
    category: "intent",
    title: "Intent score",
    buyerMeaning: "How clearly the person or business described a real thing they want, need, compare, buy, fix, or solve.",
  },
  {
    category: "urgency",
    title: "Urgency score",
    buyerMeaning: "How soon the problem appears to matter based on timeline, pain language, and requested next step.",
  },
  {
    category: "source_proof",
    title: "Source proof score",
    buyerMeaning: "How much verifiable context is attached to the signal, such as source page, URL, upload metadata, or public proof.",
  },
  {
    category: "freshness",
    title: "Freshness score",
    buyerMeaning: "How recent the signal is and whether the collection timestamp is still useful for outreach or analysis.",
  },
  {
    category: "buyer_fit",
    title: "Buyer fit score",
    buyerMeaning: "How cleanly the signal matches a buyer use case, vertical, category, location, and offer path.",
  },
  {
    category: "contactability",
    title: "Contactability score",
    buyerMeaning: "Whether there is an allowed, practical follow-up path after consent and suppression checks.",
  },
  {
    category: "compliance_readiness",
    title: "Compliance readiness score",
    buyerMeaning: "Whether the signal has adult confirmation, consent status, suppression status, and no prohibited-data flags.",
  },
  {
    category: "revenue_potential",
    title: "Revenue potential score",
    buyerMeaning: "Whether the signal points to a commercial opportunity with budget, volume, business pain, or purchase value.",
  },
];

const prohibitedDetectors: Array<{ flag: string; pattern: RegExp; excludedField: string }> = [
  {
    flag: "minor_or_under_18_signal",
    pattern: /\b(minor|under\s*18|underage|child|children|kid|teen|student under|juvenile)\b/i,
    excludedField: "minor-related data",
  },
  {
    flag: "protected_race_or_ethnicity_signal",
    pattern: /\b(race|ethnicity|ethnic origin|national origin|racial)\b/i,
    excludedField: "race or ethnicity",
  },
  {
    flag: "protected_religion_signal",
    pattern: /\b(religion|religious|church|mosque|synagogue|temple|faith|denomination)\b/i,
    excludedField: "religion or faith data",
  },
  {
    flag: "protected_sexual_orientation_signal",
    pattern: /\b(sexual orientation|gay|lesbian|bisexual|lgbtq|transgender)\b/i,
    excludedField: "sexual orientation or gender identity data",
  },
  {
    flag: "health_or_medical_signal",
    pattern: /\b(health condition|health data|health record|medical|diagnosis|medication|therapy|illness|disability|doctor|patient)\b/i,
    excludedField: "health or medical data",
  },
  {
    flag: "private_political_identity_signal",
    pattern: /\b(voter file|party registration|political persuasion|political identity|individual persuasion)\b/i,
    excludedField: "private political identity or persuasion data",
  },
  {
    flag: "private_financial_account_signal",
    pattern: /\b(ssn|social security|driver'?s license|bank account|routing number|credit card|debit card|account login|password)\b/i,
    excludedField: "private financial account or credential data",
  },
  {
    flag: "hacked_or_leaked_data_signal",
    pattern: /\b(hacked|leaked|breach dump|stolen data|scraped password|private dump)\b/i,
    excludedField: "hacked, leaked, or stolen data",
  },
];

const allowedInputs = [
  "disclosed questionnaire responses",
  "onsite behavioral events",
  "source page and UTM context",
  "consent status and notice version",
  "suppression status",
  "source proof metadata",
  "partner eligibility rules",
  "historical conversion outcomes when available",
];

const disallowedInputs = [
  "minors",
  "race or ethnicity",
  "religion",
  "health or medical data",
  "sexual orientation",
  "private political identity or persuasion",
  "private financial account data",
  "SSNs or driver license numbers",
  "hacked, leaked, or hidden sensitive data",
];

const actionTerms = /\b(buy|hire|quote|call|book|schedule|fix|need|ready|compare|choose|replace|upgrade|refi|mortgage|request|access|sample|build|lead|customer|traffic|follow up|follow-up)\b/i;
const painTerms = /\b(urgent|stuck|losing|leak|broken|slow|missed|overdue|pain|problem|waste|blocked|need now|not working|expensive|confusing|embarrassing)\b/i;
const deadlineTerms = /\b(today|tonight|tomorrow|this week|this month|asap|now|deadline|by friday|within \d+\s*(day|week|month)s?)\b/i;
const proofTerms = /\b(source|proof|link|url|screenshot|upload|public|directory|review|listing|pricing page|post|traffic clue|sample rows)\b/i;
const volumeTerms = /\b(\d+\s*(leads|records|rows|stores|vendors|customers|calls|forms|dms|visits)|volume|pipeline|traffic|audience|list|pack|route)\b/i;

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreLabel(value: number, scoreable: boolean): LeadSignalScoreLabel {
  if (!scoreable) return "Not scored";
  if (value >= 80) return "High";
  if (value >= 55) return "Medium";
  return "Low";
}

function confidenceLevel(fieldsUsed: string[], fieldsMissing: string[]): LeadSignalConfidence {
  if (fieldsUsed.length >= 4 && fieldsMissing.length <= 2) return "high";
  if (fieldsUsed.length >= 2) return "medium";
  return "low";
}

function normalizeAnswer(value: QuestionnaireAnswerValue): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : item.label || item.id))
      .filter(Boolean)
      .join(" ");
  }
  if (typeof value === "object") {
    return Object.values(value)
      .map((item) => (item === null || item === undefined ? "" : String(item)))
      .join(" ");
  }
  return String(value);
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function hasValue(value: unknown) {
  return value !== undefined && value !== null && value !== "" && (!Array.isArray(value) || value.length > 0);
}

function numericBudgetSignal(text: string) {
  let score = 0;
  if (/\$?\s*(100|250|500|1,?000|2500|2,?500|5,?000|10,?000|25,?000|50,?000|100,?000)/i.test(text)) score += 22;
  if (/\b(budget|spend|revenue|salary|retirement|price|cost|monthly|annual|per year|range)\b/i.test(text)) score += 14;
  if (/\b(under_100|100_500|500_2500|2500_plus|enterprise|high value|premium)\b/i.test(text)) score += 18;
  return Math.min(40, score);
}

function buildContext(input: LeadSignalScoringInput) {
  const questions = new Map(
    input.definition?.steps.flatMap((step) => step.questions.map((question) => [question.id, question])) ?? [],
  );

  const answered = Object.entries(input.answers).filter(([, value]) => hasValue(value));
  const answerTextByField = Object.fromEntries(answered.map(([key, value]) => [key, normalizeAnswer(value)]));
  const allText = [
    input.definition?.toolSlug,
    input.definition?.toolType,
    input.definition?.vertical,
    input.definition?.title,
    input.definition?.valuePreview,
    input.attribution?.sourceUrl,
    input.attribution?.sourcePath,
    ...Object.keys(answerTextByField),
    ...Object.values(answerTextByField),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const tags = new Set(input.definition?.defaultTags ?? []);
  for (const [questionId, value] of answered) {
    const question = questions.get(questionId);
    question?.tags?.forEach((tag) => tags.add(tag));
    for (const option of question?.options ?? []) {
      const selected = Array.isArray(value)
        ? value.some((item) => (typeof item === "string" ? item === option.id : item.id === option.id))
        : value === option.id;
      if (selected) option.tags?.forEach((tag) => tags.add(tag));
    }
  }

  const tagText = Array.from(tags).join(" ").toLowerCase();
  const flags = prohibitedDetectors.filter((detector) => detector.pattern.test(allText));
  const hasMinorFlag = flags.some((flag) => flag.flag === "minor_or_under_18_signal");
  const hasProhibitedFlag = flags.length > 0;

  return {
    answered,
    answerTextByField,
    allText,
    tags: Array.from(tags),
    tagText,
    safetyFlags: flags.map((flag) => flag.flag),
    excludedFields: unique(flags.map((flag) => flag.excludedField)),
    hasMinorFlag,
    hasProhibitedFlag,
  };
}

function hasAnyField(context: ReturnType<typeof buildContext>, patterns: RegExp[]) {
  return context.answered.some(([key, value]) => {
    const text = `${key} ${normalizeAnswer(value)}`;
    return patterns.some((pattern) => pattern.test(text));
  });
}

function addUsed(fields: string[], condition: boolean, label: string, points: number) {
  if (!condition) return 0;
  fields.push(label);
  return points;
}

function makeScore({
  category,
  title,
  value,
  scoreable,
  explanation,
  fieldsUsed,
  fieldsMissing,
  nextRecommendedAction,
}: {
  category: LeadSignalScoreCategory;
  title: string;
  value: number;
  scoreable: boolean;
  explanation: string;
  fieldsUsed: string[];
  fieldsMissing: string[];
  nextRecommendedAction: string;
}): LeadSignalScore {
  const scoreValue = scoreable ? clampScore(value) : 0;
  return {
    category,
    title,
    scoreValue,
    scoreLabel: scoreLabel(scoreValue, scoreable),
    explanation: scoreable ? explanation : "Not scored because the submission needs safety or compliance review before any buyer value can be assigned.",
    fieldsUsed: scoreable ? unique(fieldsUsed) : [],
    fieldsMissing: unique(fieldsMissing),
    confidenceLevel: scoreable ? confidenceLevel(fieldsUsed, fieldsMissing) : "low",
    nextRecommendedAction: scoreable ? nextRecommendedAction : "Do not route or sell. Send this record to manual review and suppression checks.",
  };
}

function missing(fieldsUsed: string[], checks: Array<[string, string]>) {
  return checks.filter(([usedLabel]) => !fieldsUsed.includes(usedLabel)).map(([, missingLabel]) => missingLabel);
}

export function scoreLeadSignalProfile(input: LeadSignalScoringInput): LeadSignalScoreCard {
  const context = buildContext(input);
  const consentStatus = input.consent?.status ?? "not_requested";
  const routeData = input.consent?.routeData ?? false;
  const completed = input.responseStatus === "completed";
  const sourceUrl = input.attribution?.sourceUrl ?? "";
  const sourcePath = input.attribution?.sourcePath ?? "";
  const sourcePresent = Boolean(sourceUrl || sourcePath);
  const answerCount = context.answered.length;
  const budgetScore = numericBudgetSignal(context.allText);
  const hasBudget = budgetScore > 0;
  const hasTimeline = hasAnyField(context, [/urgency/i, /timeline/i, /deadline/i, /timeframe/i]) || deadlineTerms.test(context.allText);
  const hasLocation = hasAnyField(context, [/location/i, /city/i, /state/i, /zip/i, /market/i, /area/i]);
  const hasBuyerType = hasAnyField(context, [/buyer/i, /seller/i, /customer/i, /audience/i, /best buyer/i]);
  const hasProofAnswer = hasAnyField(context, [/source/i, /proof/i, /url/i, /upload/i, /file/i, /link/i]) || proofTerms.test(context.allText);
  const hasPreferredContact = hasAnyField(context, [/contact/i, /phone/i, /email/i, /text/i, /call/i]);
  const hasEmail = Boolean(input.identity?.email);
  const hasPhone = Boolean(input.identity?.phone);
  const adultConfirmed = input.metadata?.adultConfirmed === true || input.metadata?.adult_confirmed === true;
  const sensitiveAcknowledged =
    input.metadata?.sensitiveDataAcknowledged === true || input.metadata?.sensitive_data_acknowledged === true;
  const suppressionStatus = String(input.metadata?.suppressionStatus ?? input.metadata?.suppression_status ?? "clear");
  const consentVersion = input.consent?.noticeVersion || String(input.metadata?.consentVersion ?? input.metadata?.consent_version ?? "");
  const scoreable = !context.hasMinorFlag && !context.hasProhibitedFlag;

  const intentUsed: string[] = [];
  const intentValue =
    15 +
    addUsed(intentUsed, actionTerms.test(context.allText), "action language", 22) +
    addUsed(intentUsed, answerCount >= 3, "multiple answered fields", 12) +
    addUsed(intentUsed, context.allText.length >= 240, "specific written context", 12) +
    addUsed(intentUsed, hasBudget, "budget or value range", 12) +
    addUsed(intentUsed, routeData, "routing consent", 10) +
    addUsed(intentUsed, completed, "completed response", 8) +
    addUsed(intentUsed, context.tags.length >= 3, "tagged preferences", 9);

  const urgencyUsed: string[] = [];
  const urgencyText = context.allText;
  const urgencyValue =
    10 +
    addUsed(urgencyUsed, /\bnow|asap|today|tonight|urgent\b/i.test(urgencyText), "immediate timing", 42) +
    addUsed(urgencyUsed, /\bthis week|this_week|tomorrow|within 7\b/i.test(urgencyText), "near-term timing", 30) +
    addUsed(urgencyUsed, /\bthis month|this_month|30 days|within 30\b/i.test(urgencyText), "monthly timing", 20) +
    addUsed(urgencyUsed, hasTimeline, "timeline field", 12) +
    addUsed(urgencyUsed, painTerms.test(urgencyText), "pain or loss language", 16) +
    addUsed(urgencyUsed, completed, "finished intake", 6);

  const proofUsed: string[] = [];
  const sourceProofValue =
    8 +
    addUsed(proofUsed, sourcePresent, "source page captured", 20) +
    addUsed(proofUsed, Boolean(input.attribution?.utmSource || input.attribution?.utmCampaign), "campaign attribution", 10) +
    addUsed(proofUsed, hasProofAnswer, "source proof answer", 24) +
    addUsed(proofUsed, /\bhttps?:\/\/|www\./i.test(context.allText), "URL or public link", 18) +
    addUsed(proofUsed, /\bupload|file|screenshot|sample rows\b/i.test(context.allText), "uploaded or sample proof", 16) +
    addUsed(proofUsed, context.tags.some((tag) => /verified|source|proof|public/.test(tag)), "proof tag", 12);

  const freshnessUsed: string[] = [];
  const clientTimestamp = String(input.metadata?.clientTimestamp ?? input.metadata?.client_timestamp ?? "");
  const serverTimestamp = String(input.metadata?.serverTimestamp ?? input.metadata?.server_timestamp ?? "");
  const hasTimestamp = Boolean(clientTimestamp || serverTimestamp);
  const freshnessValue =
    35 +
    addUsed(freshnessUsed, hasTimestamp, "collection timestamp", 25) +
    addUsed(freshnessUsed, sourcePresent, "current source path", 15) +
    addUsed(freshnessUsed, completed, "recent completed intake", 15) +
    addUsed(freshnessUsed, /\btoday|now|this week|new|launch|fresh|recent\b/i.test(context.allText), "freshness language", 10);

  const buyerFitUsed: string[] = [];
  const buyerFitValue =
    12 +
    addUsed(buyerFitUsed, Boolean(input.definition?.vertical), "vertical", 13) +
    addUsed(buyerFitUsed, Boolean(input.definition?.toolSlug || input.definition?.toolType), "tool or product path", 12) +
    addUsed(buyerFitUsed, hasBuyerType, "buyer or audience type", 16) +
    addUsed(buyerFitUsed, hasLocation, "location or market", 12) +
    addUsed(buyerFitUsed, hasBudget, "budget or price band", 12) +
    addUsed(buyerFitUsed, context.tags.length >= 4, "fit tags", 12) +
    addUsed(buyerFitUsed, hasProofAnswer, "source proof context", 11) +
    addUsed(buyerFitUsed, routeData, "permitted routing path", 11);

  const contactUsed: string[] = [];
  const contactabilityValue =
    5 +
    addUsed(contactUsed, hasEmail, "email captured", 26) +
    addUsed(contactUsed, hasPhone, "phone captured", 24) +
    addUsed(contactUsed, hasPreferredContact, "preferred contact method", 16) +
    addUsed(contactUsed, routeData, "permission to route", 18) +
    addUsed(contactUsed, ["single_seller", "named_sellers"].includes(consentStatus), "seller consent scope", 12) +
    addUsed(contactUsed, suppressionStatus === "clear", "suppression clear", 10);

  const complianceUsed: string[] = [];
  const complianceValue =
    5 +
    addUsed(complianceUsed, adultConfirmed, "adult confirmation", 16) +
    addUsed(complianceUsed, consentStatus !== "not_requested" && consentStatus !== "declined", "consent status", 22) +
    addUsed(complianceUsed, Boolean(consentVersion), "consent version", 11) +
    addUsed(complianceUsed, suppressionStatus === "clear", "suppression status", 18) +
    addUsed(complianceUsed, sensitiveAcknowledged, "sensitive-data acknowledgment", 11) +
    addUsed(complianceUsed, context.safetyFlags.length === 0, "no prohibited-data flags", 22);

  const revenueUsed: string[] = [];
  const revenueValue =
    10 +
    addUsed(revenueUsed, hasBudget, "budget or value range", Math.max(16, budgetScore)) +
    addUsed(revenueUsed, /\b(revenue|sales|customers|pipeline|orders|stores|vendors|leads|contracts|bookings)\b/i.test(context.allText), "commercial outcome", 18) +
    addUsed(revenueUsed, volumeTerms.test(context.allText), "volume or audience signal", 16) +
    addUsed(revenueUsed, actionTerms.test(context.allText), "purchase or hiring intent", 12) +
    addUsed(revenueUsed, painTerms.test(context.allText), "business pain", 10) +
    addUsed(revenueUsed, hasTimeline, "timing pressure", 9) +
    addUsed(revenueUsed, hasBuyerType, "buyer use case", 9);

  const scores: Record<LeadSignalScoreCategory, LeadSignalScore> = {
    intent: makeScore({
      category: "intent",
      title: "Intent score",
      value: intentValue,
      scoreable,
      explanation:
        intentValue >= 80
          ? "High intent: the record contains a clear desired action, enough context, and a usable next step."
          : intentValue >= 55
            ? "Medium intent: the person described a real need, but the buyer path still needs more detail."
            : "Low intent: the record needs clearer problem, budget, timeline, or action language before it should be treated as a buyer signal.",
      fieldsUsed: intentUsed,
      fieldsMissing: missing(intentUsed, [
        ["action language", "clear action language"],
        ["budget or value range", "budget or value range"],
        ["routing consent", "routing consent"],
        ["specific written context", "specific written context"],
      ]),
      nextRecommendedAction:
        intentValue >= 80 ? "Attach source proof and route for review." : "Ask one sharper question about what they want to do next.",
    }),
    urgency: makeScore({
      category: "urgency",
      title: "Urgency score",
      value: urgencyValue,
      scoreable,
      explanation:
        urgencyValue >= 80
          ? "High urgency: the language or selected timeline points to near-term action."
          : urgencyValue >= 55
            ? "Medium urgency: there is some time pressure, but the exact deadline is not fully pinned down."
            : "Low urgency: this looks more like research or early comparison than immediate demand.",
      fieldsUsed: urgencyUsed,
      fieldsMissing: missing(urgencyUsed, [
        ["immediate timing", "immediate timing"],
        ["timeline field", "explicit timeline field"],
        ["pain or loss language", "pain or loss reason"],
      ]),
      nextRecommendedAction: urgencyValue >= 80 ? "Prioritize follow-up after compliance review." : "Ask when they need this solved.",
    }),
    source_proof: makeScore({
      category: "source_proof",
      title: "Source proof score",
      value: sourceProofValue,
      scoreable,
      explanation:
        sourceProofValue >= 80
          ? "Strong proof: source path, link, or supporting proof is attached."
          : sourceProofValue >= 55
            ? "Some proof exists, but a reviewer should still verify the source before release."
            : "Weak proof: the record needs a link, upload, public source, or reviewer note before a buyer should trust it.",
      fieldsUsed: proofUsed,
      fieldsMissing: missing(proofUsed, [
        ["source page captured", "source page"],
        ["URL or public link", "public URL"],
        ["uploaded or sample proof", "upload, screenshot, or sample proof"],
      ]),
      nextRecommendedAction: sourceProofValue >= 80 ? "Mark proof ready for reviewer verification." : "Collect source link or proof artifact.",
    }),
    freshness: makeScore({
      category: "freshness",
      title: "Freshness score",
      value: freshnessValue,
      scoreable,
      explanation:
        freshnessValue >= 80
          ? "Fresh signal: the record has current collection context and recent activity language."
          : freshnessValue >= 55
            ? "Usable freshness: the signal is recent enough to review, but should be checked before release."
            : "Stale or unclear freshness: the record needs a collection timestamp or updated source proof.",
      fieldsUsed: freshnessUsed,
      fieldsMissing: missing(freshnessUsed, [
        ["collection timestamp", "collection timestamp"],
        ["current source path", "current source path"],
        ["recent completed intake", "completed intake status"],
      ]),
      nextRecommendedAction: freshnessValue >= 80 ? "Keep in active review queue." : "Refresh or verify the source before selling access.",
    }),
    buyer_fit: makeScore({
      category: "buyer_fit",
      title: "Buyer fit score",
      value: buyerFitValue,
      scoreable,
      explanation:
        buyerFitValue >= 80
          ? "Strong buyer fit: category, use case, tags, and route path line up."
          : buyerFitValue >= 55
            ? "Possible buyer fit: the vertical is useful, but the best buyer or offer path needs more detail."
            : "Weak buyer fit: the record needs clearer vertical, category, location, or buyer use case.",
      fieldsUsed: buyerFitUsed,
      fieldsMissing: missing(buyerFitUsed, [
        ["vertical", "vertical"],
        ["buyer or audience type", "buyer or audience type"],
        ["location or market", "location or market"],
        ["budget or price band", "budget or price band"],
      ]),
      nextRecommendedAction: buyerFitValue >= 80 ? "Match against eligible buyer accounts." : "Ask who should act on this signal.",
    }),
    contactability: makeScore({
      category: "contactability",
      title: "Contactability score",
      value: contactabilityValue,
      scoreable,
      explanation:
        contactabilityValue >= 80
          ? "Easy to contact: there is a practical, permitted follow-up path."
          : contactabilityValue >= 55
            ? "Partly contactable: the record has some contact path, but permission or preferred channel needs review."
            : "Hard to contact: this should stay as anonymous insight or needs identity capture after value is shown.",
      fieldsUsed: contactUsed,
      fieldsMissing: missing(contactUsed, [
        ["email captured", "email"],
        ["phone captured", "phone"],
        ["preferred contact method", "preferred contact method"],
        ["permission to route", "permission to route"],
        ["suppression clear", "clear suppression result"],
      ]),
      nextRecommendedAction:
        contactabilityValue >= 80 ? "Prepare permitted follow-up path." : "Show value first, then ask for contact and consent.",
    }),
    compliance_readiness: makeScore({
      category: "compliance_readiness",
      title: "Compliance readiness score",
      value: complianceValue,
      scoreable,
      explanation:
        complianceValue >= 80
          ? "Ready for review-gated release: consent, adult status, suppression, and safety checks are present."
          : complianceValue >= 55
            ? "Needs review: core controls are partly present but one or more release controls are missing."
            : "Not ready: consent, adult confirmation, suppression status, or sensitive-data checks are missing.",
      fieldsUsed: complianceUsed,
      fieldsMissing: missing(complianceUsed, [
        ["adult confirmation", "adult confirmation"],
        ["consent status", "consent status"],
        ["consent version", "consent version"],
        ["suppression status", "suppression status"],
        ["sensitive-data acknowledgment", "sensitive-data acknowledgment"],
      ]),
      nextRecommendedAction:
        complianceValue >= 80 ? "Allow reviewer to consider release." : "Resolve compliance gaps before scoring, routing, or export.",
    }),
    revenue_potential: makeScore({
      category: "revenue_potential",
      title: "Revenue potential score",
      value: revenueValue,
      scoreable,
      explanation:
        revenueValue >= 80
          ? "High commercial potential: the signal includes value, volume, urgency, or business impact."
          : revenueValue >= 55
            ? "Moderate commercial potential: there is a real opportunity, but value or volume needs clarification."
            : "Low commercial potential: the record needs budget, volume, business pain, or buyer use case before pricing access.",
      fieldsUsed: revenueUsed,
      fieldsMissing: missing(revenueUsed, [
        ["budget or value range", "budget or value range"],
        ["commercial outcome", "commercial outcome"],
        ["volume or audience signal", "volume or audience signal"],
        ["buyer use case", "buyer use case"],
      ]),
      nextRecommendedAction:
        revenueValue >= 80 ? "Price as a reviewed signal opportunity." : "Ask a value-sizing question before marketplace release.",
    }),
  };

  const weights: Record<LeadSignalScoreCategory, number> = {
    intent: 0.18,
    urgency: 0.13,
    source_proof: 0.14,
    freshness: 0.1,
    buyer_fit: 0.14,
    contactability: 0.11,
    compliance_readiness: 0.12,
    revenue_potential: 0.08,
  };

  const weightedScore = Object.entries(scores).reduce(
    (sum, [category, score]) => sum + score.scoreValue * weights[category as LeadSignalScoreCategory],
    0,
  );
  const overallScore = scoreable ? clampScore(weightedScore) : 0;
  const highConfidenceCount = Object.values(scores).filter((score) => score.confidenceLevel === "high").length;
  const mediumConfidenceCount = Object.values(scores).filter((score) => score.confidenceLevel === "medium").length;
  const overallConfidence: LeadSignalConfidence = !scoreable
    ? "low"
    : highConfidenceCount >= 4
      ? "high"
      : highConfidenceCount + mediumConfidenceCount >= 4
        ? "medium"
        : "low";

  const nextRecommendedAction = !scoreable
    ? "Do not score, route, export, or sell. Send to manual review and suppress if needed."
    : overallScore >= 80
      ? "Review source proof, confirm consent and suppression status, then consider sample or access release."
      : overallScore >= 55
        ? "Collect the missing buyer-fit, proof, contact, or timing fields before release."
        : "Keep as anonymous insight or continue the questionnaire before any buyer routing.";

  return {
    modelVersion: "leadflow_signal_score_v1",
    scoreable,
    overallScore,
    overallLabel: scoreLabel(overallScore, scoreable),
    overallConfidence,
    buyerExplanation: !scoreable
      ? "This record is not buyer-ready because it may contain minors, protected traits, health data, private financial data, private political identity, or hacked/leaked data. It should not be sold or routed."
      : overallScore >= 80
        ? "High-value lead signal: strong intent, usable proof, current context, and a buyer path are present."
        : overallScore >= 55
          ? "Medium-value lead signal: there is useful demand, but the missing fields should be resolved before release."
          : "Low-value lead signal: the record is better used for anonymous insight or continued intake until the signal is clearer.",
    nextRecommendedAction,
    scores,
    excludedFields: context.excludedFields,
    safetyFlags: context.safetyFlags,
    scoringRules: {
      allowedInputs,
      disallowedInputs,
    },
    scoredAt: new Date().toISOString(),
  };
}
