import { NextResponse } from "next/server";
import { z } from "zod";
import { createSampleRequest } from "@/lib/leadflow-samples";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SampleRequestSchema = z.object({
  listingId: z.string().trim().min(2).max(160),
  intendedUse: z.string().trim().min(12).max(1200),
  confirmedAllowedUse: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  const parsed = SampleRequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid sample request." }, { status: 400 });
  }

  const origin = req.headers.get("origin");
  const result = await createSampleRequest({ ...parsed.data, origin });
  if (!result.ok) {
    return NextResponse.json({ error: result.error, reason: result.reason }, { status: result.status });
  }
  return NextResponse.json(result);
}
