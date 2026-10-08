import { redirect } from "next/navigation";
import { loadLeadTouches } from "@/lib/loadLeadTouches";
import { leadStanding } from "@/lib/leadStanding";
import { createClient } from "@/lib/supabase/server";
import SalesLeadsTable from "../SalesLeadsTable";
import { ownerDashboardLoginFor } from "@/lib/adminOwnerAccess";
import { ownerClientSalesReport } from "@/lib/clientSalesServer";
import ClientSalesWorkspace from "@/components/ClientSalesWorkspace";

// The full lead table. This used to be the sales desk home screen; Today took
// that spot, because the first question in the morning is who to touch, not
// how many rows exist. This is where you come to browse, filter and audit.

export const metadata = { title: "Pipeline | LeadFlow Pro Sales Desk" };

export default async function SalesPipeline({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Fadmin%2Fsales%2Fpipeline");
  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "sales") redirect("/dashboard");
  const actorName = profile.full_name || "Team member";
  if (profile.role === "admin" && ownerDashboardLoginFor(user.email)) {
    const report = await ownerClientSalesReport();
    const query = await searchParams;
    if (report) {
      const native = report.clients.find(client => client.key === "leadflow");
      if (native) {
        const touches = await loadLeadTouches(supabase, native.opportunities.map(lead => lead.id));
        native.opportunities = native.opportunities.map(lead => ({ ...lead, lastTouch: touches[lead.id]?.name ? touches[lead.id] : lead.lastTouch }));
      }
      return <ClientSalesWorkspace report={report} ownerAccess initialClient={query.client} />;
    }
    if (query.client && query.client !== "leadflow") return <section className="card" role="alert"><h1 className="text-xl font-semibold">Client reporting is temporarily unavailable</h1><p className="mt-2 text-[var(--muted)]">The client records could not be loaded. Refresh in a moment.</p><a className="btn-primary mt-4 inline-flex" href="/admin/sales/pipeline?client=leadflow">Open LeadFlow sales</a></section>;
  }
  const { data: leads, error } = await supabase
    .from("leads")
    .select(
      "id, created_at, full_name, email, phone, business_name, current_platform, industry, interest, goals, timeline, best_contact_method, status, priority, next_follow_up_at, expected_value_cents, close_probability, owner, notes, source, utm_campaign",
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
        <a href="/admin/sales/pipeline" className="btn-primary mt-4 inline-flex">
          Reload the pipeline
        </a>
      </section>
    );

  const touches = await loadLeadTouches(supabase, (leads ?? []).map(lead => lead.id));
  const all = (leads ?? []).map(({ notes, ...lead }) => ({ ...lead, lastTouch: touches[lead.id], brief: leadStanding({ notes, status: lead.status, source: lead.source, industry: lead.industry, interest: lead.interest, timeline: lead.timeline, goals: lead.goals, utm_campaign: lead.utm_campaign }) }));
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
        {all.length} opportunities shown · hottest first
        {all.length === 200 ? " · first 200 records" : ""}. Open a call sheet
        for the shared conversation and next action.
      </p>
      <SalesLeadsTable initialLeads={all} actorName={actorName} />
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
