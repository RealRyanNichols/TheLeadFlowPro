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

const EMAIL_LIKE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_LIKE = /\+?\d[\d().\-\s]{7,}\d/;
const ADDRESS_LIKE = /\b\d{2,6}\s+[a-z0-9.' -]{3,}\s+(street|st|road|rd|avenue|ave|lane|ln|drive|dr|court|ct|circle|cir|boulevard|blvd)\b/i;

export type LeadFlowEventProperties = Record<string, string | number | boolean | null | undefined>;

export function sanitizeLeadFlowEventProperties(properties: Record<string, unknown>) {
  const safe: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(properties)) {
    const normalizedKey = key.toLowerCase();
    if (LEADFLOW_BLOCKED_EVENT_KEYS.some((blocked) => normalizedKey.includes(blocked))) continue;
    if (typeof value === "number" && Number.isFinite(value)) {
      safe[key.slice(0, 48)] = value;
      continue;
    }
    if (typeof value === "boolean") {
      safe[key.slice(0, 48)] = value;
      continue;
    }
    if (typeof value !== "string") continue;

    const compact = value.replace(/\s+/g, " ").trim();
    if (!compact || compact.length > 140) continue;
    if (EMAIL_LIKE.test(compact) || PHONE_LIKE.test(compact) || ADDRESS_LIKE.test(compact)) continue;

    safe[key.slice(0, 48)] = compact;
  }

  return safe;
}
