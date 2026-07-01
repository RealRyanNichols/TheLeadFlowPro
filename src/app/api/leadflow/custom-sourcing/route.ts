import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureBuyerAccountForUser } from "@/lib/buyer-portal";
import { createCustomSourcingRequest } from "@/lib/custom-sourcing";
import { getBuyerAuthState } from "@/lib/supabase-buyer-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CustomSourcingSchema = z.object({
  industry: z.string().trim().min(2).max(140),
  vertical: z.string().trim().min(2).max(140),
  leadType: z.string().trim().min(2).max(160),
  buyerType: z.string().trim().min(2).max(140),
  geography: z.string().trim().min(2).max(180),
  sourcePreference: z.string().trim().min(2).max(180),
  offer: z.string().trim().min(3).max(900),
  targetCustomer: z.string().trim().min(3).max(700),
  problemSolved: z.string().trim().min(3).max(900),
  idealLead: z.string().trim().min(3).max(900),
  badFitLead: z.string().trim().max(900).optional().default(""),
  urgency: z.string().trim().max(120).optional().default(""),
  desiredFields: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
  intendedUse: z.array(z.string().trim().min(1).max(80)).min(1).max(12),
  budgetRange: z.string().trim().min(2).max(120),
  desiredVolume: z.string().trim().max(120).optional().default(""),
  accessPreference: z.string().trim().min(2).max(120),
  timeline: z.string().trim().min(2).max(120),
  sampleFirst: z.boolean().default(true),
  notes: z.string().trim().max(1600).optional().default(""),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180).transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(40).optional().default(""),
  company: z.string().trim().min(2).max(160),
  website: z.string().trim().max(240).optional().default(""),
  consentToContact: z.literal(true),
  reviewGatedAccepted: z.literal(true),
  sourcePath: z.string().trim().max(260).optional().default("/custom-sourcing"),
});

export async function POST(req: Request) {
  const parsed = CustomSourcingSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid custom sourcing request." }, { status: 400 });
  }

  const auth = await getBuyerAuthState().catch(() => ({ authenticated: false as const, reason: "invalid_session" as const }));
  const account = auth.authenticated ? await ensureBuyerAccountForUser(auth.user).catch(() => null) : null;

  const result = await createCustomSourcingRequest({
    submission: parsed.data,
    buyerAccount: account,
    authUserId: auth.authenticated ? auth.user.id : null,
  });

  return NextResponse.json(result);
}
