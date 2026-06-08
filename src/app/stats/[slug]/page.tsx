import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Calculator, Clock, FileText, ShieldCheck, Sparkles } from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { AnimatedCounter } from "@/components/weird-stats/AnimatedCounter";
import { ConfidenceBadge, SourceBadge } from "@/components/weird-stats/Badges";
import { ShareButton } from "@/components/weird-stats/ShareButton";
import { StatTile } from "@/components/weird-stats/StatTile";
import { StatsDisclaimer } from "@/components/weird-stats/StatsDisclaimer";
import {
  getWeirdStatBySlug,
  relatedWeirdStats,
  STARTER_WEIRD_STATS,
} from "@/lib/weird-stats";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const revalidate = 60;

export function generateStaticParams() {
  return STARTER_WEIRD_STATS.map((stat) => ({ slug: stat.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const stat = getWeirdStatBySlug(params.slug);
  if (!stat) return {};
  return createSeoMetadata({
    title: `${stat.title} | Weird Stats Clock`,
    description: stat.shortDescription,
    path: `/stats/${stat.slug}`,
    imageTitle: stat.title,
    imageSubtitle: stat.shortDescription,
  });
}

export default function StatDetailPage({ params }: { params: { slug: string } }) {
  const stat = getWeirdStatBySlug(params.slug);
  if (!stat) notFound();
  const related = relatedWeirdStats(stat);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <LightHeader activePath={`/stats/${stat.slug}`} />
      <main>
        <section className="relative overflow-hidden border-b border-cyan-300/15 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div
            aria-hidden
            className="absolute inset-0 opacity-80"
            style={{
              background:
                "radial-gradient(circle at 18% 12%, rgba(34,211,238,0.22), transparent 30%), radial-gradient(circle at 88% 12%, rgba(251,146,60,0.18), transparent 28%)",
            }}
          />
          <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_0.72fr] lg:items-start">
            <div>
              <div className="flex flex-wrap gap-2">
                <SourceBadge sourceType={stat.sourceType} />
                <ConfidenceBadge score={stat.confidenceScore} />
              </div>
              <h1 className="mt-5 max-w-5xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
                {stat.title}
              </h1>
              <div className="mt-6 rounded-[2rem] border border-white/10 bg-black/35 p-5 shadow-2xl shadow-black/25">
                <AnimatedCounter stat={stat} className="block break-words text-5xl font-black tracking-tight text-white sm:text-7xl" />
                <div className="mt-2 text-xs font-black uppercase tracking-[0.24em] text-slate-500">
                  {stat.unitLabel} moving now
                </div>
              </div>
              <p className="mt-6 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                {stat.longDescription}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/request?stat=${stat.slug}&product=private_research_1900`}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 text-sm font-black text-slate-950 hover:bg-accent-400"
                >
                  Request deeper version <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={`/request?stat=${stat.slug}&product=sponsor_board_9900`}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-6 py-3 text-sm font-black text-cyan-50 hover:bg-cyan-300/15"
                >
                  Sponsor this stat <Sparkles className="h-4 w-4" />
                </Link>
                <ShareButton title={stat.title} path={`/stats/${stat.slug}`} label="Share card" />
              </div>
            </div>

            <aside className="space-y-4">
              <InfoPanel icon={Calculator} title="Formula used">
                {stat.formulaNotes}
              </InfoPanel>
              <InfoPanel icon={ShieldCheck} title="Source notes">
                {stat.sourceNotes}
              </InfoPanel>
              <InfoPanel icon={Clock} title="Last updated">
                Recalculated in the browser every 1 to 3 seconds from the current clock.
              </InfoPanel>
              <StatsDisclaimer />
            </aside>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-cyan-100">
              <FileText className="h-4 w-4" />
              Related stats
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {related.map((item) => (
                <StatTile key={item.slug} stat={item} dense />
              ))}
            </div>
          </div>
        </section>
      </main>
      <LightFooter />
    </div>
  );
}

function InfoPanel({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-5">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-100">
        <Icon className="h-4 w-4" />
        {title}
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">{children}</p>
    </div>
  );
}
