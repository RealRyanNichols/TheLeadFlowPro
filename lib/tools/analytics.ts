// Tool analytics.
//
// Goes through the platforms already on the site (Vercel Analytics for product
// events, gtag for ad conversions). No second analytics tool was added.
//
// The rule that matters: never send what somebody typed. A calculator input is
// their revenue, their payroll, their household budget or their patient volume.
// Events carry the tool slug, the preset they picked and coarse counts. That is
// enough to know which tools earn their place and which searches come up empty.
// See docs/TOOLS_ANALYTICS.md.

import { track as vercelTrack } from "@vercel/analytics";

export type ToolEvent =
  | "tools_directory_view"
  | "tool_search"
  | "tool_search_no_results"
  | "tool_filter_applied"
  | "tool_card_opened"
  | "tool_started"
  | "tool_completed"
  | "tool_preset_applied"
  | "tool_result_copied"
  | "tool_result_downloaded"
  | "tool_result_printed"
  | "tool_result_emailed"
  | "embed_requested"
  | "embed_code_copied"
  | "industry_collection_viewed"
  | "tool_request_submitted"
  | "map_my_company_clicked";

/** Only these value types are allowed through, and only on an allowed key. */
type Props = Record<string, string | number | boolean | undefined>;

/**
 * Keys we are willing to send. Anything else is dropped rather than trusted,
 * so a future caller cannot accidentally pipe a field value into analytics.
 */
const ALLOWED_KEYS = new Set([
  "slug", "preset", "domain", "toolType", "industry", "audience", "goal",
  "collection", "sort", "filter", "results", "terms", "length", "format",
  "surface", "position", "reason",
]);

const MAX_STRING = 60;

function clean(props?: Props): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!props) return out;
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || !ALLOWED_KEYS.has(k)) continue;
    out[k] = typeof v === "string" ? v.slice(0, MAX_STRING) : v;
  }
  return out;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export function trackTool(event: ToolEvent, props?: Props) {
  if (typeof window === "undefined") return;
  const payload = clean(props);
  try {
    vercelTrack(event, payload);
  } catch {
    /* analytics must never break a free calculator */
  }
  try {
    window.gtag?.("event", event, payload);
  } catch {
    /* same */
  }
}

/**
 * Search terms are the one free-text thing worth keeping, because a search that
 * returns nothing is a tool request. Truncated, lowercased, and only sent when
 * the user has stopped typing.
 */
export function trackSearch(query: string, results: number) {
  const terms = query.trim().toLowerCase().slice(0, MAX_STRING);
  if (terms.length < 2) return;
  trackTool(results === 0 ? "tool_search_no_results" : "tool_search", { terms, results });
}
