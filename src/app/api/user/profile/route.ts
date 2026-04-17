import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

const UpdateSchema = z.object({
  name:          z.preprocess(emptyToNull, z.string().trim().min(1).max(80).nullable().optional()),
  businessName:  z.preprocess(emptyToNull, z.string().trim().min(1).max(120).nullable().optional()),
  industry:      z.preprocess(emptyToNull, z.string().trim().max(80).nullable().optional()),
  phone:         z.preprocess(emptyToNull, z.string().trim().max(40).nullable().optional()),
  website:       z.preprocess(emptyToNull, z.string().trim().max(200).nullable().optional()),
  replyToEmail:  z.preprocess(emptyToNull, z.string().email().nullable().optional()),
  timezone:      z.preprocess(emptyToNull, z.string().trim().max(80).nullable().optional()),
  businessHours: z.preprocess(emptyToNull, z.string().trim().max(80).nullable().optional()),
  addressStreet: z.preprocess(emptyToNull, z.string().trim().max(120).nullable().optional()),
  addressCity:   z.preprocess(emptyToNull, z.string().trim().max(80).nullable().optional()),
  addressState:  z.preprocess(emptyToNull, z.string().trim().max(40).nullable().optional()),
  addressZip:    z.preprocess(emptyToNull, z.string().trim().max(20).nullable().optional()),
  notifPrefs:    z.record(z.boolean()).optional(),
  // ProfileCapture sends `onboardingComplete: true` after a successful save
  // so the server can stamp `onboardedAt` and flip the dashboard gate.
  // Settings saves don't send it, so this is a one-time latch.
  onboardingComplete: z.boolean().optional()
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const { onboardingComplete, ...profileData } = parsed.data;
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...profileData,
      // Latch onboardedAt once. Never reset it if the user edits later.
      ...(onboardingComplete ? { onboardedAt: new Date() } : {})
    },
    select: {
      id: true, name: true, businessName: true, industry: true, phone: true,
      website: true, replyToEmail: true, timezone: true, businessHours: true,
      addressStreet: true, addressCity: true, addressState: true, addressZip: true,
      notifPrefs: true, onboardedAt: true
    }
  });

  return NextResponse.json({ ok: true, user: updated });
}
