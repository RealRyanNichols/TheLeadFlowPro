import type { Metadata } from "next";
import { BuyerDashboardView, BuyerPortalShell } from "@/components/buyer/BuyerPortalShell";
import { getBuyerPortalData, trackBuyerEvent } from "@/lib/buyer-portal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Buyer Portal | The LeadFlow Pro",
  description: "Review-gated buyer portal for lead signal requests, watchlists, and approved access.",
};

export default async function BuyerDashboardPage() {
  const data = await getBuyerPortalData();
  if (data.authenticated && data.account) {
    await trackBuyerEvent("buyer_dashboard_viewed", {
      route: "/buyer",
      buyer_account_id: data.account.id,
      access_level: data.accessLevel,
      status: data.accountStatus,
    }).catch(() => null);
  }
  return (
    <BuyerPortalShell
      data={data}
      active="/buyer"
      title="Buyer dashboard"
      description="Request, track, and manage lead signal access without exposing full data before review."
    >
      {data.authenticated ? <BuyerDashboardView data={data} /> : null}
    </BuyerPortalShell>
  );
}
