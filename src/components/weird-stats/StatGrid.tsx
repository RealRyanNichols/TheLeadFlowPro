"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, Layers3, Palette, Plus, Search, Tags } from "lucide-react";
import type { WeirdStat } from "@/lib/weird-stats";
import { getWeirdStatTags, WEIRD_STAT_CATEGORIES } from "@/lib/weird-stats";
import { StatTile, type StatTileTheme } from "./StatTile";

type SortMode = "signal" | "title" | "confidence" | "speed";
type ViewMode = "grouped" | "flat";

const STAT_THEMES: Array<{
  key: StatTileTheme;
  label: string;
  swatch: string;
  active: string;
}> = [
  {
    key: "neon",
    label: "Neon",
    swatch: "bg-gradient-to-r from-cyan-300 via-accent-400 to-fuchsia-400",
    active: "border-cyan-300 bg-cyan-300/15 text-cyan-50",
  },
  {
    key: "sunset",
    label: "Heat",
    swatch: "bg-gradient-to-r from-orange-300 via-rose-400 to-fuchsia-400",
    active: "border-orange-300 bg-orange-300/15 text-orange-50",
  },
  {
    key: "blueprint",
    label: "Blue",
    swatch: "bg-gradient-to-r from-sky-300 via-blue-400 to-cyan-300",
    active: "border-sky-300 bg-sky-300/15 text-sky-50",
  },
  {
    key: "candy",
    label: "Pop",
    swatch: "bg-gradient-to-r from-fuchsia-300 via-cyan-300 to-accent-400",
    active: "border-fuchsia-300 bg-fuchsia-300/15 text-fuchsia-50",
  },
];

