import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

export function StatCard({
  label,
  value,
  sub,
  delta,
  highlight
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: number; // percentage change vs prior period
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "glass rounded-2xl p-5",
        highlight && "ring-1 ring-cyan-500/40 shadow-lg shadow-cyan-500/10"
      )}
    >
      <p className="text-xs uppercase tracking-wider text-ink-400 font-semibold">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={cn("text-3xl font-extrabold", highlight ? "funnel-text" : "text-white")}>
          {value}
        </span>
        {typeof delta === "number" && (
          <span
            className={cn(
              "stat-pill text-xs",
              delta >= 0
                ? "bg-lead-500/15 text-lead-400 border border-lead-500/30"
                : "bg-red-500/15 text-red-400 border border-red-500/30"
            )}
          >
            {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      {sub && <p className="mt-1 text-xs text-ink-300">{sub}</p>}
    </div>
  );
}
