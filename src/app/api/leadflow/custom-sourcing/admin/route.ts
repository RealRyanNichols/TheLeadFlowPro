import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminTokenSessionFromRequest } from "@/lib/admin-token";
import {
  CUSTOM_SOURCING_ADMIN_ACTIONS,
  handleCustomSourcingAdminAction,
} from "@/lib/custom-sourcing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AdminActionSchema = z.object({
  requestId: z.string().trim().min(8).max(160),
  action: z.enum(CUSTOM_SOURCING_ADMIN_ACTIONS),
  adminNotes: z.string().trim().max(1600).optional().default(""),
  quoteAmount: z.coerce.number().min(0).max(250000).optional().nullable(),
  quoteNotes: z.string().trim().max(1600).optional().default(""),
  segmentId: z.string().trim().max(160).optional().nullable(),
  confirmed: z.boolean().optional().default(false),
});

const sensitiveActions = new Set([
  "quote",
  "reject",
  "mark_completed",
  "archive",
  "create_product_factory_run",
  "convert_to_marketplace_listing",
]);

export async function PATCH(req: Request) {
  const admin = await getAdminTokenSessionFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Admin session required." }, { status: 401 });

  const parsed = AdminActionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid admin action." }, { status: 400 });
  }
  if (sensitiveActions.has(parsed.data.action) && !parsed.data.confirmed) {
    return NextResponse.json({ error: "Confirmation required for this custom sourcing action." }, { status: 409 });
  }

  const result = await handleCustomSourcingAdminAction({
    adminUserId: admin.userId,
    adminEmail: admin.email,
    requestId: parsed.data.requestId,
    action: parsed.data.action,
    adminNotes: parsed.data.adminNotes,
    quoteAmount: parsed.data.quoteAmount,
    quoteNotes: parsed.data.quoteNotes,
    segmentId: parsed.data.segmentId,
  });

  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  return NextResponse.json(result);
}
