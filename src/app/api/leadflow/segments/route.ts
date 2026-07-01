import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminTokenSessionFromRequest } from "@/lib/admin-token";
import { hasLeadFlowDataApiConfig, insertLeadFlowRow, patchLeadFlowRows } from "@/lib/leadflow-data-api";
import { sanitizeLeadFlowEventProperties } from "@/lib/leadflow-events";
import { getSegmentDashboardData } from "@/lib/segments/segment-builder";
import {
  SEGMENT_OPERATORS,
  SEGMENT_RULE_FIELDS,
  SEGMENT_STATUSES,
  SEGMENT_TYPES,
  SEGMENT_VISIBILITIES,
  runSegmentPreview,
  sanitizeSegmentRules,
  validateSegmentSafety,
  type SegmentCandidate,
  type SegmentInput,
  type SegmentRule,
} from "@/lib/segments/rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RuleSchema = z.object({
  id: z.string().trim().min(1).max(120).optional().default("rule"),
  field: z.enum(SEGMENT_RULE_FIELDS),
  operator: z.enum(SEGMENT_OPERATORS),
  value: z.union([
    z.string().max(300),
    z.number(),
    z.boolean(),
    z.array(z.union([z.string().max(120), z.number()])).max(25),
    z.null(),
  ]).optional().default(""),
  rule_group: z.enum(["and", "or"]).optional().default("and"),
});

const SegmentSchema = z.object({
  id: z.string().trim().max(120).optional(),
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(900).optional().default(""),
  segmentType: z.enum(SEGMENT_TYPES),
  vertical: z.string().trim().min(1).max(80),
  category: z.string().trim().min(1).max(120).optional().default("All categories"),
  status: z.enum(SEGMENT_STATUSES).optional().default("review"),
  visibility: z.enum(SEGMENT_VISIBILITIES).optional().default("internal"),
});

const SegmentActionSchema = z.object({
  action: z.enum([
    "preview",
    "create",
    "run",
    "duplicate",
    "archive",
    "mark_review",
    "create_listing",
    "start_export",
    "attach_buyer_request",
  ]),
  segment: SegmentSchema,
  rules: z.array(RuleSchema).min(1).max(12),
  confirmed: z.boolean().optional().default(false),
});

function looksLikeUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function uuidOrNull(value: string | null | undefined) {
  return looksLikeUuid(value) ? value : null;
}

async function trackSegmentEvent(eventName: string, properties: Record<string, unknown>) {
  if (!hasLeadFlowDataApiConfig()) return;
  await insertLeadFlowRow("events", {
    event_name: eventName,
    event_type: "server",
    route: "/dashboard/segments",
    user_role: "admin",
    source_path: "/dashboard/segments",
    properties: sanitizeLeadFlowEventProperties({
      ...properties,
      user_role: "admin",
    }),
  }).catch(() => null);
}

async function auditSegmentAction(input: {
  adminUserId: string | null;
  action: string;
  segmentId: string | null;
  details: Record<string, unknown>;
}) {
  if (!hasLeadFlowDataApiConfig()) return;
  await insertLeadFlowRow("audit_log", {
    actor_user_id: uuidOrNull(input.adminUserId),
    actor_type: "admin",
    action: input.action,
    object_schema: "leadflow",
    object_table: "segments",
    object_id: uuidOrNull(input.segmentId),
    details: input.details,
  }).catch(() => null);
}

function jsonPreview(segment: SegmentInput, rules: SegmentRule[], candidates: SegmentCandidate[]) {
  const preview = runSegmentPreview({ segment, rules, candidates });
  return {
    estimatedCount: preview.estimatedCount,
    suppressionCount: preview.suppressionCount,
    highRiskCount: preview.highRiskCount,
    prohibitedCount: preview.prohibitedCount,
    missingSourceProofCount: preview.missingSourceProofCount,
    exportEligible: preview.exportEligible,
    sampleMembers: preview.sampleMembers,
    riskWarnings: preview.riskWarnings,
    complianceWarnings: preview.complianceWarnings,
    sourceProofWarnings: preview.sourceProofWarnings,
    safety: preview.safety,
    scoreDistribution: preview.scoreDistribution,
    categoryDistribution: preview.categoryDistribution,
    sourceTypeDistribution: preview.sourceTypeDistribution,
  };
}

