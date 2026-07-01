import type { Metadata } from "next";
import { getAdminExclusivePageData } from "@/lib/leadflow-exclusive";
import { AdminExclusiveClient } from "./AdminExclusiveClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Exclusive Access | The LeadFlow Pro",
  description: "Admin console for exclusive, limited-seat, territory, vertical, and time-window lead signal access.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardExclusivePage() {
  const data = await getAdminExclusivePageData();
  return <AdminExclusiveClient data={data} />;
}
