import { loadLeadTouches } from "@/lib/loadLeadTouches";
import { leadStanding } from "@/lib/leadStanding";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LeadsTable from "./LeadsTable";
import TodaysCallsBanner from "./TodaysCallsBanner";
import LiveRefresh from "./command-center/LiveRefresh";
import Link from "next/link";

export default async function AdminLeads() {
  const supabase = await createClient();
  // Authorization next to the private reads (the leads below and the call
  // sheet in the banner), not only in the layout.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");
  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: leads, error } = await supabase
    .from("leads")
    .select("*")
    // Deleted leads leave the pipeline entirely.
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error)
    return (
      <>
        <TodaysCallsBanner supabase={supabase} />
        <div className="card" role="alert">
          <h2 className="font-bold">Leads could not be loaded.</h2>
          <p className="my-3 text-sm">
            This is a connection problem, not an empty pipeline. Try refreshing
            in a moment.
          </p>
          <LiveRefresh />
        </div>
      </>
    );
  const touches = await loadLeadTouches(supabase, (leads ?? []).map(lead => lead.id));
  const all = (leads ?? []).map(({ notes, ...lead }) => ({ ...lead, lastTouch: touches[lead.id], brief: leadStanding({ notes, status: lead.status, source: lead.source, industry: lead.industry, interest: lead.interest, timeline: lead.timeline, goals: lead.goals }) }));
  const counts = {
    total: all.length,
    new: all.filter((l) => l.status === "new").length,
    call_booked: all.filter((l) => l.status === "call_booked").length,
    won: all.filter((l) => l.status === "won").length,
  };

  return (
    <>
      <TodaysCallsBanner supabase={supabase} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">Leads & conversations</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Open a lead to see their original answers, source, calls, and team
            history. Showing up to 200 recent records, hottest first.
          </p>
        </div>
        <LiveRefresh />
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/connections"
          className="font-bold text-[var(--blue)]"
        >
          Check capture & message connections →
        </Link>
        <a
          href="/api/admin/leads/export"
          className="rounded-lg border border-[var(--line-strong)] px-4 py-2 text-sm font-semibold text-[var(--text)] hover:border-[var(--accent-line)] hover:text-[var(--heading)]"
        >
          Export CSV
        </a>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card !p-4 text-center">
          <div className="text-3xl font-black text-[var(--heading)]">
            {counts.total}
          </div>
          <div className="text-xs uppercase tracking-wide text-[var(--muted)]">
            Leads
          </div>
        </div>
        <div className="card !p-4 text-center">
          <div className="text-3xl font-black text-flow-400">{counts.new}</div>
          <div className="text-xs uppercase tracking-wide text-[var(--muted)]">
            New
          </div>
        </div>
        <div className="card !p-4 text-center">
          <div className="text-3xl font-black text-warn">
            {counts.call_booked}
          </div>
          <div className="text-xs uppercase tracking-wide text-[var(--muted)]">
            Calls Booked
          </div>
        </div>
        <div className="card !p-4 text-center">
          <div className="text-3xl font-black text-mint">{counts.won}</div>
          <div className="text-xs uppercase tracking-wide text-[var(--muted)]">
            Won
          </div>
        </div>
      </div>
      <LeadsTable initialLeads={all} actorName={profile.full_name || "Team member"} />
    </>
  );
}
