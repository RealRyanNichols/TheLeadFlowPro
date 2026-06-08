"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Lock, Sparkles } from "lucide-react";
import type { WeirdStat } from "@/lib/weird-stats";
import { AnimatedCounter } from "./AnimatedCounter";
import { ConfidenceBadge, SourceBadge, SponsorBadge } from "./Badges";
import { ShareButton } from "./ShareButton";

export function StatTile({
  stat,
  dense,
}: {
  stat: WeirdStat;
  dense?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <article className="group relative min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 p-4 shadow-2xl shadow-black/20 ring-1 ring-cyan-300/5 transition hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-slate-900/90">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-300 via-accent-400 to-fuchsia-400 opacity-75"
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5">
            <SourceBadge sourceType={stat.sourceType} />
            {stat.isPremium ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-accent-300/25 bg-accent-300/10 px-2 py-1 text-[0.65rem] font-black uppercase tracking-[0.18em] text-accent-100">
                <Lock className="h-3 w-3" />
                Premium
              </span>
            ) : null}
          </div>
          <h3 className="mt-3 text-base font-black leading-tight text-white sm:text-lg">
            {stat.title}
          </h3>
        </div>
        <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 p-2 text-cyan-100">
          <Sparkles className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-4">
        <AnimatedCounter
          stat={stat}
          className={`${dense ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"} block break-words font-black tracking-tight text-white`}
        />
        <div className="mt-1 text-xs font-black uppercase tracking-[0.24em] text-slate-500">
          {stat.unitLabel} moving now
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-300">{stat.shortDescription}</p>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="mt-4 text-left text-xs font-black uppercase tracking-[0.18em] text-cyan-200 underline decoration-cyan-300/30 underline-offset-4 hover:text-cyan-100"
      >
        Why it matters
      </button>
      {open ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.05] p-3 text-sm leading-6 text-slate-300">
          {stat.whyItMatters}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <ConfidenceBadge score={stat.confidenceScore} />
        <SponsorBadge stat={stat} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href={`/stats/${stat.slug}`}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent-500 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-950 hover:bg-accent-400"
        >
          Open <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
        <Link
          href={`/request?stat=${stat.slug}&product=boost_stat_100`}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-50 hover:bg-cyan-300/15"
        >
          Boost
        </Link>
        <ShareButton title={stat.title} path={`/stats/${stat.slug}`} />
      </div>
    </article>
  );
}
