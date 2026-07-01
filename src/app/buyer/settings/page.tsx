import type { Metadata } from "next";
import { BuyerPortalShell, BuyerSettingsSummary } from "@/components/buyer/BuyerPortalShell";
import { getBuyerPortalData } from "@/lib/buyer-portal";
import { BuyerSettingsForm } from "./BuyerSettingsForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Buyer Settings | The LeadFlow Pro",
  description: "Complete buyer profile fields used for review-gated lead signal access.",
};

export default async function BuyerSettingsPage() {
  const data = await getBuyerPortalData();
  return (
    <BuyerPortalShell
      data={data}
      active="/buyer/settings"
      title="Account settings"
      description="Complete the review fields that decide which samples, products, and access levels make sense for this buyer account."
    >
      {data.authenticated ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <BuyerSettingsForm account={data.account} email={data.user.email} />
          <BuyerSettingsSummary data={data} />
        </div>
      ) : null}
    </BuyerPortalShell>
  );
}
