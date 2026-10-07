/** Public campaign labels only. Never copy contact details or arbitrary form fields. */
export const CAMPAIGN_KEYS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_content",
] as const;
export type CampaignAttribution = Partial<Record<(typeof CAMPAIGN_KEYS)[number], string>>;

export function sanitizeCampaignAttribution(raw: unknown): CampaignAttribution {
  const out: CampaignAttribution = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const key of CAMPAIGN_KEYS) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value !== "string") continue;
    const label = value.trim();
    // Inspect before truncation. Encoding, URLs, emails, phone/card-like values,
    // and opaque recipient/credential IDs cannot become public campaign labels.
    if (!label || label.length > 100 || !/^[a-z0-9][a-z0-9._~-]*$/i.test(label)) continue;
    if (/(?:\d[._-]?){10,}/.test(label)) continue;
    if (/^[a-f0-9]{32,}$/i.test(label) || /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(label)) continue;
    if (/^[a-z0-9_~]{40,}$/i.test(label)) continue;
    out[key] = label;
  }
  return out;
}