function statMatchesQuery(stat: WeirdStat, query: string) {
  if (!query) return true;
  const haystack = [
    stat.title,
    stat.shortDescription,
    stat.longDescription,
    stat.category,
    stat.unitLabel,
    stat.sourceNotes,
    stat.formulaNotes,
    ...getWeirdStatTags(stat),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function sortStats(stats: WeirdStat[], sortMode: SortMode) {
  return [...stats].sort((a, b) => {
    if (sortMode === "title") return a.title.localeCompare(b.title);
    if (sortMode === "confidence") return b.confidenceScore - a.confidenceScore;
    if (sortMode === "speed") return b.ratePerSecond - a.ratePerSecond;
    return b.ratePerSecond * Math.max(1, b.confidenceScore) - a.ratePerSecond * Math.max(1, a.confidenceScore);
  });
}

export function StatGrid({ stats }: { stats: WeirdStat[] }) {
  const [category, setCategory] = useState("All");
  const [tag, setTag] = useState("All");
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("signal");
  const [viewMode, setViewMode] = useState<ViewMode>("grouped");
  const [theme, setTheme] = useState<StatTileTheme>("neon");
  const [collapsed, setCollapsed] = useState<string[]>([]);

  const allTags = useMemo(() => {
    return Array.from(new Set(stats.flatMap((stat) => getWeirdStatTags(stat)))).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [stats]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return sortStats(
      stats.filter((stat) => {
        const categoryMatch = category === "All" || stat.category === category;
        const tagMatch = tag === "All" || getWeirdStatTags(stat).includes(tag);
        return categoryMatch && tagMatch && statMatchesQuery(stat, normalizedQuery);
      }),
      sortMode,
    );
  }, [category, query, sortMode, stats, tag]);

  const groups = useMemo(() => {
    const categoryOrder = ["All", ...WEIRD_STAT_CATEGORIES].filter((item) => item !== "All");
    return categoryOrder
      .map((item) => ({
        category: item,
        stats: filtered.filter((stat) => stat.category === item),
      }))
      .filter((group) => group.stats.length > 0);
  }, [filtered]);

  function toggleCollapsed(name: string) {
    setCollapsed((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    );
  }

  function resetFilters() {
    setCategory("All");
    setTag("All");
    setQuery("");
    setSortMode("signal");
    setCollapsed([]);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-black/20">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <label className="relative block">
            <span className="sr-only">Search weird stats</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-100/70" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search calls, AI, money leaks, tabs, carts, DMs..."
              className="min-h-12 w-full rounded-2xl border border-cyan-300/20 bg-slate-950/80 pl-11 pr-4 text-sm font-semibold text-white outline-none ring-cyan-300/20 placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-4"
            />
          </label>
          <Link
            href="/request?product=submit_weird_stat_300"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent-500 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-accent-500/20 hover:bg-accent-400"
          >
            <Plus className="h-4 w-4" />
            Create new stat
          </Link>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="grid gap-1">
            <span className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-slate-500">
              Category
            </span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="min-h-11 rounded-2xl border border-white/10 bg-slate-950/80 px-3 text-sm font-black text-white outline-none focus:border-cyan-300/40"
            >
              {["All", ...WEIRD_STAT_CATEGORIES].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-slate-500">
              Tag
            </span>
            <select
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              className="min-h-11 rounded-2xl border border-white/10 bg-slate-950/80 px-3 text-sm font-black text-white outline-none focus:border-cyan-300/40"
            >
              {["All", ...allTags].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-slate-500">
              Sort
            </span>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="min-h-11 rounded-2xl border border-white/10 bg-slate-950/80 px-3 text-sm font-black text-white outline-none focus:border-cyan-300/40"
            >
              <option value="signal">Strongest signal</option>
              <option value="speed">Fastest moving</option>
              <option value="confidence">Highest confidence</option>
              <option value="title">A to Z</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              <Palette className="h-3.5 w-3.5" />
              Color
            </span>
            {STAT_THEMES.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTheme(item.key)}
                className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-xs font-black uppercase tracking-[0.14em] ${
                  theme === item.key
                    ? item.active
                    : "border-white/10 bg-white/[0.05] text-slate-300 hover:border-cyan-300/40"
                }`}
              >
                <span className={`h-3.5 w-3.5 rounded-full ${item.swatch}`} />
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode(viewMode === "grouped" ? "flat" : "grouped")}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 text-xs font-black uppercase tracking-[0.14em] text-slate-200 hover:border-cyan-300/40"
            >
              <Layers3 className="h-3.5 w-3.5" />
              {viewMode === "grouped" ? "Grouped" : "Flat"}
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex min-h-10 items-center rounded-full border border-white/10 bg-white/[0.05] px-3 text-xs font-black uppercase tracking-[0.14em] text-slate-400 hover:border-cyan-300/40 hover:text-slate-100"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            <Tags className="h-3.5 w-3.5" />
            Tags
          </span>
          {allTags.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTag(tag === item ? "All" : item)}
              className={`shrink-0 rounded-full border px-3 py-2 text-xs font-black uppercase tracking-[0.16em] ${
                tag === item
                  ? "border-accent-300 bg-accent-500 text-slate-950"
                  : "border-white/10 bg-white/[0.045] text-slate-300 hover:border-cyan-300/40"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-1 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
        <span>{filtered.length} visible stats</span>
        <span>Cards stay locked while counters move</span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-6 text-cyan-50">
          <h3 className="text-2xl font-black text-white">No stat matches that search.</h3>
          <p className="mt-2 text-sm leading-6 text-cyan-50/85">
            That is usually a sign the clock needs a new weird number.
          </p>
          <Link
            href={`/request?product=submit_weird_stat_300&request=${encodeURIComponent(query)}`}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-5 py-3 text-sm font-black text-slate-950 hover:bg-accent-400"
          >
            Create this stat <Plus className="h-4 w-4" />
          </Link>
        </div>
      ) : viewMode === "flat" ? (
        <div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((stat) => (
            <StatTile key={stat.slug} stat={stat} dense theme={theme} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const isCollapsed = collapsed.includes(group.category);
            return (
              <section
                key={group.category}
                className="rounded-3xl border border-white/10 bg-white/[0.035] p-3 sm:p-4"
              >
                <button
                  type="button"
                  onClick={() => toggleCollapsed(group.category)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-left hover:border-cyan-300/40"
                >
                  <span>
                    <span className="block text-sm font-black uppercase tracking-[0.18em] text-cyan-100">
                      {group.category}
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-slate-500">
                      {group.stats.length} visible stats
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-cyan-100 transition ${isCollapsed ? "-rotate-90" : ""}`}
                  />
                </button>

                {!isCollapsed ? (
                  <div className="mt-4 grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {group.stats.map((stat) => (
                      <StatTile key={stat.slug} stat={stat} dense theme={theme} />
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
