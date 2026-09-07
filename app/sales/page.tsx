import { createClient } from "@/lib/supabase/server";
import SalesLeadsTable from "./SalesLeadsTable";

export default async function SalesPipeline() {
  const supabase = await createClient();
  const { data: leads, error } = await supabase
    .from("leads")
    .select(
      "id, created_at, full_name, email, phone, business_name, current_platform, industry, interest, goals, timeline, best_contact_method, status, priority, next_follow_up_at, expected_value_cents, close_probability, owner",
    )
    .is("deleted_at", null)
    .eq("is_test", false)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error)
    return (
      <section role="alert" className="card border-[var(--danger-line)]">
        <h2 className="text-xl font-bold text-[var(--heading)]">
          The pipeline could not load.
        </h2>
        <p className="mt-2 text-[var(--muted)]">
          This is a connection or access error, not an empty lead list. Refresh
          the page to try again. Saved leads have not been removed.
        </p>
        <a href="/admin/sales" className="btn-primary mt-4 inline-flex">
          Reload the pipeline
        </a>
      </section>
    );

  const all = leads ?? [];
  const counts = {
    total: all.length,
    new: all.filter((lead) => lead.status === "new").length,
    active: all.filter((lead) =>
      ["contacted", "call_booked", "proposal"].includes(lead.status),
    ).length,
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
      <p className="mb-3 text-xs text-[var(--muted)]">
        Newest {all.length} leads shown
        {all.length === 200 ? " · first 200 records" : ""}. Open a call sheet
        for the shared conversation and next action.
      </p>
      <SalesLeadsTable initialLeads={all} />
    </>
  );
}

function Metric({
  label,
  value,
  tone = "text-[var(--heading)]",
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="card !p-4 text-center">
      <div className={`text-3xl font-black ${tone}`}>{value}</div>
      <div className="text-xs uppercase tracking-wide text-[var(--muted)]">
        {label}
      </div>
    </div>
  );
}