async function persistSegment(input: {
  adminUserId: string | null;
  adminEmail: string;
  segment: SegmentInput & { id?: string };
  rules: SegmentRule[];
  preview: ReturnType<typeof runSegmentPreview>;
}) {
  const inserted = await insertLeadFlowRow<{ id: string }>("segments", {
    name: input.segment.name,
    description: input.segment.description,
    segment_type: input.segment.segmentType,
    vertical: input.segment.vertical,
    category: input.segment.category,
    status: input.segment.status,
    visibility: input.segment.visibility,
    created_by: input.adminEmail,
    member_count: input.preview.estimatedCount,
    risk_level: input.preview.prohibitedCount > 0 ? "prohibited" : input.preview.highRiskCount > 0 ? "high" : input.preview.suppressionCount > 0 ? "medium" : "low",
    compliance_status: input.preview.safety.blocked ? "blocked" : input.preview.exportEligible ? "ready" : "needs_review",
    quality_summary: {
      estimated_count: input.preview.estimatedCount,
      score_distribution: input.preview.scoreDistribution,
      category_distribution: input.preview.categoryDistribution,
      source_type_distribution: input.preview.sourceTypeDistribution,
    },
    compliance_warnings: input.preview.complianceWarnings,
    metadata: {
      created_from: "dashboard_segment_builder",
      raw_sql_used: false,
      protected_traits_used: false,
    },
  });

  const segmentId = inserted[0]?.id;
  if (!segmentId) throw new Error("Segment insert did not return an id.");

  await Promise.all(input.rules.map((rule, index) =>
    insertLeadFlowRow("segment_rules", {
      segment_id: segmentId,
      field: rule.field,
      operator: rule.operator,
      value: rule.value === "" ? null : rule.value,
      rule_group: rule.rule_group,
      rule_order: index + 1,
    }).catch(() => null),
  ));

  await auditSegmentAction({
    adminUserId: input.adminUserId,
    action: "segment.created",
    segmentId,
    details: {
      segment_type: input.segment.segmentType,
      member_count: input.preview.estimatedCount,
      export_eligible: input.preview.exportEligible,
      blocked: input.preview.safety.blocked,
    },
  });

  return segmentId;
}

async function persistRun(input: {
  adminUserId: string | null;
  segmentId: string;
  preview: ReturnType<typeof runSegmentPreview>;
}) {
  const insertedRun = await insertLeadFlowRow<{ id: string }>("segment_runs", {
    segment_id: input.segmentId,
    status: input.preview.safety.blocked ? "blocked" : "completed",
    estimated_count: input.preview.estimatedCount,
    member_count: input.preview.exportEligible
      ? input.preview.members.length
      : input.preview.members.filter((member) => member.riskLevel !== "prohibited" && member.suppressionStatus !== "suppressed").length,
    suppression_count: input.preview.suppressionCount,
    high_risk_count: input.preview.highRiskCount,
    missing_source_proof_count: input.preview.missingSourceProofCount,
    risk_warnings: input.preview.riskWarnings,
    compliance_warnings: input.preview.complianceWarnings,
    blocked_reason: input.preview.safety.blocked ? input.preview.safety.reasons.join(" ") : null,
    run_by: input.adminUserId,
    completed_at: new Date().toISOString(),
  });
  const runId = insertedRun[0]?.id;

  if (runId) {
    const eligibleMembers = input.preview.members
      .filter((member) => member.riskLevel !== "prohibited" && member.suppressionStatus !== "suppressed")
      .slice(0, 500);
    await Promise.all(eligibleMembers.map((member) =>
      insertLeadFlowRow("segment_members", {
        segment_id: input.segmentId,
        segment_run_id: runId,
        member_entity_type: member.segmentType,
        member_entity_id: member.id,
        lead_profile_id: member.segmentType === "lead_profiles" ? uuidOrNull(member.id) : null,
        buyer_request_id: member.segmentType === "buyer_requests" ? uuidOrNull(member.id) : null,
        marketplace_listing_id: member.segmentType === "marketplace_listings" ? uuidOrNull(member.id) : null,
        submitted_source_id: member.segmentType === "submitted_sources" ? uuidOrNull(member.id) : null,
        score: member.score,
        confidence: member.confidence,
        risk_level: member.riskLevel,
        compliance_status: member.complianceStatus,
        suppression_status: member.suppressionStatus,
        source_proof_status: member.sourceProofStatus,
        export_eligible: member.exportEligible,
        snapshot: {
          title: member.title,
          vertical: member.vertical,
          category: member.category,
          source_type: member.sourceType,
          recommended_next_action: member.recommendedNextAction,
        },
      }).catch(() => null),
    ));
  }

  await patchLeadFlowRows("segments", { id: `eq.${input.segmentId}` }, {
    last_run_at: new Date().toISOString(),
    member_count: input.preview.estimatedCount,
    risk_level: input.preview.prohibitedCount > 0 ? "prohibited" : input.preview.highRiskCount > 0 ? "high" : input.preview.suppressionCount > 0 ? "medium" : "low",
    compliance_status: input.preview.safety.blocked ? "blocked" : input.preview.exportEligible ? "ready" : "needs_review",
    quality_summary: {
      score_distribution: input.preview.scoreDistribution,
      category_distribution: input.preview.categoryDistribution,
      source_type_distribution: input.preview.sourceTypeDistribution,
    },
    compliance_warnings: input.preview.complianceWarnings,
  }).catch(() => null);

  await auditSegmentAction({
    adminUserId: input.adminUserId,
    action: "segment.run",
    segmentId: input.segmentId,
    details: {
      segment_run_id: runId || null,
      estimated_count: input.preview.estimatedCount,
      suppression_count: input.preview.suppressionCount,
      high_risk_count: input.preview.highRiskCount,
      missing_source_proof_count: input.preview.missingSourceProofCount,
      export_eligible: input.preview.exportEligible,
      blocked: input.preview.safety.blocked,
    },
  });

  return runId || null;
}

