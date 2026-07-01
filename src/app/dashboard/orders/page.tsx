import type { Metadata } from "next";
import { getAdminOrdersPageData } from "@/lib/leadflow-checkout";
import { AdminOrdersClient } from "./AdminOrdersClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Orders | The LeadFlow Pro",
  description: "Admin-only order review for paid samples, listing access, exclusive deposits, and custom signal requests.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardOrdersPage() {
  const data = await getAdminOrdersPageData(true);
  return <AdminOrdersClient data={data} />;
}
