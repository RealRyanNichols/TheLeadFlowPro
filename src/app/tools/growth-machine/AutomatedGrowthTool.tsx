"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileText,
  Lock,
  MessageSquareText,
  MousePointerClick,
  Route,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { STRIPE_PAYMENT_LINKS } from "@/lib/stripe-links";

type ToolState = {
  businessType: string;
  mainOffer: string;
  monthlyVisitors: number;
  monthlyLeads: number;
  averageCustomerValue: number;
  closeRate: number;
  responseMinutes: number;
  postsPerWeek: number;
  hasSourceTracking: boolean;
  hasAutomation: boolean;
  hasProofAssets: boolean;
  biggestProblem: string;
};

type Unlock = {
  id: string;
  price: string;
  title: string;
  body: string;
  includes: string[];
  href: string;
  cta: string;
  Icon: typeof FileText;
};

const STORAGE_KEY = "leadflow_growth_machine_tool_v1";

const DEFAULT_STATE: ToolState = {
  businessType: "Local service business",
  mainOffer: "Paid service, appointment, quote, or consultation",
  monthlyVisitors: 1200,
  monthlyLeads: 42,
  averageCustomerValue: 750,
  closeRate: 24,
  responseMinutes: 45,
  postsPerWeek: 3,
  hasSourceTracking: false,
  hasAutomation: false,
  hasProofAssets: true,
  biggestProblem: "Leads come in, but follow-up and tracking are messy.",
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat("en-US");

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function money(value: number) {
  if (!Number.isFinite(value)) return "$0";
  return currency.format(Math.max(0, Math.round(value)));
}

function pct(part: number, whole: number) {
  if (!whole) return 0;
  return (part / whole) * 100;
}

function checkout(slug: keyof typeof STRIPE_PAYMENT_LINKS, fallback: string) {
  return STRIPE_PAYMENT_LINKS[slug] ?? fallback;
}

export function AutomatedGrowthTool() {
  const [state, setState] = useState<ToolState>(DEFAULT_STATE);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setState({ ...DEFAULT_STATE, ...JSON.parse(saved) });
    } catch {
      // Ignore localStorage errors.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore localStorage errors.
    }
  }, [state]);

  const report = useMemo(() => {
    const leadRate = pct(state.monthlyLeads, state.monthlyVisitors);
    const expectedLeadRate = state.businessType.toLowerCase().includes("service") ? 6 : 4.5;
    const leadGap = Math.max(0, Math.round((state.monthlyVisitors * (expectedLeadRate - leadRate)) / 100));
    const responseRisk =
      state.responseMinutes <= 5 ? 92 : state.responseMinutes <= 30 ? 72 : state.responseMinutes <= 120 ? 45 : 25;
    const trackingScore = state.hasSourceTracking ? 88 : 34;
    const automationScore = state.hasAutomation ? 84 : 38;
    const proofScore = clamp(45 + state.postsPerWeek * 7 + (state.hasProofAssets ? 24 : -10));
    const leadFlowScore = clamp(34 + leadRate * 7 + state.closeRate * 0.7 + (state.hasAutomation ? 10 : 0));
    const buyReadiness = Math.round(
      clamp((leadFlowScore + responseRisk + trackingScore + proofScore + automationScore) / 5),
    );
    const exposedValue = leadGap * state.averageCustomerValue * (state.closeRate / 100);

    const leaks = [
      !state.hasSourceTracking
        ? {
            title: "No source trail",
            detail: "The business cannot see which page, ad, post, form, call, or DM created the lead.",
          }
        : null,
      state.responseMinutes > 30
        ? {
            title: "Slow first response",
            detail: "A warm lead can cool off before the business replies.",
          }
        : null,
      leadRate < expectedLeadRate
        ? {
            title: "Page or offer leak",
            detail: "Traffic is arriving, but not enough people are turning into a captured lead.",
          }
        : null,
      !state.hasAutomation
        ? {
            title: "Manual follow-up drag",
            detail: "The business is relying on memory, tabs, and people remembering the next step.",
          }
        : null,
      !state.hasProofAssets || state.postsPerWeek < 3
        ? {
            title: "Proof and content gap",
            detail: "The buyer may not see enough trust, repetition, and examples to move.",
          }
        : null,
    ].filter((item): item is { title: string; detail: string } => Boolean(item));

    const topLeaks = leaks.length
      ? leaks.slice(0, 3)
      : [
          {
            title: "Scale path check",
            detail: "The basics look stronger. The next issue is tracking what to scale and what to stop.",
          },
        ];

    const nextMove =
      topLeaks[0]?.title === "No source trail"
        ? "Build the source trail before buying more traffic."
        : topLeaks[0]?.title === "Slow first response"
          ? "Install fast lead-response automation before adding more traffic."
          : topLeaks[0]?.title === "Page or offer leak"
            ? "Rewrite the above-fold offer and CTA path before adding new channels."
            : topLeaks[0]?.title === "Manual follow-up drag"
              ? "Create the follow-up sequence and owner queue first."
              : "Package proof, source data, and next-step reporting into a repeatable dashboard.";

    return {
      leadRate,
      leadGap,
      exposedValue,
      responseRisk,
      trackingScore,
      automationScore,
      proofScore,
      leadFlowScore,
      buyReadiness,
      topLeaks,
      nextMove,
    };
  }, [state]);

  const unlocks: Unlock[] = [
    {
      id: "unlock-47",
      price: "$47",
      title: "Full Growth Snapshot",
      body: "Unlock the full ranked leak list, buyer-path notes, score breakdown, and first-fix checklist.",
      includes: ["Full scorecard", "Top 5 leaks", "First fix checklist", "Copy-ready CTA angle"],
      href: checkout("quick-look", "/offers/quick-look"),
      cta: "Unlock $47 snapshot",
      Icon: FileText,
    },
    {
      id: "follow-up-kit",
      price: "$90",
      title: "Follow-Up Sequence Kit",
      body: "Unlock the scripts and timing for missed calls, DMs, forms, slow replies, and no-shows.",
      includes: ["SMS script pack", "DM response flow", "No-show rescue", "24-hour reply map"],
      href: checkout("decision-sprint", "/offers/decision-sprint"),
      cta: "Unlock $90 kit",
      Icon: MessageSquareText,
    },
    {
      id: "lead-leak-report",
      price: "$197",
      title: "Lead Leak Report",
      body: "Unlock the deeper report: leak math, dashboard fields, source trail, and critical fix order.",
      includes: ["Leak exposure math", "Source trail map", "Dashboard fields", "Fix order"],
      href: "/lead-leak-audit-197#audit-application",
      cta: "Start $197 report",
      Icon: ClipboardCheck,
    },
    {
      id: "automation-map",
      price: "$250",
      title: "Automation Blueprint",
      body: "Unlock the first useful automation map for intake, reply, routing, status, and owner visibility.",
      includes: ["Tool spec", "Automation path", "Account handoff list", "Build checklist"],
      href: "/stump-ryan",
      cta: "Open blueprint path",
      Icon: Bot,
    },
    {
      id: "growth-os",
      price: "$1,497+",
      title: "Growth OS Path",
      body: "Unlock the monthly machine path for Pulse, content signals, dashboards, follow-up, and reporting.",
      includes: ["Pulse dashboard", "Content signal map", "Owner queue", "Monthly system path"],
      href: checkout("power-bundle", "/offers/power-bundle"),
      cta: "Open Growth OS path",
      Icon: Database,
    },
  ];

  function update<K extends keyof ToolState>(key: K, value: ToolState[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,1.08fr)]">
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-[0_28px_70px_-38px_rgba(15,23,42,0.45)] backdrop-blur sm:p-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-700">
          <Route className="h-3.5 w-3.5" /> Enter rough business data
        </div>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          The tool does not need perfect numbers. It needs honest signals.
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          This stays saved on this device while they move around the site. That prevents the rage
          moment where a serious buyer fills something out, clicks away, and loses everything.
        </p>

        <div className="mt-5 grid gap-4">
          <TextField
            label="Business type"
            value={state.businessType}
            onChange={(value) => update("businessType", value)}
            placeholder="Local service business"
          />
          <TextField
            label="Main offer"
            value={state.mainOffer}
            onChange={(value) => update("mainOffer", value)}
            placeholder="Quote, booking, consultation, subscription, product"
          />
          <NumberField
            label="Monthly website or landing page visitors"
            value={state.monthlyVisitors}
            min={0}
            max={100000}
            step={50}
            onChange={(value) => update("monthlyVisitors", value)}
          />
          <NumberField
            label="Monthly leads captured"
            value={state.monthlyLeads}
            min={0}
            max={50000}
            step={5}
            onChange={(value) => update("monthlyLeads", value)}
          />
          <NumberField
            label="Average customer value"
            value={state.averageCustomerValue}
            min={1}
            max={100000}
            step={50}
            prefix="$"
            onChange={(value) => update("averageCustomerValue", value)}
          />
          <NumberField
            label="Close rate from captured lead"
            value={state.closeRate}
            min={1}
            max={100}
            step={1}
            suffix="%"
            onChange={(value) => update("closeRate", value)}
          />
          <NumberField
            label="Average first response time"
            value={state.responseMinutes}
            min={0}
            max={1440}
            step={5}
            suffix="min"
            onChange={(value) => update("responseMinutes", value)}
          />
          <NumberField
            label="Useful posts or proof assets per week"
            value={state.postsPerWeek}
            min={0}
            max={50}
            step={1}
            onChange={(value) => update("postsPerWeek", value)}
          />
          <ToggleRow
            label="Source tracking is connected"
            checked={state.hasSourceTracking}
            onChange={(checked) => update("hasSourceTracking", checked)}
          />
          <ToggleRow
            label="Lead follow-up is automated"
            checked={state.hasAutomation}
            onChange={(checked) => update("hasAutomation", checked)}
          />
          <ToggleRow
            label="Proof assets are easy to find"
            checked={state.hasProofAssets}
            onChange={(checked) => update("hasProofAssets", checked)}
          />
          <label className="block rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <span className="text-sm font-semibold text-slate-800">What feels broken?</span>
            <textarea
              value={state.biggestProblem}
              onChange={(event) => update("biggestProblem", event.target.value)}
              rows={4}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-950 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-900/10 bg-slate-950 text-white shadow-[0_32px_90px_-42px_rgba(15,23,42,0.8)]">
        <div className="border-b border-white/10 bg-gradient-to-r from-cyan-500/15 via-white/[0.03] to-accent-500/15 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-100">
                Free snapshot
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Buy-readiness score: {report.buyReadiness}/100
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                First machine read: {report.nextMove}
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-center">
              <div className="text-4xl font-bold tabular-nums">{report.buyReadiness}</div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">
                score
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <ScoreCard label="Lead-flow score" value={Math.round(report.leadFlowScore)} />
            <ScoreCard label="Response score" value={report.responseRisk} />
            <ScoreCard label="Tracking score" value={report.trackingScore} />
            <ScoreCard label="Automation score" value={report.automationScore} />
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1fr_0.88fr]">
          <div className="border-b border-white/10 p-4 sm:p-5 lg:border-b-0 lg:border-r lg:border-white/10">
            <div className="text-xs font-semibold uppercase tracking-widest text-cyan-100">
              First leaks detected
            </div>
            <div className="mt-4 space-y-3">
              {report.topLeaks.map((leak, index) => (
                <div key={leak.title} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-300/15 text-sm font-black text-accent-100">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-bold text-white">{leak.title}</div>
                      <p className="mt-1 text-sm leading-6 text-slate-300">{leak.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-accent-300/25 bg-accent-300/10 p-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-accent-100">
                Exposed value estimate
              </div>
              <div className="mt-2 text-3xl font-black text-white">{money(report.exposedValue)}</div>
              <p className="mt-2 text-xs leading-5 text-slate-300">
                This is not a guaranteed revenue number. It is a rough exposure estimate based on
                lead-rate gap, customer value, and stated close rate.
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-cyan-100">
              What stays locked
            </div>
            <div className="mt-4 grid gap-3">
              <LockedLine label="Full ranked leak report" />
              <LockedLine label="Follow-up scripts and timing" />
              <LockedLine label="Automation blueprint" />
              <LockedLine label="Dashboard field map" />
              <LockedLine label="Export-ready action plan" />
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <ShieldCheck className="h-4 w-4 text-cyan-200" />
                The correct model
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Free preview proves the engine. Paid unlock gives the document pack they need to
                act, delegate, or build.
              </p>
            </div>
          </div>
        </div>

        <div id="unlock" className="border-t border-white/10 bg-white/[0.035] p-4 sm:p-5">
          <div className="text-xs font-semibold uppercase tracking-widest text-accent-100">
            Unlock the rest
          </div>
          <div className="mt-4 grid gap-3">
            {unlocks.map((item) => (
              <UnlockCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/68 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black text-white">{Math.round(value)}</div>
    </div>
  );
}

function UnlockCard({ item }: { item: Unlock }) {
  const Icon = item.Icon;
  const external = /^https?:\/\//i.test(item.href);

  return (
    <div id={item.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent-300/25 bg-accent-300/10 px-3 py-1 text-[0.68rem] font-black uppercase tracking-widest text-accent-100">
            <Icon className="h-3.5 w-3.5" />
            {item.price}
          </div>
          <h3 className="mt-3 text-lg font-black text-white">{item.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.includes.map((include) => (
              <span
                key={include}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[0.7rem] font-semibold text-slate-200"
              >
                <CheckCircle2 className="h-3 w-3 text-cyan-200" />
                {include}
              </span>
            ))}
          </div>
        </div>
        <Link
          href={item.href}
          target={external ? "_blank" : undefined}
          rel={external ? "noreferrer" : undefined}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-bold text-slate-950 shadow-sm hover:bg-accent-400"
        >
          {item.cta} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function LockedLine({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
      <span className="text-sm font-semibold text-slate-200">{label}</span>
      <Lock className="h-4 w-4 shrink-0 text-accent-200" />
    </div>
  );
}

function TextField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  prefix = "",
  suffix = "",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <label className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate-800">{label}</span>
        <span className="font-mono text-sm font-semibold text-slate-950">
          {prefix}
          {number.format(value)}
          {suffix ? ` ${suffix}` : ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-cyan-500"
      />
    </label>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 rounded-full transition ${
          checked ? "bg-cyan-500" : "bg-slate-300"
        }`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
            checked ? "left-7" : "left-1"
          }`}
        />
      </button>
    </label>
  );
}
