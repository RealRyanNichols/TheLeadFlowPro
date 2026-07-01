export type LeadFlowRoutingMode = "exclusive_lead" | "consumer_selected_multi_seller" | "aggregated_insight_only";

export type LeadFlowRoutingGate =
  | "active_profile"
  | "active_identity"
  | "active_consent"
  | "no_suppression"
  | "partner_eligibility"
  | "seller_capacity"
  | "dedupe_window"
  | "admt_allowed_when_scored"
  | "aggregate_threshold";

export type LeadFlowRoutingSortFactor =
  | "consumer_selected_partner"
  | "consumer_expectation_match"
  | "partner_fit_score"
  | "lead_quality_score"
  | "urgency_score"
  | "sla_capacity"
  | "fair_rotation"
  | "freshness_decay"
  | "commercial_tie_breaker";

export type LeadFlowRoutingDatabaseCondition = {
  tableOrView: string;
  condition: string;
};

export type LeadFlowSlaPolicy = {
  acknowledgementMinutes: number | null;
  firstActionBusinessHours: number | null;
  expiryBusinessHours: number | null;
  missedSlaAction: "refund_or_credit" | "reroute_if_allowed" | "report_stale" | "not_applicable";
};

export type LeadFlowDuplicatePolicy = {
  fingerprintFields: readonly string[];
  sameBuyerDecayDays: number;
  crossBuyerDecayDays: number | null;
  allowRerouteWhen: readonly string[];
};

export type LeadFlowRefundPolicy = {
  refundableReasons: readonly string[];
  nonRefundableReasons: readonly string[];
};

export type LeadFlowConflictRule = {
  key: string;
  behavior: "block" | "hold_for_review" | "downgrade_to_aggregate" | "allow_with_audit";
  description: string;
};

export type LeadFlowRoutingPolicy = {
  mode: LeadFlowRoutingMode;
  label: string;
  purpose: string;
  allowedExclusivityLevels: readonly string[];
  requiredConsentScopes: readonly string[];
  allowedSortFactors: readonly LeadFlowRoutingSortFactor[];
  highestBidOnlyAllowed: false;
  commercialTieBreakerAllowed: boolean;
  gates: readonly LeadFlowRoutingGate[];
  databaseConditions: readonly LeadFlowRoutingDatabaseCondition[];
  sla: LeadFlowSlaPolicy;
  duplicatePolicy: LeadFlowDuplicatePolicy;
  refundPolicy: LeadFlowRefundPolicy;
  conflictRules: readonly LeadFlowConflictRule[];
  auditActions: readonly string[];
};

const SHARED_IDENTIFIED_DATABASE_CONDITIONS = [
  {
    tableOrView: "leadflow.profiles",
    condition: "profiles.deleted_at is null and profiles.hard_deleted_at is null",
  },
  {
    tableOrView: "leadflow.identities",
    condition: "identities.deleted_at is null and identities.hard_deleted_at is null",
  },
  {
    tableOrView: "leadflow.suppression_requests",
    condition:
      "not exists active do_not_contact or do_not_sell_share suppression matching identity_id, email_sha256, phone_sha256, or platform-global scope",
  },
  {
    tableOrView: "leadflow.dsar_requests",
    condition: "no verified active delete, do_not_sell_share, do_not_contact, or ADMT opt-out request conflicts with this route",
  },
] as const satisfies readonly LeadFlowRoutingDatabaseCondition[];

const SHARED_REFUND_POLICY = {
  refundableReasons: [
    "Delivered row was already routed to the same buyer inside the decay window.",
    "Required consumer consent was missing, revoked, expired, or mismatched at delivery time.",
    "Lead materially failed the buyer's purchased filter and the mismatch is platform-caused.",
    "The same profile was sold as exclusive to another buyer inside the exclusive decay window.",
    "Suppression or do-not-contact state existed before export and should have blocked delivery.",
  ],
  nonRefundableReasons: [
    "Consumer does not purchase after a valid, permissioned delivery.",
    "Buyer ignores the lead or misses its own SLA.",
    "Buyer requests extra use outside the consented scope.",
    "Buyer changes eligibility criteria after export.",
  ],
} as const satisfies LeadFlowRefundPolicy;

export const LEADFLOW_ROUTING_AUDIT_FIELDS = [
  "route_id",
  "routing_mode",
  "routing_policy_version",
  "partner_account_id",
  "buyer_partner_account_ids",
  "profile_id",
  "identity_id",
  "consent_ledger_ids",
  "entitlement_ids",
  "export_id",
  "score_ids",
  "eligibility_rule_version",
  "sort_factors_used",
  "commercial_tie_breaker_used",
  "suppression_checked_at",
  "duplicate_fingerprint_hash",
  "duplicate_window_days",
  "decay_expires_at",
  "sla_ack_due_at",
  "sla_first_action_due_at",
  "decision",
  "decision_reasons",
  "review_required",
  "refund_window_expires_at",
  "request_id",
] as const;

