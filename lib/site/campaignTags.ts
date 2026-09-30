// Which campaign sent a lead. The form page's own address wins. Otherwise the
// lead gets the tags the visitor arrived with this session, which
// lib/analytics/client.ts keeps in sessionStorage as "lfp_utm". Without this,
// a visitor who lands on /agency/crypto-checkout from a post and then opens
// the intake is recorded with no source at all.
//
// Leaf module: no React, no Next.js, so the unit tests run it directly.

export type CampaignTags = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
};

const KEYS = ["utm_source", "utm_medium", "utm_campaign"] as const;

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 100) : null;
}

/**
 * Tags for a lead. URL tags and stored tags are never mixed: if the form's
 * own address carries any tag, only the address is used.
 */
export function campaignTags(params: URLSearchParams, stored: unknown, fallbackMedium: string): CampaignTags {
  const fromUrl = KEYS.some((k) => clean(params.get(k)) !== null);
  const source: Record<string, unknown> = fromUrl
    ? Object.fromEntries(KEYS.map((k) => [k, params.get(k)]))
    : stored && typeof stored === "object" && !Array.isArray(stored)
      ? (stored as Record<string, unknown>)
      : {};
  return {
    utm_source: clean(source.utm_source),
    utm_medium: clean(source.utm_medium) ?? fallbackMedium,
    utm_campaign: clean(source.utm_campaign),
  };
}

/** The session's stored tags. Never throws: private windows and blocked storage return {}. */
export function storedCampaignTags(): unknown {
  try {
    return JSON.parse(window.sessionStorage.getItem("lfp_utm") || "{}");
  } catch {
    return {};
  }
}
