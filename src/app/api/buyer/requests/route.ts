import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buyerAccountIsRestricted,
  ensureBuyerAccountForUser,
  trackBuyerEvent,
  type BuyerRequest,
} from "@/lib/buyer-portal";
import { insertLeadFlowRow, selectLeadFlowRows } from "@/lib/leadflow-data-api";
import { getBuyerAuthState } from "@/lib/supabase-buyer-auth";

export const runtime = "nodejs";

const BuyerRequestSchema = z.object({
  listingSlug: z.string().trim().min(3).max(160),
  listingTitle: z.string().trim().min(3).max(180),
  category: z.string().trim().max(120).optional().default("Marketplace"),
  requestType: z.enum(["sample", "access", "purchase", "exclusive"]).default("access"),
  message: z.string().trim().max(1400).optional().default(""),
  intendedUse: z.string().trim().min(12).max(1600),
  budgetRange: z.string().trim().min(2).max(120),
  urgency: z.string().trim().min(2).max(120),
});

export async function POST(req: Request) {
  try {
    const auth = await getBuyerAuthState();
    if (!auth.authenticated) return NextResponse.json({ error: "Buyer login required." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const parsed = BuyerRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid buyer request." }, { status: 400 });
    }

    const account = await ensureBuyerAccountForUser(auth.user);
    if (!account) return NextResponse.json({ error: "Buyer profile required." }, { status: 400 });
    if (buyerAccountIsRestricted(account)) {
      return NextResponse.json({ error: "This buyer account cannot request restricted data." }, { status: 403 });
    }

    const data = parsed.data;
    const denied = await selectLeadFlowRows<BuyerRequest>("buyer_requests", {
      select: "id,status",
      buyer_account_id: `eq.${account.id}`,
      listing_slug: `eq.${data.listingSlug}`,
      status: "in.(denied,rejected)",
      limit: 1,
    }).catch(() => []);
    if (denied.length > 0) {
      return NextResponse.json(
        { error: "This listing was denied for this buyer account. Admin review is required before requesting it again." },
        { status: 409 },
      );
    }

    const inserted = await insertLeadFlowRow<BuyerRequest>("buyer_requests", {
      buyer_account_id: account.id,
      listing_slug: data.listingSlug,
      request_type: data.requestType === "purchase" || data.requestType === "exclusive" ? "access" : data.requestType,
      message: data.message || null,
      intended_use: data.intendedUse,
      budget_range: data.budgetRange,
      urgency: data.urgency,
      vertical: data.category,
      category: data.category,
      buyer_use_case: data.intendedUse,
      status: "submitted",
      review_status: "pending",
      source_path: "/buyer/requests",
      metadata: {
        listing_slug: data.listingSlug,
        listing_title: data.listingTitle,
        requested_action: data.requestType,
      },
    });
    const request = inserted[0];
    await trackBuyerEvent("buyer_request_submitted", {
      buyer_account_id: account.id,
      buyer_request_id: request?.id,
      listing_slug: data.listingSlug,
      request_type: data.requestType,
    }).catch(() => null);

    return NextResponse.json({ ok: true, request });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Buyer request failed." }, { status: 500 });
  }
}
