export const E164_US_MOBILE_PATTERN = "^\\+1\\d{10}$";

export function isE164UsPhone(value: unknown): value is string {
  return typeof value === "string" && /^\+1\d{10}$/.test(value.trim());
}

export function cleanE164UsPhone(value: unknown): string | null {
  if (!isE164UsPhone(value)) return null;
  return value.trim();
}

export function parseSmsOptOut(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1";
}
