import type { Metadata } from "next";
import { PartnerPortalShell, PartnerSettingsSummary } from "@/components/partner/PartnerPortalShell";
import { getPartnerPortalData } from "@/lib/partner-portal";
import { PartnerSettingsForm } from "./PartnerSettingsForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Partner Settings | The LeadFlow Pro",
  description: "Complete partner profile and source-compliance confirmations for review-gated LeadFlow Pro partner access.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PartnerSettingsPage() {
  const data = await getPartnerPortalData();
  return (
    <PartnerPortalShell
      data={data}
      active="/partner/settings"
      title="Partner settings"
      description="Complete the partner profile and compliance confirmations required before source contribution, review, marketplace release, or earnings review."
    >
      {data.authenticated ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <PartnerSettingsForm account={data.account} email={data.user.email} />
          <PartnerSettingsSummary account={data.account} />
        </div>
      ) : null}
    </PartnerPortalShell>
  );
}
