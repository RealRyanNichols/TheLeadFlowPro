import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, ShieldAlert, Wand2 } from "lucide-react";
import Link from "next/link";
import { NextMoveCard } from "@/components/dashboard/NextMoveCard";
import { MOCK_NEXT_MOVES } from "@/lib/mock-data";

// Real insights derive from real LeadFlow data. Until the signal brain has
// enough source-backed records, show the insight categories as previews, not
// claims. No fabricated engagement numbers, no made-up confidence scores.

type InsightKind = "strength" | "weakness" | "opportunity" | "risk";

const PREVIEWS: { kind: InsightKind; icon: any; title: string; body: string }[] = [
  {
    kind: "strength",
    icon: TrendingUp,
    title: "Strong signal — build the list",
    body: "Pain, urgency, contactability, and source depth are strong enough to package into a buyer-ready segment.",
  },
  {
    kind: "weakness",
    icon: AlertTriangle,
    title: "Weak source depth — hold delivery",
    body: "The target looks useful, but provenance, exclusions, fields, or contact paths need review before it should be sold.",
  },
  {
    kind: "opportunity",
    icon: Lightbulb,
    title: "Buyer demand — quote the package",
    body: "Multiple requests point at the same list type, region, or business category. That demand should become a priced data product.",
  },
  {
    kind: "risk",
    icon: ShieldAlert,
    title: "Compliance risk — tighten the gate",
    body: "Sensitive fields, weak consent, excluded targets, or unclear source labels should pause delivery until the record is cleaned.",
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
          <p className="text-cyan-400 text-sm font-semibold">Scoring</p>
          <h1 className="mt-1 text-3xl font-extrabold text-white">
            Signal worth selling. <span className="funnel-text">Noise worth rejecting.</span>
          </h1>
          <p className="mt-2 text-ink-300">
            LeadFlow reads demand, source depth, intent, budget, contactability,
            and compliance gates before a list becomes a product.
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
                The signal brain needs scored records
              </h2>
              <p className="mt-1 text-sm text-ink-200">
                Capture problem intent, buyer requests, source submissions, and
                public profile data. Insights appear when there is a pattern worth
                showing. Real numbers only.
              </p>
              <div className="mt-4 flex gap-2 flex-wrap">
                <Link href="/problem-intake" className="btn-primary text-xs py-2 px-3">
                  Capture intent
                </Link>
                <Link href="/data-marketplace" className="btn-ghost text-xs py-2 px-3">
                  Open marketplace
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview of what insights look like */}
      <div>
        <h2 className="text-lg font-bold text-white mb-3">
          The four scoring judgments LeadFlow produces
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
            Next moves LeadFlow recommends
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {MOCK_NEXT_MOVES.map((m) => <NextMoveCard key={m.id} move={m} />)}
          </div>
        </div>
      )}
    </div>
  );
}
