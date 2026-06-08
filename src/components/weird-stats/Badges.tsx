import { ShieldCheck, Signal, Sparkles } from "lucide-react";
import type { WeirdStat } from "@/lib/weird-stats";
import { sourceLabel } from "@/lib/weird-stats";

export function SourceBadge({ sourceType }: { sourceType: WeirdStat["sourceType"] }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[0.65rem] font-black uppercase tracking-[0.18em] text-cyan-100">
      <Signal className="h-3 w-3" />
      {sourceLabel(sourceType)}
    </span>
  );
}

export function ConfidenceBadge({ score }: { score: number }) {
  const color =
    score >= 60
      ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
      : score >= 40
        ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
        : "border-rose-300/25 bg-rose-300/10 text-rose-100";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[0.65rem] font-black uppercase tracking-[0.18em] ${color}`}>
      <ShieldCheck className="h-3 w-3" />
      {score}% confidence
    </span>
  );
}

export function SponsorBadge({ stat }: { stat: WeirdStat }) {
  if (!stat.sponsorName) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-accent-300/25 bg-accent-300/10 px-2 py-1 text-[0.65rem] font-black uppercase tracking-[0.18em] text-accent-100">
      <Sparkles className="h-3 w-3" />
      Sponsored by {stat.sponsorName}
    </span>
  );
}
