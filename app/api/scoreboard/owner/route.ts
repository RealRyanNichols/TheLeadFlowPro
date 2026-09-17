// CSV of a client's own 90-day aggregates, for the owner view. Key-gated the
// same way as the page. Aggregate columns only: the feed has nothing else.

import { NextResponse } from "next/server";
import { scoreboardBusiness } from "@/lib/scoreboard";
import { fetchScoreboardDays } from "@/lib/scoreboardFeeds";
import { daysToCsv, verifyOwnerKey } from "@/lib/scoreboardOwner";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("business") ?? "";
  const key = url.searchParams.get("k");
  const business = /^[a-z0-9-]{1,80}$/.test(slug) ? scoreboardBusiness(slug) : null;
  if (!business || !business.optIn.ownerView || !verifyOwnerKey(slug, key)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const result = await fetchScoreboardDays(business, 90);
  if (!result.ok) return NextResponse.json({ error: "Feed unavailable. Nothing is substituted." }, { status: 503 });
  return new NextResponse(daysToCsv(result.days, business), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${slug}-scoreboard-90d.csv"`,
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}
