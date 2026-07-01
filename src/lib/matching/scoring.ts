import type {
  BuyerDemandInput,
  BuyerMatchCandidate,
  BuyerMatchResult,
  BuyerMatchScoreComponents,
  MatchRecommendedAction,
} from "./types";

const emptyWords = new Set(["the", "and", "for", "with", "that", "this", "lead", "leads", "signal", "signals"]);

export function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function normalizeText(value: string | number | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9$+.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function readable(value: string | null | undefined) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function tokens(value: string | number | null | undefined) {
  return normalizeText(value)
    .split(" ")
    .map((item) => item.trim())
    .filter((item) => item.length > 2 && !emptyWords.has(item));
}

function hasOverlap(a: string | null | undefined, b: string | null | undefined) {
  const aTokens = tokens(a);
  const bTokens = new Set(tokens(b));
  return aTokens.some((token) => bTokens.has(token) || [...bTokens].some((candidate) => candidate.includes(token) || token.includes(candidate)));
}

function textScore(input: string | null | undefined, candidate: string | null | undefined, strong = 100, partial = 70, fallback = 48) {
  const buyer = normalizeText(input);
  const target = normalizeText(candidate);
  if (!buyer) return fallback;
  if (!target) return 45;
  if (target.includes(buyer) || buyer.includes(target)) return strong;
  if (hasOverlap(buyer, target)) return partial;
  return 24;
}

function budgetNumber(value: string | null | undefined) {
  const text = normalizeText(value);
  if (!text) return 0;
  if (/under/.test(text)) return 400;
  if (/\$?15,?000\+|15000\+/.test(text)) return 15000;
  const numbers = [...text.matchAll(/\$?([0-9][0-9,]*)/g)].map((match) => Number(match[1].replace(/,/g, ""))).filter(Number.isFinite);
  if (numbers.length === 0) return 0;
  return Math.max(...numbers);
}

function scoreBudget(input: string | null | undefined, candidate: BuyerMatchCandidate) {
  const buyerBudget = budgetNumber(input);
  const price = typeof candidate.samplePrice === "number" ? candidate.samplePrice : budgetNumber(candidate.budgetRange);
  if (!buyerBudget) return 48;
  if (!price) return 62;
  if (buyerBudget >= price) return 100;
  if (buyerBudget >= price * 0.5) return 68;
  return 34;
}

function scoreUrgency(input: string | null | undefined, candidate: BuyerMatchCandidate) {
  const urgency = normalizeText(input);
  const available = normalizeText(candidate.availabilityStatus);
  if (!urgency) return 50;
  if (/now|today|urgent|this week|asap/.test(urgency)) {
    return /available|sample|active|approved/.test(available) ? 100 : 52;
  }
  if (/month|quarter|research|planning/.test(urgency)) return /archived|suppressed|sold/.test(available) ? 34 : 78;
  return 66;
}

function scoreAccessModel(input: string | null | undefined, candidate: BuyerMatchCandidate) {
  const preference = normalizeText(input);
  const access = normalizeText(candidate.accessModel);
  if (!preference) return access.includes("internal") ? 24 : 55;
  if (preference.includes("exclusive")) return access.includes("exclusive") ? 100 : access.includes("limited") ? 72 : 46;
  if (preference.includes("shared") || preference.includes("sample")) return access.includes("shared") || access.includes("limited") ? 92 : 52;
  if (preference.includes("territory") || preference.includes("geo")) return access.includes("geo") || access.includes("exclusive") ? 94 : 45;
  return 60;
}

function confidenceScore(value: string | number | null | undefined, requirement: string | null | undefined) {
  const label = normalizeText(value);
  const required = normalizeText(requirement);
  const number = typeof value === "number" ? value : Number(value);
  const normalized = Number.isFinite(number) ? (number <= 1 ? number * 100 : number) : 0;
  const candidate =
    label.includes("high") || normalized >= 80 ? 95 :
    label.includes("medium") || normalized >= 55 ? 72 :
    label.includes("low") || normalized > 0 ? 46 :
    36;
  if (!required) return candidate;
  if (required.includes("high")) return candidate >= 90 ? 100 : candidate >= 70 ? 58 : 26;
  if (required.includes("medium")) return candidate >= 70 ? 92 : 52;
  return candidate;
}

function complianceScore(candidate: BuyerMatchCandidate) {
  const compliance = normalizeText(candidate.complianceStatus);
  const proof = normalizeText(candidate.sourceProofStatus);
  if (/blocked|suppressed|prohibited|high risk/.test(compliance)) return 0;
  if (/ready|approved/.test(compliance) && /verified|approved/.test(proof)) return 100;
  if (/ready|approved|review|needs_review/.test(compliance)) return /missing|none/.test(proof) ? 56 : 76;
  return 58;
}

function availabilityScore(candidate: BuyerMatchCandidate) {
  const status = normalizeText(candidate.availabilityStatus);
  const access = normalizeText(candidate.accessModel);
  if (/suppressed|archived|sold exclusive|internal/.test(status) || access.includes("internal")) return 0;
  if (/reserved|sold_shared|limited/.test(status)) return 58;
  if (/sample|available|active|approved|review/.test(status)) return 92;
  return 60;
}

export function missingBuyerInfo(input: BuyerDemandInput) {
  const missing: string[] = [];
  if (!input.industry) missing.push("industry");
  if (!input.geography) missing.push("geography");
  if (!input.buyerType) missing.push("buyer type");
  if (!input.budgetRange) missing.push("budget range");
  if (!input.intendedUse) missing.push("intended use");
  if (!input.accessPreference) missing.push("access preference");
  return missing;
}

export function scoreCandidate(input: BuyerDemandInput, candidate: BuyerMatchCandidate): BuyerMatchResult {
  const combinedNeed = [input.industry, input.desiredLeadType, input.intendedUse, input.listingTitle].filter(Boolean).join(" ");
  const candidateText = [candidate.title, candidate.vertical, candidate.category, candidate.summary, candidate.buyerUseCase].join(" ");
  const components: BuyerMatchScoreComponents = {
    industry: textScore(combinedNeed, candidateText),
    geography: textScore(input.geography, candidate.geography || candidate.summary, 100, 66, 58),
    buyerType: textScore(input.buyerType, candidate.buyerType || candidate.buyerUseCase, 100, 72, 52),
    budget: scoreBudget(input.budgetRange, candidate),
    urgency: scoreUrgency(input.urgency, candidate),
    accessModel: scoreAccessModel(input.accessPreference, candidate),
    sourceType: textScore(input.sourcePreference, candidate.sourceType || candidate.summary, 100, 68, 55),
    confidence: confidenceScore(candidate.confidence, input.confidenceRequirement),
    compliance: complianceScore(candidate),
    availability: availabilityScore(candidate),
  };

  const matchScore = clampScore(
    components.industry * 0.18 +
      components.geography * 0.1 +
      components.buyerType * 0.11 +
      components.budget * 0.08 +
      components.urgency * 0.08 +
      components.accessModel * 0.09 +
      components.sourceType * 0.08 +
      components.confidence * 0.1 +
      components.compliance * 0.1 +
      components.availability * 0.08,
  );

  const matchLabel = matchScore >= 85 ? "Strong match" : matchScore >= 70 ? "Good match" : matchScore >= 55 ? "Possible match" : "Weak match";
  const missing = missingBuyerInfo(input);
  const reasons = [
    components.industry >= 70 ? `Industry fit: ${candidate.vertical || candidate.category}` : "Industry fit needs more buyer detail.",
    components.geography >= 70 ? "Geography does not block the match." : "Geography may need custom sourcing or a narrower territory.",
    components.confidence >= 70 ? "Confidence level is usable for review." : "Confidence needs more proof before purchase.",
    components.compliance >= 70 ? "Compliance status can move through review." : "Compliance review limits release.",
    components.availability >= 70 ? "Availability supports a next step now." : "Availability may require waitlist or admin review.",
  ].slice(0, 5);

  return {
    buyerRequestId: input.buyerRequestId || null,
    buyerAccountId: input.buyerAccountId || null,
    matchedEntityType: candidate.entityType,
    matchedEntityId: candidate.id,
    title: candidate.title,
    category: candidate.category,
    vertical: candidate.vertical,
    summary: candidate.summary,
    matchScore,
    matchLabel,
    matchReasons: reasons,
    scoreComponents: components,
    recommendedAction: recommendedAction(input, candidate, matchScore, missing),
    missingBuyerInfo: missing,
    cautionNote: cautionNote(candidate, matchScore),
    href: candidate.href || hrefForCandidate(candidate),
  };
}

function recommendedAction(
  input: BuyerDemandInput,
  candidate: BuyerMatchCandidate,
  score: number,
  missing: string[],
): MatchRecommendedAction {
  if (missing.length >= 4) return "complete_buyer_profile";
  if (candidate.entityType === "tool") return "start_tool";
  if (candidate.entityType === "custom_sourcing") return "request_custom_sourcing";
  if (score < 48) return "request_custom_sourcing";
  const availability = normalizeText(candidate.availabilityStatus);
  const access = normalizeText(candidate.accessModel);
  if (/sold|reserved/.test(availability)) return "join_waitlist";
  if (access.includes("exclusive") || normalizeText(input.accessPreference).includes("exclusive")) return "request_exclusive";
  if (candidate.sampleEnabled || candidate.entityType === "sample") return "request_sample";
  return "request_access";
}

function cautionNote(candidate: BuyerMatchCandidate, score: number) {
  const compliance = normalizeText(candidate.complianceStatus);
  if (/civic|political/.test(normalizeText(`${candidate.vertical} ${candidate.category}`))) {
    return "Civic matches stay aggregate, consented, public-source, or manually reviewed. Do not use for individual political persuasion targeting.";
  }
  if (/blocked|suppressed|prohibited/.test(compliance)) return "Blocked until compliance, suppression, and proof review clears.";
  if (score < 55) return "Use this as a research hint, not a ready-to-buy recommendation.";
  return "Access still depends on review, entitlement, suppression status, and allowed use.";
}

function hrefForCandidate(candidate: BuyerMatchCandidate) {
  if (candidate.entityType === "tool") return `/tools?tool=${encodeURIComponent(candidate.id)}`;
  if (candidate.entityType === "lead_profile") return `/lead-profile/${candidate.id}`;
  if (candidate.entityType === "segment") return "/marketplace";
  if (candidate.entityType === "sample") return `/marketplace/${candidate.id}/sample`;
  if (candidate.entityType === "custom_sourcing") return "/custom-sourcing";
  return "/marketplace";
}

export function sortedMatches(results: BuyerMatchResult[], limit = 8) {
  return [...results]
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}
