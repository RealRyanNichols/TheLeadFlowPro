import type { Metadata } from "next";
import { PartnerDashboardView, PartnerPortalShell } from "@/components/partner/PartnerPortalShell";
import { getPartnerPortalData, trackPartnerEvent } from "@/lib/partner-portal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Partner Portal | The LeadFlow Pro",
  description: "Review-gated partner portal for source contributors, agencies, affiliates, data partners, and niche operators.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PartnerDashboardPage() {
  const data = await getPartnerPortalData();
  if (data.authenticated && data.account) {
    await trackPartnerEvent("partner_dashboard_viewed", {
      route: "/partner",
      partner_account_id: data.account.id,
      partner_type: data.account.partner_type,
      status: data.status,
    }).catch(() => null);
  }

  return (
    <PartnerPortalShell
      data={data}
      active="/partner"
      title="Partner dashboard"
      description="Track sources, review status, buyer interest, marketplace movement, and review-gated earnings without turning source submissions into automatic data products."
    >
      {data.authenticated ? <PartnerDashboardView data={data} /> : null}
    </PartnerPortalShell>
  );
}
