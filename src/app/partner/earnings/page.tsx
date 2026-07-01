import type { Metadata } from "next";
import { PartnerEarningsView, PartnerPortalShell } from "@/components/partner/PartnerPortalShell";
import { getPartnerPortalData, trackPartnerEvent } from "@/lib/partner-portal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Partner Earnings | The LeadFlow Pro",
  description: "Review-gated earnings estimates, approvals, paid status, source-based earnings, referrals, and listing-based earnings.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PartnerEarningsPage() {
  const data = await getPartnerPortalData();
  if (data.authenticated && data.account) {
    await trackPartnerEvent("partner_earnings_viewed", {
      route: "/partner/earnings",
      partner_account_id: data.account.id,
      status: data.status,
      earnings_count: data.earnings.length,
    }).catch(() => null);
  }

  return (
    <PartnerPortalShell
      data={data}
      active="/partner/earnings"
      title="Partner earnings"
      description="Track estimated, pending, approved, and paid partner earnings. Estimates are not guaranteed and only become payable after review."
    >
      {data.authenticated ? <PartnerEarningsView data={data} /> : null}
    </PartnerPortalShell>
  );
}
