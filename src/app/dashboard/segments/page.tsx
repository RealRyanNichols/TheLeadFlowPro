import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getSegmentDashboardData } from "@/lib/segments/segment-builder";
import { SegmentsClient } from "./SegmentsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Segment Builder | The LeadFlow Pro",
  description: "Admin-only Segment Builder for turning reviewed, source-backed signals into auditable lead products.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardSegmentsPage() {
  const session = await auth();
  const data = await getSegmentDashboardData(session?.user?.email || undefined);
  return <SegmentsClient data={data} />;
}
