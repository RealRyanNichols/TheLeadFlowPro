export type LeadFlowPredictiveModelId =
  | "lead_quality_score"
  | "urgency_score"
  | "channel_preference_score"
  | "likely_objection_classifier"
  | "partner_fit_score";

export type LeadFlowFeatureSource =
  | "disclosed_questionnaire_response"
  | "onsite_behavioral_event"
  | "historical_conversion_outcome"
  | "partner_eligibility_rule";

export type LeadFlowModelLogicOption =
  | "rules_v1"
  | "regularized_logistic_regression"
  | "interpretable_gradient_boosted_trees"
  | "multiclass_rules"
  | "multiclass_logistic_regression";

export type LeadFlowFeatureDefinition = {
  key: string;
  source: LeadFlowFeatureSource;
  description: string;
  examples?: readonly string[];
};

export type LeadFlowPredictiveModelSpec = {
  id: LeadFlowPredictiveModelId;
  label: string;
  purpose: string;
  output: "score_0_100" | "ranked_channels" | "class_probabilities";
  allowedSources: readonly LeadFlowFeatureSource[];
  forbiddenInputs: readonly string[];
  features: readonly LeadFlowFeatureDefinition[];
  modelLogicOptions: readonly LeadFlowModelLogicOption[];
  explainabilityFields: readonly string[];
  retrainingCadence: string;
  biasChecks: readonly string[];
  humanReviewTriggers: readonly string[];
  optOutHandling: string;
};

export const LEADFLOW_FORBIDDEN_MODEL_INPUTS = [
  "race",
  "ethnicity",
  "religion",
  "health",
  "sexual_orientation",
  "political_opinion",
  "precise_geolocation",
  "exact_address",
  "biometric_data",
  "government_id",
  "financial_account_access",
  "sensitive_proxy_features",
] as const;

const COMMON_EXPLAINABILITY_FIELDS = [
  "model_id",
  "model_version",
  "score_value",
  "score_band",
  "top_positive_factors",
  "top_negative_factors",
  "eligibility_filters_applied",
  "consent_scope_used",
  "feature_snapshot_hash",
  "feature_freshness_days",
  "human_review_required",
  "review_reason_codes",
] as const;

