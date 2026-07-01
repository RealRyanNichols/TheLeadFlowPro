import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminTokenSessionFromRequest } from "@/lib/admin-token";
import { adminUpdateOrder } from "@/lib/leadflow-checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AdminOrderActionSchema = z.object({
  action: z.enum(["approve_manual_review", "grant_entitlement", "revoke_entitlement", "mark_fulfilled", "mark_refunded"]),
  orderId: z.string().trim().min(8).max(80),
  adminNotes: z.string().trim().max(1400).optional().default(""),
  confirmedImpact: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  const admin = await getAdminTokenSessionFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 401 });

  const parsed = AdminOrderActionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid order admin action." }, { status: 400 });
  }

  const result = await adminUpdateOrder({
    orderId: parsed.data.orderId,
    action: parsed.data.action,
    adminNotes: parsed.data.adminNotes || null,
    confirmedImpact: parsed.data.confirmedImpact,
    adminUserId: admin.userId,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, result });
}
