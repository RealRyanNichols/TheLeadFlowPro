/**
 * GET  /api/missed-call/settings  → current user's settings
 * POST /api/missed-call/settings  → update settings
 *
 * Backs the /dashboard/leads/missed-call form. Also mints a formKey on
 * first save so the user has a public lead-capture form URL immediately.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateFormKey } from "@/lib/leads";
import { DEFAULT_MISSED_CALL_REPLY } from "@/lib/sms";

export const dynamic = "force-dynamic";

const Body = z.object({
  inboundPhone: z.string().trim().max(40).nullable().optional(),
  forwardToPhone: z.string().trim().max(40).nullable().optional(),
  missedCallReply: z.string().trim().max(1000).nullable().optional(),
  missedCallEnabled: z.boolean().optional(),
  missedCallFollowup: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, reason: "Not signed in" }, { status: 401 });
  }

  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      inboundPhone: true,
      forwardToPhone: true,
      missedCallReply: true,
      missedCallEnabled: true,
      missedCallFollowup: true,
      formKey: true,
      businessName: true,
      name: true,
    },
  });
  if (!u) {
    return NextResponse.json({ ok: false, reason: "No user row" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    settings: {
      inboundPhone: u.inboundPhone ?? "",
      forwardToPhone: u.forwardToPhone ?? "",
      missedCallReply: u.missedCallReply ?? DEFAULT_MISSED_CALL_REPLY,
      missedCallEnabled: u.missedCallEnabled,
      missedCallFollowup: u.missedCallFollowup,
      formKey: u.formKey,
      businessName: u.businessName ?? u.name ?? "",
    },
  });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, reason: "Not signed in" }, { status: 401 });
  }

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        reason:
          err instanceof z.ZodError ? err.errors[0]?.message : "Invalid input",
      },
      { status: 400 },
    );
  }

  // Mint a formKey on first save if the user doesn't already have one.
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { formKey: true },
  });

  const data: Record<string, unknown> = {};
  if (parsed.inboundPhone !== undefined) data.inboundPhone = parsed.inboundPhone || null;
  if (parsed.forwardToPhone !== undefined) data.forwardToPhone = parsed.forwardToPhone || null;
  if (parsed.missedCallReply !== undefined) data.missedCallReply = parsed.missedCallReply || null;
  if (parsed.missedCallEnabled !== undefined) data.missedCallEnabled = parsed.missedCallEnabled;
  if (parsed.missedCallFollowup !== undefined) data.missedCallFollowup = parsed.missedCallFollowup;
  if (!existing?.formKey) data.formKey = generateFormKey();

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      inboundPhone: true,
      forwardToPhone: true,
      missedCallReply: true,
      missedCallEnabled: true,
      missedCallFollowup: true,
      formKey: true,
    },
  });

  return NextResponse.json({ ok: true, settings: updated });
}
