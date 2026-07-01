import type { Metadata } from "next";
import { BuyerPortalShell, BuyerRequestsView } from "@/components/buyer/BuyerPortalShell";
import { getBuyerPortalData } from "@/lib/buyer-portal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Buyer Requests | The LeadFlow Pro",
  description: "Track sample and access requests for review-gated lead signal products.",
};

export default async function BuyerRequestsPage() {
  const data = await getBuyerPortalData();
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
