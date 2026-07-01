import { NextResponse } from "next/server";
import { z } from "zod";
import { buyerAccountIsRestricted, ensureBuyerAccountForUser, trackBuyerEvent, type BuyerWatchlistItem } from "@/lib/buyer-portal";
import { insertLeadFlowRow, selectLeadFlowRows } from "@/lib/leadflow-data-api";
import { getBuyerAuthState } from "@/lib/supabase-buyer-auth";

export const runtime = "nodejs";

const WatchlistSchema = z.object({
  listingSlug: z.string().trim().min(3).max(160),
  title: z.string().trim().min(3).max(180),
  category: z.string().trim().max(120).optional().default("Marketplace"),
});

export async function POST(req: Request) {
  try {
    const auth = await getBuyerAuthState();
    if (!auth.authenticated) return NextResponse.json({ error: "Buyer login required." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const parsed = WatchlistSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid watchlist item." }, { status: 400 });
    }

    const account = await ensureBuyerAccountForUser(auth.user);
    if (!account) return NextResponse.json({ error: "Buyer profile required." }, { status: 400 });
    if (buyerAccountIsRestricted(account)) {
      return NextResponse.json({ error: "This buyer account cannot save restricted listings." }, { status: 403 });
    }

    const existing = await selectLeadFlowRows<BuyerWatchlistItem>("buyer_watchlist", {
      select: "id,buyer_account_id,listing_slug,title,category,created_at",
      buyer_account_id: `eq.${account.id}`,
      listing_slug: `eq.${parsed.data.listingSlug}`,
      limit: 1,
    }).catch(() => []);
    const item =
      existing[0] ||
      (
        await insertLeadFlowRow<BuyerWatchlistItem>("buyer_watchlist", {
          buyer_account_id: account.id,
          listing_slug: parsed.data.listingSlug,
          title: parsed.data.title,
          category: parsed.data.category,
          source_path: "/marketplace",
        })
      )[0];

    await trackBuyerEvent("buyer_watchlist_opened", {
      buyer_account_id: account.id,
      listing_slug: parsed.data.listingSlug,
    }).catch(() => null);

    return NextResponse.json({ ok: true, item });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Watchlist save failed." }, { status: 500 });
  }
}
