import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminTokenSessionFromRequest } from "@/lib/admin-token";
import {
  SAMPLE_FIELD_GROUPS,
  adminCreateOrUpdateSample,
  adminUpdateSampleRequest,
} from "@/lib/leadflow-samples";
import type { SampleAccessType, SampleFieldGroup } from "@/lib/leadflow-samples";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SampleAdminActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.enum(["approve", "deny", "revoke", "extend"]),
    requestId: z.string().trim().min(8).max(80),
    adminNotes: z.string().trim().max(1200).optional().default(""),
  }),
  z.object({
    action: z.enum(["create_sample", "update_sample"]),
    sampleId: z.string().trim().max(80).optional().default(""),
    listingId: z.string().trim().min(2).max(160),
    sampleType: z.enum(["free_redacted", "paid_sample", "buyer_approved", "admin_created", "report_only"]).default("paid_sample"),
    title: z.string().trim().min(3).max(220),
    description: z.string().trim().max(900).optional().default(""),
    price: z.coerce.number().min(0).max(100000),
    recordCount: z.coerce.number().int().min(1).max(500),
    fieldGroups: z.array(z.enum(SAMPLE_FIELD_GROUPS)).min(1).default(["public_profile", "source_proof", "compliance"]),
    status: z.enum(["draft", "review", "active", "paused", "archived", "revoked"]).default("active"),
    contactFieldsAllowed: z.boolean().optional().default(false),
    requiresAdminApproval: z.boolean().optional().default(true),
    allowedUse: z.string().trim().min(12).max(1200),
    restrictedUse: z.string().trim().min(12).max(1200),
  }),
]);

type SampleSaveAction = {
  action: "create_sample" | "update_sample";
  sampleId?: string;
  listingId: string;
  sampleType: SampleAccessType;
  title: string;
  description: string;
  price: number;
  recordCount: number;
  fieldGroups: SampleFieldGroup[];
  status: string;
  contactFieldsAllowed: boolean;
  requiresAdminApproval: boolean;
  allowedUse: string;
  restrictedUse: string;
};

export async function POST(req: Request) {
  const admin = await getAdminTokenSessionFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const parsed = SampleAdminActionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid sample admin action." }, { status: 400 });
  }

  const data = parsed.data;
  if (
    data.action === "approve" ||
    data.action === "deny" ||
    data.action === "revoke" ||
    data.action === "extend"
  ) {
    const result = await adminUpdateSampleRequest({
      requestId: data.requestId,
      action: data.action,
      adminUserId: admin.userId,
      adminNotes: data.adminNotes,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, request: result.request });
  }

  const sampleData = data as SampleSaveAction;
  const result = await adminCreateOrUpdateSample({
    action: sampleData.action,
    sampleId: sampleData.sampleId || null,
    listingId: sampleData.listingId,
    sampleType: sampleData.sampleType,
    title: sampleData.title,
    description: sampleData.description || null,
    price: sampleData.price,
    recordCount: sampleData.recordCount,
    fieldGroups: sampleData.fieldGroups,
    status: sampleData.status,
    contactFieldsAllowed: sampleData.contactFieldsAllowed,
    requiresAdminApproval: sampleData.requiresAdminApproval,
    allowedUse: sampleData.allowedUse,
    restrictedUse: sampleData.restrictedUse,
    adminUserId: admin.userId,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, sample: result.sample });
}
