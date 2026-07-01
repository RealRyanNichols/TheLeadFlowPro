import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getAdminPartnerDashboardData } from "@/lib/partner-portal";
import { AdminPartnersClient } from "./AdminPartnersClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Partner Dashboard | The LeadFlow Pro",
  description: "Admin-only partner review dashboard for contributors, affiliates, agencies, source owners, earnings, payouts, and partner activity.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardPartnersPage() {
  const session = await auth();
  const data = await getAdminPartnerDashboardData(session?.user?.email || undefined);
  return <AdminPartnersClient data={data} />;
}
