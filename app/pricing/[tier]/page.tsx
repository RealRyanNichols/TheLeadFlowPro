import Link from "next/link";
import { notFound } from "next/navigation";
import { TIERS, type TierSlug, type TierData } from "@/lib/tiers";
import { rampHex } from "@/lib/severity";
import BuyButton from "@/components/BuyButton";

export function generateStaticParams() {
  return Object.keys(TIERS).map((tier) => ({ tier }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tier: string }>;
}) {
  const { tier } = await params;
  const t = TIERS[tier as TierSlug];
  if (!t) return {};
  return {
    title: `${t.name} | The LeadFlow Pro`,
    description: t.headline,
  };
}

// Accent styling per tier (static class strings for Tailwind)
const ACCENTS = {
  sky: {
    chip: "border-sky-400/40 bg-sky-500/10 text-sky-300",
    text: "text-sky-300",
    ring: "border-sky-400/40 shadow-glow-blue",
    step: "border-sky-400/40 bg-sky-500/10 text-sky-300",
  },
  violet: {
    chip: "border-violet-400/40 bg-violet-500/10 text-violet-300",
    text: "text-violet-300",
    ring: "border-violet-400/40 shadow-glow-violet",
    step: "border-violet-400/40 bg-violet-500/10 text-violet-300",
  },
  mint: {
    chip: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
    text: "text-emerald-300",
    ring: "border-emerald-400/40 shadow-glow-mint",
    step: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
  },
} as const;

const TONE = {
  warn: "text-warn glow-amber",
  mint: "text-mint glow-mint",
  accent: "text-white",
} as const;

/* ---------- CHARTS (server-rendered SVG, direct-labeled) ---------- */

// Learn It: cumulative rent bars vs one-time $497 line
function WaitingChart() {
  const months = 12;
  const rate = 250;
  const max = months * rate; // 3000
  const W = 720, H = 260, PAD = 36, BOT = 30;
  const plotH = H - BOT - 8;
  const bw = (W - PAD * 2) / months - 8;
  const y = (v: number) => 8 + plotH - (v / max) * plotH;
  const courseY = y(497);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Cumulative rented-stack spend by month versus the one-time $497 course price" className="w-full">
      {[1000, 2000, 3000].map((g) => (
        <g key={g}>
          <line x1={PAD} x2={W - PAD} y1={y(g)} y2={y(g)} stroke="#1E2A44" strokeWidth="1" />
          <text x={PAD - 6} y={y(g) + 4} textAnchor="end" fontSize="11" fill="#64748B">${g / 1000}k</text>
        </g>
      ))}
      {Array.from({ length: months }, (_, i) => {
        const v = (i + 1) * rate;
        const x = PAD + i * ((W - PAD * 2) / months) + 4;
        const label = i === 2 || i === 5 || i === 11;
        return (
          <g key={i}>
            <rect x={x} y={y(v)} width={bw} height={8 + plotH - y(v)} rx="4" fill={rampHex(i / (months - 1))} opacity={0.9}>
              <title>{`Month ${i + 1}: $${v.toLocaleString()} spent on rent`}</title>
            </rect>
            {label && (
              <text x={x + bw / 2} y={y(v) - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill="#E2E8F0">${v.toLocaleString()}</text>
            )}
            <text x={x + bw / 2} y={H - 12} textAnchor="middle" fontSize="10" fill="#64748B">{i + 1}</text>
          </g>
        );
      })}
      <line x1={PAD} x2={W - PAD} y1={courseY} y2={courseY} stroke="#34D399" strokeWidth="2" strokeDasharray="6 4" />
      <text x={W - PAD} y={courseY - 8} textAnchor="end" fontSize="12" fontWeight="700" fill="#34D399">Learn It: $497, once</text>
      <text x={PAD} y={H - 12} textAnchor="start" fontSize="10" fill="#64748B">month</text>
    </svg>
  );
}

