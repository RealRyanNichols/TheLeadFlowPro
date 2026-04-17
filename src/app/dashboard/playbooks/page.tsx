import Link from "next/link";
import { BookOpen, ArrowRight, Clock, Flame } from "lucide-react";
import { PLAYBOOKS } from "@/lib/playbooks";

const DIFFICULTY_STYLES: Record<string, string> = {
  easy:   "bg-lead-500/15 text-lead-400 border-lead-500/30",
  medium: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  spicy:  "bg-accent-500/15 text-accent-400 border-accent-500/30"
};

export default function PlaybooksPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <p className="text-cyan-400 text-sm font-semibold">Playbooks</p>
        <h1 className="mt-1 text-3xl font-extrabold text-white">
          Pick a play. <span className="funnel-text">Every choice branches the next.</span>
        </h1>
        <p className="mt-2 text-ink-300">
          Step-by-step plays that react to what you actually do. Pick a move, take
          the action, confirm it — the playbook rewrites itself around the new reality.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PLAYBOOKS.map((p) => (
          <Link
            key={p.id}
            href={`/dashboard/playbooks/${p.id}`}
            className="glass rounded-2xl p-5 hover:border-cyan-500/40 transition block active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-brand-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 shrink-0">
                <BookOpen className="h-5 w-5" />
              </div>
              <span className={"stat-pill border text-[11px] " + DIFFICULTY_STYLES[p.difficulty]}>
                <Flame className="h-3 w-3" /> {p.difficulty}
              </span>
            </div>
            <h3 className="mt-4 text-lg font-bold text-white">{p.title}</h3>
            <p className="mt-1 text-xs text-ink-400 uppercase tracking-wider font-semibold">
              {p.industry}
            </p>
            <p className="mt-3 text-sm text-ink-200">{p.goal}</p>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1 text-ink-400">
                <Clock className="h-3 w-3" /> {p.duration}
              </span>
              <span className="inline-flex items-center gap-1 text-cyan-400 font-semibold">
                Start play <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="glass rounded-2xl p-5 sm:p-6 border-l-2 border-accent-500">
        <p className="text-[10px] uppercase tracking-wider text-accent-400 font-semibold">
          How it works
        </p>
        <h2 className="mt-1 text-lg font-bold text-white">The butterfly effect, for lead flow</h2>
        <p className="mt-2 text-sm text-ink-200 leading-relaxed">
          Pick one of a handful of next-moves. Take the action in real life. Mark it
          done — and for auto-verified moves, we confirm it actually happened by
          checking your Lead Inbox, SMS log, or social connections. Every confirmed
          move rewrites the next set of options. No two runs look the same.
        </p>
      </div>
    </div>
  );
}
