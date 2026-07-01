"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Factory,
  Loader2,
  MessageSquareMore,
  Search,
  ShieldAlert,
  Sparkles,
  Store,
  Target,
  XCircle,
} from "lucide-react";
import { trackLeadFlowEvent } from "@/lib/leadflow-events-client";
import type {
  AdminCustomRequestsData,
  CustomSourcingAdminAction,
  CustomSourcingRequestRow,
} from "@/lib/custom-sourcing";
import { cn } from "@/lib/utils";

function statusTone(value: string) {
  if (/completed|accepted|feasible/.test(value)) return "border-lead-300/30 bg-lead-300/10 text-lead-100";
  if (/reject|not_feasible|archived/.test(value)) return "border-red-300/30 bg-red-300/10 text-red-100";
  if (/quoted|review|submitted|progress|more/.test(value)) return "border-accent-300/30 bg-accent-300/10 text-accent-100";
  return "border-white/10 bg-white/[0.045] text-ink-200";
}

function StatusBadge({ value }: { value: string }) {
  return <span className={cn("inline-flex min-h-7 items-center rounded-md border px-2 text-xs font-bold capitalize", statusTone(value))}>{value.replace(/_/g, " ")}</span>;
}

function money(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function dateLabel(value: string | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function rowMatches(row: CustomSourcingRequestRow, search: string, status: string) {
  const haystack = [
    row.company,
    row.industry,
    row.vertical,
    row.lead_type,
    row.buyer_type,
    row.geography,
    row.offer,
    row.problem_solved,
  ].join(" ").toLowerCase();
  if (search && !haystack.includes(search.toLowerCase())) return false;
  if (status !== "all" && row.status !== status) return false;
  return true;
}

function AdminAction({
  request,
  action,
  label,
  icon: Icon = CheckCircle2,
  tone = "neutral",
  quoteAmount,
  quoteNotes,
  adminNotes,
}: {
  request: CustomSourcingRequestRow;
  action: CustomSourcingAdminAction;
  label: string;
  icon?: typeof CheckCircle2;
  tone?: "success" | "danger" | "neutral" | "premium";
  quoteAmount?: number | null;
  quoteNotes?: string;
  adminNotes?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const className =
    tone === "success" ? "border-lead-300/30 text-lead-100 hover:bg-lead-300/10" :
    tone === "danger" ? "border-red-300/30 text-red-100 hover:bg-red-400/10" :
    tone === "premium" ? "border-accent-300/30 text-accent-100 hover:bg-accent-300/10" :
    "border-white/15 text-ink-100 hover:bg-white/10";
  const sensitive = new Set(["quote", "reject", "mark_completed", "archive", "create_product_factory_run", "convert_to_marketplace_listing"]).has(action);

  async function run() {
    if (sensitive && !window.confirm(`Confirm custom sourcing action: ${label}`)) return;
    setPending(true);
    try {
      const response = await fetch("/api/leadflow/custom-sourcing/admin", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestId: request.id,
          action,
          quoteAmount,
          quoteNotes,
          adminNotes,
          confirmed: sensitive,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Custom sourcing action failed.");
      trackLeadFlowEvent(
        action === "quote" ? "custom_sourcing_quoted" : action === "accept" ? "custom_sourcing_accepted" : "custom_sourcing_reviewed",
        {
          route: "/dashboard/custom-requests",
          source_id: request.id,
          vertical: request.vertical,
          category: request.lead_type,
          status: action,
          user_role: "admin",
        },
      );
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Custom sourcing action failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending}
      className={cn("inline-flex min-h-9 items-center justify-center gap-2 rounded-md border px-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50", className)}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

export function AdminCustomRequestsClient({ data }: { data: AdminCustomRequestsData }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [quoteById, setQuoteById] = useState<Record<string, string>>({});
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const statuses = useMemo(() => Array.from(new Set(data.requests.map((request) => request.status))).sort(), [data.requests]);
  const requests = data.requests.filter((request) => rowMatches(request, search, status));

  return (
    <div className="mx-auto max-w-[1540px] space-y-6">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_10%_10%,rgba(35,184,255,0.18),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(255,186,61,0.14),transparent_28%),linear-gradient(135deg,#07101b,#050711)] p-5 shadow-2xl shadow-black/30 md:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-cyan-200">
              <Target className="h-4 w-4" />
              Custom Sourcing Desk
            </p>
            <h1 className="mt-4 max-w-5xl text-4xl font-black leading-tight text-white md:text-6xl">
              Turn unmatched buyer demand into reviewed signal products.
            </h1>
            <p className="mt-4 max-w-4xl text-sm leading-6 text-ink-200 md:text-base md:leading-7">
              Review custom sourcing requests, score feasibility, quote serious buyers, request more detail, create Product Factory drafts, and keep risky data blocked before any marketplace release.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-extrabold uppercase tracking-wider text-ink-200">
            {data.mode === "live" ? "Live Supabase" : "Safe preview"}
          </div>
        </div>
      </section>

      {data.loadErrors.length ? (
        <div className="rounded-lg border border-accent-300/30 bg-accent-300/10 p-3 text-sm leading-6 text-accent-100">
          {data.loadErrors[0]}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total" value={data.stats.total} />
        <StatCard label="Needs review" value={data.stats.needsReview} />
        <StatCard label="Feasible" value={data.stats.feasible} />
        <StatCard label="Quoted" value={data.stats.quoted} />
        <StatCard label="In progress" value={data.stats.inProgress} />
        <StatCard label="Avg score" value={data.stats.averageFeasibility} />
      </section>

      <section className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_210px_220px]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 w-full rounded-lg border border-white/10 bg-ink-950 pl-9 pr-3 text-sm text-white outline-none placeholder:text-ink-500 focus:border-cyan-300/60"
              placeholder="Search industry, geography, company, use case"
            />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-300/60">
            <option value="all">All statuses</option>
            {statuses.map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}
          </select>
          <Link href="/dashboard/product-factory" className="btn-accent justify-center text-sm">
            Product Factory
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-5 grid gap-4">
          {requests.length ? requests.map((request) => (
            <article key={request.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={request.status} />
                    <span className="rounded-md border border-white/10 bg-ink-950/60 px-2 py-1 text-xs font-black text-white">{request.feasibility_score}/100</span>
                    <span className="text-xs text-ink-500">{dateLabel(request.created_at)}</span>
                  </div>
                  <h2 className="mt-3 text-xl font-black text-white">{request.vertical || request.industry}</h2>
                  <p className="mt-2 max-w-4xl text-sm leading-6 text-ink-200">{request.problem_solved || request.offer}</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <Field label="Company" value={request.company} />
                    <Field label="Lead type" value={request.lead_type} />
                    <Field label="Geography" value={request.geography} />
                    <Field label="Budget" value={request.budget_range} />
                  </div>
                  <div className="mt-4 rounded-lg border border-white/10 bg-ink-950/60 p-3">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-400">Requested fields</p>
                    <p className="mt-1 text-sm leading-6 text-ink-200">{request.desired_fields.join(", ").replace(/_/g, " ")}</p>
                  </div>
                </div>
                <div className="grid min-w-[280px] gap-3">
                  <textarea
                    value={noteById[request.id] ?? request.admin_notes ?? ""}
                    onChange={(event) => setNoteById((current) => ({ ...current, [request.id]: event.target.value }))}
                    rows={3}
                    className="rounded-lg border border-white/10 bg-ink-950 px-3 py-2 text-sm leading-6 text-white outline-none placeholder:text-ink-500 focus:border-cyan-300/60"
                    placeholder="Admin notes"
                  />
                  <input
                    value={quoteById[request.id] ?? (request.quote_amount ? String(request.quote_amount) : "")}
                    onChange={(event) => setQuoteById((current) => ({ ...current, [request.id]: event.target.value }))}
                    className="h-10 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none placeholder:text-ink-500 focus:border-cyan-300/60"
                    placeholder="Quote amount"
                  />
                  <div className="flex flex-wrap gap-2">
                    <AdminAction request={request} action="review" label="Review" adminNotes={noteById[request.id]} />
                    <AdminAction request={request} action="quote" label="Quote" icon={Sparkles} tone="premium" quoteAmount={Number(quoteById[request.id] || request.quote_amount || 0)} quoteNotes={noteById[request.id]} adminNotes={noteById[request.id]} />
                    <AdminAction request={request} action="request_more_info" label="More info" icon={MessageSquareMore} adminNotes={noteById[request.id]} />
                    <AdminAction request={request} action="create_product_factory_run" label="Factory draft" icon={Factory} tone="success" quoteAmount={Number(quoteById[request.id] || request.quote_amount || 0)} adminNotes={noteById[request.id]} />
                    <AdminAction request={request} action="convert_to_marketplace_listing" label="Marketplace draft" icon={Store} tone="premium" quoteAmount={Number(quoteById[request.id] || request.quote_amount || 0)} adminNotes={noteById[request.id]} />
                    <AdminAction request={request} action="mark_in_progress" label="In progress" icon={CheckCircle2} adminNotes={noteById[request.id]} />
                    <AdminAction request={request} action="mark_completed" label="Complete" icon={CheckCircle2} tone="success" adminNotes={noteById[request.id]} />
                    <AdminAction request={request} action="reject" label="Reject" icon={XCircle} tone="danger" adminNotes={noteById[request.id]} />
                  </div>
                  {request.product_factory_run_id ? (
                    <Link href="/dashboard/product-factory" className="btn-ghost justify-center text-sm">
                      Open Product Factory
                    </Link>
                  ) : null}
                  {request.marketplace_listing_id ? (
                    <Link href="/marketplace" className="btn-ghost justify-center text-sm">
                      Marketplace draft attached
                    </Link>
                  ) : null}
                </div>
              </div>
            </article>
          )) : (
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-8 text-center">
              <ShieldAlert className="mx-auto h-8 w-8 text-accent-300" />
              <h2 className="mt-3 text-xl font-black text-white">No custom requests match this filter.</h2>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#060a11]/90 p-4 shadow-2xl shadow-black/25">
      <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-lg border border-white/10 bg-ink-950/65 p-3">
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-white">{value || "Missing"}</p>
    </div>
  );
}
