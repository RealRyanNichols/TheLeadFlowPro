import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, DollarSign, Target } from "lucide-react";
import { BuyerPortalShell } from "@/components/buyer/BuyerPortalShell";
import { getBuyerCustomRequestsData, type CustomSourcingRequestRow } from "@/lib/custom-sourcing";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Custom Requests | The LeadFlow Pro",
  description: "Buyer custom sourcing request history, feasibility scores, quote state, and review-gated next actions.",
};

export default async function BuyerCustomRequestsPage() {
  const data = await getBuyerCustomRequestsData();

  return (
    <BuyerPortalShell
      data={data.authenticated ? data.portal : data}
      active="/buyer/custom-requests"
      title="Custom sourcing requests"
      description="Track custom lead signal requests that do not already exist in the marketplace. Every request stays review-gated before quote, sample, listing, or delivery."
    >
      {data.authenticated ? (
        <div className="space-y-5">
          {data.loadErrors.length ? (
            <div className="rounded-lg border border-accent-300/30 bg-accent-300/10 p-3 text-sm leading-6 text-accent-100">
              {data.loadErrors[0]}
            </div>
          ) : null}

          <section className="grid gap-4 md:grid-cols-4">
            <StatCard label="Total" value={data.stats.total} />
            <StatCard label="Active" value={data.stats.active} />
            <StatCard label="Quoted" value={data.stats.quoted} />
            <StatCard label="Completed" value={data.stats.completed} />
          </section>

          <section className="lead-shell p-5 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Request history</p>
                <h2 className="mt-2 text-2xl font-black text-white">Custom sourcing demand you submitted.</h2>
              </div>
              <Link href="/custom-sourcing" className="btn-accent justify-center text-sm">
                New custom request
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-5 grid gap-4">
              {data.requests.length ? data.requests.map((request) => <RequestCard key={request.id} request={request} />) : (
                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5 text-center">
                  <Target className="mx-auto h-8 w-8 text-cyan-300" />
                  <h3 className="mt-3 text-xl font-black text-white">No custom requests yet.</h3>
                  <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink-300">
                    If the marketplace does not have the exact industry, geography, source type, or buyer use case you need, start a custom sourcing request.
                  </p>
                  <Link href="/custom-sourcing" className="btn-ghost mx-auto mt-4 justify-center text-sm">
                    Start request
                  </Link>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </BuyerPortalShell>
  );
}

function RequestCard({ request }: { request: CustomSourcingRequestRow }) {
  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={request.status} />
            <span className="rounded-md border border-white/10 bg-ink-950/55 px-2 py-1 text-xs font-bold text-ink-300">
              {request.feasibility_score}/100 feasibility
            </span>
          </div>
          <h3 className="mt-3 text-xl font-black text-white">{request.vertical || request.industry}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-200">{request.problem_solved || request.offer}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Signal label="Lead type" value={request.lead_type} />
            <Signal label="Geography" value={request.geography} />
            <Signal label="Budget" value={request.budget_range} />
          </div>
        </div>
        <div className="grid min-w-48 gap-2">
          <MiniLine icon={Clock3} label={new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(request.created_at))} />
          {request.quote_amount ? <MiniLine icon={DollarSign} label={`Quote: $${Number(request.quote_amount).toLocaleString()}`} /> : null}
          {request.product_factory_run_id ? <MiniLine icon={CheckCircle2} label="Factory draft created" /> : null}
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ value }: { value: string }) {
  const tone = /completed|accepted|feasible/.test(value)
    ? "border-lead-300/30 bg-lead-300/10 text-lead-100"
    : /rejected|not_feasible/.test(value)
      ? "border-red-300/30 bg-red-300/10 text-red-100"
      : /quoted|review|submitted|progress|more/.test(value)
        ? "border-accent-300/30 bg-accent-300/10 text-accent-100"
        : "border-white/10 bg-white/[0.04] text-ink-200";
  return <span className={cn("inline-flex min-h-7 items-center rounded-md border px-2 text-xs font-bold capitalize", tone)}>{value.replace(/_/g, " ")}</span>;
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="lead-shell p-4">
      <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function Signal({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-lg border border-white/10 bg-ink-950/55 p-3">
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-white">{value || "Missing"}</p>
    </div>
  );
}

function MiniLine({ icon: Icon, label }: { icon: typeof Clock3; label: string }) {
  return (
    <span className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/10 bg-ink-950/55 px-3 text-sm font-bold text-ink-200">
      <Icon className="h-4 w-4 text-cyan-300" />
      {label}
    </span>
  );
}
