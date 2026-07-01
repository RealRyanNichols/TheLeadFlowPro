import type { PredictiveScoreComponent } from "./explain-score";
import type { BuyerRequestFeatures, LeadProfileFeatures, PredictiveEntityType } from "./features";

export type PredictiveRecommendedAction =
  | "approve_for_marketplace"
  | "request_more_source_proof"
  | "suppress"
  | "enrich_profile"
  | "request_buyer_info"
  | "grant_basic_access"
  | "grant_sample_access"
  | "offer_exclusive_access"
  | "route_to_sales"
  | "add_to_watchlist"
  | "create_industry_listing"
  | "create_tool_followup"
  | "do_not_contact";

export function recommendNextAction(
  entityType: PredictiveEntityType,
  features: LeadProfileFeatures | BuyerRequestFeatures,
  components: PredictiveScoreComponent[],
): PredictiveRecommendedAction {
  const byKey = Object.fromEntries(components.map((component) => [component.key, component.value ?? 0]));
  const compliance = byKey.compliance_readiness_score || 0;
  const source = byKey.source_reliability_score || 0;
  const intent = byKey.buyer_intent_score || 0;
  const buyerFit = byKey.buyer_fit_score || 0;
  const marketplaceValue = byKey.marketplace_value_score || 0;

  if (entityType === "lead_profile") {
    const profile = features as LeadProfileFeatures;
    if (profile.suppressionStatus.match(/suppressed|do_not_contact|delete_requested/i)) return "suppress";
    if (compliance < 35) return "do_not_contact";
    if (source < 55) return "request_more_source_proof";
    if (!profile.hasRecommendedNextAction || buyerFit < 50) return "enrich_profile";
    if (marketplaceValue >= 82 && source >= 70 && compliance >= 70) return "approve_for_marketplace";
    if (intent >= 70 && source >= 60) return "create_industry_listing";
    return "create_tool_followup";
  }

  const request = features as BuyerRequestFeatures;
  if (request.buyerAccountStatus === "suspended" || request.buyerAccountStatus === "denied") return "do_not_contact";
  if (!request.intendedUse || !request.budgetRange) return "request_buyer_info";
  if (request.requestType === "sample" && compliance >= 65) return "grant_sample_access";
  if (request.requestType.includes("exclusive") || request.listingReleaseMode.includes("exclusive")) return "offer_exclusive_access";
  if (buyerFit >= 72 && compliance >= 65) return "grant_basic_access";
  if (intent >= 60) return "route_to_sales";
  return "request_buyer_info";
}

export function actionLabel(action: PredictiveRecommendedAction) {
  return action.replace(/_/g, " ");
}
