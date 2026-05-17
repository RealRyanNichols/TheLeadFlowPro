import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const StatusSchema = z.enum([
  "proposed",
  "reviewing",
  "scoped",
  "building",
  "shipped_one",
  "shipped_all",
  "gifted",
  "declined",
]);

const UpdateToolRequestSchema = z.object({
  id: z.string().trim().min(1),
  status: StatusSchema.optional(),
  reply: z.string().trim().max(5000).nullable().optional(),
  quotedPriceUsd: z.coerce.number().min(0).nullable().optional(),
  estPlatformCostUsd: z.coerce.number().min(0).nullable().optional(),
  shippedUrl: z.string().trim().max(500).nullable().optional(),
});

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  }

  const requests = await prisma.toolRequest.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 200,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          businessName: true,
          phone: true,
          website: true,
          plan: true,
        },
      },
    },
  });

  return NextResponse.json({ requests });
}

export async function PATCH(req: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = UpdateToolRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid tool request update." },
      { status: 400 },
    );
  }

  const { id, ...fields } = parsed.data;
  const data = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  );

  const request = await prisma.toolRequest.update({
    where: { id },
    data,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          businessName: true,
          phone: true,
          website: true,
          plan: true,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, request });
}
