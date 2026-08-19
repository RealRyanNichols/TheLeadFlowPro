import { createClient } from "@/lib/supabase/server";
import SalesLeadsTable from "./SalesLeadsTable";

export default async function SalesPipeline() {
  const supabase = await createClient();
  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .is("deleted_at", null)
    .eq("is_test", false)
    .order("created_at", { ascending: false })
    .limit(200);

  const all = leads ?? [];
  const counts = {
    total: all.length,
    new: all.filter((lead) => lead.status === "new").length,
    active: all.filter((lead) => ["contacted", "call_booked", "proposal"].includes(lead.status)).length,
    won: all.filter((lead) => lead.status === "won").length,
  };

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric label="Leads" value={counts.total} />
        <Metric label="New" value={counts.new} tone="text-flow-400" />
        <Metric label="Active" value={counts.active} tone="text-warn" />
        <Metric label="Won" value={counts.won} tone="text-mint" />
      </div>
      <SalesLeadsTable initialLeads={all} />
    </>
  );
}

function Metric({ label, value, tone = "text-[var(--heading)]" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="card !p-4 text-center">
      <div className={`text-3xl font-black ${tone}`}>{value}</div>
      <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</div>
    </div>
  );
}
