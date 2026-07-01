import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getAdminTokenSession } from "@/lib/admin-token";
import { getLeadFlowOpsData, normalizeLeadFlowOpsFilters } from "@/lib/leadflow-ops";
import { OpsDashboardClient } from "./OpsDashboardClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Operating Dashboard | The LeadFlow Pro",
  description: "Admin-only LeadFlow operating dashboard for traffic, tools, buyer demand, source supply, compliance, exports, and revenue movement.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function LeadFlowOpsDashboardPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const admin = await getAdminTokenSession();
  if (!admin) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-[#060a11]/92 p-6 shadow-2xl shadow-black/25">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-red-300/30 bg-red-300/10 text-red-100">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-red-200">Admin only</p>
            <h1 className="mt-2 text-3xl font-black text-white">The operating dashboard is locked.</h1>
            <p className="mt-3 text-sm leading-6 text-ink-300">
              This route summarizes internal events, buyer demand, source supply, exports, and compliance queues. Sign in with a LeadFlow admin account before reviewing operating data.
            </p>
            <Link href="/login?callbackUrl=%2Fdashboard%2Fops" className="btn-primary mt-5 inline-flex justify-center text-sm">
              Admin login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filters = normalizeLeadFlowOpsFilters(searchParams);
  const data = await getLeadFlowOpsData(filters);
  return <OpsDashboardClient data={data} />;
}
