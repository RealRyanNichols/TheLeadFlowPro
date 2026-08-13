import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";

// Read-only public feed for /live. This route only ever calls the two
// sanitized public RPCs — it CANNOT reach raw events (the anon role has no
// select on analytics_events), so nothing private can leak through it even
// by bug. Cached at the edge so polling clients don't multiply database load.

export const revalidate = 0; // caching handled via Cache-Control below

export async function GET() {
  try {
    const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const [metrics, feed, series] = await Promise.all([
      supabase.rpc("public_live_metrics"),
      supabase.rpc("public_live_feed", { p_limit: 12 }),
      supabase.rpc("public_live_series"),
    ]);

    return NextResponse.json(
      {
        metrics: metrics.data ?? null,
        feed: feed.data ?? [],
        series: series.data ?? null,
        fetched_at: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { metrics: null, feed: [], series: null, error: "unavailable" },
      { status: 503 }
    );
  }
}
