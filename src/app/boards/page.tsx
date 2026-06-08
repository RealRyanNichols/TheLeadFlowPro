import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { BoardCard } from "@/components/weird-stats/BoardCard";
import { StatsDisclaimer } from "@/components/weird-stats/StatsDisclaimer";
import { WEIRD_BOARDS } from "@/lib/weird-stats";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "Premium Weird Stat Boards | The Weird Stats Clock",
  description:
    "Browse themed weird stat boards for internet weirdness, business waste, AI explosion, time wasters, relationships, and hidden habits.",
  path: "/boards",
  imageTitle: "Premium Weird Stat Boards",
  imageSubtitle: "Themed dashboards for strange numbers and premium unlocks.",
});

export default function BoardsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <LightHeader activePath="/boards" />
      <main className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-[96rem]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <div className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-cyan-100">
                Board wall
              </div>
              <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-6xl">
                Pick a weird board and watch the category breathe.
              </h1>
              <p className="mt-5 text-base leading-7 text-slate-300">
                Each board has free preview counters, locked premium cards, sponsor paths,
                and request lanes for custom research pulls.
              </p>
            </div>
            <Link
              href="/unlock"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 text-sm font-black text-slate-950 hover:bg-accent-400"
            >
              See unlocks <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {WEIRD_BOARDS.map((board) => (
              <BoardCard key={board.key} board={board} />
            ))}
          </div>
          <div className="mt-8">
            <StatsDisclaimer />
          </div>
        </div>
      </main>
      <LightFooter />
    </div>
  );
}
