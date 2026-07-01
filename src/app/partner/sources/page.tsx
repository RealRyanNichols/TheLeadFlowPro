import type { Metadata } from "next";
import { PartnerPortalShell, PartnerSourcesView } from "@/components/partner/PartnerPortalShell";
import { getPartnerPortalData, trackPartnerEvent } from "@/lib/partner-portal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Partner Sources | The LeadFlow Pro",
  description: "Partner source review status, risk level, marketplace status, buyer interest, and visible admin notes.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PartnerSourcesPage() {
  const data = await getPartnerPortalData();
  if (data.authenticated && data.account) {
    await trackPartnerEvent("partner_source_status_viewed", {
      route: "/partner/sources",
      partner_account_id: data.account.id,
      source_count: data.sourceCount,
      status: data.status,
    }).catch(() => null);
  }

  return (
    <PartnerPortalShell
      data={data}
      active="/partner/sources"
      title="Partner sources"
      description="Submitted and connected source records stay review-gated until proof, permission, suppression, risk, and buyer use case are checked."
    >
      {data.authenticated ? <PartnerSourcesView data={data} /> : null}
    </PartnerPortalShell>
  );
}
