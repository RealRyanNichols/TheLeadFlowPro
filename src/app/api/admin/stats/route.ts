import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Body = z.object({
  slug: z.string().min(2).max(120),
  title: z.string().min(2).max(180),
  shortDescription: z.string().max(500).optional(),
  whyItMatters: z.string().max(1000).optional(),
  category: z.string().max(80).default("Internet"),
  unitLabel: z.string().max(40).default("items"),
  baseValue: z.coerce.number().default(0),
  ratePerSecond: z.coerce.number().default(1),
});

export async function POST(req: Request) {
  await requireAdminUser();
  const parsed = Body.parse(await req.json());
  const stat = await (prisma as any).stat.create({
    data: {
      slug: parsed.slug,
      title: parsed.title,
      shortDescription: parsed.shortDescription || "",
      longDescription: parsed.shortDescription || "",
      whyItMatters: parsed.whyItMatters || "",
      category: parsed.category,
      unitLabel: parsed.unitLabel,
      baseValue: parsed.baseValue,
      ratePerSecond: parsed.ratePerSecond,
      formulaType: "linear_estimate",
      formulaNotes: "Admin-created linear estimate.",
      sourceType: "community_requested",
      sourceNotes: "Created inside the Weird Stats Clock admin.",
      confidenceScore: 35,
      isActive: true,
    },
  });
  return NextResponse.json({ ok: true, stat });
}