// Build It With You: 3-year cost of three paths, horizontal bars
function ThreeWaysChart() {
  // Severity-graded: worst cost burns red, runner-up orange, the owned path green.
  const rows = [
    { name: "Typical agency (build + care plan)", value: 9400, approx: true, fill: "#F87171", note: "≈ $4,000 build + $150/mo — and they usually keep the keys" },
    { name: "Rented DIY stack", value: 9000, approx: false, fill: "#FB923C", note: "$250/mo, forever, own nothing" },
    { name: "Build It With You", value: 3400, approx: false, fill: "#34D399", note: "$2,500 build + $25/mo infra — yours, with the skill" },
  ];
  const max = 10000;
  const W = 720, H = 190, LP = 8, RP = 90;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Three-year cost comparison: typical agency about $9,400, rented DIY stack $9,000, Build It With You about $3,400" className="w-full">
      {rows.map((r, i) => {
        const yTop = 10 + i * 60;
        const w = ((W - LP - RP) * r.value) / max;
        return (
          <g key={r.name}>
            <text x={LP} y={yTop + 10} fontSize="12" fontWeight="600" fill="#E2E8F0">{r.name}</text>
            <text x={LP} y={yTop + 46} fontSize="10" fill="#64748B">{r.note}</text>
            <rect x={LP} y={yTop + 16} width={w} height={16} rx="4" fill={r.fill} opacity={0.85}>
              <title>{`${r.name}: $${r.value.toLocaleString()} over 3 years${r.approx ? " (typical range, varies)" : ""}`}</title>
            </rect>
            <text x={LP + w + 8} y={yTop + 29} fontSize="13" fontWeight="800" fill={r.fill}>
              {r.approx ? "≈ " : ""}${r.value.toLocaleString()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Done For You: cumulative cost lines, break-even crossover
function TcoChart() {
  const months = 36;
  const W = 720, H = 260, PAD = 40, BOT = 28;
  const plotH = H - BOT - 10;
  const maxV = 9200;
  const x = (m: number) => PAD + ((W - PAD * 2) * m) / months;
  const y = (v: number) => 10 + plotH - (v / maxV) * plotH;
  const rentPts = Array.from({ length: months + 1 }, (_, m) => `${x(m)},${y(m * 250)}`).join(" ");
  const ownPts = Array.from({ length: months + 1 }, (_, m) => `${x(m)},${y(5000 + m * 25)}`).join(" ");
  const beM = 5000 / 225; // ~22.2 → renting passes owning
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Cumulative three-year cost: renting at $250 per month versus Done For You build plus $25 per month; lines cross near month 22" className="w-full">
      {[3000, 6000, 9000].map((g) => (
        <g key={g}>
          <line x1={PAD} x2={W - PAD} y1={y(g)} y2={y(g)} stroke="#1E2A44" strokeWidth="1" />
          <text x={PAD - 6} y={y(g) + 4} textAnchor="end" fontSize="11" fill="#64748B">${g / 1000}k</text>
        </g>
      ))}
      {[6, 12, 18, 24, 30, 36].map((m) => (
        <text key={m} x={x(m)} y={H - 8} textAnchor="middle" fontSize="10" fill="#64748B">{m}</text>
      ))}
      <defs>
        <linearGradient id="rentHeat" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="45%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#EF4444" />
        </linearGradient>
      </defs>
      <polyline points={rentPts} fill="none" stroke="url(#rentHeat)" strokeWidth="2.5" />
      <polyline points={ownPts} fill="none" stroke="#34D399" strokeWidth="2.5" />
      <circle cx={x(beM)} cy={y(beM * 250)} r="5" fill="#38BDF8" stroke="#070B14" strokeWidth="2">
        <title>Break even: around month 22 the rented stack has cost more than the entire owned build</title>
      </circle>
      <text x={x(beM)} y={y(beM * 250) - 12} textAnchor="middle" fontSize="12" fontWeight="700" fill="#38BDF8">break even ≈ month 22</text>
      <text x={x(36) - 4} y={y(9000) + 16} textAnchor="end" fontSize="12" fontWeight="700" fill="#EF4444">Renting: $9,000 and climbing</text>
      <text x={x(36) - 4} y={y(5900) - 10} textAnchor="end" fontSize="12" fontWeight="700" fill="#34D399">Owned: $5,900 total — asset yours</text>
      <text x={W - PAD} y={H - 8} textAnchor="end" fontSize="10" fill="#64748B">month</text>
    </svg>
  );
}

const CHARTS: Record<TierSlug, () => React.ReactElement> = {
  "learn-it": WaitingChart,
  "build-it-with-you": ThreeWaysChart,
  "done-for-you": TcoChart,
};

/* ---------- PAGE ---------- */

export default async function TierPage({
  params,
}: {
  params: Promise<{ tier: string }>;
}) {
  const { tier } = await params;
  const t: TierData | undefined = TIERS[tier as TierSlug];
  if (!t) notFound();
  const a = ACCENTS[t.accent];
  const Chart = CHARTS[t.slug];
  const others = (Object.values(TIERS) as TierData[]).filter((o) => o.slug !== t.slug);

  return (
    <section className="mx-auto max-w-5xl px-4 py-14">
      <Link href="/pricing" className="text-sm font-semibold text-slate-400 hover:text-white">
        ← All pricing
      </Link>

      {/* HERO */}
      <div className="mt-4">
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${a.chip}`}>
          {t.name}
        </span>
        <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight text-white sm:text-5xl">
          {t.headline}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-300">{t.sub}</p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <span className="text-4xl font-black text-white">{t.price}</span>
          <span className="text-sm text-slate-400">{t.unit}</span>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          {t.slug === "learn-it" ? (
            <BuyButton label={t.cta} />
          ) : (
            <Link href={`/book?interest=${t.interest}`} className="btn-primary">
              {t.cta}
            </Link>
          )}
          <Link href="/#receipt" className="btn-ghost">
            Run Your Numbers First
          </Link>
        </div>
      </div>

      {/* STATS */}
      <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {t.stats.map((s) => (
          <div key={s.label} className="card !p-5 text-center">
            <div className={`text-2xl font-black sm:text-3xl ${TONE[s.tone ?? "accent"]}`}>{s.value}</div>
            <div className="mt-1 text-xs text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* THE MATH */}
      <div className={`card mt-10 border ${a.ring}`}>
        <h2 className="text-xl font-bold text-white">{t.chartTitle}</h2>
        <p className="mt-1 text-sm text-slate-400">{t.chartNote}</p>
        <div className="mt-5">
          <Chart />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Rented-stack figures use the same sourced vendor pricing as the calculator on the home page (checked July 2026); $250/mo is the midpoint of the typical $200–500/mo range. Items marked ≈ are typical market ranges and vary.
        </p>
      </div>

      {/* WHAT YOU GET */}
      <h2 className="mt-14 text-2xl font-black text-white sm:text-3xl">What you get</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {t.features.map((f) => (
          <div key={f.title} className="card card-hover !p-5">
            <h3 className={`font-bold ${a.text}`}>{f.title}</h3>
            <p className="mt-2 text-sm text-slate-400">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* HOW IT WORKS */}
      <h2 className="mt-14 text-2xl font-black text-white sm:text-3xl">How it works</h2>
      <ol className="mt-6 space-y-4">
        {t.steps.map((s, i) => (
          <li key={s.title} className="flex gap-4">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-black ${a.step}`}>
              {i + 1}
            </span>
            <div>
              <h3 className="font-bold text-white">{s.title}</h3>
              <p className="mt-0.5 text-sm text-slate-400">{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* FIT */}
      <div className="mt-14 grid gap-6 md:grid-cols-2">
        <div className="card border-mint/30">
          <h2 className="text-lg font-bold text-mint">This is for you if</h2>
          <ul className="mt-3 space-y-2.5 text-sm text-slate-300">
            {t.forYou.map((x) => (
              <li key={x} className="flex gap-2.5">
                <span className="text-mint">✓</span>
                <span>{x}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card border-white/10">
          <h2 className="text-lg font-bold text-slate-300">It's not for you if</h2>
          <ul className="mt-3 space-y-2.5 text-sm text-slate-400">
            {t.notForYou.map((x) => (
              <li key={x} className="flex gap-2.5">
                <span className="text-slate-500">✕</span>
                <span>{x}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* FAQ */}
      <h2 className="mt-14 text-2xl font-black text-white sm:text-3xl">Straight answers</h2>
      <div className="mt-6 space-y-3">
        {t.faq.map((f) => (
          <details key={f.q} className="card !p-0">
            <summary className="cursor-pointer list-none p-5 font-semibold text-white">
              {f.q}
            </summary>
            <p className="px-5 pb-5 text-sm text-slate-300">{f.a}</p>
          </details>
        ))}
      </div>

      {/* CLOSER */}
      <div className={`card mt-14 border text-center ${a.ring}`}>
        <p className="text-xl font-bold text-white sm:text-2xl">{t.closing}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {t.slug === "learn-it" ? (
            <BuyButton label={t.cta} />
          ) : (
            <Link href={`/book?interest=${t.interest}`} className="btn-primary">
              {t.cta}
            </Link>
          )}
          <Link href="/showcase" className="btn-ghost">
            See the Command Center Demo
          </Link>
        </div>
      </div>

      {/* CROSS-LINKS */}
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {others.map((o) => (
          <Link key={o.slug} href={`/pricing/${o.slug}`} className="card card-hover !p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Compare: {o.name} · {o.price}
            </span>
            <p className="mt-1 text-sm text-slate-300">{o.headline}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
