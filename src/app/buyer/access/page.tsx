import type { Metadata } from "next";
import { BuyerAccessView, BuyerPortalShell } from "@/components/buyer/BuyerPortalShell";
import { auditBuyerAccessView, getBuyerPortalData, trackBuyerEvent } from "@/lib/buyer-portal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Approved Buyer Access | The LeadFlow Pro",
  description: "Entitlement-gated access to approved lead signal product summaries.",
};

export default async function BuyerAccessPage() {
  const data = await getBuyerPortalData();
  if (data.authenticated && data.account && data.entitlements.length > 0) {
    const entitlementIds = data.entitlements.map((entitlement) => entitlement.id);
    await Promise.all([
      trackBuyerEvent("buyer_entitlement_viewed", {
        buyer_account_id: data.account.id,
        entitlement_count: entitlementIds.length,
        raw_records_returned: false,
      }).catch(() => null),
      auditBuyerAccessView({
        actorUserId: data.user.id,
        buyerAccountId: data.account.id,
        entitlementIds,
        sourcePath: "/buyer/access",
      }).catch(() => null),
    ]);
  }
  return (
    <BuyerPortalShell
      data={data}
      active="/buyer/access"
      title="Approved access"
      description="View the signal products tied to this buyer account by active entitlement."
    >
      {data.authenticated ? <BuyerAccessView data={data} /> : null}
    </BuyerPortalShell>
  );
}
