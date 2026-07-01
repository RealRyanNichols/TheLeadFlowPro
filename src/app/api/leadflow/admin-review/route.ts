import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminTokenSessionFromRequest } from "@/lib/admin-token";
import { hasLeadFlowDataApiConfig, insertLeadFlowRow, patchLeadFlowRows, selectLeadFlowRows } from "@/lib/leadflow-data-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuidSchema = z.string().uuid();

const AdminReviewSchema = z.object({
  targetType: z.enum([
    "lead_profile",
    "lead_profiles_bulk",
    "marketplace_listing",
    "submitted_source",
    "buyer_request",
    "suppression_request",
    "source_proof",
  ]),
  targetId: z.string().trim().min(1).optional(),
  targetIds: z.array(z.string().trim().min(1)).max(100).optional(),
  action: z.string().trim().min(1).max(80),
  notes: z.string().trim().max(2000).optional().default(""),
  confirmed: z.boolean().optional().default(false),
  accessLevel: z.enum(["sample", "summary", "full_profile", "raw_export", "exclusive", "aggregate"]).optional(),
  tag: z.string().trim().min(1).max(60).optional(),
  score: z.number().min(0).max(100).optional(),
});

type BuyerRequestRow = {
  id: string;
  buyer_account_id: string | null;
  listing_id: string | null;
  listing_slug: string | null;
};

type LeadProfileRow = {
  id: string;
  tags?: string[];
};

type SubmittedSourceRow = {
  id: string;
  source_name: string;
  source_type: string;
  source_url: string | null;
  description: string | null;
  vertical: string;
  categories: string[];
  buyer_type: string | null;
  best_use_case: string | null;
  data_fields_present: string[];
  origin_type: string;
  risk_level: string;
  risk_flags: string[];
};

const sensitiveActions = new Set([
  "suppress",
  "approve_suppression",
  "grant_entitlement",
  "create_export",
  "archive",
]);

function uuidOrNull(value: string | null | undefined) {
  return value && uuidSchema.safeParse(value).success ? value : null;
}

function actionEventName(targetType: string, action: string) {
  if (targetType === "lead_profile" && action === "approve") return "admin_profile_approved";
  if (targetType === "submitted_source") return "admin_source_reviewed";
  if (targetType === "buyer_request") return "admin_buyer_request_reviewed";
  if (targetType === "suppression_request") return "admin_suppression_resolved";
  if (action === "create_export") return "admin_export_created";
  return "admin_review_action";
}

async function audit(input: {
  adminUserId: string | null;
  action: string;
  objectTable: string;
  objectId: string | null;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  details?: Record<string, unknown>;
}) {
  await insertLeadFlowRow("audit_log", {
    actor_user_id: uuidOrNull(input.adminUserId),
    actor_type: "admin",
    action: input.action,
    object_schema: "leadflow",
    object_table: input.objectTable,
    object_id: uuidOrNull(input.objectId),
    before_redacted: input.before || {},
    after_redacted: input.after || {},
    details: input.details || {},
  });
}

async function trackAdminEvent(eventName: string, properties: Record<string, unknown>) {
  await insertLeadFlowRow("events", {
    event_name: eventName,
    event_type: "server",
    source_path: "/dashboard",
    properties,
  }).catch(() => null);
}

function patchFor(targetType: string, action: string, body: z.infer<typeof AdminReviewSchema>) {
  if (targetType === "lead_profile" || targetType === "lead_profiles_bulk") {
    if (action === "approve") return { review_status: "approved", status: "available", approved_at: new Date().toISOString() };
    if (action === "reject") return { review_status: "rejected" };
    if (action === "needs_review") return { review_status: "review" };
    if (action === "suppress") return { review_status: "suppressed", suppression_status: "suppressed", status: "suppressed" };
    if (action === "archive") return { status: "archived" };
    if (action === "edit_score" && typeof body.score === "number") return { score: body.score, last_scored_at: new Date().toISOString() };
  }

  if (targetType === "marketplace_listing") {
    if (action === "publish") return { listing_status: "available", review_status: "approved" };
    if (action === "unpublish") return { listing_status: "draft" };
    if (action === "archive") return { listing_status: "archived" };
    if (action === "suppress") return { listing_status: "suppressed", review_status: "suppressed" };
    if (action === "needs_review") return { review_status: "review" };
  }

  if (targetType === "submitted_source") {
    if (action === "approve_research") return { review_status: "approved_for_research", reviewed_at: new Date().toISOString() };
    if (action === "approve_marketplace") return { review_status: "approved_for_marketplace", reviewed_at: new Date().toISOString() };
    if (action === "reject") return { review_status: "rejected", reviewed_at: new Date().toISOString() };
    if (action === "request_more_info") return { review_status: "needs_permission", reviewed_at: new Date().toISOString() };
    if (action === "prohibited") return { review_status: "rejected", risk_level: "prohibited", reviewed_at: new Date().toISOString() };
    if (action === "suppress") return { review_status: "suppressed", reviewed_at: new Date().toISOString() };
    if (action === "archive") return { review_status: "archived", reviewed_at: new Date().toISOString() };
    if (action === "convert_source_proof" || action === "convert_lead_profile_batch") return { review_status: "approved_for_marketplace", reviewed_at: new Date().toISOString() };
  }

  if (targetType === "buyer_request") {
    if (action === "approve" || action === "grant_entitlement") return { status: "approved", review_status: "approved", reviewed_at: new Date().toISOString() };
    if (action === "deny") return { status: "denied", review_status: "denied", reviewed_at: new Date().toISOString() };
    if (action === "request_more_info") return { status: "pending_review", review_status: "needs_info", reviewed_at: new Date().toISOString() };
  }

  if (targetType === "suppression_request") {
    if (action === "approve_suppression") return { status: "active", effective_at: new Date().toISOString() };
    if (action === "deny") return { status: "denied" };
    if (action === "duplicate") return { status: "duplicate" };
    if (action === "resolve") return { status: "resolved" };
  }

  if (targetType === "source_proof") {
    if (action === "approve") return { status: "approved", review_status: "approved" };
    if (action === "reject") return { status: "rejected", review_status: "rejected" };
    if (action === "needs_review") return { status: "review", review_status: "review" };
  }

  return null;
}

