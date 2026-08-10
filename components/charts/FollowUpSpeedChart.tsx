// Proof figure: speed-to-lead. One published, citable comparison — no invented
// stats. Lead Response Management Study (Oldroyd, MIT): sales teams were 21x
// more likely to qualify a web lead calling back within 5 minutes vs 30.

const BARS = [
  { label: "Call back in 5 minutes", value: 21, color: "#0993dd", note: "21x more likely to qualify the lead" },
  { label: "Call back in 30 minutes", value: 1, color: "#dc4747", note: "The baseline everyone else lives at" },
];

const MAX = 21;

export default function FollowUpSpeedChart() {
  return (
    <figure className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <figcaption className="mb-1 text-base font-black text-white">
        Speed is the whole ballgame.
      </figcaption>
      <p className="mb-4 text-xs text-slate-400">
        Relative odds of qualifying a new web lead, by callback speed.
      </p>
      <div className="space-y-4">
        {BARS.map((b) => (
          <div key={b.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="text-sm font-bold text-white">{b.label}</span>
              <span className="text-sm font-black text-white">{b.value}x</span>
            </div>
            <div className="h-5 w-full overflow-hidden rounded bg-white/[0.06]">
              <div
                className="h-full rounded-r"
                style={{ width: `${(b.value / MAX) * 100}%`, minWidth: 10, background: b.color }}
                title={b.note}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">{b.note}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Source: Lead Response Management Study (James Oldroyd). This is why the
        systems I build text a lead back in seconds, not hours.
      </p>
    </figure>
  );
}
