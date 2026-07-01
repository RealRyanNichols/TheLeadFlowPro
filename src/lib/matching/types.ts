export const MATCHED_ENTITY_TYPES = [
  "marketplace_listing",
  "segment",
  "lead_profile",
  "sample",
  "tool",
  "custom_sourcing",
] as const;

export const MATCH_RECOMMENDED_ACTIONS = [
  "request_sample",
  "request_access",
  "request_exclusive",
  "complete_buyer_profile",
  "book_fit_call",
  "start_tool",
  "request_custom_sourcing",
  "join_waitlist",
  "no_match_found",
] as const;

export type MatchedEntityType = (typeof MATCHED_ENTITY_TYPES)[number];
export type MatchRecommendedAction = (typeof MATCH_RECOMMENDED_ACTIONS)[number];

export type BuyerDemandInput = {
  buyerAccountId?: string | null;
  buyerRequestId?: string | null;
  buyerType?: string | null;
  industry?: string | null;
  geography?: string | null;
  budgetRange?: string | null;
  desiredLeadType?: string | null;
  urgency?: string | null;
  intendedUse?: string | null;
  accessPreference?: string | null;
  sourcePreference?: string | null;
  confidenceRequirement?: string | null;
  listingSlug?: string | null;
  listingTitle?: string | null;
};

export type BuyerMatchCandidate = {
  id: string;
  entityType: MatchedEntityType;
  title: string;
  category: string;
  vertical: string;
  summary: string;
  buyerUseCase: string;
  buyerType?: string | null;
  geography?: string | null;
  budgetRange?: string | null;
  accessModel?: string | null;
  sourceType?: string | null;
  confidence?: string | number | null;
  score?: string | number | null;
  complianceStatus?: string | null;
  availabilityStatus?: string | null;
  sourceProofStatus?: string | null;
  sampleEnabled?: boolean;
  samplePrice?: number;
  href?: string;
};

export type BuyerMatchScoreComponents = {
  industry: number;
  geography: number;
  buyerType: number;
  budget: number;
  urgency: number;
  accessModel: number;
  sourceType: number;
  confidence: number;
  compliance: number;
  availability: number;
};

export type BuyerMatchResult = {
  buyerRequestId?: string | null;
  buyerAccountId?: string | null;
  matchedEntityType: MatchedEntityType;
  matchedEntityId: string;
  title: string;
  category: string;
  vertical: string;
  summary: string;
  matchScore: number;
  matchLabel: string;
  matchReasons: string[];
  scoreComponents: BuyerMatchScoreComponents;
  recommendedAction: MatchRecommendedAction;
  missingBuyerInfo: string[];
  cautionNote: string;
  href: string;
};

export type StoredBuyerMatchResult = {
  id: string;
  buyer_request_id: string;
  buyer_account_id: string | null;
  matched_entity_type: MatchedEntityType;
  matched_entity_id: string;
  listing_id: string | null;
  segment_id: string | null;
  lead_profile_id: string | null;
  sample_id: string | null;
  tool_slug: string | null;
  match_score: number | string;
  match_label: string;
  match_reasons: string[] | Record<string, unknown>;
  score_components: BuyerMatchScoreComponents | Record<string, unknown>;
  recommended_action: MatchRecommendedAction;
  missing_buyer_info: string[] | Record<string, unknown>;
  caution_note: string | null;
  status: string;
  created_at: string;
  updated_at?: string;
  metadata?: Record<string, unknown>;
};

export type BuyerMatchingRunResult = {
  ok: boolean;
  persisted: boolean;
  mode: "live" | "offline" | "missing_supabase_config";
  buyerRequestId: string;
  buyerAccountId: string | null;
  results: BuyerMatchResult[];
  customSourcingRecommended: boolean;
  message: string;
};
