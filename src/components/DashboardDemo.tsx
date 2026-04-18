// src/components/DashboardDemo.tsx
//
// Public /dashboard demo shown to logged-out visitors. The point is to make
// "what you get if you sign in" unmistakable — polished numbers, a clear
// story, and a persistent "Sign in to unlock YOUR dashboard" CTA.
//
// Every number here is FAKE — and that's intentional for this component
// only. The real /dashboard (when authed) shows real-or-zero numbers.
// To keep the honesty promise, every tile + every chart is visibly
// watermarked "DEMO DATA" and every CTA points to /login so anyone
// interested moves to their actual data immediately.

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const DEMO_NAME = "Jordan";
const DEMO_NICHE = "solo mortgage originator, TX + NM";

// Small, realistic numbers that feel like a plausible 30-day snapshot.
const DEMO_COUNTS = {
  leadsThisMonth: 47,
  leadsLastMonth: 31,
  qualifiedA: 12,
  qualifiedB: 18,
  qualifiedC: 11,
  qualifiedD: 6,
  docsChasedAutomatically: 94,
  complianceGreen: 214,
  complianceYellow: 8,
  complianceRed: 0,
  rateWatchHits: 4,
  partnerDeals: 7,
  floCaptionsDrafted: 23,
  automationsSaved: 6.3, // hours saved / week
  revenueAttributed: 28450, // dollars closed attributed to LeadFlow
};

const DEMO_PIPELINE = [
  { stage: "New",             count: 14 },
  { stage: "Contacted",       count: 11 },
  { stage: "Qualified",       count:  9 },
  { stage: "Application",     count:  5 },
  { stage: "Processing",      count:  4 },
  { stage: "Underwriting",    count:  2 },
  { stage: "Clear to Close",  count:  1 },
  { stage: "Closed",          count:  1 },
];

const DEMO_RECENT_LEADS = [
  { initials: "M.R.", vertical: "VA",       grade: "A", reason: "DTI 28%, 720+ FICO, owner-occupied, ratified contract" },
  { initials: "J.P.", vertical: "Conv",     grade: "B", reason: "DTI 38%, 692 FICO, 30-day timeline" },
  { initials: "K.S.", vertical: "FHA",      grade: "B", reason: "DTI 41%, 650 FICO, gift funds documented" },
  { initials: "D.L.", vertical: "Cash-out", grade: "C", reason: "Rate-term unlock 60 bps — monitoring" },
  { initials: "T.N.", vertical: "Jumbo",    grade: "A", reason: "Reserves 24mo, 780 FICO, purchase $1.1M" },
];

const DEMO_COMPLIANCE_FLAGS = [
  { tag: "RESPA §8",  verdict: "green",  note: "No referral-fee language detected this week" },
  { tag: "TILA LE-3", verdict: "green",  note: "100% of apps received LE within 3 business days" },
  { tag: "TCPA",      verdict: "yellow", note: "8 msgs scanned: STOP language ✓, consent capture verified" },
  { tag: "ECOA AAN",  verdict: "green",  note: "Adverse action notices logged within 30 days" },
  { tag: "SAFE Act",  verdict: "green",  note: "NMLS ID appended to 100% of outbound SMS + email" },
];

function Watermark() {
  return (
    <div className="pointer-events-none absolute top-2 right-3 z-10 text-[10px] uppercase tracking-widest text-amber-600/80 font-semibold">
      Demo
    </div>
  );
}

function Tile({
  title,
  value,
  sub,
  tone = "blue",
}: {
  title: string;
  value: string | number;
  sub?: string;
  tone?: "blue" | "green" | "amber" | "rose" | "slate";
}) {
  const tones: Record<string, string> = {
    blue: "from-blue-50 to-white ring-blue-100",
    green: "from-emerald-50 to-white ring-emerald-100",
    amber: "from-amber-50 to-white ring-amber-100",
    rose: "from-rose-50 to-white ring-rose-100",
    slate: "from-slate-50 to-white ring-slate-200",
  };
  return (
    <div
      className={`relative rounded-2xl bg-gradient-to-br ${tones[tone]} p-5 ring-1 shadow-sm`}
    >
      <Watermark />
      <div className="text-xs uppercase tracking-wider text-slate-500">{title}</div>
      <div className="mt-1 text-3xl font-semibold text-slate-900">{value}</div>
      {sub ? <div className="mt-1 text-sm text-slate-600">{sub}</div> : null}
    </div>
  );
}

