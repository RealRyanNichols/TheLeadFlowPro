"use client";

import { useMemo, useState } from "react";
import type { WeirdStat } from "@/lib/weird-stats";
import { WEIRD_STAT_CATEGORIES } from "@/lib/weird-stats";
import { StatTile } from "./StatTile";

export function StatGrid({ stats }: { stats: WeirdStat[] }) {
  const [category, setCategory] = useState("All");
  const filtered = useMemo(
    () => (category === "All" ? stats : stats.filter((stat) => stat.category === category)),
    [category, stats],
  );

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-3">
        {["All", ...WEIRD_STAT_CATEGORIES].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            className={`shrink-0 rounded-full border px-3 py-2 text-xs font-black uppercase tracking-[0.16em] ${
              category === item
                ? "border-accent-300 bg-accent-500 text-slate-950"
                : "border-white/10 bg-white/[0.06] text-slate-200 hover:border-cyan-300/40 hover:bg-cyan-300/10"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="mt-2 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filtered.map((stat) => (
          <StatTile key={stat.slug} stat={stat} dense />
        ))}
      </div>
    </div>
  );
}
