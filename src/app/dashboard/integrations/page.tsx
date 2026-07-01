import type { Metadata } from "next";
import { getAdminIntegrationsPageData } from "@/lib/leadflow-integrations";
import { AdminIntegrationsClient } from "./AdminIntegrationsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Integration Delivery | The LeadFlow Pro",
  description: "Admin-only integration delivery monitor for buyer CRM, webhook, CSV, and automation routes.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardIntegrationsPage() {
  const data = await getAdminIntegrationsPageData();
  return <AdminIntegrationsClient data={data} />;
}
