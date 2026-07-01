export const LEADFLOW_BLOCKED_EVENT_KEYS = [
  "email",
  "phone",
  "name",
  "first_name",
  "last_name",
  "address",
  "street",
  "ssn",
  "dob",
  "raw_answer",
  "message",
  "notes",
  "medical",
  "health",
  "race",
  "religion",
  "sexual_orientation",
  "exact_income",
  "bank_account",
  "credit_card",
  "password",
  "token",
] as const;

export const LEADFLOW_FUNNEL_EVENTS = [
  "homepage_viewed",
  "hero_cta_clicked",
  "buyer_lane_clicked",
  "system_lane_clicked",
  "submit_source_lane_clicked",
  "marketplace_viewed",
  "marketplace_filter_changed",
  "listing_card_clicked",
  "listing_preview_opened",
  "sample_request_started",
  "sample_request_submitted",
  "access_request_started",
  "access_request_submitted",
  "watchlist_added",
  "tools_hub_viewed",
  "tool_card_clicked",
  "questionnaire_started",
  "questionnaire_step_completed",
  "questionnaire_completed",
  "result_viewed",
  "consent_given",
  "contact_request_submitted",
  "submit_source_viewed",
  "source_submission_started",
  "source_submission_step_completed",
  "source_file_uploaded",
  "source_submission_completed",
  "source_submission_flagged",
  "buyer_login_started",
  "buyer_login_completed",
  "buyer_dashboard_viewed",
  "buyer_profile_updated",
  "buyer_request_viewed",
  "buyer_export_started",
  "buyer_export_completed",
  "admin_dashboard_viewed",
  "admin_table_filtered",
  "admin_profile_reviewed",
  "admin_profile_approved",
  "admin_source_reviewed",
  "admin_buyer_request_reviewed",
  "admin_export_created",
  "admin_suppression_resolved",
  "partner_signup_started",
  "partner_signup_completed",
  "partner_dashboard_viewed",
  "partner_source_submitted",
  "partner_source_status_viewed",
  "partner_earnings_viewed",
  "admin_partner_reviewed",
  "partner_payout_marked_paid",
  "sample_page_viewed",
  "sample_requested",
  "sample_checkout_started",
  "sample_payment_completed",
  "sample_access_granted",
  "sample_viewed",
  "sample_downloaded",
  "full_access_requested_from_sample",
  "admin_sample_reviewed",
  "exclusive_request_started",
  "exclusive_request_submitted",
  "exclusive_request_reviewed",
  "exclusive_access_granted",
  "exclusive_access_expired",
  "listing_reserved",
  "listing_sold_exclusive",
  "checkout_started",
  "checkout_completed",
  "checkout_failed",
  "order_created",
  "order_paid",
  "entitlement_granted_after_payment",
  "order_manual_review_required",
  "admin_order_reviewed",
  "integration_page_viewed",
  "integration_created",
  "integration_tested",
  "integration_run_started",
  "integration_run_completed",
  "integration_run_failed",
  "integration_paused",
  "integration_revoked",
  "widget_loaded",
  "widget_started",
  "widget_step_completed",
  "widget_completed",
  "widget_result_viewed",
  "widget_contact_submitted",
  "civic_page_viewed",
  "civic_survey_started",
  "civic_survey_completed",
  "civic_dashboard_viewed",
  "civic_issue_aggregate_viewed",
  "civic_submission_flagged",
  "questionnaire_builder_opened",
  "questionnaire_created",
  "question_added",
  "scoring_rule_added",
  "consent_module_added",
  "questionnaire_previewed",
  "questionnaire_published",
  "questionnaire_cloned",
  "questionnaire_archived",
  "product_factory_opened",
  "product_factory_source_selected",
  "product_factory_quality_reviewed",
  "product_factory_listing_generated",
  "product_factory_listing_published",
  "product_factory_blocked_by_compliance",
] as const;

const EMAIL_LIKE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_LIKE = /\+?\d[\d().\-\s]{7,}\d/;
const ADDRESS_LIKE = /\b\d{2,6}\s+[a-z0-9.' -]{3,}\s+(street|st|road|rd|avenue|ave|lane|ln|drive|dr|court|ct|circle|cir|boulevard|blvd)\b/i;
const SSN_LIKE = /\b\d{3}-?\d{2}-?\d{4}\b/;
const CARD_LIKE = /\b(?:\d[ -]*?){13,19}\b/;
const TOKEN_LIKE = /\b(?:sk|pk|pat|ghp|xoxb|xoxp|eyJ)[A-Za-z0-9._-]{16,}\b/;

const EVENT_NAME_PATTERN = /^[a-z0-9][a-z0-9_.:-]{1,95}$/;

export type LeadFlowEventProperties = Record<string, string | number | boolean | null | undefined>;

export function normalizeLeadFlowEventName(eventName: string) {
  return eventName
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96);
}

export function isSafeLeadFlowEventName(eventName: string) {
  return EVENT_NAME_PATTERN.test(eventName);
}

function blockedKey(key: string) {
  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  return LEADFLOW_BLOCKED_EVENT_KEYS.some((blocked) => normalizedKey.includes(blocked));
}

function blockedString(value: string) {
  return (
    EMAIL_LIKE.test(value) ||
    PHONE_LIKE.test(value) ||
    ADDRESS_LIKE.test(value) ||
    SSN_LIKE.test(value) ||
    CARD_LIKE.test(value.replace(/\s+/g, "")) ||
    TOKEN_LIKE.test(value)
  );
}

export function sanitizeLeadFlowEventProperties(properties: Record<string, unknown>) {
  const safe: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(properties)) {
    if (blockedKey(key)) continue;
    const safeKey = key
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48);
    if (!safeKey || blockedKey(safeKey)) continue;

    if (typeof value === "number" && Number.isFinite(value)) {
      safe[safeKey] = value;
      continue;
    }
    if (typeof value === "boolean") {
      safe[safeKey] = value;
      continue;
    }
    if (typeof value !== "string") continue;

    const compact = value.replace(/\s+/g, " ").trim();
    if (!compact || compact.length > 140 || blockedString(compact)) continue;

    safe[safeKey] = compact.slice(0, 140);
  }

  return safe;
}