export async function POST(req: Request) {
  const admin = await getAdminTokenSessionFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Admin session required." }, { status: 401 });

  const parsed = SegmentActionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid segment action." }, { status: 400 });
  }

  const segment = parsed.data.segment as SegmentInput & { id?: string };
  const rules = sanitizeSegmentRules(parsed.data.rules as SegmentRule[]);
  const data = await getSegmentDashboardData(admin.email);
  const preview = runSegmentPreview({ segment, rules, candidates: data.candidates });
  const safety = validateSegmentSafety({ segment, rules, matchedCandidates: preview.members });

  if (parsed.data.action === "preview") {
    return NextResponse.json({ ok: true, persisted: false, preview: jsonPreview(segment, rules, data.candidates) });
  }

  if (safety.blocked) {
    await trackSegmentEvent("segment_blocked", {
      route: "/dashboard/segments",
      segment_type: segment.segmentType,
      vertical: segment.vertical,
      category: segment.category,
      status: "blocked",
    });
    return NextResponse.json({ error: safety.reasons.join(" "), preview: jsonPreview(segment, rules, data.candidates) }, { status: 400 });
  }

  if (["archive", "create_listing", "start_export", "attach_buyer_request"].includes(parsed.data.action) && !parsed.data.confirmed) {
    return NextResponse.json({ error: "Confirmation required for this segment action." }, { status: 400 });
  }

  if (!hasLeadFlowDataApiConfig()) {
    await trackSegmentEvent(parsed.data.action === "run" ? "segment_run" : "segment_created", {
      route: "/dashboard/segments",
      segment_type: segment.segmentType,
      vertical: segment.vertical,
      category: segment.category,
      status: segment.status,
    });
    return NextResponse.json({
      ok: true,
      persisted: false,
      mode: "missing_supabase_config",
      segmentId: segment.id || `demo-${Date.now()}`,
      preview: jsonPreview(segment, rules, data.candidates),
    });
  }

  if (parsed.data.action === "archive") {
    if (!segment.id) return NextResponse.json({ error: "Segment id required." }, { status: 400 });
    await patchLeadFlowRows("segments", { id: `eq.${segment.id}` }, { status: "archived" });
    await auditSegmentAction({ adminUserId: admin.userId, action: "segment.archived", segmentId: segment.id, details: { confirmed: true } });
    await trackSegmentEvent("segment_run", { route: "/dashboard/segments", segment_id: segment.id, status: "archived" });
    return NextResponse.json({ ok: true, persisted: true, segmentId: segment.id });
  }

  const shouldCreate = parsed.data.action === "create" || parsed.data.action === "duplicate" || !segment.id;
  const segmentId = shouldCreate
    ? await persistSegment({ adminUserId: admin.userId, adminEmail: admin.email, segment, rules, preview })
    : segment.id!;

  let runId: string | null = null;
  if (parsed.data.action === "run") {
    runId = await persistRun({ adminUserId: admin.userId, segmentId, preview });
  }

  if (parsed.data.action === "mark_review") {
    await patchLeadFlowRows("segments", { id: `eq.${segmentId}` }, { status: "review", compliance_status: "needs_review" });
    await auditSegmentAction({ adminUserId: admin.userId, action: "segment.mark_review", segmentId, details: { source: "segment_builder" } });
  }

  if (parsed.data.action === "create_listing") {
    await auditSegmentAction({
      adminUserId: admin.userId,
      action: "segment.create_marketplace_listing_requested",
      segmentId,
      details: {
        status: "queued_for_product_factory",
        estimated_count: preview.estimatedCount,
        export_eligible: preview.exportEligible,
      },
    });
  }

  await trackSegmentEvent(parsed.data.action === "create_listing" ? "segment_listing_created" : parsed.data.action === "run" ? "segment_run" : "segment_created", {
    route: "/dashboard/segments",
    segment_id: segmentId,
    segment_type: segment.segmentType,
    vertical: segment.vertical,
    category: segment.category,
    status: segment.status,
    export_eligible: preview.exportEligible,
  });

  return NextResponse.json({
    ok: true,
    persisted: true,
    segmentId,
    runId,
    preview: jsonPreview(segment, rules, data.candidates),
  });
}
