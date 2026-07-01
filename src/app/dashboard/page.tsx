import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getAdminReviewDashboardData } from "@/lib/admin-review-dashboard";
import { AdminReviewDashboardClient } from "./AdminReviewDashboardClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Review Dashboard | The LeadFlow Pro",
  description: "Internal review dashboard for source submissions, lead profiles, buyer requests, listings, suppression, exports, events, and audit logs.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardOverview() {
  const session = await auth();
  const data = await getAdminReviewDashboardData(session?.user?.email || "admin");
  return <AdminReviewDashboardClient data={data} />;
}
