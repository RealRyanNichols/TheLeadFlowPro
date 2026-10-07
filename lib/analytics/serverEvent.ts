import { classifySourceFamily, sanitizeMeta } from "./shared";
import { safeAnalyticsPath } from "./privacy";
import { sanitizeCampaignAttribution } from "./attribution";

export type ServerEventInput = {
  event_name: string;
  label?: string;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  meta?: Record<string, unknown>;
};

function anonymousCookie(cookies: string, name: string): string | null {
  const raw = cookies.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))?.[1];
  if (!raw) return null;
  try {
    const value = decodeURIComponent(raw);
    if (!/^[a-z0-9-]{8,100}$/i.test(value) || /^\d{8,}$/.test(value)) return null;
    return value;
  } catch { return null; }
}

export function serverEventRow(request: Request, input: ServerEventInput) {
  if (!/^[a-z][a-z0-9_]{1,63}$/.test(input.event_name)) return null;
  const cookies = request.headers.get("cookie") ?? "";
  let path = "/";
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const from = new URL(referer);
      if (["theleadflowpro.com", "www.theleadflowpro.com", "go.theleadflowpro.com"].includes(from.hostname.toLowerCase())) {
        const publicPath = safeAnalyticsPath(referer);
        if (!publicPath) return null;
        path = publicPath.slice(0, 300);
      }
    } catch { /* no public referrer: use the neutral path */ }
  }
  const attribution = sanitizeCampaignAttribution(input);
  const label = sanitizeMeta({ label: input.label }).label;
  const meta = sanitizeMeta(input.meta ?? {});
  for (const key of Object.keys(meta)) if (key.includes("body")) delete meta[key];
  return {
    event_name: input.event_name,
    visitor_id: anonymousCookie(cookies, "lfp_vid"),
    session_id: anonymousCookie(cookies, "lfp_sid"),
    path,
    label: typeof label === "string" ? label : null,
    utm_source: attribution.utm_source ?? null,
    utm_medium: attribution.utm_medium ?? null,
    utm_campaign: attribution.utm_campaign ?? null,
    utm_content: attribution.utm_content ?? null,
    source_family: classifySourceFamily(attribution.utm_source, attribution.utm_medium, null),
    is_internal: /(?:^|;\s*)lfp_int=1(?:;|$)/.test(cookies),
    meta,
  };
}
