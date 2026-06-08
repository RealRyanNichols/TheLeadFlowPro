import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { STARTER_WEIRD_STATS } from "@/lib/weird-stats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await (prisma as any).stat.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { title: "asc" }],
    });
    return NextResponse.json({ stats: rows.length ? rows : STARTER_WEIRD_STATS });
  } catch {
    return NextResponse.json({
      stats: STARTER_WEIRD_STATS,
      source: "seed_fallback",
    });
  }
}
