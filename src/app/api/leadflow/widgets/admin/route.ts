import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminTokenSessionFromRequest } from "@/lib/admin-token";
import { LEADFLOW_WIDGET_TYPES } from "@/lib/leadflow-widget-definitions";
import { adminSaveWidget } from "@/lib/leadflow-widgets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AdminWidgetSchema = z.object({
  action: z.enum(["create", "update", "pause", "activate", "archive", "delete"]),
  widgetId: z.string().trim().max(120).optional().nullable(),
  widgetType: z.enum(LEADFLOW_WIDGET_TYPES).optional(),
  name: z.string().trim().min(2).max(180).optional(),
  slug: z.string().trim().max(120).optional(),
  status: z.enum(["draft", "active", "paused", "archived", "deleted"]).optional(),
  allowedDomains: z.array(z.string().trim().max(220)).max(25).optional(),
  theme: z.record(z.unknown()).optional(),
  questionnaireId: z.string().trim().max(120).optional().nullable(),
  redirectUrl: z.string().trim().max(900).optional().nullable(),
  completionMessage: z.string().trim().max(600).optional(),
  consentRequired: z.boolean().optional(),
});

export async function POST(req: Request) {
  const admin = await getAdminTokenSessionFromRequest(req);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Admin access required." }, { status: 401 });
  }

  const parsed = AdminWidgetSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message || "Invalid widget admin action." }, { status: 400 });
  }

  const result = await adminSaveWidget({
    ...parsed.data,
    adminUserId: admin.userId,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, widget: result.widget });
}
