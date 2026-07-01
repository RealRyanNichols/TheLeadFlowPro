import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminTokenSessionFromRequest } from "@/lib/admin-token";
import { hasLeadFlowDataApiConfig, insertLeadFlowRow } from "@/lib/leadflow-data-api";
import {
  auditLeadProfileAccess,
  getProtectedLeadProfileAccess,
  persistAdminLeadProfileAction,
  trackLeadProfileEvent,
} from "@/lib/protected-lead-profile";

export const runtime = "nodejs";

const AdminLeadProfileActionSchema = z.object({
  action: z.enum([
    "approve",
    "reject",
    "needs_review",
    "add_source_proof",
    "update_score",
    "add_tag",
    "suppress",
    "resolve_suppression",
    "export",
    "grant_buyer_access",
    "remove_buyer_access",
  ]),
});

function eventNameForAction(action: z.infer<typeof AdminLeadProfileActionSchema>["action"]) {
  if (action === "approve") return "admin_profile_approved";
  if (action === "suppress") return "admin_profile_suppressed";
  if (action === "export") return "lead_profile_exported";
  return `admin_profile_${action}`;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAdminTokenSessionFromRequest(req);
    if (!session?.email) {
      return NextResponse.json({ error: "Admin session required." }, { status: 401 });
    }

    const parsed = AdminLeadProfileActionSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid admin profile action." }, { status: 400 });
    }

    const access = await getProtectedLeadProfileAccess(params.id, { isAdmin: true, adminUserId: null });
    if (!access.allowed) {
      return NextResponse.json({ error: "Lead profile not found." }, { status: 404 });
    }

    const { action } = parsed.data;
    const persisted =
      action === "approve" ||
      action === "reject" ||
      action === "needs_review" ||
      action === "suppress" ||
      action === "resolve_suppression"
        ? await persistAdminLeadProfileAction(access.profile.id, action)
        : { persisted: false };

    if (action === "export" && hasLeadFlowDataApiConfig()) {
      await insertLeadFlowRow("exports", {
        export_type: "admin_lead_profile_summary",
        export_status: "queued",
        row_count: 1,
        raw_answers_included: false,
        filter_summary: {
          profile_slug: access.profile.id,
          requested_by: session.email,
        },
      }).catch(() => null);
    }

    await Promise.all([
      trackLeadProfileEvent(eventNameForAction(action), {
        profileId: access.profile.id,
        role: "admin",
        action,
        rawRecordsReturned: false,
      }).catch(() => null),
      auditLeadProfileAccess({
        profileId: access.profile.id,
        actorUserId: null,
        actorType: "admin",
        action: `admin_profile.${action}`,
        details: {
          admin_email: session.email,
          persisted: persisted.persisted,
        },
      }).catch(() => null),
    ]);

    return NextResponse.json({
      ok: true,
      persisted: persisted.persisted,
      message: persisted.persisted
        ? "Admin action persisted and audit logged."
        : "Admin action audit logged. Add a selected buyer/source/score payload to persist this action.",
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Admin profile action failed." },
      { status: 500 },
    );
  }
}
