// Server-owned enrollment markers. Public intake must strip these reserved keys.
export const META_DAILY_ENROLLMENT_KEY = "meta_daily30";
export const META_DAILY_DUPLICATE_KEY = "meta_daily30_duplicate_of";
export const META_DAILY_ENROLLMENT_CAMPAIGN = "meta_sales_daily30_v1";

export type MetaDailyEnrollment = {
  version: 1;
  campaign: typeof META_DAILY_ENROLLMENT_CAMPAIGN;
  enrolled_at: string;
  meta_lead_id: string;
  source: "facebook_lead_ads";
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

export function createMetaDailyEnrollment(nowIso: string, verifiedMetaID: string): MetaDailyEnrollment | null {
  const at = Date.parse(nowIso);
  if (!/^\d+$/.test(verifiedMetaID) || !Number.isFinite(at)) return null;
  return { version: 1, campaign: META_DAILY_ENROLLMENT_CAMPAIGN,
    enrolled_at: new Date(at).toISOString(), meta_lead_id: verifiedMetaID,
    source: "facebook_lead_ads" };
}

export function readMetaDailyEnrollment(diagnostic: unknown): MetaDailyEnrollment | null {
  const marker = record(record(diagnostic)[META_DAILY_ENROLLMENT_KEY]);
  if (marker.version !== 1 || marker.campaign !== META_DAILY_ENROLLMENT_CAMPAIGN ||
      marker.source !== "facebook_lead_ads" || typeof marker.meta_lead_id !== "string" ||
      !/^\d+$/.test(marker.meta_lead_id) || typeof marker.enrolled_at !== "string") return null;
  const at = Date.parse(marker.enrolled_at);
  // One canonical timestamp format keeps the indexed JSON-path lookback safe.
  if (!Number.isFinite(at) || new Date(at).toISOString() !== marker.enrolled_at) return null;
  return marker as MetaDailyEnrollment;
}

export function hasMetaDailyEnrollment(diagnostic: unknown): boolean {
  return Object.hasOwn(record(diagnostic), META_DAILY_ENROLLMENT_KEY);
}

export function hasMetaDailyDuplicateHold(diagnostic: unknown): boolean {
  // Even a malformed hold is a hold; do not silently resume an older lane.
  return Object.hasOwn(record(diagnostic), META_DAILY_DUPLICATE_KEY);
}

export function stripMetaDailyEnrollment(diagnostic: unknown): Record<string, unknown> {
  const clean = { ...record(diagnostic) };
  delete clean[META_DAILY_ENROLLMENT_KEY];
  delete clean[META_DAILY_DUPLICATE_KEY];
  return clean;
}

export function metaDailyEnrollmentFingerprint(diagnostic: unknown): string {
  const data = record(diagnostic);
  const marker = data[META_DAILY_ENROLLMENT_KEY];
  // Compare semantic fields, not unrelated diagnostic fields or JSON key order.
  const valid = readMetaDailyEnrollment(diagnostic);
  return JSON.stringify([
    hasMetaDailyEnrollment(diagnostic), valid ? [valid.version, valid.campaign,
      valid.enrolled_at, valid.meta_lead_id, valid.source] : marker,
    hasMetaDailyDuplicateHold(diagnostic), data[META_DAILY_DUPLICATE_KEY],
  ]);
}
