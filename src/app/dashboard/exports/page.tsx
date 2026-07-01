import type { Metadata } from "next";
import { getAdminExportPageData } from "@/lib/leadflow-export";
import { AdminExportsClient } from "./AdminExportsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Controlled Exports | The LeadFlow Pro",
  description: "Admin-only export console for permissioned, scoped, audited lead signal delivery.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardExportsPage() {
  const data = await getAdminExportPageData();
  return <AdminExportsClient data={data} />;
}
