import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, DatabaseZap, Route, ShieldAlert, ShieldCheck, Sparkles, Target } from "lucide-react";
import { LeadScoreBadge } from "@/components/leadflow-system";
import { getAdminTokenSession } from "@/lib/admin-token";
import { getAdminBuyerMatchingData } from "@/lib/matching/match-buyer-request";
import type { BuyerMatchResult } from "@/lib/matching/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Buyer Demand Matching | The LeadFlow Pro",
  description: "Admin-only buyer demand matching dashboard for listings, segments, profiles, samples, tools, and custom sourcing.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardBuyerMatchingPage() {
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
            <h1 className="mt-2 text-3xl font-black text-white">Buyer matching is locked.</h1>
            <p className="mt-3 text-sm leading-6 text-ink-300">
              This dashboard reads buyer demand, stored match results, and custom sourcing recommendations. Sign in with a LeadFlow admin account before reviewing demand routing.
            </p>
            <Link href="/login?callbackUrl=%2Fdashboard%2Fbuyer-matching" className="btn-primary mt-5 inline-flex justify-center text-sm">
              Admin login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const data = await getAdminBuyerMatchingData();

  return (
    <div className="mx-auto max-w-[1540px] space-y-6">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_10%_10%,rgba(35,184,255,0.18),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(255,186,61,0.14),transparent_28%),linear-gradient(135deg,#07101b,#050711)] p-5 shadow-2xl shadow-black/30 md:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-cyan-200">
              <Target className="h-4 w-4" />
              Buyer Demand Matching
            </p>
            <h1 className="mt-4 max-w-5xl text-4xl font-black leading-tight text-white md:text-6xl">
              Match buyer demand to the products we can actually deliver.
            </h1>
            <p className="mt-4 max-w-4xl text-sm leading-6 text-ink-200 md:text-base md:leading-7">
              Review buyer requests against marketplace listings, segments, lead profiles, sample products, and intake tools. Weak matches route to custom sourcing instead of pretending the marketplace has everything.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-extrabold uppercase tracking-wider text-ink-200">
            {data.mode === "live" ? "Live data" : "Safe fallback data"}
          </div>
        </div>
        {data.loadErrors.length ? (
          <div className="mt-5 rounded-lg border border-accent-300/30 bg-accent-300/10 p-3 text-sm leading-6 text-accent-100">
            {data.loadErrors[0]}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Requests" value={data.stats.totalRequests} />
        <StatCard label="Unmatched" value={data.stats.unmatchedRequests} />
        <StatCard label="High value" value={data.stats.highValueRequests} />
        <StatCard label="Listing matches" value={data.stats.requestsWithListings} />
        <StatCard label="Custom sourcing" value={data.stats.customSourcingNeeded} />
        <StatCard label="Stored matches" value={data.stats.storedMatches} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Demand queue</p>
              <h2 className="mt-2 text-2xl font-black text-white">Buyer requests with recommended matches.</h2>
            </div>
            <Link href="/dashboard/product-factory" className="btn-accent justify-center text-sm">
              Open Product Factory
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-5 grid gap-4">
            {data.requestSummaries.map((summary) => (
              <article key={summary.request.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={summary.status} />
                      <span className="rounded-md border border-white/10 bg-ink-950/60 px-2 py-1 text-[11px] font-extrabold uppercase tracking-wider text-ink-300">
                        {summary.request.request_type}
                      </span>
                    </div>
                    <h3 className="mt-3 text-xl font-black text-white">
                      {summary.request.category || summary.request.vertical || "Buyer request"}
                    </h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-200">
                      {summary.request.intended_use || summary.request.buyer_use_case || "Buyer use case needs review before routing."}
                    </p>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <Field label="Buyer" value={summary.buyer ? `${summary.buyer.company} · ${summary.buyer.status}` : "Anonymous or unlinked"} />
                      <Field label="Budget" value={summary.request.budget_range || "Missing"} />
                      <Field label="Urgency" value={summary.request.urgency || "Missing"} />
                    </div>
                  </div>
                  <div className="min-w-32 rounded-lg border border-white/10 bg-ink-950/70 p-3 text-center">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-400">Stored</p>
                    <p className="mt-1 text-3xl font-black text-white">{summary.storedCount}</p>
                    <p className="mt-1 text-xs font-bold capitalize text-cyan-200">{summary.recommendedAction.replace(/_/g, " ")}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 xl:grid-cols-2">
                  {summary.topMatches.length ? summary.topMatches.map((match) => (
                    <MiniMatch key={`${summary.request.id}-${match.matchedEntityType}-${match.matchedEntityId}`} match={match} />
                  )) : (
                    <div className="rounded-lg border border-accent-300/25 bg-accent-300/10 p-4 text-sm leading-6 text-accent-100">
                      No match found. Send this to custom sourcing or ask the buyer for industry, geography, buyer type, budget, and intended use.
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="grid gap-5 self-start">
          <ActionPanel
            title="Unmatched demand"
            icon={Route}
            body="Requests with weak matches should become custom sourcing opportunities or new marketplace product ideas."
            href="/custom-sourcing"
            cta="Open custom sourcing"
          />
          <ActionPanel
            title="Product opportunity"
            icon={DatabaseZap}
            body="Repeated demand against the same vertical should feed Segment Builder and Product Factory."
            href="/dashboard/segments"
            cta="Open segments"
          />
          <ActionPanel
            title="Release control"
            icon={ShieldCheck}
            body="Do not sell a match until proof, suppression, consent, allowed use, and entitlement rules are clear."
            href="/privacy-center"
            cta="Review controls"
          />
        </aside>
      </section>
    </div>
  );
}

function MiniMatch({ match }: { match: BuyerMatchResult }) {
  return (
    <div className="rounded-lg border border-white/10 bg-ink-950/55 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-300">{match.matchedEntityType.replace(/_/g, " ")}</p>
          <h4 className="mt-1 font-black text-white">{match.title}</h4>
        </div>
        <LeadScoreBadge score={match.matchScore} label="Match" className="min-h-12 min-w-16 px-2" />
      </div>
      <p className="mt-3 text-sm leading-6 text-ink-300">{match.summary}</p>
      <p className="mt-3 text-xs font-bold capitalize text-accent-100">Action: {match.recommendedAction.replace(/_/g, " ")}</p>
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-ink-950/65 p-3">
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "matched" ? "border-lead-300/35 bg-lead-300/12 text-lead-100" :
    status === "custom_sourcing" ? "border-accent-300/35 bg-accent-300/12 text-accent-100" :
    status === "needs_profile" ? "border-cyan-300/35 bg-cyan-300/12 text-cyan-100" :
    "border-red-300/35 bg-red-300/12 text-red-100";
  return (
    <span className={`inline-flex min-h-8 items-center gap-2 rounded-lg border px-2.5 text-xs font-extrabold uppercase tracking-wider ${tone}`}>
      <Sparkles className="h-3.5 w-3.5" />
      {status.replace(/_/g, " ")}
    </span>
  );
}

function ActionPanel({
  title,
  icon: Icon,
  body,
  href,
  cta,
}: {
  title: string;
  icon: typeof Route;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-xl font-black text-white">{title}</h2>
        <Icon className="h-5 w-5 text-cyan-300" />
      </div>
      <p className="mt-3 text-sm leading-6 text-ink-300">{body}</p>
      <Link href={href} className="btn-ghost mt-4 justify-center text-sm">
        {cta}
      </Link>
    </div>
  );
}
