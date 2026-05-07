"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  Flame,
  Gauge,
  HelpCircle,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { formatHours, type WorkloadLine } from "@/lib/workload";

type DecisionMode = "ready" | "proof" | "not-ready";

type Props = {
  slug: string;
  category: string;
  priceBig: string;
  priceSub: string;
  primaryCta: {
    label: string;
    href: string;
  };
  secondaryCta: {
    label: string;
    href: string;
  };
  rightFit: string[];
  wrongFit: string[];
  upgradeCredit?: string;
  workload: {
    label: string;
    visibleTime: string;
    planningHours: number;
    reserveHours: number;
    deliveryPromise: string;
    workloadNote: string;
    breakdown?: WorkloadLine[];
  } | null;
};

const CATEGORY_TOOLS: Record<string, string[]> = {
  consulting: ["Decision map", "action worksheet", "recording archive", "next 3 moves"],
  social: ["angle map", "content queue", "platform checklist", "lead-path review"],
  ads: ["offer check", "creative test map", "pixel/CAPI review", "lead follow-up map"],
  operator: ["ops scoreboard", "weekly priorities", "tool cleanup", "follow-up system"],
  advisor: ["owner briefing", "quarterly priorities", "decision record", "risk review"],
};

const fallbackBreakdown: WorkloadLine[] = [
  { label: "Context intake and review", minutes: 30 },
  { label: "Planning and decision work", minutes: 60 },
  { label: "Build, write, or package deliverable", minutes: 120 },
  { label: "QA, handoff, and follow-up", minutes: 45 },
];

function moneyVerb(slug: string) {
  if (slug === "quick-look") return "Reserve the quick look";
  if (slug === "decision-sprint") return "Reserve the sprint";
  if (slug.includes("audit")) return "Begin the audit";
  if (slug.includes("ads")) return "Start the ad system";
  if (slug.includes("bundle")) return "Start the bundle";
  if (slug.includes("operator")) return "Bring Ryan in";
  if (slug.includes("advisor")) return "Start the advisor track";
  return "Start this engagement";
}

function lowStep(slug: string) {
  if (slug === "quick-look") {
    return {
      href: "/book",
      label: "Take the free 10-minute call instead",
      note: "If even $47 feels early, talk first and let Ryan point you to the cleanest next move.",
    };
  }

  return {
    href: "/offers/quick-look",
    label: "Start smaller with the $47 Quick-Look",
    note: "Get Ryan's eyes on the account first, then apply the credit upward if the bigger engagement is right.",
  };
}

