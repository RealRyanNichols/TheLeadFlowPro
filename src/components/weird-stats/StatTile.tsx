"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Lock, Sparkles } from "lucide-react";
import type { WeirdStat } from "@/lib/weird-stats";
import { getWeirdStatTags } from "@/lib/weird-stats";
import { AnimatedCounter } from "./AnimatedCounter";
import { ConfidenceBadge, SourceBadge, SponsorBadge } from "./Badges";
import { ShareButton } from "./ShareButton";

export type StatTileTheme = "neon" | "sunset" | "blueprint" | "candy";

const TILE_THEMES: Record<
  StatTileTheme,
  {
    shell: string;
    stripe: string;
    icon: string;
    counter: string;
    detail: string;
    primary: string;
    secondary: string;
    tag: string;
  }
> = {
  neon: {
    shell:
      "border-cyan-300/15 bg-slate-950/80 ring-cyan-300/5 hover:border-cyan-300/40 hover:bg-slate-900/90",
    stripe: "from-cyan-300 via-accent-400 to-fuchsia-400",
    icon: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
    counter: "border-cyan-300/10 bg-black/25",
    detail: "border-cyan-300/15 bg-cyan-300/[0.06] text-cyan-50",
    primary: "bg-accent-500 text-slate-950 hover:bg-accent-400",
    secondary: "border-cyan-300/25 bg-cyan-300/10 text-cyan-50 hover:bg-cyan-300/15",
    tag: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
  },
  sunset: {
    shell:
      "border-orange-300/20 bg-[#16101c]/90 ring-orange-300/5 hover:border-orange-300/40 hover:bg-[#1e1324]",
    stripe: "from-orange-300 via-rose-400 to-fuchsia-400",
    icon: "border-orange-300/25 bg-orange-300/10 text-orange-100",
    counter: "border-orange-300/10 bg-orange-950/20",
    detail: "border-orange-300/15 bg-orange-300/[0.07] text-orange-50",
    primary: "bg-orange-400 text-slate-950 hover:bg-orange-300",
    secondary: "border-rose-300/25 bg-rose-300/10 text-rose-50 hover:bg-rose-300/15",
    tag: "border-orange-300/20 bg-orange-300/10 text-orange-100",
  },
  blueprint: {
    shell:
      "border-sky-300/20 bg-[#071426]/90 ring-sky-300/5 hover:border-sky-300/40 hover:bg-[#0a1b31]",
    stripe: "from-sky-300 via-blue-400 to-cyan-300",
    icon: "border-sky-300/25 bg-sky-300/10 text-sky-100",
    counter: "border-sky-300/10 bg-sky-950/25",
    detail: "border-sky-300/15 bg-sky-300/[0.07] text-sky-50",
    primary: "bg-sky-300 text-slate-950 hover:bg-sky-200",
    secondary: "border-sky-300/25 bg-sky-300/10 text-sky-50 hover:bg-sky-300/15",
    tag: "border-sky-300/20 bg-sky-300/10 text-sky-100",
  },
  candy: {
    shell:
      "border-fuchsia-300/20 bg-[#170b2c]/90 ring-fuchsia-300/5 hover:border-fuchsia-300/40 hover:bg-[#211037]",
    stripe: "from-fuchsia-300 via-cyan-300 to-accent-400",
    icon: "border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-100",
    counter: "border-fuchsia-300/10 bg-fuchsia-950/20",
    detail: "border-fuchsia-300/15 bg-fuchsia-300/[0.07] text-fuchsia-50",
    primary: "bg-fuchsia-300 text-slate-950 hover:bg-fuchsia-200",
    secondary: "border-cyan-300/25 bg-cyan-300/10 text-cyan-50 hover:bg-cyan-300/15",
    tag: "border-fuchsia-300/20 bg-fuchsia-300/10 text-fuchsia-100",
  },
};

export function StatTile({
  stat,
  dense,
  theme = "neon",
}: {
  stat: WeirdStat;
  dense?: boolean;
  theme?: StatTileTheme;
}) {
  const [open, setOpen] = useState(false);
  const themeClasses = TILE_THEMES[theme] ?? TILE_THEMES.neon;
  const tags = getWeirdStatTags(stat).slice(0, 4);

  return (
    <article
      className={`group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border p-4 shadow-2xl shadow-black/20 ring-1 transition-colors ${themeClasses.shell}`}
    >
      <div
        aria-hidden
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-80 ${themeClasses.stripe}`}
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
        <div className={`rounded-full border p-2 ${themeClasses.icon}`}>
          <Sparkles className="h-4 w-4" />
        </div>
      </div>

      <div className={`mt-4 rounded-xl border px-3 py-3 ${themeClasses.counter}`}>
        <AnimatedCounter
          stat={stat}
          className={`${dense ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"} block min-h-[2.1rem] w-full leading-none font-black tracking-tight text-white sm:min-h-[2.5rem]`}
        />
        <div className="mt-1 text-xs font-black uppercase tracking-[0.24em] text-slate-500">
          {stat.unitLabel} moving now
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-300">{stat.shortDescription}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className={`rounded-full border px-2 py-1 text-[0.64rem] font-black uppercase tracking-[0.16em] ${themeClasses.tag}`}
          >
            {tag}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="mt-4 text-left text-xs font-black uppercase tracking-[0.18em] text-cyan-200 underline decoration-cyan-300/30 underline-offset-4 hover:text-cyan-100"
      >
        Why it matters
      </button>
      {open ? (
        <div className={`mt-3 rounded-xl border p-3 text-sm leading-6 ${themeClasses.detail}`}>
          {stat.whyItMatters}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <ConfidenceBadge score={stat.confidenceScore} />
        <SponsorBadge stat={stat} />
      </div>

      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        <Link
          href={`/stats/${stat.slug}`}
          className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black uppercase tracking-[0.16em] ${themeClasses.primary}`}
        >
          Open <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
        <Link
          href={`/request?stat=${stat.slug}&product=boost_stat_100`}
          className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-black uppercase tracking-[0.16em] ${themeClasses.secondary}`}
        >
          Boost
        </Link>
        <ShareButton title={stat.title} path={`/stats/${stat.slug}`} />
      </div>
    </article>
  );
}
