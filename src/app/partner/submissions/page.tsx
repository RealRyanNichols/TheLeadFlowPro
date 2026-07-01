import type { Metadata } from "next";
import { PartnerPortalShell, PartnerSubmissionsView } from "@/components/partner/PartnerPortalShell";
import { getPartnerPortalData, trackPartnerEvent } from "@/lib/partner-portal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Partner Submissions | The LeadFlow Pro",
  description: "Review-gated source submissions for LeadFlow Pro partners.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PartnerSubmissionsPage() {
  const data = await getPartnerPortalData();
  if (data.authenticated && data.account) {
    await trackPartnerEvent("partner_source_status_viewed", {
      route: "/partner/submissions",
      partner_account_id: data.account.id,
      source_count: data.sourceCount,
      status: data.status,
    }).catch(() => null);
  }

  return (
    <PartnerPortalShell
      data={data}
      active="/partner/submissions"
      title="Source submissions"
      description="See what each source became after review, including marketplace status, risk level, visible notes, and buyer interest."
    >
      {data.authenticated ? <PartnerSubmissionsView data={data} /> : null}
    </PartnerPortalShell>
  );
}
