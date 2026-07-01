import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminTokenSessionFromRequest } from "@/lib/admin-token";
import { hasLeadFlowDataApiConfig, insertLeadFlowRow, patchLeadFlowRows } from "@/lib/leadflow-data-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuidSchema = z.string().uuid();

const PartnerAdminActionSchema = z.object({
  targetType: z.enum(["partner_account", "partner_source", "partner_earning", "partner_payout"]),
  targetId: z.string().trim().min(1),
  action: z.string().trim().min(1).max(80),
  notes: z.string().trim().max(2000).optional().default(""),
  confirmed: z.boolean().optional().default(false),
});

const sensitiveActions = new Set(["suspend", "deny", "mark_paid", "void", "restrict"]);

function uuidOrNull(value: string | null | undefined) {
  return value && uuidSchema.safeParse(value).success ? value : null;
}

function tableFor(targetType: z.infer<typeof PartnerAdminActionSchema>["targetType"]) {
  if (targetType === "partner_account") return "partner_accounts";
  if (targetType === "partner_source") return "partner_sources";
  if (targetType === "partner_earning") return "partner_earnings";
  if (targetType === "partner_payout") return "partner_payouts";
  return null;
}

function patchFor(targetType: string, action: string, notes: string) {
  if (targetType === "partner_account") {
    if (action === "approve") return { status: "approved", admin_notes: notes || null };
    if (action === "restrict") return { status: "restricted", admin_notes: notes || null };
    if (action === "suspend") return { status: "suspended", admin_notes: notes || null };
    if (action === "deny") return { status: "denied", admin_notes: notes || null };
    if (action === "pending_review") return { status: "pending_review", admin_notes: notes || null };
  }

  if (targetType === "partner_source") {
    if (action === "approve_research") return { source_status: "approved_for_research", review_result: notes || null };
    if (action === "approve_marketplace") return { source_status: "approved_for_marketplace", review_result: notes || null };
    if (action === "request_more_info") return { source_status: "needs_permission", review_result: notes || null };
    if (action === "reject") return { source_status: "rejected", review_result: notes || null };
    if (action === "mark_duplicate") return { source_status: "duplicate", review_result: notes || null };
    if (action === "mark_prohibited") return { source_status: "rejected", risk_level: "prohibited", review_result: notes || "Marked prohibited." };
  }

  if (targetType === "partner_earning") {
    if (action === "approve") return { status: "approved", approved_at: new Date().toISOString(), calculation_note: notes || undefined };
    if (action === "void") return { status: "voided", calculation_note: notes || undefined };
    if (action === "dispute") return { status: "disputed", calculation_note: notes || undefined };
    if (action === "mark_paid") return { status: "paid", paid_at: new Date().toISOString(), calculation_note: notes || undefined };
  }

  if (targetType === "partner_payout") {
    if (action === "approve") return { status: "approved", approved_at: new Date().toISOString(), admin_notes: notes || undefined };
    if (action === "mark_paid") return { status: "paid", paid_at: new Date().toISOString(), admin_notes: notes || undefined };
    if (action === "void") return { status: "voided", admin_notes: notes || undefined };
    if (action === "dispute") return { status: "disputed", admin_notes: notes || undefined };
  }

  return null;
}

async function audit(input: {
  adminUserId: string | null;
  action: string;
  objectTable: string;
  objectId: string;
  after: Record<string, unknown>;
  details?: Record<string, unknown>;
}) {
  await insertLeadFlowRow("audit_log", {
    actor_user_id: uuidOrNull(input.adminUserId),
    actor_type: "admin",
    action: input.action,
    object_schema: "leadflow",
    object_table: input.objectTable,
    object_id: uuidOrNull(input.objectId),
    after_redacted: input.after,
    details: input.details || {},
  }).catch(() => null);
}

async function trackAdminPartnerEvent(eventName: string, properties: Record<string, unknown>) {
  await insertLeadFlowRow("events", {
    event_name: eventName,
    event_type: "server",
    route: "/dashboard/partners",
    user_role: "admin",
    source_path: "/dashboard/partners",
    properties: {
      ...properties,
      user_role: "admin",
    },
  }).catch(() => null);
}

export async function PATCH(req: Request) {
  const admin = await getAdminTokenSessionFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Admin session required." }, { status: 401 });
  if (!hasLeadFlowDataApiConfig()) {
    return NextResponse.json({ error: "LeadFlow Supabase Data API is not configured." }, { status: 503 });
  }

  const parsed = PartnerAdminActionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid partner admin action." }, { status: 400 });
  }

  const body = parsed.data;
  if (sensitiveActions.has(body.action) && !body.confirmed) {
    return NextResponse.json({ error: "Confirmation required for this partner action." }, { status: 400 });
  }

  const table = tableFor(body.targetType);
  const patch = table ? patchFor(body.targetType, body.action, body.notes) : null;
  if (!table || !patch) return NextResponse.json({ error: "Unsupported partner action." }, { status: 400 });

  const rows = await patchLeadFlowRows(table, { id: `eq.${body.targetId}` }, { ...patch, updated_at: new Date().toISOString() });

  await audit({
    adminUserId: admin.userId,
    action: `${body.targetType}.${body.action}`,
    objectTable: table,
    objectId: body.targetId,
    after: patch,
    details: { notes: body.notes || null },
  });

  await trackAdminPartnerEvent(body.action === "mark_paid" ? "partner_payout_marked_paid" : "admin_partner_reviewed", {
    target_type: body.targetType,
    action: body.action,
    status: "completed",
  });

  return NextResponse.json({ ok: true, rows });
}
