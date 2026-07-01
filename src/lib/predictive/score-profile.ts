import { clampScore, scoreComponent, type PredictiveScoreComponent } from "./explain-score";
import { daysSince, textIncludesAny, type BuyerRequestFeatures, type LeadProfileFeatures } from "./features";

function scoreFreshnessFromDate(value: string | null | undefined) {
  const days = daysSince(value);
  if (days === null) return null;
  if (days <= 3) return 95;
  if (days <= 14) return 84;
  if (days <= 30) return 70;
  if (days <= 90) return 48;
  return 25;
}

export function scoreLeadProfileFeatures(features: LeadProfileFeatures): PredictiveScoreComponent[] {
  const baseScore = features.baseScore ?? 45;
  const sourceScore = clampScore(
    features.sourceProofCount * 16 +
      features.approvedSourceProofCount * 12 +
      (features.sourceProofConfidence ?? 0) * 0.45 +
      (features.sourceProofStatus.match(/approved|verified|sample/i) ? 15 : 0),
  );
  const freshnessRaw = scoreFreshnessFromDate(features.lastVerifiedAt || features.updatedAt || features.createdAt);
  const buyerUseCaseText = `${features.title} ${features.vertical} ${features.category} ${features.buyerUseCase} ${features.tags.join(" ")}`;
  const urgencyTerms = ["urgent", "now", "missed", "leak", "active", "request", "ready", "watchlist", "sample"];
  const urgencyScore = clampScore(
    35 +
      features.requestedAccessCount * 14 +
      features.requestedSampleCount * 10 +
      features.watchlistCount * 8 +
      (textIncludesAny(buyerUseCaseText, urgencyTerms) ? 14 : 0),
  );
  const intentScore = clampScore(
    baseScore * 0.58 +
      features.requestedAccessCount * 12 +
      features.requestedSampleCount * 9 +
      features.watchlistCount * 7 +
      features.relatedToolClicks * 5 +
      features.repeatedCategoryVisits * 3,
  );
  const contactabilityScore = clampScore(
    24 +
      (features.hasBusinessContactRoute ? 28 : 0) +
      (features.sourceUrl ? 18 : 0) +
      (features.hasSubmittedWebsite ? 16 : 0) +
      (features.suppressionStatus.match(/clear|unchecked|sample/i) ? 8 : -40),
  );
  const buyerFitScore = clampScore(
    34 +
      (features.buyerUseCase ? 22 : 0) +
      (features.vertical !== "general" ? 12 : 0) +
      (features.category !== "uncategorized" ? 10 : 0) +
      (features.hasRecommendedNextAction ? 12 : 0) +
      Math.min(10, features.tags.length * 2),
  );
  const revenuePotentialScore = clampScore(baseScore * 0.56 + buyerFitScore * 0.24 + intentScore * 0.2);
  const complianceScore = clampScore(
    35 +
      (features.consentStatus.match(/accepted|source-backed|review|permission|consent/i) ? 18 : 0) +
      (features.suppressionStatus.match(/clear|unchecked|sampleAvailable|sample_available/i) ? 24 : -45) +
      (features.reviewStatus.match(/approved|review|pending/i) ? 10 : 0) +
      (features.sourceProofStatus.match(/approved|verified|sample|review/i) ? 13 : 0),
  );
  const marketplaceValueScore = clampScore(
    intentScore * 0.22 +
      urgencyScore * 0.12 +
      contactabilityScore * 0.1 +
      sourceScore * 0.18 +
      (freshnessRaw ?? 45) * 0.1 +
      buyerFitScore * 0.14 +
      revenuePotentialScore * 0.1 +
      complianceScore * 0.04,
  );

  return [
    scoreComponent({
      key: "buyer_intent_score",
      value: intentScore,
      explanation: "Declared need, buyer action, sample interest, watchlist behavior, and base profile score indicate how much commercial intent is visible.",
      featuresUsed: ["base profile score", "sample requests", "access requests", "watchlist activity", "tool interactions"],
      missingFeatures: features.requestedAccessCount ? [] : ["confirmed buyer access request"],
    }),
    scoreComponent({
      key: "urgency_score",
      value: urgencyScore,
      explanation: "Urgency rises when the profile has request activity, watchlist activity, or language tied to active leaks, missed demand, or immediate review.",
      featuresUsed: ["request activity", "watchlist activity", "urgency language scan"],
      missingFeatures: features.requestedSampleCount || features.requestedAccessCount ? [] : ["recent buyer request"],
    }),
    scoreComponent({
      key: "contactability_score",
      value: contactabilityScore,
      explanation: "Contactability reflects whether a reviewed business route, source URL, submitted website, and non-suppressed status are present.",
      featuresUsed: ["source URL", "business contact route hint", "submitted website signal", "suppression status"],
      missingFeatures: features.hasBusinessContactRoute ? [] : ["approved business contact route"],
      cautionNote: features.suppressionStatus.match(/suppressed|do_not_contact/i) ? "Suppression status blocks outreach and delivery." : undefined,
    }),
    scoreComponent({
      key: "source_reliability_score",
      value: sourceScore,
      explanation: "Source reliability increases with source proof count, approved proof, source proof confidence, and review status.",
      featuresUsed: ["source proof count", "approved proof count", "source proof confidence", "source proof status"],
      missingFeatures: features.sourceProofCount ? [] : ["source proof records"],
      cautionNote: sourceScore < 55 ? "Request more source proof before packaging this as a buyer product." : undefined,
    }),
    scoreComponent({
      key: "freshness_score",
      value: freshnessRaw,
      explanation: "Freshness is based on the most recent verified, updated, or created timestamp available for the profile.",
      featuresUsed: freshnessRaw === null ? [] : ["last verified or updated timestamp"],
      missingFeatures: freshnessRaw === null ? ["last verified timestamp"] : [],
    }),
    scoreComponent({
      key: "buyer_fit_score",
      value: buyerFitScore,
      explanation: "Buyer fit improves when the profile has a clear vertical, category, buyer use case, tags, and a recommended next action.",
      featuresUsed: ["vertical", "category", "buyer use case", "tags", "recommended next action"],
      missingFeatures: features.buyerUseCase ? [] : ["buyer use case"],
    }),
    scoreComponent({
      key: "revenue_potential_score",
      value: revenuePotentialScore,
      explanation: "Revenue potential blends profile strength, buyer fit, and visible intent without promising revenue or lead volume.",
      featuresUsed: ["base profile score", "buyer fit score", "buyer intent score"],
      missingFeatures: ["historical conversion outcome"],
    }),
    scoreComponent({
      key: "compliance_readiness_score",
      value: complianceScore,
      explanation: "Compliance readiness looks for consent or permission context, clear suppression status, review state, and usable source proof status.",
      featuresUsed: ["consent status", "suppression status", "review status", "source proof status"],
      missingFeatures: features.consentStatus.match(/unverified|not_requested/i) ? ["verified consent or permission context"] : [],
      cautionNote: complianceScore < 60 ? "Keep this in review until permission, suppression, and allowed-use checks are stronger." : undefined,
    }),
    scoreComponent({
      key: "marketplace_value_score",
      value: marketplaceValueScore,
      explanation: "Marketplace value combines intent, urgency, contactability, source reliability, freshness, buyer fit, revenue potential, and compliance readiness.",
      featuresUsed: ["intent", "urgency", "contactability", "source reliability", "freshness", "buyer fit", "revenue potential", "compliance readiness"],
      missingFeatures: [],
    }),
  ];
}

