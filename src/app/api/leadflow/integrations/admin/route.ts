import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminTokenSessionFromRequest } from "@/lib/admin-token";
import { adminUpdateIntegration } from "@/lib/leadflow-integrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AdminIntegrationSchema = z.object({
  integrationId: z.string().trim().min(1),
  action: z.enum(["pause", "resume", "revoke"]),
  confirmedImpact: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  const admin = await getAdminTokenSessionFromRequest(req);
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 401 });

  const parsed = AdminIntegrationSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid admin integration request." }, { status: 400 });
  }

  const result = await adminUpdateIntegration({
    actorUserId: admin.userId,
    integrationId: parsed.data.integrationId,
    action: parsed.data.action,
    confirmedImpact: parsed.data.confirmedImpact,
  });

  if (!result.ok) return NextResponse.json({ error: result.error, reason: result.reason }, { status: result.status });
  return NextResponse.json({ ok: true, integration: result.integration, message: result.message }, { status: result.status });
}
