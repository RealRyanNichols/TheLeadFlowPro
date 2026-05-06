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
        decisionSprintReserveHours: 5,
        decisionSprintsRemaining: 12,
        activeClientCount: 0,
        recentlyCompletedCount: 0,
        activeEngagements: [],
        offerCapacity: [],
        forecastWindows: [
          { key: "7d", label: "Next 7 days", days: 7, weeks: 1, capacityHours: 60, bookedHours: 0, remainingHours: 60, utilizationPct: 0, decisionSprintBlocks: 12 },
          { key: "14d", label: "Next 2 weeks", days: 14, weeks: 2, capacityHours: 120, bookedHours: 0, remainingHours: 120, utilizationPct: 0, decisionSprintBlocks: 24 },
          { key: "30d", label: "Next 30 days", days: 30, weeks: 4.3, capacityHours: 257.1, bookedHours: 0, remainingHours: 257.1, utilizationPct: 0, decisionSprintBlocks: 51 },
          { key: "60d", label: "Next 60 days", days: 60, weeks: 8.6, capacityHours: 514.3, bookedHours: 0, remainingHours: 514.3, utilizationPct: 0, decisionSprintBlocks: 102 },
          { key: "90d", label: "Next 90 days", days: 90, weeks: 12.9, capacityHours: 771.4, bookedHours: 0, remainingHours: 771.4, utilizationPct: 0, decisionSprintBlocks: 154 },
          { key: "6mo", label: "Next 6 months", days: 182, weeks: 26, capacityHours: 1560, bookedHours: 0, remainingHours: 1560, utilizationPct: 0, decisionSprintBlocks: 312 },
          { key: "12mo", label: "Next 12 months", days: 365, weeks: 52.1, capacityHours: 3128.6, bookedHours: 0, remainingHours: 3128.6, utilizationPct: 0, decisionSprintBlocks: 625 },
          { key: "10yr", label: "120 months", days: 3650, weeks: 521.4, capacityHours: 31285.7, bookedHours: 0, remainingHours: 31285.7, utilizationPct: 0, decisionSprintBlocks: 6257 },
        ],
        status: "open",
        lastUpdated: new Date().toISOString(),
        _err: err instanceof Error ? err.message : String(err),
      },
      { status: 200 }
    );
  }
}
