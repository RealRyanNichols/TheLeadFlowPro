import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, ShieldAlert, Wand2 } from "lucide-react";
import { NextMoveCard } from "@/components/dashboard/NextMoveCard";
import { MOCK_NEXT_MOVES } from "@/lib/mock-data";
import { SoonButton } from "@/components/ui/SoonButton";
import { DemoBanner } from "@/components/dashboard/DemoBanner";

const INSIGHTS = [
  {
    kind: "strength",
    icon: TrendingUp,
    title: "TikTok cosmetic content is your secret weapon",
    body: "Engagement on cosmetic-procedure posts is 8.7% (vs your 5.2% IG average). Your 3 highest-performing posts ever are all TikToks under 30 seconds.",
    confidence: 92,
    source: "TikTok analytics, last 30 days"
  },
  {
    kind: "weakness",
    icon: AlertTriangle,
    title: "You're slow on Instagram DMs",
    body: "Average DM response time is 4h 12m. 38% of leads who DM you don't get a reply within 1 hour, and they're 2.4× more likely to never book.",
    confidence: 88,
    source: "Instagram DM data"
  },
  {
    kind: "opportunity",
    icon: Lightbulb,
    title: "Saturday 6–8pm is your golden window",
    body: "Your audience is online + idle on phones. You've never posted in this window — competitors that do are getting 3× the local saves.",
    confidence: 81,
    source: "Cross-platform engagement times"
  },
  {
    kind: "risk",
    icon: ShieldAlert,
    title: "Cost per lead drifting up on Meta",
    body: "Last 14 days: $9.20 CPL vs $7.66 30-day avg. Likely creative fatigue — your top ad has been running 41 days.",
    confidence: 85,
    source: "Meta Ads Manager"
  }
];

const KIND_STYLES: Record<string, string> = {
  strength:    "from-lead-500 to-cyan-500",
  weakness:    "from-red-500 to-accent-500",
  opportunity: "from-cyan-500 to-brand-600",
  risk:        "from-accent-500 to-red-500"
};

export default function InsightsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <DemoBanner setupHref="/dashboard/social" setupLabel="Connect socials">
        Claude needs your social data and a week of lead activity before it can
        surface real insights. The cards below are a preview — they'll be
        rewritten in your own numbers once data starts flowing.
      </DemoBanner>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-cyan-400 text-sm font-semibold">AI Insights</p>
          <h1 className="mt-1 text-3xl font-extrabold text-white">
            What's working. <span className="funnel-text">What's not.</span>
          </h1>
          <p className="mt-2 text-ink-300">
            Claude reads your data daily and surfaces what changed, what to double down
            on, and what to fix. You decide what to act on.
          </p>
        </div>
        <SoonButton variant="primary">
          <Wand2 className="h-4 w-4" /> Re-analyze now
        </SoonButton>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {INSIGHTS.map((i) => (
          <div key={i.title} className="glass rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${KIND_STYLES[i.kind]} flex items-center justify-center text-white shrink-0`}>
                <i.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold">{i.kind}</span>
                  <span className="text-[10px] text-ink-500">· {i.confidence}% confidence</span>
                </div>
                <h3 className="text-base font-bold text-white mt-1">{i.title}</h3>
                <p className="text-sm text-ink-200 mt-2 leading-relaxed">{i.body}</p>
                <p className="text-[11px] text-ink-500 mt-2">Source: {i.source}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-400" />
          Next moves Claude recommends
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {MOCK_NEXT_MOVES.map((m) => <NextMoveCard key={m.id} move={m} />)}
        </div>
      </div>
    </div>
  );
}