function tableFor(targetType: string) {
  if (targetType === "lead_profile" || targetType === "lead_profiles_bulk") return "lead_profiles";
  if (targetType === "marketplace_listing") return "marketplace_listings";
  if (targetType === "submitted_source") return "submitted_sources";
  if (targetType === "buyer_request") return "buyer_requests";
  if (targetType === "suppression_request") return "suppression_requests";
  if (targetType === "source_proof") return "source_proofs";
  return null;
}

export async function PATCH(req: Request) {
  const admin = await getAdminTokenSessionFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Admin session required." }, { status: 401 });
  if (!hasLeadFlowDataApiConfig()) {
    return NextResponse.json({ error: "LeadFlow Supabase Data API is not configured." }, { status: 503 });
  }

  const parsed = AdminReviewSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid admin review action." }, { status: 400 });
  }

  const body = parsed.data;
  if (sensitiveActions.has(body.action) && !body.confirmed) {
    return NextResponse.json({ error: "Confirmation required for this action." }, { status: 400 });
  }

  const table = tableFor(body.targetType);
  if (!table) return NextResponse.json({ error: "Unsupported target type." }, { status: 400 });

  if (body.targetType === "lead_profiles_bulk") {
    const ids = body.targetIds || [];
    if (!ids.length) return NextResponse.json({ error: "No rows selected." }, { status: 400 });
    if (!["needs_review", "archive"].includes(body.action)) {
      return NextResponse.json({ error: "That bulk action is not allowed." }, { status: 400 });
    }
    const patch = patchFor(body.targetType, body.action, body);
    if (!patch) return NextResponse.json({ error: "Unsupported bulk action." }, { status: 400 });

    const updated = [];
    for (const id of ids) {
      const rows = await patchLeadFlowRows(table, { id: `eq.${id}` }, patch);
      updated.push(...rows);
      await audit({
        adminUserId: admin.userId,
        action: `lead_profile.bulk_${body.action}`,
        objectTable: table,
        objectId: id,
        after: patch,
        details: { notes: body.notes || null },
      });
    }
    await trackAdminEvent("admin_review_action", {
      target_type: body.targetType,
      action: body.action,
      count: ids.length,
      user_role: "admin",
    });
    return NextResponse.json({ ok: true, updatedCount: updated.length });
  }

  if (!body.targetId) return NextResponse.json({ error: "Missing target id." }, { status: 400 });

  if (body.targetType === "lead_profile" && body.action === "create_export") {
    await insertLeadFlowRow("exports", {
      lead_profile_id: uuidOrNull(body.targetId),
      export_type: "admin_internal_review",
      export_status: "queued",
      row_count: 1,
      raw_answers_included: false,
      created_by_user_id: uuidOrNull(admin.userId),
      filter_summary: {
        source: "admin_dashboard",
        field_scope: "review_summary_only",
      },
    });
    await audit({
      adminUserId: admin.userId,
      action: "lead_profile.create_export",
      objectTable: "lead_profiles",
      objectId: body.targetId,
      details: { notes: body.notes || null, export_scope: "review_summary_only" },
    });
    await trackAdminEvent("admin_export_created", {
      target_type: body.targetType,
      action: body.action,
      user_role: "admin",
      raw_answers_included: false,
    });
    return NextResponse.json({ ok: true, exportQueued: true });
  }

  if (body.targetType === "submitted_source" && ["convert_source_proof", "convert_lead_profile_batch"].includes(body.action)) {
    const sourceRows = await selectLeadFlowRows<SubmittedSourceRow>("submitted_sources", {
      select: "id,source_name,source_type,source_url,description,vertical,categories,buyer_type,best_use_case,data_fields_present,origin_type,risk_level,risk_flags",
      id: `eq.${body.targetId}`,
      limit: 1,
    });
    const source = sourceRows[0];
    if (!source) return NextResponse.json({ error: "Submitted source not found." }, { status: 404 });
    if (source.risk_level === "prohibited") {
      return NextResponse.json({ error: "Prohibited sources cannot be converted from the dashboard." }, { status: 400 });
    }

    if (body.action === "convert_source_proof") {
      await insertLeadFlowRow("source_proofs", {
        submitted_source_id: source.id,
        proof_type: "submitted_source",
        source_url: source.source_url,
        source_label: source.source_name,
        proof_payload: {
          source_type: source.source_type,
          origin_type: source.origin_type,
          data_fields_present: source.data_fields_present,
          categories: source.categories,
        },
        confidence: source.risk_level === "low" ? 0.72 : source.risk_level === "medium" ? 0.55 : 0.35,
        status: "review",
        review_status: "pending",
        buyer_visible: false,
      });
    }

    if (body.action === "convert_lead_profile_batch") {
      await insertLeadFlowRow("lead_profiles", {
        title: source.source_name,
        vertical: source.vertical,
        category: source.categories[0] ?? null,
        buyer_use_case: source.best_use_case,
        tags: [...source.categories, source.source_type, source.origin_type].filter(Boolean),
        consent_status: source.origin_type === "public_website" ? "public_source_review" : "unverified",
        suppression_status: "unchecked",
        source_proof_status: "submitted",
        status: "draft",
        review_status: "review",
        source_url: source.source_url,
        source_path: "/submit-source",
        buyer_visible_summary: {
          summary: source.description,
          best_use_case: source.best_use_case,
          source_submission_id: source.id,
        },
        private_profile: {
          submitted_source_id: source.id,
          data_fields_present: source.data_fields_present,
          risk_level: source.risk_level,
          risk_flags: source.risk_flags,
        },
      });
    }
  }

  if (body.targetType === "lead_profile" && body.action === "add_tag") {
    if (!body.tag) return NextResponse.json({ error: "Missing tag." }, { status: 400 });
    const rows = await selectLeadFlowRows<LeadProfileRow>("lead_profiles", {
      select: "id,tags",
      id: `eq.${body.targetId}`,
      limit: 1,
    });
    const current = rows[0];
    if (!current) return NextResponse.json({ error: "Lead profile not found." }, { status: 404 });
    const tags = Array.from(new Set([...(current.tags || []), body.tag]));
    const updated = await patchLeadFlowRows(table, { id: `eq.${body.targetId}` }, { tags });
    await audit({
      adminUserId: admin.userId,
      action: "lead_profile.add_tag",
      objectTable: table,
      objectId: body.targetId,
      before: { tags: current.tags || [] },
      after: { tags },
      details: { notes: body.notes || null },
    });
    await trackAdminEvent("admin_review_action", { target_type: body.targetType, action: body.action, user_role: "admin" });
    return NextResponse.json({ ok: true, rows: updated });
  }

  const patch = patchFor(body.targetType, body.action, body);
  if (!patch) return NextResponse.json({ error: "Unsupported action for this target." }, { status: 400 });

  let entitlementCreated = false;
  if (body.targetType === "buyer_request" && body.action === "grant_entitlement") {
    const requests = await selectLeadFlowRows<BuyerRequestRow>("buyer_requests", {
      select: "id,buyer_account_id,listing_id,listing_slug",
      id: `eq.${body.targetId}`,
      limit: 1,
    });
    const request = requests[0];
    if (!request?.buyer_account_id) return NextResponse.json({ error: "Buyer request has no buyer account." }, { status: 400 });

    await insertLeadFlowRow("buyer_entitlements", {
      buyer_account_id: request.buyer_account_id,
      listing_id: uuidOrNull(request.listing_id),
      listing_slug: request.listing_slug,
      access_level: body.accessLevel || "summary",
      status: "active",
      created_by: uuidOrNull(admin.userId),
      metadata: {
        source: "admin_dashboard",
        buyer_request_id: request.id,
      },
    });
    entitlementCreated = true;
  }

  const updated = await patchLeadFlowRows(table, { id: `eq.${body.targetId}` }, patch);
  await audit({
    adminUserId: admin.userId,
    action: `${body.targetType}.${body.action}`,
    objectTable: table,
    objectId: body.targetId,
    after: patch,
    details: {
      notes: body.notes || null,
      entitlement_created: entitlementCreated,
    },
  });
  await trackAdminEvent(actionEventName(body.targetType, body.action), {
    target_type: body.targetType,
    action: body.action,
    user_role: "admin",
    entitlement_created: entitlementCreated,
  });

  return NextResponse.json({ ok: true, rows: updated, entitlementCreated });
}
