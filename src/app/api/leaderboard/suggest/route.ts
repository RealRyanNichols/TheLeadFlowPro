// src/app/api/leaderboard/suggest/route.ts — autocomplete search.
// Used by the buy form to show existing businesses as you type.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().slice(0, 80);
  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }
  const rows = await prisma.businessProfile.findMany({
    where: {
      publicName: { contains: q, mode: "insensitive" },
    },
    select: {
      slug: true,
      publicName: true,
      city: true,
      category: true,
      websiteUrl: true,
      socialUrl: true,
      imageUrl: true,
      totalLifetimeDollars: true,
    },
    orderBy: { totalLifetimeDollars: "desc" },
    take: 6,
  });
  return NextResponse.json({ suggestions: rows });
}
