import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminTokenSessionFromRequest } from "@/lib/admin-token";
import { getBuyerPortalData } from "@/lib/buyer-portal";
import {
  createLeadFlowExport,
  normalizeExportFormat,
  normalizeFieldGroupsForRequest,
} from "@/lib/leadflow-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateExportSchema = z.object({
  exportType: z
    .enum(["sample", "buyer_approved", "admin_internal", "crm_push", "watchlist", "report_only"])
    .default("buyer_approved"),
  entitlementId: z.string().trim().optional(),
  listingId: z.string().trim().optional(),
  listingSlug: z.string().trim().optional(),
  leadProfileId: z.string().trim().optional(),
  format: z.enum(["csv", "json"]).default("csv"),
  fieldGroups: z.array(z.enum(["public_profile", "contact", "source_proof", "compliance", "admin"])).optional().default(["public_profile", "source_proof", "compliance"]),
  reason: z.string().trim().min(3).max(500),
  confirmedAllowedUse: z.boolean().optional().default(false),
  adminOverrideHighRisk: z.boolean().optional().default(false),
});

function eventExportType(type: z.infer<typeof CreateExportSchema>["exportType"], actor: "buyer" | "admin") {
  if (actor === "admin" && type === "admin_internal") return "admin_internal";
  if (type === "sample") return "sample";
  if (type === "crm_push") return "crm_push";
  if (type === "watchlist") return "watchlist";
  if (type === "report_only") return "report_only";
  return "approved_buyer";
}

export async function POST(req: Request) {
  const body = CreateExportSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message || "Invalid export request." }, { status: 400 });
  }

  const parsed = body.data;
  const admin = await getAdminTokenSessionFromRequest(req);
  if (admin) {
    const result = await createLeadFlowExport({
      actor: "admin",
      actorUserId: admin.userId,
      exportType: eventExportType(parsed.exportType, "admin"),
      format: normalizeExportFormat(parsed.format),
      fieldGroups: normalizeFieldGroupsForRequest(parsed.fieldGroups, "admin"),
      listingId: parsed.listingId || null,
      listingSlug: parsed.listingSlug || null,
      leadProfileId: parsed.leadProfileId || null,
      reason: parsed.reason,
      confirmedAllowedUse: parsed.confirmedAllowedUse,
      adminOverrideHighRisk: parsed.adminOverrideHighRisk,
    });

    if (!result.ok) return NextResponse.json({ error: result.error, reason: result.reason }, { status: result.status });
    return NextResponse.json({
      ok: true,
      exportId: result.exportRecord.id,
      downloadUrl: result.downloadUrl,
      blockedCount: result.blockedCount,
    });
  }

  const buyerData = await getBuyerPortalData();
  if (!buyerData.authenticated) {
    return NextResponse.json({ error: "Buyer login required." }, { status: buyerData.reason === "missing_config" ? 503 : 401 });
  }
  if (!buyerData.account) {
    return NextResponse.json({ error: "Complete buyer profile before requesting exports." }, { status: 403 });
  }

  const entitlement =
    buyerData.entitlements.find((item) => item.id === parsed.entitlementId) ||
    buyerData.entitlements.find((item) => item.listing_id === parsed.listingId || item.listing_slug === parsed.listingSlug || item.lead_profile_id === parsed.leadProfileId) ||
    null;

  const result = await createLeadFlowExport({
    actor: "buyer",
    actorUserId: buyerData.user.id,
    buyerAccount: buyerData.account,
    entitlement,
    exportType: eventExportType(parsed.exportType, "buyer"),
    format: normalizeExportFormat(parsed.format),
    fieldGroups: normalizeFieldGroupsForRequest(parsed.fieldGroups, "buyer", entitlement?.access_level),
    listingId: parsed.listingId || entitlement?.listing_id || null,
    listingSlug: parsed.listingSlug || entitlement?.listing_slug || null,
    leadProfileId: parsed.leadProfileId || entitlement?.lead_profile_id || null,
    reason: parsed.reason,
    confirmedAllowedUse: parsed.confirmedAllowedUse,
  });

  if (!result.ok) return NextResponse.json({ error: result.error, reason: result.reason }, { status: result.status });
  return NextResponse.json({
    ok: true,
    exportId: result.exportRecord.id,
    downloadUrl: result.downloadUrl,
    blockedCount: result.blockedCount,
  });
}
