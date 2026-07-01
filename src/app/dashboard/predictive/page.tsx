import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Gauge,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  getPredictiveDashboardData,
  type PredictiveScoreResult,
} from "@/lib/predictive/signal-engine";
import type { PredictiveScoreComponent } from "@/lib/predictive/explain-score";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Predictive Signal Engine | The LeadFlow Pro",
  description: "Internal predictive scoring dashboard for source-backed profiles, buyer requests, marketplace demand, and compliance warnings.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PredictiveDashboardPage() {
  const data = await getPredictiveDashboardData();

  return (
    <div className="space-y-6">
      <section className="lead-shell overflow-hidden p-5 md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-cyan-200">
              <Sparkles className="h-4 w-4" />
              LeadFlow Predictive Signal Engine
            </p>
            <h1 className="mt-4 text-3xl font-black tracking-normal text-white md:text-5xl">
              Predict what deserves review next.
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-ink-200 md:text-base md:leading-7">
              This dashboard scores profiles and buyer requests from declared intent, source proof, site behavior,
              freshness, buyer fit, and compliance readiness. It does not infer protected traits, minors, private
              political identity, medical status, or private financial account data.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-extrabold uppercase tracking-wider text-ink-200">
            {data.mode === "live" ? "Live data" : "Safe test data"}
          </div>
        </div>
        {data.loadErrors.length ? (
          <div className="mt-5 rounded-lg border border-accent-300/25 bg-accent-300/10 p-4 text-sm leading-6 text-accent-100">
            {data.loadErrors.join(" ")}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Scored profiles" value={data.stats.scoredProfiles} />
        <StatCard label="High value" value={data.stats.highValueProfiles} />
        <StatCard label="Needs enrichment" value={data.stats.enrichmentNeeded} />
        <StatCard label="Buyer requests" value={data.stats.buyerRequestsScored} />
        <StatCard label="Compliance warnings" value={data.stats.complianceWarnings} />
        <StatCard label="Avg marketplace value" value={data.stats.averageMarketplaceValue} />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <ResultList
          title="High-value profiles"
          eyebrow="Package candidates"
          icon={TrendingUp}
          results={data.highValueProfiles}
          empty="No high-value profiles yet."
        />
        <ResultList
          title="Profiles needing enrichment"
          eyebrow="Review queue"
          icon={Lightbulb}
          results={data.profilesNeedingEnrichment}
          empty="No enrichment items right now."
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <ResultList
          title="Buyer requests likely to move"
          eyebrow="Access decisions"
          icon={Gauge}
          results={data.buyerRequestsLikelyToClose}
          empty="No scored buyer requests yet."
        />
        <div className="lead-shell p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Demand map</p>
              <h2 className="mt-2 text-2xl font-black text-white">Marketplace listings with demand</h2>
            </div>
            <BarChart3 className="h-6 w-6 text-accent-300" />
          </div>
          <div className="mt-5 grid gap-3">
            {data.marketplaceListingsWithDemand.map((item) => (
              <div key={`${item.title}-${item.vertical}`} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-white">{item.title}</h3>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wider text-ink-400">{item.vertical}</p>
                  </div>
                  <ScorePill score={item.demandScore} label={item.demandLabel} />
                </div>
                <p className="mt-3 text-sm leading-6 text-ink-200">{item.reason}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <InfoList title="Categories gaining interest" rows={data.categoriesGainingInterest.map((row) => ({
          title: row.category,
          meta: `${row.vertical} · ${row.signalCount} signals`,
          body: row.reason,
        }))} />
        <InfoList title="Tools generating best signals" rows={data.toolsGeneratingBestSignals.map((row) => ({
          title: row.tool,
          meta: `Avg score ${row.averageScore} · ${row.signalCount} signals`,
          body: row.reason,
        }))} />
        <InfoList title="Suppression and compliance warnings" tone="warning" rows={data.complianceWarnings.map((row) => ({
          title: row.title,
          meta: row.action.replace(/_/g, " "),
          body: row.warning,
        }))} />
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="lead-shell p-4">
      <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </article>
  );
}

function ScorePill({ score, label }: { score: number; label: string }) {
  const tone = score >= 80 ? "border-lead-300/35 bg-lead-300/12 text-lead-100" : score >= 60 ? "border-accent-300/35 bg-accent-300/12 text-accent-100" : "border-white/10 bg-white/[0.045] text-ink-200";
  return (
    <div className={`min-w-20 rounded-lg border px-3 py-2 text-center ${tone}`}>
      <p className="text-2xl font-black leading-none">{score}</p>
      <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wider">{label}</p>
    </div>
  );
}

function ResultList({
  title,
  eyebrow,
  icon: Icon,
  results,
  empty,
}: {
  title: string;
  eyebrow: string;
  icon: typeof Gauge;
  results: PredictiveScoreResult[];
  empty: string;
}) {
  return (
    <div className="lead-shell p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-black text-white">{title}</h2>
        </div>
        <Icon className="h-6 w-6 text-accent-300" />
      </div>
      <div className="mt-5 grid gap-3">
        {results.length ? results.map((result) => <PredictiveResultCard key={`${result.entityType}-${result.entityId}`} result={result} />) : (
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm text-ink-300">{empty}</div>
        )}
      </div>
    </div>
  );
}

function PredictiveResultCard({ result }: { result: PredictiveScoreResult }) {
  const marketplace = result.components.find((component) => component.key === "marketplace_value_score");
  const compliance = result.components.find((component) => component.key === "compliance_readiness_score");
  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-black text-white">{result.title}</h3>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-ink-400">
            {result.vertical} · {result.category}
          </p>
        </div>
        <ScorePill score={result.overallScore} label={result.scoreLabel} />
      </div>
      <p className="mt-3 text-sm leading-6 text-ink-200">{result.explanation}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <MiniMetric label="Marketplace" component={marketplace} />
        <MiniMetric label="Compliance" component={compliance} />
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link href={result.entityType === "lead_profile" ? `/lead-profile/${result.entityId}` : "/dashboard#buyer-requests"} className="btn-ghost justify-center text-sm">
          Open record
          <ArrowRight className="h-4 w-4" />
        </Link>
        <span className="inline-flex min-h-10 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 text-sm font-bold capitalize text-cyan-100">
          {result.recommendedNextActionLabel}
        </span>
      </div>
    </article>
  );
}

function MiniMetric({ label, component }: { label: string; component?: PredictiveScoreComponent }) {
  return (
    <div className="rounded-lg border border-white/10 bg-ink-950/45 p-3">
      <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{component?.value ?? "NA"}</p>
      <p className="mt-1 text-xs text-ink-300">{component?.scoreLabel || "Unknown"}</p>
    </div>
  );
}

function InfoList({
  title,
  rows,
  tone = "neutral",
}: {
  title: string;
  rows: Array<{ title: string; meta: string; body: string }>;
  tone?: "neutral" | "warning";
}) {
  const Icon = tone === "warning" ? AlertTriangle : CheckCircle2;
  return (
    <div className="lead-shell p-5">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-2xl font-black text-white">{title}</h2>
        <Icon className={tone === "warning" ? "h-6 w-6 text-accent-300" : "h-6 w-6 text-lead-300"} />
      </div>
      <div className="mt-5 grid gap-3">
        {rows.length ? rows.map((row) => (
          <div key={`${row.title}-${row.meta}`} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <h3 className="font-black text-white">{row.title}</h3>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-ink-400">{row.meta}</p>
            <p className="mt-3 text-sm leading-6 text-ink-200">{row.body}</p>
          </div>
        )) : (
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm text-ink-300">No rows yet.</div>
        )}
      </div>
    </div>
  );
}
