import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CreateToolRequestSchema = z.object({
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().min(10).max(3000),
  scope: z.enum(["just_me", "all_users", "unsure"]).default("unsure"),
});

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [mine, community] = await Promise.all([
    prisma.toolRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.toolRequest.findMany({
      where: {
        userId: { not: user.id },
        status: { not: "declined" },
      },
      orderBy: [{ upvotes: "desc" }, { createdAt: "desc" }],
      take: 50,
      include: { user: { select: { businessName: true, name: true } } },
    }),
  ]);

  return NextResponse.json({ mine, community });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = CreateToolRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid request" },
      { status: 400 },
    );
  }

  const request = await prisma.toolRequest.create({
    data: {
      userId: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      scope: parsed.data.scope,
      status: "proposed",
    },
  });

  return NextResponse.json({ ok: true, request });
}
