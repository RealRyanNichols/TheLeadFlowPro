import type { Metadata } from "next";
import { getAdminSamplesPageData } from "@/lib/leadflow-samples";
import { AdminSamplesClient } from "./AdminSamplesClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Paid Samples | The LeadFlow Pro",
  description: "Admin console for paid, reviewed, source-backed sample access.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardSamplesPage() {
  const data = await getAdminSamplesPageData();
  return <AdminSamplesClient data={data} />;
}
