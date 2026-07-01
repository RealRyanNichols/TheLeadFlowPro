import { NextResponse } from "next/server";
import { z } from "zod";
import {
  auditLeadProfileAccess,
  entitlementAllowsExport,
  getProtectedLeadProfileAccess,
  trackBuyerLeadProfileAction,
} from "@/lib/protected-lead-profile";
import { hasLeadFlowDataApiConfig, insertLeadFlowRow, selectLeadFlowRows } from "@/lib/leadflow-data-api";

export const runtime = "nodejs";

const BuyerLeadProfileActionSchema = z.object({
  action: z.enum([
    "watchlist",
    "request_clarification",
    "report_issue",
    "request_exclusive",
    "export",
    "mark_contacted",
  ]),
});

function eventNameForAction(action: z.infer<typeof BuyerLeadProfileActionSchema>["action"]) {
  if (action === "watchlist") return "lead_profile_watchlisted";
  if (action === "report_issue" || action === "request_clarification") return "lead_profile_issue_reported";
  if (action === "export") return "lead_profile_exported";
  return "buyer_request_submitted";
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const parsed = BuyerLeadProfileActionSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid lead profile action." }, { status: 400 });
    }

    const access = await getProtectedLeadProfileAccess(params.id);
    if (!access.allowed) {
      const status = access.reason === "not_authenticated" || access.reason === "invalid_session" ? 401 : 403;
      return NextResponse.json({ error: "Approved buyer entitlement required for this profile." }, { status });
    }
    if (access.role !== "buyer" || !access.buyerAccount || !access.entitlement) {
      return NextResponse.json({ error: "Buyer account required." }, { status: 403 });
    }

    const { action } = parsed.data;
    const eventName = eventNameForAction(action);

    if (!hasLeadFlowDataApiConfig()) {
      return NextResponse.json({
        ok: true,
        persisted: false,
        message: "Action accepted in the UI. Connect Supabase service credentials to persist buyer profile actions.",
      });
    }

    if (action === "export" && !entitlementAllowsExport(access.entitlement)) {
      await trackBuyerLeadProfileAction("lead_profile_exported", {
        profileId: access.profile.id,
        buyerAccountId: access.buyerAccount.id,
        entitlementId: access.entitlement.id,
        action: "export_denied",
        details: { reason: "entitlement_access_level" },
      });
      return NextResponse.json({ error: "This entitlement does not permit profile export." }, { status: 403 });
    }

    if (action === "watchlist") {
      const existing = await selectLeadFlowRows("buyer_watchlist", {
        select: "id",
        buyer_account_id: `eq.${access.buyerAccount.id}`,
        listing_slug: `eq.${access.profile.id}`,
        limit: 1,
      }).catch(() => []);
      if (existing.length === 0) {
        await insertLeadFlowRow("buyer_watchlist", {
          buyer_account_id: access.buyerAccount.id,
          listing_slug: access.profile.id,
          title: access.profile.title,
          category: access.profile.category,
          source_path: `/lead-profile/${access.profile.id}`,
        });
      }
    }

    if (action === "request_clarification" || action === "report_issue") {
      await insertLeadFlowRow("profile_issue_reports", {
        lead_profile_slug: access.profile.id,
        buyer_account_id: access.buyerAccount.id,
        report_type: action === "request_clarification" ? "clarification" : "issue",
        message:
          action === "request_clarification"
            ? "Buyer requested clarification from the protected profile page."
            : "Buyer reported an issue from the protected profile page.",
        status: "submitted",
        source_path: `/lead-profile/${access.profile.id}`,
        metadata: {
          entitlement_id: access.entitlement.id,
          access_level: access.entitlement.access_level,
        },
      });
    }

    if (action === "request_exclusive") {
      await insertLeadFlowRow("buyer_requests", {
        buyer_account_id: access.buyerAccount.id,
        listing_slug: access.profile.id,
        request_type: "exclusive",
        message: "Buyer requested exclusive access from the protected profile page.",
        intended_use: access.profile.buyerUseCase,
        budget_range: access.profile.priceBand,
        urgency: access.profile.buyerFitRecord.urgencyCategory,
        vertical: access.profile.vertical,
        category: access.profile.category,
        buyer_use_case: access.profile.buyerUseCase,
        status: "submitted",
        review_status: "pending",
        source_path: `/lead-profile/${access.profile.id}`,
        metadata: {
          entitlement_id: access.entitlement.id,
          profile_title: access.profile.title,
        },
      });
    }

    if (action === "export") {
      await insertLeadFlowRow("exports", {
        buyer_account_id: access.buyerAccount.id,
        export_type: "lead_profile_summary",
        export_status: "queued",
        row_count: 1,
        raw_answers_included: access.entitlement.access_level === "raw_export",
        filter_summary: {
          profile_slug: access.profile.id,
          entitlement_id: access.entitlement.id,
          access_level: access.entitlement.access_level,
        },
      });
    }

    await Promise.all([
      trackBuyerLeadProfileAction(eventName, {
        profileId: access.profile.id,
        buyerAccountId: access.buyerAccount.id,
        entitlementId: access.entitlement.id,
        action,
      }),
      auditLeadProfileAccess({
        profileId: access.profile.id,
        actorUserId: access.actorUserId,
        actorType: "buyer",
        buyerAccountId: access.buyerAccount.id,
        entitlementId: access.entitlement.id,
        action: `lead_profile.${action}`,
      }),
    ]);

    return NextResponse.json({ ok: true, persisted: true, message: "Action recorded and audit logged." });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lead profile action failed." },
      { status: 500 },
    );
  }
}
