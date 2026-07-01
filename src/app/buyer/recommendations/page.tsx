import type { Metadata } from "next";
import { BuyerPortalShell } from "@/components/buyer/BuyerPortalShell";
import { getBuyerRecommendationsData } from "@/lib/matching/match-buyer-request";
import { BuyerRecommendationsClient } from "./BuyerRecommendationsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Buyer Recommendations | The LeadFlow Pro",
  description: "Buyer demand matches for listings, samples, segments, lead profiles, tools, and custom sourcing.",
};

export default async function BuyerRecommendationsPage() {
  const data = await getBuyerRecommendationsData();

  return (
    <BuyerPortalShell
      data={data.authenticated ? data.portal : data}
      active="/buyer/recommendations"
      title="Buyer recommendations"
      description="Match buyer demand to available lead signal products, sample access, exclusive options, tools, and custom sourcing."
    >
      {data.authenticated ? <BuyerRecommendationsClient data={data} /> : null}
    </BuyerPortalShell>
  );
}
