import type { Metadata } from "next";
import { BuyerPortalShell, BuyerWatchlistView } from "@/components/buyer/BuyerPortalShell";
import { getBuyerPortalData, trackBuyerEvent } from "@/lib/buyer-portal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Buyer Watchlist | The LeadFlow Pro",
  description: "Saved lead signal listings for buyer review and future access requests.",
};

export default async function BuyerWatchlistPage() {
  const data = await getBuyerPortalData();
  if (data.authenticated && data.account) {
    await trackBuyerEvent("buyer_watchlist_opened", {
      buyer_account_id: data.account.id,
      watchlist_count: data.watchlistCount,
    }).catch(() => null);
  }
  return (
    <BuyerPortalShell
      data={data}
      active="/buyer/watchlist"
      title="My watchlist"
      description="Save signal products that look useful, then request access once the use case is clear."
    >
      {data.authenticated ? <BuyerWatchlistView data={data} /> : null}
    </BuyerPortalShell>
  );
}
