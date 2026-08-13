"use client";

import { ArrowDownRight, ArrowUpRight, Minus, Info } from "lucide-react";
import { trend, type TrendDirection } from "@/lib/analytics/shared";

// One KPI card: current value, prior comparable period, numeric + percentage
// change, a direction arrow, and a tooltip. Tone follows the metric's
// declared direction (more bounce is bad, lower Google position is good), and
// meaning never rides on color alone — the arrow, sign, and label carry it too.

const TONE_CLASS: Record<string, string> = {
  positive: "text-[var(--green)] bg-[var(--green-tint)] border-[var(--green-line)]",
  negative: "text-[var(--danger)] bg-[var(--danger-tint)] border-[var(--danger-line)]",
  caution: "text-[var(--warn)] bg-[var(--warn-tint)] border-[var(--warn-line)]",
  neutral: "text-[var(--muted)] bg-[var(--fill-2)] border-[var(--line)]",
};

export default function MetricCard({
  label,
  value,
  previous,
  direction = "up_good",
  tooltip,
  format = (v: number) => Math.round(v).toLocaleString("en-US"),
  suffix,
  live = false,
}: {
  label: string;
  value: number | null | undefined;
  previous?: number | null;
  direction?: TrendDirection;
  tooltip: string;
  format?: (v: number) => string;
  suffix?: string;
  live?: boolean;
}) {
  const hasValue = value != null && Number.isFinite(value);
  const hasPrev = previous != null && Number.isFinite(previous);
  const t = hasValue && hasPrev ? trend(value, previous, direction) : null;

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
          {label}
        </span>
        <span className="group relative inline-flex" tabIndex={0} aria-label={`${label}: ${tooltip}`}>
          <Info aria-hidden="true" className="h-3.5 w-3.5 text-[var(--quiet)]" />
          <span
            role="tooltip"
            className="pointer-events-none absolute right-0 top-5 z-20 hidden w-56 rounded-lg border border-[var(--line-strong)] bg-white p-2.5 text-xs font-normal normal-case leading-snug text-[var(--text)] shadow-xl group-hover:block group-focus-within:block"
          >
            {tooltip}
          </span>
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-[26px] font-black leading-none tracking-tight text-[var(--heading)] tabular-nums">
          {hasValue ? format(value) : "—"}
        </span>
        {suffix && hasValue && (
          <span className="text-sm font-semibold text-[var(--muted)]">{suffix}</span>
        )}
        {live && (
          <span className="ml-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--green)]">
            <span className="live-pulse-dot" aria-hidden="true" />
            Live
          </span>
        )}
      </div>

      {t ? (
        <div className="mt-2 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${TONE_CLASS[t.tone]}`}
          >
            {t.arrow === "up" ? (
              <ArrowUpRight aria-hidden="true" className="h-3 w-3" />
            ) : t.arrow === "down" ? (
              <ArrowDownRight aria-hidden="true" className="h-3 w-3" />
            ) : (
              <Minus aria-hidden="true" className="h-3 w-3" />
            )}
            {t.diff > 0 ? "+" : ""}
            {format(t.diff)}
            {t.pct != null && (
              <span className="font-semibold">
                ({t.pct > 0 ? "+" : ""}
                {(t.pct * 100).toFixed(Math.abs(t.pct) < 0.1 ? 1 : 0)}%)
              </span>
            )}
          </span>
          <span className="sr-only">
            {t.tone === "positive" ? "Improved" : t.tone === "negative" ? "Declined" : "Changed"} versus
            the previous period, which was {format(previous!)}.
          </span>
          <span aria-hidden="true" className="text-[11px] text-[var(--quiet)]">
            vs {format(previous!)}
          </span>
        </div>
      ) : (
        <div className="mt-2 text-[11px] text-[var(--quiet)]">
          {hasValue ? "No prior-period data yet" : "Collecting data"}
        </div>
      )}
    </div>
  );
}
