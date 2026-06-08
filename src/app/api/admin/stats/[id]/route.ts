import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Body = z.object({
  slug: z.string().min(2).max(120).optional(),
  title: z.string().min(2).max(180).optional(),
  shortDescription: z.string().max(500).optional(),
  whyItMatters: z.string().max(1000).optional(),
  category: z.string().max(80).optional(),
  unitLabel: z.string().max(40).optional(),
  baseValue: z.coerce.number().optional(),
  ratePerSecond: z.coerce.number().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  await requireAdminUser();
  const parsed = Body.parse(await req.json());
  const stat = await (prisma as any).stat.update({
    where: { id: params.id },
    data: parsed,
  });
  return NextResponse.json({ ok: true, stat });
}
