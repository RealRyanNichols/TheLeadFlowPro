/**
 * POST /api/social/disconnect/[id]
 *
 * Disconnects a social account. Hard-deletes the row + cascades the metrics.
 * Only the owner of the row can disconnect it.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface Ctx {
  params: { id: string };
}

export async function POST(_req: Request, { params }: Ctx) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, reason: "Not signed in" }, { status: 401 });
  }

  const row = await prisma.socialAccount.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true },
  });
  if (!row) return NextResponse.json({ ok: false, reason: "Not found" }, { status: 404 });
  if (row.userId !== userId) {
    return NextResponse.json({ ok: false, reason: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.socialAccount.delete({ where: { id: row.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, reason: `Delete failed: ${String(err).slice(0, 120)}` },
      { status: 500 },
    );
  }
}