export function InteractiveOfferDecision({
  slug,
  category,
  priceBig,
  priceSub,
  primaryCta,
  secondaryCta,
  rightFit,
  wrongFit,
  upgradeCredit,
  workload,
}: Props) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [decision, setDecision] = useState<DecisionMode>("ready");
  const [activeLine, setActiveLine] = useState(0);

  const fitQuestions = rightFit.slice(0, 5);
  const score = Object.values(checked).filter(Boolean).length;
  const scorePct = fitQuestions.length ? Math.round((score / fitQuestions.length) * 100) : 0;
  const strongFit = score >= Math.max(3, Math.ceil(fitQuestions.length * 0.6));
  const tools = CATEGORY_TOOLS[category] ?? CATEGORY_TOOLS.consulting;
  const lines = workload?.breakdown?.length ? workload.breakdown : fallbackBreakdown;
  const totalMinutes = lines.reduce((sum, line) => sum + line.minutes, 0);
  const maxMinutes = Math.max(...lines.map((line) => line.minutes), 1);
  const low = lowStep(slug);
  const visibleHours = workload?.planningHours ?? totalMinutes / 60;
  const reservedHours = workload?.reserveHours ?? Math.ceil((totalMinutes / 60) * 4) / 4;
  const active = lines[Math.min(activeLine, lines.length - 1)];

  const decisionState = useMemo(() => {
    if (decision === "ready") {
      return {
        Icon: Flame,
        title: moneyVerb(slug),
        body: `This is the direct path. ${priceBig} ${priceSub}. The point is to stop thinking and put the work into motion.`,
        href: primaryCta.href,
        label: primaryCta.label,
      };
    }

    if (decision === "proof") {
      return {
        Icon: BarChart3,
        title: "See the workload and proof first",
        body: "Scroll the workload, proof, and FAQ sections below. If the math makes sense, come back to the purchase button.",
        href: "#workload-analyzer",
        label: "Show me the workload",
      };
    }

    return {
      Icon: HelpCircle,
      title: low.label,
      body: low.note,
      href: low.href,
      label: low.label,
    };
  }, [decision, low.href, low.label, low.note, priceBig, priceSub, primaryCta.href, primaryCta.label, slug]);

  const DecisionIcon = decisionState.Icon;

  return (
    <section className="relative overflow-hidden bg-slate-950 text-white">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />
      <div
        aria-hidden
        className="absolute -left-24 top-20 h-[420px] w-[420px] rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(92,208,255,0.85) 0%, transparent 62%)" }}
      />
      <div
        aria-hidden
        className="absolute -right-20 bottom-0 h-[460px] w-[460px] rounded-full opacity-35 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(240,122,16,0.75) 0%, transparent 64%)" }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
              <Target className="h-3.5 w-3.5" /> Decision cockpit
            </div>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Do not read forever. Check fit, see the work, then make the move.
            </h2>
          </div>
          <Link
            href={primaryCta.href}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-5 py-3 font-semibold text-white shadow-lg shadow-accent-500/25 hover:bg-accent-600"
          >
            {moneyVerb(slug)} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/25 backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
                  <CheckCircle2 className="h-4 w-4" /> Fit check
                </div>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-300">
                  Click the lines that are true. The page will tell you whether to buy this, step down, or talk first.
                </p>
              </div>
              <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-right">
                <div className="text-2xl font-bold tabular-nums text-white">{scorePct}%</div>
                <div className="text-[10px] uppercase tracking-widest text-cyan-100">fit score</div>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {fitQuestions.map((question, index) => {
                const selected = Boolean(checked[index]);
                return (
                  <button
                    key={question}
                    type="button"
                    onClick={() => setChecked((current) => ({ ...current, [index]: !current[index] }))}
                    className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                      selected
                        ? "border-cyan-300/60 bg-cyan-300/15"
                        : "border-white/10 bg-white/[0.04] hover:border-cyan-300/30 hover:bg-white/[0.08]"
                    }`}
                  >
                    <span
                      className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        selected ? "border-cyan-200 bg-cyan-300 text-slate-950" : "border-white/25 text-transparent"
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-sm leading-relaxed text-slate-100">{question}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-cyan-400 via-sky-500 to-accent-500 transition-all"
                style={{ width: `${scorePct}%` }}
              />
            </div>

            <div className={`mt-5 rounded-2xl border p-4 ${strongFit ? "border-cyan-300/35 bg-cyan-300/10" : "border-accent-300/35 bg-accent-300/10"}`}>
              <div className="font-semibold text-white">
                {strongFit ? "This looks like the right level." : "You may need a smaller first step."}
              </div>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">
                {strongFit
                  ? "If these statements are true, the cleanest move is to start the engagement and let the deliverable force clarity."
                  : "If most of those lines are not true yet, do not overbuy. Step down, talk first, or use the Quick-Look to get pointed in the right direction."}
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Link
                  href={strongFit ? primaryCta.href : low.href}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-50"
                >
                  {strongFit ? primaryCta.label : low.label} <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={secondaryCta.href}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.1]"
                >
                  {secondaryCta.label}
                </Link>
              </div>
            </div>
          </div>

          <div id="workload-analyzer" className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/25 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
                  <Gauge className="h-4 w-4" /> Workload analyzer
                </div>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">
                  The visible offer is only part of the work. This is the hidden capacity Ryan has to reserve.
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold tabular-nums text-white">{formatHours(reservedHours)}</div>
                <div className="text-[10px] uppercase tracking-widest text-cyan-100">reserved</div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric label="Visible to buyer" value={workload?.visibleTime ?? "deliverable"} />
              <Metric label="Planning estimate" value={formatHours(visibleHours)} />
            </div>

            <div className="mt-5 space-y-2">
              {lines.map((line, index) => {
                const activeRow = index === activeLine;
                return (
                  <button
                    key={`${line.label}-${index}`}
                    type="button"
                    onClick={() => setActiveLine(index)}
                    className={`grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${
                      activeRow
                        ? "border-accent-300/60 bg-accent-300/15"
                        : "border-white/10 bg-white/[0.04] hover:border-cyan-300/30 hover:bg-white/[0.08]"
                    }`}
                  >
                    <span>
                      <span className="block text-sm font-semibold text-white">{line.label}</span>
                      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-white/10">
                        <span
                          className="block h-full rounded-full bg-gradient-to-r from-cyan-400 to-accent-500"
                          style={{ width: `${Math.max(8, Math.round((line.minutes / maxMinutes) * 100))}%` }}
                        />
                      </span>
                    </span>
                    <span className="text-sm font-bold tabular-nums text-cyan-100">{line.minutes}m</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-cyan-200" />
                <div>
                  <div className="font-semibold text-white">{active.label}</div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-300">
                    {active.note || workload?.workloadNote || "This is part of the real delivery load behind the public price."}
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-400">
              Total visible breakdown: {Math.round(totalMinutes / 60 * 10) / 10} hours. Public capacity uses the reserved block because follow-up, QA, and admin time are real work.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/25 backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
              <PlayCircle className="h-4 w-4" /> What Ryan takes off your plate
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {tools.map((tool) => (
                <div key={tool} className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-3 text-sm font-semibold text-slate-100">
                  {tool}
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-accent-300/25 bg-accent-300/10 p-4 text-sm leading-relaxed text-slate-200">
              You are not paying for a vague agency handoff. The system, account, content, follow-up, and deliverable stay inside your business wherever possible.
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/25 backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
              <Sparkles className="h-4 w-4" /> Pick the next click
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <DecisionButton active={decision === "ready"} onClick={() => setDecision("ready")} icon={<Flame className="h-4 w-4" />} label="I'm ready" />
              <DecisionButton active={decision === "proof"} onClick={() => setDecision("proof")} icon={<BarChart3 className="h-4 w-4" />} label="Show proof" />
              <DecisionButton active={decision === "not-ready"} onClick={() => setDecision("not-ready")} icon={<HelpCircle className="h-4 w-4" />} label="Not ready" />
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/55 p-5">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-accent-500 text-slate-950">
                  <DecisionIcon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-semibold text-white">{decisionState.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-300">{decisionState.body}</p>
                </div>
              </div>
              <Link
                href={decisionState.href}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-600"
              >
                {decisionState.label} <ArrowRight className="h-4 w-4" />
              </Link>
              {upgradeCredit && (
                <p className="mt-3 text-xs leading-relaxed text-cyan-100">
                  <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
                  {upgradeCredit}
                </p>
              )}
            </div>

            {wrongFit.length > 0 && (
              <div className="mt-4 rounded-2xl border border-rose-300/25 bg-rose-400/10 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-rose-100">
                  <X className="h-4 w-4" /> If this sounds like you, step down
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{wrongFit[0]}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
      <div className="text-[10px] uppercase tracking-widest text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function DecisionButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
        active
          ? "border-cyan-300 bg-cyan-300 text-slate-950"
          : "border-white/10 bg-white/[0.05] text-slate-100 hover:border-cyan-300/40 hover:bg-white/[0.1]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
