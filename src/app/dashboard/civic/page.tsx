import type { Metadata } from "next";
import { getCivicDashboardData } from "@/lib/leadflow-civic";
import { AdminCivicClient } from "./AdminCivicClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Civic Review Dashboard | The LeadFlow Pro",
  description:
    "Internal civic review dashboard for aggregate issue pulse records, district signals, public sources, consented surveys, and public-display approvals.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardCivicPage() {
  const data = await getCivicDashboardData();
  const clientData = {
    ...data,
    surveys: data.surveys.map((survey) => ({
      ...survey,
      contact_email: survey.contact_email ? "opt-in contact stored" : null,
    })),
  };

  return <AdminCivicClient data={clientData} />;
}
