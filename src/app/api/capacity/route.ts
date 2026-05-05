// src/app/api/capacity/route.ts — public read of Ryan's bandwidth state.
//
// Cached for 60 seconds at the edge. Anyone can hit this; powers the public
// BandwidthMeter component on the homepage, /book, /contact, /tiers, /offers/*.

import { NextResponse } from "next/server";
import { getCapacitySnapshot } from "@/lib/capacity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const snapshot = await getCapacitySnapshot();
    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Capacity data unavailable",
        capacity: 60,
        booked: 0,
        remaining: 60,
        utilizationPct: 0,
        activeClientCount: 0,
        recentlyCompletedCount: 0,
        activeEngagements: [],
        status: "open",
        lastUpdated: new Date().toISOString(),
        _err: err instanceof Error ? err.message : String(err),
      },
      { status: 200 }
    );
  }
}
