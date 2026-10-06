import { redirect } from "next/navigation";
import { requireDashboardOwner } from "@/lib/adminOwnerSnapshot";
import { safeOwnerView } from "@/lib/adminOwnerViews";
import { OperatorAuthError } from "@/lib/operatoros/auth";
import OwnerFrame from "./OwnerFrame";

export const dynamic = "force-dynamic";
export const metadata = { title: "Command Center | The LeadFlow Pro" };

export default async function OwnerOverview({ searchParams }: { searchParams: Promise<{ view?: string; record?: string; status?: string }> }) {
  try { await requireDashboardOwner(); }
  catch (error) {
    if (error instanceof OperatorAuthError) redirect(error.status === 401 ? "/login?next=/admin/overview" : "/admin");
    throw error;
  }
  const params = await searchParams;
  const view = safeOwnerView(params.view); const detail = new URLSearchParams();
  if (view === "library" && params.record && /^[a-zA-Z0-9_-]{1,100}$/.test(params.record)) detail.set("record", params.record);
  if (view === "work" && params.status && ["all","open","waiting","review","done"].includes(params.status)) detail.set("status", params.status);
  return <OwnerFrame view={view} detail={detail.size ? "?" + detail.toString() : ""} />;
}
