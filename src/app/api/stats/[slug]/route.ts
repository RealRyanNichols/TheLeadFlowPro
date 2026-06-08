import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWeirdStatBySlug } from "@/lib/weird-stats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  try {
    const stat = await (prisma as any).stat.findUnique({
      where: { slug: params.slug },
    });
    if (stat) return NextResponse.json({ stat });
  } catch {
    // Fall through to seed fallback.
  }

  const fallback = getWeirdStatBySlug(params.slug);
  if (!fallback) return NextResponse.json({ error: "Stat not found" }, { status: 404 });
  return NextResponse.json({ stat: fallback, source: "seed_fallback" });
}
