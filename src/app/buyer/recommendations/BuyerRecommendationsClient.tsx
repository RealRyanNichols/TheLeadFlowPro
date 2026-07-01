"use client";

import Link from "next/link";
import { ArrowRight, FileText, LockKeyhole, Route, ShieldCheck, Sparkles, Target } from "lucide-react";
import { LeadScoreBadge } from "@/components/leadflow-system";
import { trackLeadFlowEvent } from "@/lib/leadflow-events-client";
import type { BuyerRecommendationsData } from "@/lib/matching/match-buyer-request";
import type { BuyerMatchResult, MatchRecommendedAction } from "@/lib/matching/types";

type AuthenticatedData = Extract<BuyerRecommendationsData, { authenticated: true }>;

const actionLabels: Record<MatchRecommendedAction, string> = {
  request_sample: "Request sample",
  request_access: "Request access",
  request_exclusive: "Request exclusive",
  complete_buyer_profile: "Complete buyer profile",
  book_fit_call: "Book fit call",
  start_tool: "Start tool",
  request_custom_sourcing: "Request custom sourcing",
  join_waitlist: "Join waitlist",
  no_match_found: "No match found",
};

function trackClick(result: BuyerMatchResult, section: string) {
  trackLeadFlowEvent("buyer_recommendation_clicked", {
    route: "/buyer/recommendations",
    profile_id: result.matchedEntityType === "lead_profile" ? result.matchedEntityId : undefined,
    listing_id: result.matchedEntityType === "marketplace_listing" || result.matchedEntityType === "sample" ? result.matchedEntityId : undefined,
    category: result.category,
    vertical: result.vertical,
    score_range: result.matchScore >= 80 ? "high" : result.matchScore >= 60 ? "medium" : "low",
    status: result.recommendedAction,
    cta: section,
    user_role: "buyer",
  });
}

