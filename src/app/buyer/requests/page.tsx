import type { Metadata } from "next";
import { BuyerPortalShell, BuyerRequestsView } from "@/components/buyer/BuyerPortalShell";
import { getBuyerPortalData, trackBuyerEvent } from "@/lib/buyer-portal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Buyer Requests | The LeadFlow Pro",
  description: "Track sample and access requests for review-gated lead signal products.",
};

export default async function BuyerRequestsPage() {
  const data = await getBuyerPortalData();
  if (data.authenticated && data.account) {
    await trackBuyerEvent("buyer_request_viewed", {
      route: "/buyer/requests",
      buyer_account_id: data.account.id,
      request_count: data.requests.length,
      status: data.accountStatus,
    }).catch(() => null);
  }
  return (
    <BuyerPortalShell
      data={data}
      active="/buyer/requests"
      title="My requests"
      description="See requested listings, request type, review status, admin-visible notes, and the next action."
    >
      {data.authenticated ? <BuyerRequestsView data={data} /> : null}
    </BuyerPortalShell>
  );
}
