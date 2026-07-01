import type { Metadata } from "next";
import { getAdminWidgetsDashboardData } from "@/lib/leadflow-widgets";
import { AdminWidgetsClient } from "./AdminWidgetsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Widget Builder | The LeadFlow Pro",
  description: "Admin widget builder for embeddable LeadFlow questionnaires, calculators, and first-party signal tools.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardWidgetsPage() {
  const data = await getAdminWidgetsDashboardData();
  return <AdminWidgetsClient data={data} />;
}
