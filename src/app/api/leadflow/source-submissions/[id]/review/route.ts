import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminTokenSessionFromRequest } from "@/lib/admin-token";
import { hasLeadFlowDataApiConfig, insertLeadFlowRow, patchLeadFlowRows, selectLeadFlowRows } from "@/lib/leadflow-data-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AdminSourceActionSchema = z.object({
  action: z.enum([
    "approve_research",
    "approve_marketplace",
    "reject",
    "request_more_info",
    "duplicate",
    "prohibited",
    "suppress",
    "archive",
    "convert_source_proof",
    "convert_marketplace_listing",
    "convert_lead_profile_batch",
  ]),
  notes: z.string().trim().max(4000).optional().default(""),
});

type SubmittedSourceRow = {
  id: string;
  source_name: string;
  source_type: string;
  source_url: string | null;
  description: string | null;
  vertical: string;
  categories: string[];
  geography: string | null;
  buyer_type: string | null;
  best_use_case: string | null;
  data_fields_present: string[];
  origin_type: string;
  review_status: string;
  risk_level: string;
  risk_flags: string[];
  restrictions: string | null;
  metadata: Record<string, unknown>;
};

function targetStatus(action: z.infer<typeof AdminSourceActionSchema>["action"], currentRisk: string) {
  if (action === "approve_research") return "approved_for_research";
  if (action === "approve_marketplace") return "approved_for_marketplace";
  if (action === "reject") return "rejected";
  if (action === "request_more_info") return "needs_permission";
  if (action === "duplicate") return "duplicate";
  if (action === "prohibited") return "rejected";
  if (action === "suppress") return "suppressed";
  if (action === "archive") return "archived";
  if (action.startsWith("convert_")) return currentRisk === "prohibited" ? "needs_review" : "approved_for_marketplace";
  return "needs_review";
}

function nextRisk(action: z.infer<typeof AdminSourceActionSchema>["action"], currentRisk: string) {
  if (action === "prohibited") return "prohibited";
  if (action === "approve_research" || action === "approve_marketplace") {
    return currentRisk === "prohibited" ? "high" : currentRisk;
  }
  return currentRisk;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminTokenSessionFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "Admin session required." }, { status: 401 });
  }

  if (!hasLeadFlowDataApiConfig()) {
    return NextResponse.json({ error: "LeadFlow Supabase Data API is not configured." }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = AdminSourceActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid source review action." },
      { status: 400 },
    );
  }

  const rows = await selectLeadFlowRows<SubmittedSourceRow>("submitted_sources", {
    id: `eq.${params.id}`,
    select: "*",
    limit: 1,
  });
  const source = rows[0];
  if (!source) {
    return NextResponse.json({ error: "Source submission not found." }, { status: 404 });
  }

  const action = parsed.data.action;
  const toStatus = targetStatus(action, source.risk_level);
  const riskLevel = nextRisk(action, source.risk_level);
  const reviewedAt = new Date().toISOString();

  const updatedRows = await patchLeadFlowRows<SubmittedSourceRow>(
    "submitted_sources",
    { id: `eq.${params.id}` },
    {
      review_status: toStatus,
      risk_level: riskLevel,
      reviewed_at: reviewedAt,
      reviewed_by: admin.email,
      metadata: {
        ...(source.metadata || {}),
        last_admin_action: action,
        last_admin_notes: parsed.data.notes || null,
        last_reviewed_at: reviewedAt,
      },
    },
  );

  if (action === "convert_source_proof") {
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
        restrictions: source.restrictions,
      },
      confidence: riskLevel === "low" ? 0.72 : riskLevel === "medium" ? 0.55 : 0.35,
      status: "review",
      review_status: "pending",
      buyer_visible: false,
      admin_notes: parsed.data.notes || null,
    });
  }

  if (action === "convert_marketplace_listing") {
    await insertLeadFlowRow("marketplace_listings", {
      title: source.source_name,
      vertical: source.vertical,
      category: source.categories[0] ?? null,
      buyer_type: source.buyer_type,
      source_type: source.source_type,
      location_label: source.geography,
      listing_status: "draft",
      review_status: "pending",
      release_mode: "review_gated",
      freshness_label: "needs verification",
      compliance_status: riskLevel === "prohibited" ? "blocked" : "review_required",
      buyer_visible_summary: {
        summary: source.description,
        best_use_case: source.best_use_case,
        source_submission_id: source.id,
        converted_by: admin.email,
      },
      source_url: source.source_url,
    });
  }

  if (action === "convert_lead_profile_batch") {
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
        risk_level: riskLevel,
        risk_flags: source.risk_flags,
      },
    });
  }

  await insertLeadFlowRow("source_reviews", {
    submitted_source_id: source.id,
    action,
    from_status: source.review_status,
    to_status: toStatus,
    risk_level: riskLevel,
    reviewer_type: "admin",
    reviewer_email: admin.email,
    notes: parsed.data.notes || null,
    metadata: {
      converted: action.startsWith("convert_"),
    },
  });

  await insertLeadFlowRow("audit_log", {
    actor_user_id: admin.userId,
    actor_type: "admin",
    action: `source_submission.${action}`,
    object_schema: "leadflow",
    object_table: "submitted_sources",
    object_id: source.id,
    before_redacted: {
      review_status: source.review_status,
      risk_level: source.risk_level,
    },
    after_redacted: {
      review_status: toStatus,
      risk_level: riskLevel,
    },
    details: {
      notes: parsed.data.notes || null,
      source_type: source.source_type,
      vertical: source.vertical,
    },
  });

  await insertLeadFlowRow("events", {
    event_name: "admin_source_reviewed",
    event_type: "server",
    route: "/dashboard/source-submissions",
    user_role: "admin",
    vertical: source.vertical,
    category: source.categories[0] ?? null,
    source_path: "/dashboard/source-submissions",
    properties: {
      user_role: "admin",
      submitted_source_id: source.id,
      action,
      review_status: toStatus,
      risk_level: riskLevel,
    },
  });

  return NextResponse.json({
    ok: true,
    submission: updatedRows[0] ?? { ...source, review_status: toStatus, risk_level: riskLevel },
  });
}
