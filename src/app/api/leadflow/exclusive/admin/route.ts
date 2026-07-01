import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminTokenSessionFromRequest } from "@/lib/admin-token";
import { ACCESS_MODELS, adminUpdateExclusive } from "@/lib/leadflow-exclusive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ExclusiveAdminActionSchema = z.object({
  action: z.enum([
    "approve",
    "deny",
    "request_more_info",
    "reserve",
    "grant_entitlement",
    "remove_exclusivity",
    "convert_to_exclusive",
    "convert_to_shared",
  ]),
  requestId: z.string().trim().max(80).optional().default(""),
  listingId: z.string().trim().max(160).optional().default(""),
  accessModel: z.enum(ACCESS_MODELS).optional().default("exclusive_listing"),
  territory: z.string().trim().max(180).optional().default(""),
  startsAt: z.string().trim().max(60).optional().default(""),
  endsAt: z.string().trim().max(60).optional().default(""),
  adminNotes: z.string().trim().max(1400).optional().default(""),
  confirmedImpact: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  const admin = await getAdminTokenSessionFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 401 });

  const parsed = ExclusiveAdminActionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid exclusive admin action." }, { status: 400 });
  }

  const data = parsed.data;
  const result = await adminUpdateExclusive({
    action: data.action,
    requestId: data.requestId || null,
    listingId: data.listingId || null,
    accessModel: data.accessModel,
    territory: data.territory || null,
    startsAt: data.startsAt || null,
    endsAt: data.endsAt || null,
    adminNotes: data.adminNotes || null,
    confirmedImpact: data.confirmedImpact,
    adminUserId: admin.userId,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, result });
}