export function BuyerRecommendationsClient({ data }: { data: AuthenticatedData }) {
  const restricted = data.portal.accountStatus === "suspended" || data.portal.accountStatus === "denied";

  return (
    <div className="space-y-5">
      <section className="lead-shell p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-cyan-200">
              <Sparkles className="h-4 w-4" />
              {data.mode === "live" ? "Stored recommendations" : "Safe fallback recommendations"}
            </p>
            <h2 className="mt-4 text-2xl font-black text-white md:text-4xl">Best matches for this buyer demand.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-200 md:text-base md:leading-7">
              Matches use buyer profile fields, request details, marketplace summaries, segment metadata, approved profile summaries, and tool fit. Raw answers, hidden source notes, contact fields, and admin notes are not shown here.
            </p>
          </div>
          <Link href="/custom-sourcing" onClick={() => trackLeadFlowEvent("custom_sourcing_recommended", { route: "/buyer/recommendations", user_role: "buyer", cta: "custom_sourcing_top" })} className="btn-accent justify-center text-sm">
            Custom sourcing
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {data.loadErrors.length ? (
          <div className="mt-5 rounded-lg border border-accent-300/30 bg-accent-300/10 p-3 text-sm leading-6 text-accent-100">
            {data.loadErrors[0]}
          </div>
        ) : null}

        {restricted ? (
          <div className="mt-5 rounded-lg border border-red-300/35 bg-red-300/10 p-4 text-sm leading-6 text-red-100">
            This buyer account is restricted. Recommendations can be reviewed, but restricted access, exports, and contact fields stay blocked.
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MiniStat label="Best matches" value={String(data.bestMatches.length)} />
        <MiniStat label="Samples" value={String(data.sampleMatches.length)} />
        <MiniStat label="Exclusive options" value={String(data.exclusiveMatches.length)} />
        <MiniStat label="Tools" value={String(data.toolMatches.length)} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="lead-shell p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Best matches for you</p>
              <h2 className="mt-2 text-2xl font-black text-white">Recommended products and next actions.</h2>
            </div>
            <Target className="h-6 w-6 text-accent-300" />
          </div>
          <div className="mt-5 grid gap-4">
            {data.bestMatches.length ? data.bestMatches.map((result) => (
              <RecommendationCard key={`${result.matchedEntityType}-${result.matchedEntityId}-${result.recommendedAction}`} result={result} section="best_match" />
            )) : (
              <EmptyBlock title="No stored matches yet." body="Submit a buyer request or complete your buyer profile so the engine can recommend products, samples, tools, or custom sourcing." href="/marketplace" cta="Browse marketplace" />
            )}
          </div>
        </div>

        <aside className="grid gap-5">
          <SidePanel
            title="Available sample products"
            icon={FileText}
            items={data.sampleMatches}
            fallback="No sample recommendation yet. A clear industry, budget, and access preference improves this."
            section="sample_match"
          />
          <SidePanel
            title="Exclusive options"
            icon={LockKeyhole}
            items={data.exclusiveMatches}
            fallback="No exclusive recommendation yet. Ask for exclusive territory, vertical, or time-window access."
            section="exclusive_match"
          />
          <SidePanel
            title="Tools to improve matches"
            icon={Route}
            items={data.toolMatches}
            fallback="No tool recommendation yet. Use the buyer lead tool to add stronger intent signals."
            section="tool_match"
          />
        </aside>
      </section>

      <section className="lead-shell p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-accent-300">Custom sourcing CTA</p>
            <h2 className="mt-2 text-2xl font-black text-white">Need a signal pack we do not have listed?</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-200">
              Tell us the industry, geography, buyer type, proof type, budget, and outcome. We will review whether it can be sourced, scored, and built into a source-backed product.
            </p>
          </div>
          <Link href="/custom-sourcing" onClick={() => trackLeadFlowEvent("custom_sourcing_recommended", { route: "/buyer/recommendations", user_role: "buyer", cta: "custom_sourcing_bottom" })} className="btn-accent justify-center text-sm">
            Start request
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function RecommendationCard({ result, section }: { result: BuyerMatchResult; section: string }) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">
            {result.matchedEntityType.replace(/_/g, " ")} · {result.matchLabel}
          </p>
          <h3 className="mt-2 text-xl font-black text-white">{result.title}</h3>
          <p className="mt-2 text-sm leading-6 text-ink-200">{result.summary}</p>
        </div>
        <LeadScoreBadge score={result.matchScore} label="Match" className="min-w-[5.25rem]" />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <SignalField label="Vertical" value={result.vertical} />
        <SignalField label="Category" value={result.category} />
        <SignalField label="Next action" value={actionLabels[result.recommendedAction]} />
      </div>
      <div className="mt-4 rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-3">
        <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-200">Why this matches</p>
        <ul className="mt-2 space-y-1 text-sm leading-6 text-cyan-50">
          {result.matchReasons.slice(0, 4).map((reason) => <li key={reason}>{reason}</li>)}
        </ul>
      </div>
      {result.missingBuyerInfo.length ? (
        <p className="mt-3 text-xs leading-5 text-accent-100">Missing buyer info: {result.missingBuyerInfo.join(", ")}</p>
      ) : null}
      <p className="mt-3 text-xs leading-5 text-ink-400">{result.cautionNote}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link href={result.href} onClick={() => trackClick(result, section)} className="btn-accent justify-center text-sm">
          {actionLabels[result.recommendedAction]}
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/privacy-center" className="btn-ghost justify-center text-sm">
          <ShieldCheck className="h-4 w-4" />
          Access rules
        </Link>
      </div>
    </article>
  );
}

function SidePanel({
  title,
  icon: Icon,
  items,
  fallback,
  section,
}: {
  title: string;
  icon: typeof FileText;
  items: BuyerMatchResult[];
  fallback: string;
  section: string;
}) {
  return (
    <div className="lead-shell p-5">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-xl font-black text-white">{title}</h2>
        <Icon className="h-5 w-5 text-cyan-300" />
      </div>
      <div className="mt-4 grid gap-3">
        {items.length ? items.map((item) => (
          <Link key={`${section}-${item.matchedEntityId}`} href={item.href} onClick={() => trackClick(item, section)} className="rounded-lg border border-white/10 bg-white/[0.035] p-3 transition hover:border-cyan-300/35">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-white">{item.title}</h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-ink-400">{actionLabels[item.recommendedAction]}</p>
              </div>
              <span className="rounded-md border border-white/10 px-2 py-1 text-sm font-black text-white">{item.matchScore}</span>
            </div>
          </Link>
        )) : <p className="text-sm leading-6 text-ink-300">{fallback}</p>}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="lead-shell p-4">
      <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function SignalField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-ink-950/55 p-3">
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function EmptyBlock({ title, body, href, cta }: { title: string; body: string; href: string; cta: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5 text-center">
      <h3 className="text-lg font-black text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink-300">{body}</p>
      <Link href={href} className="btn-ghost mx-auto mt-4 justify-center text-sm">
        {cta}
      </Link>
    </div>
  );
}
