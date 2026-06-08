import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import type { WeirdBoard, WeirdStat } from "@/lib/weird-stats";
import { STARTER_WEIRD_STATS } from "@/lib/weird-stats";

export function BoardCard({ board }: { board: WeirdBoard }) {
  const stats = board.statSlugs
    .map((slug) => STARTER_WEIRD_STATS.find((stat) => stat.slug === slug))
    .filter((stat): stat is WeirdStat => Boolean(stat))
    .slice(0, 4);

  return (
    <article className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.055] shadow-2xl shadow-black/20">
      <div className={`h-2 bg-gradient-to-r ${board.accent}`} />
      <div className="p-5">
        <h3 className="text-2xl font-black tracking-tight text-white">{board.title}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-300">{board.description}</p>
        <div className="mt-5 grid gap-2">
          {stats.map((stat) => (
            <div key={stat.slug} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
              <div className="text-sm font-black text-white">{stat.title}</div>
              <div className="mt-1 text-xs text-slate-400">{stat.shortDescription}</div>
            </div>
          ))}
          <div className="flex items-center gap-2 rounded-2xl border border-accent-300/20 bg-accent-300/10 p-3 text-sm font-black text-accent-100">
            <Lock className="h-4 w-4" />
            {board.lockedCount} deeper cards locked
          </div>
        </div>
        <Link
          href={`/request?board=${board.key}&product=premium_board_unlock_500`}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-3 text-sm font-black text-slate-950 hover:bg-accent-400"
        >
          Unlock full board <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
