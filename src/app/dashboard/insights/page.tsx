import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, ShieldAlert, Wand2 } from "lucide-react";
import Link from "next/link";
import { NextMoveCard } from "@/components/dashboard/NextMoveCard";
import { MOCK_NEXT_MOVES } from "@/lib/mock-data";

// Real insights derive from a user's real data. Until Flo has something
// worth saying, we show the four kinds of insight she'll produce — labelled
// as previews, not claims. No fabricated TikTok engagement numbers, no made-
// up CPL drift, no invented confidence percentages.

type InsightKind = "strength" | "weakness" | "opportunity" | "risk";

const PREVIEWS: { kind: InsightKind; icon: any; title: string; body: string }[] = [
  {
    kind: "strength",
    icon: TrendingUp,
    title: "What's working — Flo doubles down",
    body: "Channels, posts, offers, or scripts outperforming your own average. Flo shows exactly why and how to pour more gas on it.",
  },
  {
    kind: "weakness",
    icon: AlertTriangle,
    title: "What's leaking money — Flo flags early",
    body: "Slow replies, dead funnels, quiet channels, ignored messages. Caught before they turn into lost leads.",
  },
  {
    kind: "opportunity",
    icon: Lightbulb,
    title: "What you're missing — Flo finds quietly",
    body: "Windows your audience is online that you're not posting in, lookalike customers you haven't targeted, offers you haven't tested.",
  },
  {
    kind: "risk",
    icon: ShieldAlert,
    title: "What's drifting — Flo catches before it breaks",
    body: "Rising cost per lead, creative fatigue, delivery issues, renewal dates. Named with the specific thing to do about it.",
  },
];

const KIND_STYLES: Record<InsightKind, string> = {
  strength:    "from-lead-500 to-cyan-500",
  weakness:    "from-red-500 to-accent-500",
  opportunity: "from-cyan-500 to-brand-600",
  risk:        "from-accent-500 to-red-500",
};

export default function InsightsPage() {
  const hasInsights = false; // wired to real insight engine in a later pass
  const hasMoves = MOCK_NEXT_MOVES.length > 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-cyan-400 text-sm font-semibold">AI Insights</p>
          <h1 className="mt-1 text-3xl font-extrabold text-white">
            What's working. <span className="funnel-text">What's not.</span>
          </h1>
          <p className="mt-2 text-ink-300">
            Flo reads your data daily and surfaces what changed, what to double down
            on, and what to fix. You decide what to act on.
          </p>
        </div>
        <button className="btn-primary text-sm py-2 px-3" disabled={!hasInsights}>
          <Wand2 className="h-4 w-4" /> Re-analyze now
        </button>
      </div>

      {!hasInsights && (
        <div className="glass rounded-2xl p-6 border border-cyan-400/20">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-accent-500 flex items-center justify-center text-white shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-white">
                Flo is ready — she just needs your data
              </h2>
              <p className="mt-1 text-sm text-ink-200">
                Connect one or more sources (ads, social, calls, leads) and Flo will
                start surfacing insights the moment there's a pattern worth showing.
                Real numbers only — no invented stats.
              </p>
              <div className="mt-4 flex gap-2 flex-wrap">
                <Link href="/dashboard/social" className="btn-primary text-xs py-2 px-3">
                  Connect social accounts
                </Link>
                <Link href="/dashboard/leads" className="btn-ghost text-xs py-2 px-3">
                  Import existing leads
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview of what insights look like */}
      <div>
        <h2 className="text-lg font-bold text-white mb-3">
          The four kinds of insight Flo produces
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {PREVIEWS.map((i) => (
            <div key={i.title} className="rounded-2xl border border-dashed border-white/10 p-5">
              <div className="flex items-start gap-3">
                <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${KIND_STYLES[i.kind]} flex items-center justify-center text-white shrink-0 opacity-80`}>
                  <i.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold">{i.kind}</span>
                    <span className="text-[10px] text-ink-500">· preview</span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">{i.title}</h3>
                  <p className="text-sm text-ink-300 mt-2 leading-relaxed">{i.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {hasMoves && (
        <div>
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            Next moves Flo recommends
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {MOCK_NEXT_MOVES.map((m) => <NextMoveCard key={m.id} move={m} />)}
          </div>
        </div>
      )}
    </div>
  );
}
