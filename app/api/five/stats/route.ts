import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";
import { FIVE_OFFER, FIVE_TRACKING, fiveOfferExpired } from "@/lib/fiveOffer";

// The live counters on /five: how many people looked, how many clicked the
// buy button, and how many of the five spots are gone. Public, read only,
// no personal data. Views and clicks come from the first-party analytics
// table (internal visits excluded). Spots taken come from the purchases
// ledger, which only the Stripe webhook writes.
//
// Numbers are counted from the launch moment so the page never shows a
// count that predates the offer.

export const dynamic = "force-dynamic";

type Stats = {
  ok: boolean;
  views: number;
  clicks: number;
  taken: number;
  spots: number;
  left: number;
  soldOut: boolean;
  expired: boolean;
  deadlineIso: string;
};

const EMPTY: Stats = {
  ok: false,
  views: 0,
  clicks: 0,
  taken: 0,
  spots: FIVE_OFFER.spots,
  left: FIVE_OFFER.spots,
  soldOut: false,
  expired: fiveOfferExpired(),
  deadlineIso: FIVE_OFFER.deadlineIso,
};

const HEADERS = {
  "Cache-Control": "public, s-maxage=20, stale-while-revalidate=120",
};

export async function GET() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceKey) return NextResponse.json(EMPTY, { headers: HEADERS });

  try {
    const supabase = createSupabaseClient(SUPABASE_URL, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const since = FIVE_OFFER.launchIso;

    const [views, clicks, taken] = await Promise.all([
      supabase
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .eq("event_name", "page_view")
        .eq("path", FIVE_OFFER.path)
        .eq("is_internal", false)
        .gte("created_at", since),
      supabase
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .eq("event_name", "checkout_start")
        .eq("label", FIVE_TRACKING.checkoutLabel)
        .eq("is_internal", false)
        .gte("created_at", since),
      supabase
        .from("purchases")
        .select("id", { count: "exact", head: true })
        .eq("kind", FIVE_OFFER.kind)
        .eq("status", "paid"),
    ]);

    const takenCount = Math.max(0, taken.count ?? 0);
    const left = Math.max(0, FIVE_OFFER.spots - takenCount);
    const body: Stats = {
      ok: !views.error && !clicks.error && !taken.error,
      views: Math.max(0, views.count ?? 0),
      clicks: Math.max(0, clicks.count ?? 0),
      taken: takenCount,
      spots: FIVE_OFFER.spots,
      left,
      soldOut: left === 0,
      expired: fiveOfferExpired(),
      deadlineIso: FIVE_OFFER.deadlineIso,
    };
    return NextResponse.json(body, { headers: HEADERS });
  } catch (error) {
    console.error("five stats failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(EMPTY, { headers: HEADERS });
  }
}