export const LEADFLOW_PREDICTIVE_MODELS = [
  {
    id: "lead_quality_score",
    label: "Lead Quality Score",
    purpose: "Estimate whether a consented profile is likely to become a valid, reachable, relevant opportunity.",
    output: "score_0_100",
    allowedSources: [
      "disclosed_questionnaire_response",
      "onsite_behavioral_event",
      "historical_conversion_outcome",
      "partner_eligibility_rule",
    ],
    forbiddenInputs: LEADFLOW_FORBIDDEN_MODEL_INPUTS,
    features: [
      {
        key: "response_completeness_ratio",
        source: "disclosed_questionnaire_response",
        description: "Share of required non-sensitive quiz fields completed.",
      },
      {
        key: "problem_specificity_bucket",
        source: "disclosed_questionnaire_response",
        description: "How specific the disclosed need is, bucketed from broad to precise.",
        examples: ["broad", "category_specific", "requirements_specific"],
      },
      {
        key: "timeline_bucket",
        source: "disclosed_questionnaire_response",
        description: "Self-disclosed purchase/action timeline bucket.",
        examples: ["now", "0_30_days", "31_90_days", "90_days_plus"],
      },
      {
        key: "budget_fit_bucket",
        source: "disclosed_questionnaire_response",
        description: "Self-disclosed budget fit against the selected category or partner offer.",
      },
      {
        key: "proof_depth_count",
        source: "disclosed_questionnaire_response",
        description: "Count of non-sensitive proof/support fields the user chose to provide.",
      },
      {
        key: "high_intent_event_count_7d",
        source: "onsite_behavioral_event",
        description: "Count of consent-safe high-intent onsite events in the last seven days.",
      },
      {
        key: "historical_conversion_rate_bucket",
        source: "historical_conversion_outcome",
        description: "Prior conversion performance for the same quiz, vertical, and source family bucket.",
      },
    ],
    modelLogicOptions: ["rules_v1", "regularized_logistic_regression", "interpretable_gradient_boosted_trees"],
    explainabilityFields: COMMON_EXPLAINABILITY_FIELDS,
    retrainingCadence: "Monthly after at least 500 labeled outcomes per vertical, with weekly calibration monitoring.",
    biasChecks: [
      "Forbidden-feature scan before every training run.",
      "Proxy review for location, language, device, timing, and source features.",
      "Score distribution drift by vertical and source family.",
      "False-positive and false-negative review against human-reviewed lead outcomes.",
    ],
    humanReviewTriggers: [
      "Score is high but proof depth is low.",
      "Score changes by more than 25 points between model versions.",
      "Eligibility rule conflicts with model score.",
      "Lead is routed for exclusive sale.",
    ],
    optOutHandling:
      "Only score rows selected from leadflow.scoreable_profiles. Remove or expire existing scores when ADMT opt-out, deletion, or suppression is submitted.",
  },
  {
    id: "urgency_score",
    label: "Urgency Score",
    purpose: "Estimate how soon a person or business is likely to act, based only on disclosed timing and onsite intent.",
    output: "score_0_100",
    allowedSources: ["disclosed_questionnaire_response", "onsite_behavioral_event", "historical_conversion_outcome"],
    forbiddenInputs: LEADFLOW_FORBIDDEN_MODEL_INPUTS,
    features: [
      {
        key: "timeline_bucket",
        source: "disclosed_questionnaire_response",
        description: "Self-disclosed action timeline.",
      },
      {
        key: "pain_intensity_bucket",
        source: "disclosed_questionnaire_response",
        description: "Self-disclosed problem severity bucket.",
      },
      {
        key: "repeat_visit_count_7d",
        source: "onsite_behavioral_event",
        description: "Return visits inside seven days using first-party app events only.",
      },
      {
        key: "cta_depth_bucket",
        source: "onsite_behavioral_event",
        description: "Farthest consent-safe step reached in the quiz or seller-selection flow.",
      },
      {
        key: "recent_conversion_window_bucket",
        source: "historical_conversion_outcome",
        description: "How quickly similar consented profiles historically converted after intake.",
      },
    ],
    modelLogicOptions: ["rules_v1", "regularized_logistic_regression"],
    explainabilityFields: COMMON_EXPLAINABILITY_FIELDS,
    retrainingCadence: "Monthly when new conversion timing labels are available; recalibrate thresholds weekly during campaign launches.",
    biasChecks: [
      "Check that urgency is not using precise location, device price, inferred income, or protected-class proxies.",
      "Compare urgency score calibration by vertical and traffic source.",
      "Review abandoned-flow labels so friction is not mistaken for low urgency.",
    ],
    humanReviewTriggers: [
      "Very high urgency with low or missing consent scope.",
      "Urgency score conflicts with disclosed timeline.",
      "Urgency is used to prioritize outreach cadence.",
    ],
    optOutHandling:
      "Do not calculate urgency when ADMT opt-out or do-not-contact suppression is active. Stop outreach sequencing immediately on suppression.",
  },
  {
    id: "channel_preference_score",
    label: "Channel Preference Score",
    purpose: "Rank permitted contact channels using disclosed preference, channel consent, and prior response outcomes.",
    output: "ranked_channels",
    allowedSources: [
      "disclosed_questionnaire_response",
      "onsite_behavioral_event",
      "historical_conversion_outcome",
      "partner_eligibility_rule",
    ],
    forbiddenInputs: LEADFLOW_FORBIDDEN_MODEL_INPUTS,
    features: [
      {
        key: "declared_preferred_channel",
        source: "disclosed_questionnaire_response",
        description: "Explicitly selected preferred channel.",
        examples: ["email", "sms", "phone", "marketplace_inbox"],
      },
      {
        key: "channel_consent_scope",
        source: "disclosed_questionnaire_response",
        description: "Consent scopes granted for email, SMS, phone, or marketplace messages.",
      },
      {
        key: "channel_click_event_count",
        source: "onsite_behavioral_event",
        description: "Consent-safe clicks on channel-specific CTAs.",
      },
      {
        key: "historical_channel_response_rate",
        source: "historical_conversion_outcome",
        description: "Response rates by channel for the same vertical and consent mode.",
      },
      {
        key: "partner_allowed_channels",
        source: "partner_eligibility_rule",
        description: "Channels the partner is allowed and configured to use.",
      },
    ],
    modelLogicOptions: ["rules_v1", "regularized_logistic_regression"],
    explainabilityFields: [
      ...COMMON_EXPLAINABILITY_FIELDS,
      "ranked_channel_outputs",
      "blocked_channels",
      "blocking_consent_scopes",
    ],
    retrainingCadence: "Monthly, with immediate rule updates when channel consent or carrier/compliance requirements change.",
    biasChecks: [
      "Channel rank must never be inferred from protected class, language, neighborhood, or device cost.",
      "Blocked-channel rate by partner and vertical.",
      "Response-rate calibration by channel consent scope.",
    ],
    humanReviewTriggers: [
      "Preferred channel is not consented.",
      "Model ranks a channel the partner cannot legally or operationally use.",
      "Consumer submitted do-not-contact or channel-specific revocation.",
    ],
    optOutHandling:
      "Return no contact-channel recommendation when do-not-contact applies. Return only consented channels when partial revocation applies.",
  },
  {
    id: "likely_objection_classifier",
    label: "Likely Objection Classifier",
    purpose: "Classify the most likely sales or support blocker so the partner can answer the real concern first.",
    output: "class_probabilities",
    allowedSources: ["disclosed_questionnaire_response", "onsite_behavioral_event", "historical_conversion_outcome"],
    forbiddenInputs: LEADFLOW_FORBIDDEN_MODEL_INPUTS,
    features: [
      {
        key: "declared_blocker_category",
        source: "disclosed_questionnaire_response",
        description: "Explicitly selected blocker or concern category.",
        examples: ["price", "trust", "timing", "authority", "complexity", "privacy", "financing", "not_sure"],
      },
      {
        key: "comparison_behavior_bucket",
        source: "onsite_behavioral_event",
        description: "Bucketed onsite comparison or repeated-pricing behavior.",
      },
      {
        key: "proof_request_event_count",
        source: "onsite_behavioral_event",
        description: "Clicks or views of proof, reviews, examples, or trust material.",
      },
      {
        key: "abandoned_at_step_key",
        source: "onsite_behavioral_event",
        description: "Step where the visitor stopped, bucketed to workflow step keys.",
      },
      {
        key: "historical_objection_resolution_rate",
        source: "historical_conversion_outcome",
        description: "Historical resolution/conversion rate for similar explicitly disclosed objection patterns.",
      },
    ],
    modelLogicOptions: ["multiclass_rules", "multiclass_logistic_regression", "interpretable_gradient_boosted_trees"],
    explainabilityFields: [
      ...COMMON_EXPLAINABILITY_FIELDS,
      "predicted_objection",
      "class_probabilities",
      "recommended_response_angle",
    ],
    retrainingCadence: "Quarterly after enough reviewed objection labels exist; rules may update monthly from sales-review findings.",
    biasChecks: [
      "Review objection labels for subjective or stereotyping language.",
      "Check whether source/channel or timing proxies dominate predictions.",
      "Sample human-review transcripts for overconfident objection labels.",
    ],
    humanReviewTriggers: [
      "Classifier confidence below 60%.",
      "Predicted objection is privacy, financing, or legal/compliance concern.",
      "Recommended response would materially affect price, eligibility, or routing.",
    ],
    optOutHandling:
      "Do not classify objections for ADMT opted-out profiles when the output affects routing, prioritization, price, or eligibility.",
  },
  {
    id: "partner_fit_score",
    label: "Partner Fit Score",
    purpose: "Estimate fit between a consented lead/profile and a named partner using disclosed needs and partner eligibility rules.",
    output: "score_0_100",
    allowedSources: [
      "disclosed_questionnaire_response",
      "onsite_behavioral_event",
      "historical_conversion_outcome",
      "partner_eligibility_rule",
    ],
    forbiddenInputs: LEADFLOW_FORBIDDEN_MODEL_INPUTS,
    features: [
      {
        key: "category_match",
        source: "disclosed_questionnaire_response",
        description: "Disclosed need category compared with partner category eligibility.",
      },
      {
        key: "requirement_match_count",
        source: "disclosed_questionnaire_response",
        description: "Count of disclosed requirements the partner can satisfy.",
      },
      {
        key: "broad_service_area_match",
        source: "partner_eligibility_rule",
        description: "Self-selected or partner-defined broad market/service area match. Never precise coordinates.",
      },
      {
        key: "budget_offer_fit_bucket",
        source: "disclosed_questionnaire_response",
        description: "Budget or price-range compatibility when disclosed by the user.",
      },
      {
        key: "partner_capacity_status",
        source: "partner_eligibility_rule",
        description: "Partner availability, cap, pause, or product-line eligibility.",
      },
      {
        key: "historical_partner_conversion_bucket",
        source: "historical_conversion_outcome",
        description: "Historical conversion rate bucket for similar consented fits with the same partner.",
      },
    ],
    modelLogicOptions: ["rules_v1", "regularized_logistic_regression", "interpretable_gradient_boosted_trees"],
    explainabilityFields: [
      ...COMMON_EXPLAINABILITY_FIELDS,
      "matched_requirements",
      "missing_requirements",
      "partner_rules_passed",
      "partner_rules_failed",
    ],
    retrainingCadence:
      "Monthly for model weights; partner eligibility rules update immediately when partner configuration changes.",
    biasChecks: [
      "Partner rules must be reviewed for protected-class or proxy exclusions.",
      "No precise geolocation, neighborhood proxy, or sensitive category targeting.",
      "Compare fit-score acceptance and rejection reasons by vertical/source family.",
    ],
    humanReviewTriggers: [
      "Fit score determines exclusive routing.",
      "Fit score blocks all partner matches.",
      "Partner rule conflict or missing eligibility data.",
      "High-value export or paid data product generation.",
    ],
    optOutHandling:
      "Do not compute or expose partner fit for ADMT opted-out profiles when the score changes routing, prioritization, export, or eligibility.",
  },
] as const satisfies readonly LeadFlowPredictiveModelSpec[];

export function getLeadFlowPredictiveModelSpec(modelId: LeadFlowPredictiveModelId) {
  return LEADFLOW_PREDICTIVE_MODELS.find((model) => model.id === modelId);
}

export function isForbiddenPredictiveFeatureKey(featureKey: string) {
  const normalized = featureKey.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return LEADFLOW_FORBIDDEN_MODEL_INPUTS.some((forbidden) => normalized.includes(forbidden));
}
