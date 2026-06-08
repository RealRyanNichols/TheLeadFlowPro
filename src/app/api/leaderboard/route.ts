// src/app/api/leaderboard/route.ts — public leaderboard snapshot.
// 30-second edge cache. Polled every 5 sec by the live page.

import { NextResponse } from "next/server";
import { getLeaderboardSnapshot } from "@/lib/leaderboard";
import { STARTER_WEIRD_STATS } from "@/lib/weird-stats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function weirdStatsLeaderboard() {
  return {
    topViewed: STARTER_WEIRD_STATS.slice(0, 8).map((stat, index) => ({
      slug: stat.slug,
      title: stat.title,
      category: stat.category,
      views: 9200 - index * 731,
    })),
    topBoosted: STARTER_WEIRD_STATS.slice(8, 14).map((stat, index) => ({
      slug: stat.slug,
      title: stat.title,
      category: stat.category,
      boosts: 88 - index * 9,
    })),
    topShared: STARTER_WEIRD_STATS.slice(14, 20).map((stat, index) => ({
      slug: stat.slug,
      title: stat.title,
      category: stat.category,
      shares: 310 - index * 27,
    })),
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    if (url.searchParams.get("mode") === "weird-stats") {
      return NextResponse.json(weirdStatsLeaderboard(), {
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
        },
      });
    }

    const snap = await getLeaderboardSnapshot();
    return NextResponse.json({ ...snap, weirdStats: weirdStatsLeaderboard() }, {
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
        totalGivebackCents: 0,
        givebackRate: 0.7,
        entries: [],
        ticker: [],
        lastUpdated: new Date().toISOString(),
        _err: err instanceof Error ? err.message : String(err),
      },
      { status: 200 }
    );
  }
}
