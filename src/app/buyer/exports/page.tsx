import type { Metadata } from "next";
import { BuyerPortalShell } from "@/components/buyer/BuyerPortalShell";
import { getBuyerPortalData } from "@/lib/buyer-portal";
import { getBuyerExportPageData } from "@/lib/leadflow-export";
import { BuyerExportsClient } from "./BuyerExportsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Buyer Exports | The LeadFlow Pro",
  description: "Permissioned, scoped, audited exports for approved lead signal products.",
};

export default async function BuyerExportsPage() {
  const [portalData, exportData] = await Promise.all([
    getBuyerPortalData(),
    getBuyerExportPageData(),
  ]);

  return (
    <BuyerPortalShell
      data={portalData}
      active="/buyer/exports"
      title="Buyer exports"
      description="Generate scoped files only when this buyer account has approved entitlement and allowed-use confirmation."
    >
      {exportData.authenticated ? <BuyerExportsClient data={exportData} /> : null}
    </BuyerPortalShell>
  );
}
