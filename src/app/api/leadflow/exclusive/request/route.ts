import { NextResponse } from "next/server";
import { z } from "zod";
import { createExclusiveRequest, EXCLUSIVE_REQUEST_MODELS } from "@/lib/leadflow-exclusive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ExclusiveRequestSchema = z.object({
  listingId: z.string().trim().min(2).max(160),
  buyerName: z.string().trim().min(2).max(140),
  company: z.string().trim().min(2).max(180),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().max(40).optional().default(""),
  website: z.string().trim().max(260).optional().default(""),
  requestedAccessModel: z.enum(EXCLUSIVE_REQUEST_MODELS).default("exclusive_listing"),
  requestedTerritory: z.string().trim().max(180).optional().default(""),
  requestedVertical: z.string().trim().max(180).optional().default(""),
  requestedStart: z.string().trim().max(40).optional().default(""),
  requestedEnd: z.string().trim().max(40).optional().default(""),
  budgetRange: z.string().trim().min(2).max(140),
  intendedUse: z.string().trim().min(12).max(1600),
  urgency: z.string().trim().min(2).max(120),
  notes: z.string().trim().max(1400).optional().default(""),
  consentAccepted: z.literal(true),
});

export async function POST(req: Request) {
  const parsed = ExclusiveRequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid exclusive request." }, { status: 400 });
  }

  const result = await createExclusiveRequest(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, request: result.request, listing: result.listing });
}
