import { createClient } from "@/lib/supabase/server";
import LeadsTable from "./LeadsTable";
import LiveRefresh from "./command-center/LiveRefresh";
import Link from "next/link";

export default async function AdminLeads() {
  const supabase = await createClient();
  const { data: leads, error } = await supabase
    .from("leads")
    .select("*")
    // Deleted leads leave the pipeline entirely.
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error)
    return (
      <div className="card" role="alert">
        <h2 className="font-bold">Leads could not be loaded.</h2>
        <p className="my-3 text-sm">
          This is a connection problem, not an empty pipeline. Try refreshing in
          a moment.
        </p>
        <LiveRefresh />
      </div>
    );
  const all = leads ?? [];
  const counts = {
    total: all.length,
    new: all.filter((l) => l.status === "new").length,
    call_booked: all.filter((l) => l.status === "call_booked").length,
    won: all.filter((l) => l.status === "won").length,
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">Leads & conversations</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Open a lead to see their original answers, source, calls, and team
            history. Showing the latest 200 saved records.
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
      <LeadsTable initialLeads={all} />
    </>
  );
}
