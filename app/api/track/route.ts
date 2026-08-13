import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";
import {
  validateEvent,
  isBotUserAgent,
  deviceFromUserAgent,
  browserFromUserAgent,
  referrerHostOf,
  classifySourceFamily,
  type IncomingEvent,
} from "@/lib/analytics/shared";

// First-party event ingestion. Accepts the batched shape from
// lib/analytics/client.ts and the legacy single page-view body older cached
// bundles still send. Page views keep flowing into the original page_views
// table so nothing that reads it breaks; everything lands in analytics_events.

const MAX_BATCH = 25;

// Best-effort rate limiting. Serverless instances don't share memory, so this
// is a burst guard, not a hard quota — the database policy and size caps are
// the real backstop.
const buckets = new Map<string, { count: number; reset: number }>();
const WINDOW_MS = 10_000;
const MAX_PER_WINDOW = 60;

function rateLimited(key: string, cost: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.reset < now) {
    buckets.set(key, { count: cost, reset: now + WINDOW_MS });
    if (buckets.size > 5000) buckets.clear();
    return false;
  }
  bucket.count += cost;
  return bucket.count > MAX_PER_WINDOW;
}

type EventRow = {
  client_id?: string;
  event_name: string;
  visitor_id: string | null;
  session_id: string | null;
  path: string;
  page_title: string | null;
  label: string | null;
  target_host: string | null;
  tool_slug: string | null;
  referrer: string | null;
  referrer_host: string | null;
  source_family: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  device: string;
  browser: string;
  country: string | null;
  region: string | null;
  visitor_type: string | null;
  is_internal: boolean;
  meta: Record<string, string | number | boolean>;
};

export async function POST(request: Request) {
  try {
    const ua = request.headers.get("user-agent");
    if (isBotUserAgent(ua)) {
      return NextResponse.json({ ok: true, skipped: "bot" });
    }

    const body = await request.json();

    // Legacy single-event body from the previous TrackingScripts bundle.
    const rawEvents: unknown[] = Array.isArray(body?.events)
      ? body.events.slice(0, MAX_BATCH)
      : body?.path
        ? [{ event_name: "page_view", ...body }]
        : [];

    if (rawEvents.length === 0) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const cookies = request.headers.get("cookie") ?? "";
    const isInternal =
      body?.internal === true || /(?:^|;\s*)lfp_int=1(?:;|$)/.test(cookies);

    const firstValid = rawEvents
      .map((e) => validateEvent(e))
      .filter((e): e is IncomingEvent => e !== null);
    if (firstValid.length === 0) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const ip =
      request.headers.get("x-real-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const limiterKey = firstValid[0].visitor_id ?? ip;
    if (rateLimited(limiterKey, firstValid.length)) {
      return NextResponse.json({ ok: true, skipped: "rate" });
    }

    // Coarse geo only, from Vercel's edge headers. The IP itself is never
    // stored anywhere.
    const country = request.headers.get("x-vercel-ip-country");
    const region = request.headers.get("x-vercel-ip-country-region");
    const device = deviceFromUserAgent(ua);
    const browser = browserFromUserAgent(ua);

    const rows: EventRow[] = firstValid.map((e) => {
      const referrerHost = referrerHostOf(e.referrer);
      return {
        client_id: e.client_id,
        event_name: e.event_name,
        visitor_id: e.visitor_id ?? null,
        session_id: e.session_id ?? null,
        path: e.path ?? "/",
        page_title: e.page_title ?? null,
        label: e.label ?? null,
        target_host: e.target_host ?? null,
        tool_slug: e.tool_slug ?? null,
        referrer: e.referrer ?? null,
        referrer_host: referrerHost,
        source_family: classifySourceFamily(e.utm_source, e.utm_medium, referrerHost),
        utm_source: e.utm_source ?? null,
        utm_medium: e.utm_medium ?? null,
        utm_campaign: e.utm_campaign ?? null,
        utm_content: e.utm_content ?? null,
        device,
        browser,
        country: country ? country.slice(0, 8) : null,
        region: region ? region.slice(0, 80) : null,
        visitor_type: e.visitor_type ?? null,
        is_internal: isInternal,
        meta: e.meta ?? {},
      };
    });

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createSupabaseClient(SUPABASE_URL, serviceKey || SUPABASE_ANON_KEY);

    const { error } = await supabase
      .from("analytics_events")
      .upsert(rows, { onConflict: "client_id", ignoreDuplicates: true });
    if (error) {
      // Fall back to plain inserts (e.g. rows without client_id conflicts).
      await supabase.from("analytics_events").insert(rows);
    }

    // Keep the original page_views pipe alive for anything still reading it.
    const pageViews = rows
      .filter((r) => r.event_name === "page_view" && !r.is_internal)
      .map((r) => ({
        path: r.path,
        referrer: r.referrer,
        visitor_id: r.visitor_id,
        utm_source: r.utm_source,
        utm_medium: r.utm_medium,
        utm_campaign: r.utm_campaign,
      }));
    if (pageViews.length > 0) {
      await supabase.from("page_views").insert(pageViews);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