export function scoreBuyerRequestFeatures(features: BuyerRequestFeatures): PredictiveScoreComponent[] {
  const requestText = `${features.requestType} ${features.intendedUse} ${features.urgency} ${features.vertical} ${features.category}`;
  const urgencyScore = clampScore(
    38 +
      (textIncludesAny(requestText, ["urgent", "asap", "now", "this week", "ready"]) ? 30 : 0) +
      (features.requestType === "access" ? 13 : 0) +
      (features.requestType === "sample" ? 8 : 0),
  );
  const budgetMatch = features.budgetRange || features.buyerBudget;
  const budgetScore = clampScore(
    38 +
      (textIncludesAny(budgetMatch, ["1000", "1,000", "1500", "1,500", "5000", "5,000", "premium", "custom"]) ? 30 : 0) +
      (features.listingPriceCents && features.listingPriceCents > 0 ? 12 : 0),
  );
  const industryMatch = features.vertical && features.buyerIndustry && features.buyerIndustry.toLowerCase().includes(features.vertical.toLowerCase());
  const buyerFitScore = clampScore(
    34 +
      (features.intendedUse ? 18 : 0) +
      (features.buyerIntendedUse ? 14 : 0) +
      (features.buyerType ? 12 : 0) +
      (features.vertical ? 8 : 0) +
      (industryMatch ? 14 : 0),
  );
  const intentScore = clampScore(
    42 +
      (features.requestType === "access" ? 22 : 0) +
      (features.requestType === "sample" ? 14 : 0) +
      (features.intendedUse.length > 24 ? 14 : 0) +
      (features.status.match(/submitted|review|approved/i) ? 8 : 0),
  );
  const sourceReliabilityScore = clampScore(45 + (features.listingStatus.match(/available|sample|approved/i) ? 25 : 0) + (features.listingScore || 0) * 0.2);
  const contactabilityScore = clampScore(40 + (features.buyerAccountStatus.match(/approved/i) ? 28 : 0) + (features.approvedAccessLevel !== "none" ? 14 : 0));
  const freshnessScore = scoreFreshnessFromDate(features.createdAt) ?? 50;
  const complianceScore = clampScore(
    36 +
      (features.buyerAccountStatus.match(/approved|pending_review/i) ? 18 : -35) +
      (features.intendedUse ? 18 : 0) +
      (features.listingStatus.match(/suppressed|sold_exclusive/i) ? -40 : 10),
  );
  const revenuePotentialScore = clampScore(budgetScore * 0.48 + buyerFitScore * 0.24 + intentScore * 0.28);
  const marketplaceValueScore = clampScore(intentScore * 0.22 + buyerFitScore * 0.2 + budgetScore * 0.16 + complianceScore * 0.18 + urgencyScore * 0.14 + sourceReliabilityScore * 0.1);

  return [
    scoreComponent({
      key: "buyer_intent_score",
      value: intentScore,
      explanation: "Buyer intent is based on request type, stated use, request status, and whether the buyer gave enough context to review the ask.",
      featuresUsed: ["request type", "intended use", "request status"],
      missingFeatures: features.intendedUse ? [] : ["intended use"],
    }),
    scoreComponent({
      key: "urgency_score",
      value: urgencyScore,
      explanation: "Urgency checks timing language and whether the request is for sample review or deeper access.",
      featuresUsed: ["urgency text", "request type"],
      missingFeatures: features.urgency ? [] : ["explicit timeline"],
    }),
    scoreComponent({
      key: "contactability_score",
      value: contactabilityScore,
      explanation: "Contactability here means the buyer account is reachable, reviewed, and usable for next-step handling.",
      featuresUsed: ["buyer account status", "approved access level"],
      missingFeatures: features.approvedAccessLevel === "none" ? ["approved access level"] : [],
    }),
    scoreComponent({
      key: "source_reliability_score",
      value: sourceReliabilityScore,
      explanation: "Source reliability for a buyer request reflects the requested listing status and listing score when known.",
      featuresUsed: ["listing status", "listing score"],
      missingFeatures: features.listingScore === null ? ["listing score"] : [],
    }),
    scoreComponent({
      key: "freshness_score",
      value: freshnessScore,
      explanation: "Freshness is based on when the buyer request was created.",
      featuresUsed: ["request created timestamp"],
      missingFeatures: features.createdAt ? [] : ["request created timestamp"],
    }),
    scoreComponent({
      key: "buyer_fit_score",
      value: buyerFitScore,
      explanation: "Buyer fit checks buyer type, industry, vertical, and intended use alignment.",
      featuresUsed: ["buyer type", "buyer industry", "requested vertical", "intended use"],
      missingFeatures: features.buyerType ? [] : ["buyer type"],
    }),
    scoreComponent({
      key: "revenue_potential_score",
      value: revenuePotentialScore,
      explanation: "Revenue potential blends budget fit, buyer fit, and request intent without promising sales or lead volume.",
      featuresUsed: ["budget range", "buyer fit", "buyer intent"],
      missingFeatures: budgetMatch ? [] : ["budget range"],
    }),
    scoreComponent({
      key: "compliance_readiness_score",
      value: complianceScore,
      explanation: "Compliance readiness checks buyer review status, intended use, and whether the listing is available for the requested use.",
      featuresUsed: ["buyer account status", "intended use", "listing status"],
      missingFeatures: features.intendedUse ? [] : ["intended use"],
      cautionNote: complianceScore < 60 ? "Request more buyer information before granting access." : undefined,
    }),
    scoreComponent({
      key: "marketplace_value_score",
      value: marketplaceValueScore,
      explanation: "Marketplace value combines buyer intent, urgency, budget, fit, compliance readiness, and listing reliability.",
      featuresUsed: ["buyer intent", "urgency", "budget", "buyer fit", "compliance readiness", "listing reliability"],
      missingFeatures: [],
    }),
  ];
}
