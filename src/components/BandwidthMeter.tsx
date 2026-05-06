// src/components/BandwidthMeter.tsx — public capacity widget.
//
// Two visual variants:
//   <BandwidthMeter />          → full card with bar + active count + status pill
//   <BandwidthMeter variant="compact" /> → inline pill-style hint for hero areas
//
// Server component. Re-fetches snapshot on each render (route caching handles
// frequency). Falls back gracefully if the DB is unreachable.

import { getCapacitySnapshot } from "@/lib/capacity";
import Link from "next/link";

type Variant = "full" | "compact";

export async function BandwidthMeter({ variant = "full" }: { variant?: Variant }) {
  let snap;
  try {
    snap = await getCapacitySnapshot();
  } catch {
    return null;
  }

  const tone = TONE[snap.status];
  const headlineLine = HEADLINE[snap.status];

  if (variant === "compact") {
    return (
      <Link
        href="/availability"
        className={`inline-flex items-center gap-2 rounded-full border ${tone.border} ${tone.bg} backdrop-blur px-3 py-1 text-xs font-semibold ${tone.text} shadow-sm hover:shadow-md transition-shadow`}
      >
        <span className={`inline-flex h-1.5 w-1.5 rounded-full ${tone.dot} animate-pulse`} />
        {snap.remaining} hrs left · ~{snap.decisionSprintsRemaining} sprint blocks
      </Link>
    );
  }

  return (
    <div className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl p-5 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.15)] ring-1 ring-slate-900/5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
            Ryan's bandwidth · this week
          </div>
          <div className="mt-1 text-lg font-bold text-slate-950 leading-snug">
            {headlineLine}
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border ${tone.border} ${tone.bg} px-2.5 py-0.5 text-[11px] font-bold ${tone.text} uppercase tracking-widest shrink-0`}
        >
          <span className={`inline-flex h-1.5 w-1.5 rounded-full ${tone.dot} animate-pulse`} />
          {snap.status}
        </span>
      </div>

      {/* Bar */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-slate-700">
            <strong className="text-slate-950 tabular-nums">{snap.booked}</strong> booked /{" "}
            <span className="text-slate-500 tabular-nums">{snap.capacity}</span> hrs
          </span>
          <span className="text-cyan-700 font-semibold tabular-nums">
            {snap.remaining} hrs left
          </span>
        </div>
        <div className="mt-2 h-3 w-full rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
          <div
            className={`h-full ${tone.barGradient} transition-all duration-700 ease-out`}
            style={{ width: `${snap.utilizationPct}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-slate-500 uppercase tracking-widest">
          <span>0 hrs</span>
          <span>{snap.capacity} hrs cap</span>
        </div>
        <div className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50/70 p-3 text-xs leading-relaxed text-cyan-950">
          A 90-minute Decision Sprint reserves{" "}
          <strong>{snap.decisionSprintReserveHours} hours</strong> of the week after prep,
          transcript, machine research, worksheet finalization, foldering, and follow-up.
        </div>
      </div>

      {/* Active engagements (anonymized labels only) */}
      {snap.activeEngagements.length > 0 && (
        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">
            Currently working with · {snap.activeClientCount} active
          </div>
          <div className="flex flex-wrap gap-1.5">
            {snap.activeEngagements.map((e, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs text-slate-700"
              >
                <span className="inline-flex h-1 w-1 rounded-full bg-cyan-500" />
                {e.label} <span className="text-slate-400">· {e.hoursPerWeek}h/wk</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <Link
          href="/availability"
          className="text-xs font-semibold text-cyan-700 hover:text-cyan-800 inline-flex items-center gap-1"
        >
          See full breakdown →
        </Link>
        {snap.recentlyCompletedCount > 0 && (
          <span className="text-[11px] text-slate-500">
            {snap.recentlyCompletedCount} completed in last 30 days
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── tone tokens ────────────────────────────────────────────────── */

const TONE = {
  open: {
    border: "border-cyan-300",
    bg:     "bg-cyan-50/80",
    text:   "text-cyan-800",
    dot:    "bg-cyan-500",
    barGradient: "bg-gradient-to-r from-cyan-400 to-brand-500",
  },
  limited: {
    border: "border-accent-300",
    bg:     "bg-accent-300/15",
    text:   "text-accent-700",
    dot:    "bg-accent-500",
    barGradient: "bg-gradient-to-r from-cyan-400 via-accent-400 to-accent-500",
  },
  full: {
    border: "border-rose-300",
    bg:     "bg-rose-50",
    text:   "text-rose-700",
    dot:    "bg-rose-500",
    barGradient: "bg-gradient-to-r from-cyan-400 via-accent-500 to-rose-500",
  },
} as const;

const HEADLINE = {
  open:    "Plenty of room. Let's work.",
  limited: "Filling up. Get on the calendar before I'm full.",
  full:    "Full this week. Apply now to be next.",
} as const;
