import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";
import { classifySourceFamily, sanitizeMeta } from "./shared";

/**
 * Server-side conversion events. Lead creation is recorded here — in the API
 * route where the lead insert actually succeeded — because most lead forms
 * finish inline without a redirect the client tracker could see.
 *
 * Attribution only, never identity: the anonymous visitor/session cookies the
 * tracker already set on the same request, UTM values, and coarse labels. No
 * name, no email, no phone, no answers.
 */
export async function recordServerEvent(
  request: Request,
  input: {
    event_name: string;
    label?: string;
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    meta?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    const cookies = request.headers.get("cookie") ?? "";
    const visitorId = cookies.match(/(?:^|;\s*)lfp_vid=([^;]+)/)?.[1]?.slice(0, 100) ?? null;
    const sessionId = cookies.match(/(?:^|;\s*)lfp_sid=([^;]+)/)?.[1]?.slice(0, 100) ?? null;
    const isInternal = /(?:^|;\s*)lfp_int=1(?:;|$)/.test(cookies);

    let path = "/";
    const referer = request.headers.get("referer");
    if (referer) {
      try {
        path = new URL(referer).pathname.slice(0, 300) || "/";
      } catch {
        /* keep default */
      }
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createSupabaseClient(SUPABASE_URL, serviceKey || SUPABASE_ANON_KEY);

    await supabase.from("analytics_events").insert({
      event_name: input.event_name,
      visitor_id: visitorId ? decodeURIComponent(visitorId) : null,
      session_id: sessionId ? decodeURIComponent(sessionId) : null,
      path,
      label: input.label?.slice(0, 120) ?? null,
      utm_source: input.utm_source?.slice(0, 100) ?? null,
      utm_medium: input.utm_medium?.slice(0, 100) ?? null,
      utm_campaign: input.utm_campaign?.slice(0, 100) ?? null,
      source_family: classifySourceFamily(input.utm_source, input.utm_medium, null),
      is_internal: isInternal,
      meta: sanitizeMeta(input.meta ?? {}),
    });
  } catch {
    // Analytics must never break lead capture.
  }
}
