import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminTokenSessionFromRequest } from "@/lib/admin-token";
import { adminReviewCivicRecord } from "@/lib/leadflow-civic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CivicAdminSchema = z.object({
  recordType: z.enum(["survey", "submission", "source"]),
  id: z.string().trim().min(8).max(120),
  action: z.enum(["approve_public_display", "mark_reviewed", "reject", "suppress", "flag_risk"]),
});

export async function POST(req: Request) {
  const admin = await getAdminTokenSessionFromRequest(req);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Admin access required." }, { status: 401 });
  }

  const parsed = CivicAdminSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message || "Invalid civic admin action." }, { status: 400 });
  }

  const result = await adminReviewCivicRecord({
    ...parsed.data,
    adminUserId: admin.userId,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, record: result.record });
}