export const LEADFLOW_MARKETPLACE_ROUTING_POLICIES = [
  {
    mode: "exclusive_lead",
    label: "Exclusive Lead",
    purpose: "Route one consented lead to one named buyer when the consumer-facing flow sets that expectation.",
    allowedExclusivityLevels: ["exclusive_single_seller"],
    requiredConsentScopes: ["single_seller_routing", "sale_or_share"],
    allowedSortFactors: [
      "consumer_expectation_match",
      "partner_fit_score",
      "lead_quality_score",
      "urgency_score",
      "sla_capacity",
      "freshness_decay",
    ],
    highestBidOnlyAllowed: false,
    commercialTieBreakerAllowed: false,
    gates: [
      "active_profile",
      "active_identity",
      "active_consent",
      "no_suppression",
      "partner_eligibility",
      "seller_capacity",
      "dedupe_window",
      "admt_allowed_when_scored",
    ],
    databaseConditions: [
      ...SHARED_IDENTIFIED_DATABASE_CONDITIONS,
      {
        tableOrView: "leadflow.consent_ledger",
        condition:
          "granted = true and revoked_at is null and deleted_at is null and scope = 'single_seller_routing' and buyer_partner_account_id is not null",
      },
      {
        tableOrView: "leadflow.partner_entitlements",
        condition:
          "exclusivity_level = 'exclusive_single_seller' and lifecycle_stage in ('qualified', 'routed', 'sold') and revoked_at is null and deleted_at is null",
      },
      {
        tableOrView: "leadflow.scores",
        condition:
          "scores may be used only when ADMT scoring consent is active and the subject appears in leadflow.scoreable_profiles",
      },
    ],
    sla: {
      acknowledgementMinutes: 15,
      firstActionBusinessHours: 4,
      expiryBusinessHours: 72,
      missedSlaAction: "refund_or_credit",
    },
    duplicatePolicy: {
      fingerprintFields: ["identity_id", "profile_id", "vertical", "buyer_partner_account_id", "questionnaire_id"],
      sameBuyerDecayDays: 60,
      crossBuyerDecayDays: 60,
      allowRerouteWhen: [
        "consumer submits a new route request after the prior decay window",
        "prior buyer entitlement is revoked before delivery",
        "buyer misses SLA and rerouting was disclosed and consented",
      ],
    },
    refundPolicy: SHARED_REFUND_POLICY,
    conflictRules: [
      {
        key: "multiple_active_exclusive_buyers",
        behavior: "hold_for_review",
        description: "Do not auto-resolve two active exclusive buyers. Hold and audit before any delivery.",
      },
      {
        key: "highest_bidder_only",
        behavior: "block",
        description: "Exclusive routing cannot be decided only by the highest bid.",
      },
      {
        key: "source_partner_is_buyer",
        behavior: "hold_for_review",
        description: "Review self-dealing or source-owner conflicts before marking a lead exclusive.",
      },
    ],
    auditActions: [
      "route.exclusive.evaluated",
      "route.exclusive.blocked",
      "route.exclusive.entitlement_created",
      "route.exclusive.export_created",
      "route.exclusive.sla_missed",
      "route.exclusive.refund_credit_issued",
    ],
  },
  {
    mode: "consumer_selected_multi_seller",
    label: "Consumer-Selected Multi-Seller Lead",
    purpose: "Route one lead to the named sellers the consumer selected or clearly accepted in the flow.",
    allowedExclusivityLevels: ["named_multi_partner"],
    requiredConsentScopes: ["named_partner_routing", "sale_or_share"],
    allowedSortFactors: [
      "consumer_selected_partner",
      "consumer_expectation_match",
      "partner_fit_score",
      "lead_quality_score",
      "urgency_score",
      "sla_capacity",
      "fair_rotation",
      "freshness_decay",
      "commercial_tie_breaker",
    ],
    highestBidOnlyAllowed: false,
    commercialTieBreakerAllowed: true,
    gates: [
      "active_profile",
      "active_identity",
      "active_consent",
      "no_suppression",
      "partner_eligibility",
      "seller_capacity",
      "dedupe_window",
      "admt_allowed_when_scored",
    ],
    databaseConditions: [
      ...SHARED_IDENTIFIED_DATABASE_CONDITIONS,
      {
        tableOrView: "leadflow.consent_ledger",
        condition:
          "one active granted named_partner_routing consent row per named buyer_partner_account_id included in the delivery set",
      },
      {
        tableOrView: "leadflow.partner_entitlements",
        condition:
          "exclusivity_level = 'named_multi_partner' and buyer_partner_account_id is in the consumer-selected seller set",
      },
      {
        tableOrView: "leadflow.exports",
        condition:
          "export_type = 'named_partner_leads' and entitlement_ids contains only active entitlements for named buyers",
      },
    ],
    sla: {
      acknowledgementMinutes: 30,
      firstActionBusinessHours: 8,
      expiryBusinessHours: 120,
      missedSlaAction: "reroute_if_allowed",
    },
    duplicatePolicy: {
      fingerprintFields: ["identity_id", "profile_id", "vertical", "buyer_partner_account_id", "questionnaire_id"],
      sameBuyerDecayDays: 30,
      crossBuyerDecayDays: null,
      allowRerouteWhen: [
        "consumer explicitly adds another named seller",
        "seller misses SLA and backup sellers were named in the consent experience",
        "consumer edits the request enough to create a materially new need",
      ],
    },
    refundPolicy: SHARED_REFUND_POLICY,
    conflictRules: [
      {
        key: "buyer_not_named",
        behavior: "block",
        description: "Never include a seller that was not named, selected, or clearly accepted by the consumer.",
      },
      {
        key: "highest_bidder_only",
        behavior: "block",
        description: "A bid can break a tie only after consent, eligibility, SLA capacity, and fair rotation pass.",
      },
      {
        key: "seller_cap_exceeded",
        behavior: "allow_with_audit",
        description: "Skip over sellers who have reached caps; log the skipped reason for fairness reporting.",
      },
    ],
    auditActions: [
      "route.multi_seller.evaluated",
      "route.multi_seller.partner_skipped",
      "route.multi_seller.entitlement_created",
      "route.multi_seller.export_created",
      "route.multi_seller.sla_missed",
      "route.multi_seller.rerouted",
      "route.multi_seller.refund_credit_issued",
    ],
  },
  {
    mode: "aggregated_insight_only",
    label: "Aggregated Insight Only",
    purpose: "Produce non-personal demand intelligence without routing a person or profile to a buyer.",
    allowedExclusivityLevels: ["aggregated_only"],
    requiredConsentScopes: ["aggregated_insights"],
    allowedSortFactors: ["freshness_decay"],
    highestBidOnlyAllowed: false,
    commercialTieBreakerAllowed: false,
    gates: ["active_consent", "no_suppression", "aggregate_threshold"],
    databaseConditions: [
      {
        tableOrView: "leadflow.aggregated_insights",
        condition:
          "profile_count >= product_threshold and no identity_id, profile_id, answer_id, raw payload, or contact field appears in the output",
      },
      {
        tableOrView: "leadflow.exports",
        condition: "export_type = 'aggregated_insights' and entitlement_ids is empty",
      },
      {
        tableOrView: "leadflow.consent_ledger",
        condition:
          "source records have active aggregated_insights consent or are anonymous analytics records with no identified profile output",
      },
    ],
    sla: {
      acknowledgementMinutes: null,
      firstActionBusinessHours: null,
      expiryBusinessHours: null,
      missedSlaAction: "report_stale",
    },
    duplicatePolicy: {
      fingerprintFields: ["vertical", "category_key", "time_bucket", "region_bucket"],
      sameBuyerDecayDays: 7,
      crossBuyerDecayDays: null,
      allowRerouteWhen: ["new reporting period starts", "underlying aggregate refresh changes the bucket materially"],
    },
    refundPolicy: {
      refundableReasons: [
        "Report was delivered from a stale window outside the purchased time range.",
        "Aggregate threshold was not met after privacy filtering.",
        "Purchased category or market bucket was materially wrong.",
      ],
      nonRefundableReasons: [
        "Buyer wants identified lead records from an aggregate-only product.",
        "Buyer expected a sales outcome from a trend report.",
      ],
    },
    conflictRules: [
      {
        key: "aggregate_threshold_not_met",
        behavior: "block",
        description: "Do not export an aggregate bucket below the configured privacy threshold.",
      },
      {
        key: "contains_personal_record",
        behavior: "block",
        description: "Any identity, profile, contact, raw answer, or raw event field blocks aggregate export.",
      },
      {
        key: "buyer_requests_identification",
        behavior: "block",
        description: "Aggregate buyers cannot reverse engineer or request re-identification.",
      },
    ],
    auditActions: [
      "route.aggregate.evaluated",
      "route.aggregate.blocked",
      "route.aggregate.export_created",
      "route.aggregate.report_stale",
      "route.aggregate.refund_credit_issued",
    ],
  },
] as const satisfies readonly LeadFlowRoutingPolicy[];

export function getLeadFlowRoutingPolicy(mode: LeadFlowRoutingMode) {
  return LEADFLOW_MARKETPLACE_ROUTING_POLICIES.find((policy) => policy.mode === mode);
}

export function canUseCommercialTieBreaker(mode: LeadFlowRoutingMode) {
  return Boolean(getLeadFlowRoutingPolicy(mode)?.commercialTieBreakerAllowed);
}

export function isHighestBidOnlyRoutingAllowed(mode: LeadFlowRoutingMode) {
  void mode;
  return false;
}
