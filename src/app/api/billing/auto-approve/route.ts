/**
 * POST /api/billing/auto-approve
 *
 * Sets or updates the user's auto-approve preferences for $5-increment
 * micro-purchases. Users can:
 *   - turn it off entirely (capCents = 0)
 *   - set a monthly ceiling in dollars (capCents > 0)
 *   - customize the increment size (minimum $1 = 100 cents)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const Body = z.object({
  /** Monthly auto-approve cap in cents. 0 = disable. */
  capCents: z.number().int().min(0).max(50_000),
  /** Per-top-up size in cents. Default/min $1. */
  microCents: z.number().int().min(100).max(5_000).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { ok: false, reason: err instanceof z.ZodError ? err.errors[0]?.message : "Invalid input" },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      autoApproveMonthlyCapCents: parsed.capCents,
      ...(parsed.microCents ? { microPurchaseCents: parsed.microCents } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
