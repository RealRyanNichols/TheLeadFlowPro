import type { Metadata } from "next";
import { BuyerPortalShell } from "@/components/buyer/BuyerPortalShell";
import { getBuyerPortalData } from "@/lib/buyer-portal";
import { getBuyerIntegrationsPageData } from "@/lib/leadflow-integrations";
import { BuyerIntegrationsClient } from "./BuyerIntegrationsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Buyer Integrations | The LeadFlow Pro",
  description: "Route approved lead signal products into buyer workflows without exposing unauthorized fields.",
};

export default async function BuyerIntegrationsPage() {
  const portalData = await getBuyerPortalData();
  const integrationData = await getBuyerIntegrationsPageData(portalData);

  return (
    <BuyerPortalShell
      data={portalData}
      active="/buyer/integrations"
      title="Buyer integrations"
      description="Send approved signal summaries into webhooks, CSV workflows, spreadsheets, CRMs, and sales systems. Every run checks entitlement before delivery."
    >
      {integrationData.authenticated ? <BuyerIntegrationsClient data={integrationData} /> : null}
    </BuyerPortalShell>
  );
}
