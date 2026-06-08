import { Info } from "lucide-react";

export function StatsDisclaimer({ compact }: { compact?: boolean }) {
  return (
    <div className={`rounded-2xl border border-cyan-300/20 bg-cyan-300/10 ${compact ? "p-3 text-xs" : "p-4 text-sm"} leading-relaxed text-cyan-50`}>
      <div className="flex gap-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
        <p>
          Stats marked as estimates are generated using public assumptions, formulas, or
          user-submitted models. They are for entertainment and directional insight only.
        </p>
      </div>
    </div>
  );
}
