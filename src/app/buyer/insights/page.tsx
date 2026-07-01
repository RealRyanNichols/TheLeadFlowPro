import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, BookmarkPlus, Eye, Gauge, ShieldCheck, Sparkles } from "lucide-react";
import { BuyerPortalShell } from "@/components/buyer/BuyerPortalShell";
import { getBuyerInsightsData, type PredictiveScoreResult } from "@/lib/predictive/signal-engine";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Buyer Insights | The LeadFlow Pro",
  description: "Buyer-safe signal recommendations based on approved profile data and the buyer's own profile.",
};

export default async function BuyerInsightsPage() {
  const data = await getBuyerInsightsData();

  return (
    <BuyerPortalShell
      data={data.portal}
      active="/buyer/insights"
      title="Buyer insights"
      description="Recommended signal packs, category matches, watchlist suggestions, and new signals without exposing raw private data."
    >
      {data.portal.authenticated ? (
        <div className="space-y-5">
          <section className="lead-shell p-5 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-cyan-200">
                  <Sparkles className="h-4 w-4" />
                  {data.mode === "live" ? "Live recommendations" : "Safe test recommendations"}
                </p>
                <h2 className="mt-4 text-2xl font-black text-white md:text-3xl">Best matches for your buyer profile.</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-200">
                  These recommendations use your profile, approved public listing summaries, score ranges, verticals,
                  and available signal categories. They do not reveal another buyer's behavior or raw private answers.
                </p>
              </div>
              <Link href="/marketplace" className="btn-accent justify-center text-sm">
                Browse marketplace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="lead-shell p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Recommended signal packs</p>
                  <h2 className="mt-2 text-2xl font-black text-white">Why we recommend these</h2>
                </div>
                <Gauge className="h-6 w-6 text-accent-300" />
              </div>
              <div className="mt-5 grid gap-3">
                {data.recommendations.map((result) => (
                  <BuyerRecommendationCard key={`${result.entityType}-${result.entityId}`} result={result} />
                ))}
              </div>
            </div>

            <div className="grid gap-5">
              <InfoPanel
                title="Categories matching you"
                icon={BadgeCheck}
                rows={data.categoryMatches.map((row) => ({
                  title: row.label,
                  meta: `Fit score ${row.score}`,
                  body: row.reason,
                }))}
              />
              <InfoPanel
                title="Buyer-safe privacy rules"
                icon={ShieldCheck}
                rows={data.privacyNotes.map((note) => ({
                  title: "Privacy guardrail",
                  meta: "Buyer-facing explanation",
                  body: note,
                }))}
              />
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <MiniResultPanel title="Watchlist suggestions" icon={BookmarkPlus} results={data.watchlistSuggestions} />
            <MiniResultPanel title="New signals in approved verticals" icon={Eye} results={data.newSignals} />
          </section>
        </div>
      ) : null}
    </BuyerPortalShell>
  );
}

function BuyerRecommendationCard({ result }: { result: PredictiveScoreResult }) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-black text-white">{result.title}</h3>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-ink-400">
            {result.vertical} · {result.category}
          </p>
        </div>
        <div className="min-w-20 rounded-lg border border-lead-300/35 bg-lead-300/12 px-3 py-2 text-center text-lead-100">
          <p className="text-2xl font-black leading-none">{result.overallScore}</p>
          <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wider">{result.scoreLabel}</p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-ink-200">{result.explanation}</p>
      <div className="mt-4 rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm font-bold capitalize text-cyan-100">
        Recommended action: {result.recommendedNextActionLabel}
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link href="/marketplace" className="btn-accent justify-center text-sm">
          Request sample
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href={`/lead-profile/${result.entityId}`} className="btn-ghost justify-center text-sm">
          View if entitled
        </Link>
      </div>
    </article>
  );
}

function InfoPanel({
  title,
  icon: Icon,
  rows,
}: {
  title: string;
  icon: typeof BadgeCheck;
  rows: Array<{ title: string; meta: string; body: string }>;
}) {
  return (
    <div className="lead-shell p-5">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-2xl font-black text-white">{title}</h2>
        <Icon className="h-6 w-6 text-cyan-300" />
      </div>
      <div className="mt-5 grid gap-3">
        {rows.map((row) => (
          <div key={`${row.title}-${row.body}`} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <h3 className="font-black text-white">{row.title}</h3>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-ink-400">{row.meta}</p>
            <p className="mt-3 text-sm leading-6 text-ink-200">{row.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniResultPanel({ title, icon: Icon, results }: { title: string; icon: typeof Eye; results: PredictiveScoreResult[] }) {
  return (
    <div className="lead-shell p-5">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-2xl font-black text-white">{title}</h2>
        <Icon className="h-6 w-6 text-accent-300" />
      </div>
      <div className="mt-5 grid gap-3">
        {results.map((result) => (
          <Link key={`${title}-${result.entityId}`} href="/marketplace" className="rounded-lg border border-white/10 bg-white/[0.035] p-4 transition hover:border-cyan-300/35">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-white">{result.title}</h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-ink-400">{result.category}</p>
              </div>
              <span className="rounded-md border border-white/10 px-2 py-1 text-sm font-black text-white">{result.overallScore}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
