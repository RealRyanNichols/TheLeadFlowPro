import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { SCOREBOARD_BUSINESSES } from "@/lib/scoreboard";
import { METRIC_GUIDES } from "@/lib/scoreboardMetrics";

// On-demand refresh for the public Scoreboard (vercel.json cron, every 10 minutes).
//
// The scoreboard pages are ISR. ISR is lazy and stale-while-revalidate: a page
// only rebuilds when somebody requests it after its window, and that visitor is
// served the previous render while the rebuild happens behind them. On a page
// this low-traffic the owner is the traffic, so he always saw the old copy.
// This route purges the rendered pages so the next visit renders fresh from the
// feeds. The page-level `revalidate` (300 s) is only the backstop.
//
// Guarded with CRON_SECRET exactly the way app/api/cron/analytics/route.ts is.

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const paths = [
    "/scoreboard",
    ...SCOREBOARD_BUSINESSES.map((business) => `/scoreboard/${business.slug}`),
    ...METRIC_GUIDES.map((guide) => `/scoreboard/metrics/${guide.slug}`),
  ];
  for (const path of paths) revalidatePath(path);

  return NextResponse.json({
    ok: true,
    revalidated: paths,
    count: paths.length,
    at: new Date().toISOString(),
  });
}
