// Proof chart: cumulative cost of renting your stack vs owning it.
// Pure SVG, no dependencies, honest arithmetic only. Colors validated for
// contrast and colorblind separation on the navy surface.

const RENT_MO = 180; // example monthly tool stack
const BUILD = 2500; // example one-time build
const HOST_MO = 25; // hosting after you own it
const MONTHS = 60;

const W = 640;
const H = 300;
const PAD = { l: 52, r: 118, t: 24, b: 34 };

const maxY = RENT_MO * MONTHS; // 10,800
const x = (m: number) => PAD.l + (m / MONTHS) * (W - PAD.l - PAD.r);
const y = (v: number) => H - PAD.b - (v / maxY) * (H - PAD.t - PAD.b);

const rentAt = (m: number) => RENT_MO * m;
const ownAt = (m: number) => BUILD + HOST_MO * m;

function path(fn: (m: number) => number) {
  const pts: string[] = [];
  for (let m = 0; m <= MONTHS; m += 3) {
    pts.push(`${m === 0 ? "M" : "L"}${x(m).toFixed(1)},${y(fn(m)).toFixed(1)}`);
  }
  return pts.join(" ");
}

// Crossover: RENT_MO*m = BUILD + HOST_MO*m
const crossM = BUILD / (RENT_MO - HOST_MO);

const fmtK = (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : `$${v}`);

export default function RentVsOwnChart() {
  return (
    <figure className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <figcaption className="mb-1 text-base font-black text-white">
        Renting never stops charging you. Owning does.
      </figcaption>
      <p className="mb-3 text-xs text-slate-400">
        Example: ${RENT_MO}/mo in rented tools vs a ${BUILD.toLocaleString()} one-time
        build plus ${HOST_MO}/mo hosting, over 5 years.
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Line chart: renting at $${RENT_MO} per month reaches ${fmtK(rentAt(MONTHS))} over five years while owning reaches ${fmtK(ownAt(MONTHS))}. Owning costs less from month ${Math.ceil(crossM)} on.`} className="w-full">
        {/* gridlines */}
        {[0, 3000, 6000, 9000].map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="#ffffff14" strokeWidth={1} />
            <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill="#748196">
              {fmtK(v)}
            </text>
          </g>
        ))}
        {/* x labels */}
        {[0, 1, 2, 3, 4, 5].map((yr) => (
          <text key={yr} x={x(yr * 12)} y={H - 12} textAnchor="middle" fontSize={11} fill="#748196">
            {yr === 0 ? "Start" : `Year ${yr}`}
          </text>
        ))}
        {/* series */}
        <path d={path(rentAt)} fill="none" stroke="#dc4747" strokeWidth={2.5} strokeLinecap="round" />
        <path d={path(ownAt)} fill="none" stroke="#0993dd" strokeWidth={2.5} strokeLinecap="round" />
        {/* crossover marker */}
        <circle cx={x(crossM)} cy={y(rentAt(crossM))} r={5} fill="#0e1a2e" stroke="#ffffff" strokeWidth={2}>
          <title>{`Month ${Math.ceil(crossM)}: owning is cheaper from here on`}</title>
        </circle>
        {/* end-point markers with native tooltips */}
        <circle cx={x(MONTHS)} cy={y(rentAt(MONTHS))} r={4} fill="#dc4747">
          <title>{`Renting: ${fmtK(rentAt(MONTHS))} after 5 years`}</title>
        </circle>
        <circle cx={x(MONTHS)} cy={y(ownAt(MONTHS))} r={4} fill="#0993dd">
          <title>{`Owning: ${fmtK(ownAt(MONTHS))} after 5 years`}</title>
        </circle>
        {/* direct labels */}
        <text x={x(MONTHS) + 8} y={y(rentAt(MONTHS)) + 4} fontSize={12} fontWeight={800} fill="#f7fafc">
          Rent: {fmtK(rentAt(MONTHS))}
        </text>
        <text x={x(MONTHS) + 8} y={y(ownAt(MONTHS)) + 4} fontSize={12} fontWeight={800} fill="#f7fafc">
          Own: {fmtK(ownAt(MONTHS))}
        </text>
        <text x={x(crossM) + 8} y={y(rentAt(crossM)) - 10} fontSize={11} fontWeight={700} fill="#aab5c5">
          Owning wins from month {Math.ceil(crossM)}
        </text>
      </svg>
      {/* legend */}
      <div className="mt-2 flex flex-wrap gap-4 text-xs font-bold text-slate-300">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "#dc4747" }} />
          Keep renting the stack
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "#0993dd" }} />
          Own it once
        </span>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Your numbers different? Run them in the{" "}
        <a href="/tools/rent-receipt" className="font-bold text-sky-300 underline">
          Rent Receipt calculator
        </a>
        .
      </p>
    </figure>
  );
}
