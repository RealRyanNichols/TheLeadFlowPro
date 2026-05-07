// src/app/api/leaderboard/route.ts — public leaderboard snapshot.
// 30-second edge cache. Polled every 5 sec by the live page.

import { NextResponse } from "next/server";
import { getLeaderboardSnapshot } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const snap = await getLeaderboardSnapshot();
    return NextResponse.json(snap, {
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Leaderboard temporarily unavailable",
        weekStart: new Date().toISOString(),
        weekEnd: new Date(Date.now() + 7 * 86400_000).toISOString(),
        resetsInSeconds: 0,
        totalEntries: 0,
        totalDollars: 0,
        entries: [],
        ticker: [],
        lastUpdated: new Date().toISOString(),
        _err: err instanceof Error ? err.message : String(err),
      },
      { status: 200 }
    );
  }
}