function PipelineBar({ count, max }: { count: number; max: number }) {
  const pct = Math.min(100, Math.round((count / max) * 100));
  return (
    <div className="h-3 w-full rounded-full bg-slate-100">
      <div className="h-3 rounded-full bg-slate-900/80" style={{ width: `${pct}%` }} />
    </div>
  );
}

function VerdictPill({ v }: { v: string }) {
  const colors: Record<string, string> = {
    green: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    yellow: "bg-amber-100 text-amber-800 ring-amber-200",
    red: "bg-rose-100 text-rose-800 ring-rose-200",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${colors[v] || colors.green}`}
    >
      {v}
    </span>
  );
}

export default function DashboardDemo() {
  const [hovered, setHovered] = useState<string | null>(null);

  // Gentle pulse for the sign-in CTA without being obnoxious
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setPulse((p) => !p), 1800);
    return () => clearInterval(id);
  }, []);

  const maxStage = useMemo(
    () => Math.max(...DEMO_PIPELINE.map((s) => s.count)),
    []
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Sticky sign-in nudge ─────────────────────────────────────── */}
      <div className="sticky top-0 z-40 border-b border-amber-200 bg-amber-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 text-sm">
          <div className="flex items-center gap-2 text-amber-900">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-200 text-[11px] font-bold">
              i
            </span>
            <span className="font-medium">
              You're viewing a <u>demo</u> dashboard. Every number below is a sample — yours will be real the moment you sign in.
            </span>
          </div>
          <Link
            href="/login?callbackUrl=%2Fdashboard"
            className={`rounded-lg bg-slate-900 px-3 py-1.5 text-white font-medium hover:bg-slate-800 transition-all ${
              pulse ? "ring-2 ring-amber-400" : ""
            }`}
          >
            Sign in to see YOUR numbers →
          </Link>
        </div>
      </div>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-slate-500">
              Your Dashboard · Demo Preview
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Good morning, {DEMO_NAME} <span className="text-slate-400 text-lg">· {DEMO_NICHE}</span>
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              This is roughly what a 30-day snapshot looks like for a working LeadFlow Pro + Mortgage OS user.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/signup?plan=originator"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-white text-sm font-medium hover:bg-emerald-500"
            >
              Start free — 7 days
            </Link>
            <Link
              href="/login?callbackUrl=%2Fdashboard"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 text-sm font-medium hover:bg-slate-50"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* ── Tiles ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          title="New leads this month"
          value={DEMO_COUNTS.leadsThisMonth}
          sub={`+${DEMO_COUNTS.leadsThisMonth - DEMO_COUNTS.leadsLastMonth} vs last month`}
          tone="blue"
        />
        <Tile
          title="Docs chased automatically"
          value={DEMO_COUNTS.docsChasedAutomatically}
          sub={`${DEMO_COUNTS.automationsSaved} hrs saved / week`}
          tone="green"
        />
        <Tile
          title="Compliance scans"
          value={DEMO_COUNTS.complianceGreen + DEMO_COUNTS.complianceYellow + DEMO_COUNTS.complianceRed}
          sub={`${DEMO_COUNTS.complianceGreen} green · ${DEMO_COUNTS.complianceYellow} yellow · ${DEMO_COUNTS.complianceRed} red`}
          tone="amber"
        />
        <Tile
          title="Revenue attributed (est.)"
          value={`$${DEMO_COUNTS.revenueAttributed.toLocaleString()}`}
          sub={`${DEMO_COUNTS.partnerDeals} from partner portal`}
          tone="rose"
        />
      </section>

      {/* ── Pipeline + Recent Leads ──────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-4 grid gap-4 lg:grid-cols-[2fr_1.2fr]">
        <div className="relative rounded-2xl bg-white p-5 ring-1 ring-slate-200 shadow-sm">
          <Watermark />
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            Pipeline snapshot
          </h2>
          <p className="text-xs text-slate-500">From Flo's pre-qual grading of every new lead</p>
          <ul className="mt-4 space-y-3">
            {DEMO_PIPELINE.map((s) => (
              <li key={s.stage} className="grid grid-cols-[110px_1fr_40px] items-center gap-3">
                <div className="text-sm text-slate-700">{s.stage}</div>
                <PipelineBar count={s.count} max={maxStage} />
                <div className="text-sm font-medium text-slate-900 text-right">{s.count}</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative rounded-2xl bg-white p-5 ring-1 ring-slate-200 shadow-sm">
          <Watermark />
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            Recent leads · graded by Flo
          </h2>
          <p className="text-xs text-slate-500">A, B, C, D grading from the Flo pre-qual scanner</p>
          <ul className="mt-4 space-y-3">
            {DEMO_RECENT_LEADS.map((l, i) => (
              <li
                key={i}
                onMouseEnter={() => setHovered(`lead-${i}`)}
                onMouseLeave={() => setHovered(null)}
                className="flex items-start gap-3 rounded-lg p-2 hover:bg-slate-50"
              >
                <div className="mt-0.5 h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                  {l.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">
                      {l.vertical} · Grade {l.grade}
                    </span>
                    {hovered === `lead-${i}` ? (
                      <span className="rounded bg-amber-100 text-amber-900 text-[10px] px-1.5 py-0.5">
                        🔒 sign in to contact
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-slate-500 truncate">{l.reason}</div>
                </div>
              </li>
            ))}
          </ul>
          <Link
            href="/login?callbackUrl=%2Fdashboard"
            className="mt-4 block text-center text-sm font-medium text-blue-700 hover:underline"
          >
            Sign in to see your own leads →
          </Link>
        </div>
      </section>

      {/* ── Compliance Guard summary ─────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-4">
        <div className="relative rounded-2xl bg-white p-5 ring-1 ring-slate-200 shadow-sm">
          <Watermark />
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Compliance Guard — last 7 days
              </h2>
              <p className="text-xs text-slate-500">
                Every outbound text, email, and social post is scanned against RESPA, TILA, ECOA, TCPA, SAFE Act, GLBA, TX A6 and UDAAP before it goes out.
              </p>
            </div>
            <Link
              href="/solutions/mortgage#compliance"
              className="text-sm text-blue-700 hover:underline"
            >
              How it works →
            </Link>
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {DEMO_COMPLIANCE_FLAGS.map((f) => (
              <li
                key={f.tag}
                className="flex items-start gap-3 rounded-lg border border-slate-200 p-3"
              >
                <VerdictPill v={f.verdict} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-900">{f.tag}</div>
                  <div className="text-xs text-slate-500">{f.note}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Big CTA ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-2xl bg-slate-900 text-white p-8 sm:p-10 ring-1 ring-slate-800 shadow-xl">
          <div className="grid gap-6 sm:grid-cols-[1fr_auto] items-end">
            <div>
              <div className="text-xs uppercase tracking-widest text-amber-300">
                Ready for your own dashboard?
              </div>
              <h3 className="mt-2 text-2xl font-semibold">
                Sign in — every number above will become yours, and the ones you'll actually watch will be real.
              </h3>
              <p className="mt-3 text-slate-300 max-w-2xl text-sm">
                Once you log in, the fake sample goes away. Empty states replace it with "Connect" and "Import" buttons so you can see your own story instead of a mock-up. No fake stats, ever, when you're inside your own account.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                href="/login?callbackUrl=%2Fdashboard"
                className="rounded-lg bg-emerald-500 px-5 py-3 text-center font-semibold text-white hover:bg-emerald-400"
              >
                Sign in →
              </Link>
              <Link
                href="/signup?plan=originator"
                className="rounded-lg bg-white/10 px-5 py-3 text-center font-semibold text-white ring-1 ring-white/20 hover:bg-white/20"
              >
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tiny footer / honesty note ───────────────────────────────── */}
      <footer className="mx-auto max-w-6xl px-4 pb-10 text-center text-xs text-slate-500">
        This preview is a demo. The dashboard you see after signing in shows your own data — or "0" with a "Connect" button if there isn't any yet. We don't show fake numbers once you're logged in.
      </footer>
    </div>
  );
}
