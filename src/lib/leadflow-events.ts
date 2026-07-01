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
