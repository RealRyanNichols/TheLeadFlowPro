"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  BarChart3,
  Bot,
  ChevronDown,
  ChevronUp,
  Clock3,
  DollarSign,
  Gauge,
  Lightbulb,
  MousePointerClick,
  Sparkles,
  Wand2,
} from "lucide-react";

const FOCUS_OPTIONS = [
  {
    key: "missed-leads",
    label: "Missed leads",
    line: "Stops calls, forms, DMs, and texts from falling through the cracks.",
  },
  {
    key: "manual-work",
    label: "Manual work",
    line: "Removes repeated admin tasks your team keeps doing by hand.",
  },
  {
    key: "follow-up",
    label: "Follow-up",
    line: "Makes sure every prospect gets the next touch without waiting on memory.",
  },
  {
    key: "content-engine",
    label: "Content engine",
    line: "Turns field work, offers, and proof into repeatable posts and short videos.",
  },
  {
    key: "client-portal",
    label: "Client portal",
    line: "Gives customers a place to see status, files, requests, and next steps.",
  },
  {
    key: "owner-dashboard",
    label: "Owner dashboard",
    line: "Shows the numbers that tell you what to do next.",
  },
] as const;

const BUILD_LEVELS = [
  { key: "quick-prototype", label: "Quick prototype", multiplier: 0.75 },
  { key: "business-tool", label: "Business tool", multiplier: 1 },
  { key: "operating-system", label: "Operating system", multiplier: 1.45 },
] as const;

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function ChallengeInsightBuilder({ compact = false }: { compact?: boolean }) {
  const [activeFocus, setActiveFocus] = useState<string>("missed-leads");
  const [missedLeads, setMissedLeads] = useState(6);
  const [leadValue, setLeadValue] = useState(350);
  const [manualHours, setManualHours] = useState(7);
  const [responseDelay, setResponseDelay] = useState(12);
  const [teamSize, setTeamSize] = useState(3);
  const [buildLevel, setBuildLevel] = useState<(typeof BUILD_LEVELS)[number]["key"]>("business-tool");
  const [expanded, setExpanded] = useState(false);

  const active = FOCUS_OPTIONS.find((item) => item.key === activeFocus) ?? FOCUS_OPTIONS[0];
  const level = BUILD_LEVELS.find((item) => item.key === buildLevel) ?? BUILD_LEVELS[1];

  const stats = useMemo(() => {
    const weeklyLeak = missedLeads * leadValue;
    const monthlyLeak = weeklyLeak * 4.33;
    const yearlyLeak = monthlyLeak * 12;
    const monthlyHours = manualHours * 4.33;
    const automationScore = Math.min(
      100,
      Math.round(
        (weeklyLeak / 75) * 0.28 +
          manualHours * 2.2 +
          responseDelay * 1.15 +
          teamSize * 2.4,
      ),
    );
    const buildHours = Math.max(
      4,
      Math.round((4 + manualHours * 0.65 + teamSize * 0.8 + responseDelay * 0.12) * level.multiplier),
    );
    const promptScore = Math.min(
      100,
      Math.round(52 + (missedLeads > 0 ? 12 : 0) + (manualHours > 0 ? 14 : 0) + (leadValue > 0 ? 10 : 0) + teamSize),
    );

    return {
      weeklyLeak,
      monthlyLeak,
      yearlyLeak,
      monthlyHours,
      automationScore,
      buildHours,
      promptScore,
    };
  }, [leadValue, level.multiplier, manualHours, missedLeads, responseDelay, teamSize]);

  const promptDraft = useMemo(() => {
    return [
      `Build focus: ${active.label}.`,
      `Business problem: ${active.line}`,
      `Estimated missed leads per week: ${missedLeads}.`,
      `Estimated value per lead/customer: ${fmt.format(leadValue)}.`,
      `Manual hours wasted per week: ${manualHours}.`,
      `Typical response delay: ${responseDelay} hours.`,
      `Team size affected: ${teamSize}.`,
      `Desired build level: ${level.label}.`,
      `Instant read: roughly ${fmt.format(stats.monthlyLeak)} in monthly lead-flow exposure and ${Math.round(stats.monthlyHours)} team hours/month are on the table if the assumptions are close.`,
      "Ryan should look for the fastest useful system the business can own: intake, follow-up, dashboard, automations, reminders, files, reporting, and handoff.",
    ].join("\n");
  }, [active.label, active.line, leadValue, level.label, manualHours, missedLeads, responseDelay, stats.monthlyHours, stats.monthlyLeak, teamSize]);

  const snapshot = useMemo(
    () => ({
      focus: activeFocus,
      focusLabel: active.label,
      missedLeadsPerWeek: missedLeads,
      leadValue,
      manualHoursPerWeek: manualHours,
      responseDelayHours: responseDelay,
      teamSize,
      buildLevel,
      buildLevelLabel: level.label,
      estimatedWeeklyLeak: stats.weeklyLeak,
      estimatedMonthlyLeak: Math.round(stats.monthlyLeak),
      estimatedYearlyLeak: Math.round(stats.yearlyLeak),
      estimatedMonthlyHours: Math.round(stats.monthlyHours),
      automationScore: stats.automationScore,
      promptScore: stats.promptScore,
      estimatedBuildHours: stats.buildHours,
    }),
    [active.label, activeFocus, buildLevel, leadValue, level.label, manualHours, missedLeads, responseDelay, stats, teamSize],
  );

  const insightQuery = useMemo(() => {
    const params = new URLSearchParams({
      focus: activeFocus,
      missedLeads: String(missedLeads),
      leadValue: String(leadValue),
      manualHours: String(manualHours),
      responseDelay: String(responseDelay),
      teamSize: String(teamSize),
      buildLevel,
    });
    return params.toString();
  }, [activeFocus, buildLevel, leadValue, manualHours, missedLeads, responseDelay, teamSize]);

  const insightHref = (slug: string) => `/challenge/insights/${slug}?${insightQuery}`;

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 text-white shadow-[0_26px_70px_-32px_rgba(15,23,42,0.75)]">
      <input type="hidden" name="toolFocus" value={active.label} />
      <input type="hidden" name="promptDraft" value={promptDraft} />
      <input type="hidden" name="insightSnapshot" value={JSON.stringify(snapshot)} />

      <div className={`border-b border-white/10 bg-white/[0.04] ${compact ? "p-4" : "p-4 sm:p-5"}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
              <Wand2 className="h-3.5 w-3.5" /> Prompt-to-build lab
            </div>
            <h3 className={`${compact ? "mt-2 text-xl" : "mt-3 text-2xl"} font-semibold tracking-tight`}>
              Put rough numbers on the leak.
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
              Pick what hurts most and drag the sliders until the numbers feel close. This does not
              need to be perfect. It gives Ryan a business signal to compare against the tool idea.
            </p>
          </div>
          <div className="rounded-2xl border border-accent-300/25 bg-accent-300/10 px-4 py-3">
            <div className="text-2xl font-bold tabular-nums">{stats.promptScore}%</div>
            <div className="text-[10px] uppercase tracking-widest text-accent-100">prompt clarity</div>
          </div>
        </div>
      </div>

      <div className={compact ? "grid gap-0" : "grid gap-0 lg:grid-cols-[0.95fr_1.05fr]"}>
        <div className={`border-b border-white/10 p-4 sm:p-5 ${compact ? "" : "lg:border-b-0 lg:border-r"}`}>
          <div className="grid grid-cols-2 gap-2">
            {FOCUS_OPTIONS.map((option) => {
              const selected = option.key === activeFocus;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setActiveFocus(option.key)}
                  className={`min-h-20 rounded-2xl border p-3 text-left transition active:scale-[0.98] ${
                    selected
                      ? "border-cyan-300 bg-cyan-300/15 shadow-[0_0_0_1px_rgba(92,208,255,0.25)]"
                      : "border-white/10 bg-white/[0.04] hover:border-cyan-300/35 hover:bg-white/[0.07]"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <MousePointerClick className={`h-4 w-4 ${selected ? "text-cyan-200" : "text-slate-400"}`} />
                    {option.label}
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-300">{option.line}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid gap-3">
            <RangeControl
              icon={<DollarSign className="h-4 w-4" />}
              label="Missed leads per week"
              value={missedLeads}
              min={0}
              max={40}
              step={1}
              suffix="leads"
              onChange={setMissedLeads}
            />
            <RangeControl
              icon={<Gauge className="h-4 w-4" />}
              label="Average lead/customer value"
              value={leadValue}
              min={25}
              max={5000}
              step={25}
              prefix="$"
              onChange={setLeadValue}
            />
            <RangeControl
              icon={<Clock3 className="h-4 w-4" />}
              label="Manual hours wasted each week"
              value={manualHours}
              min={0}
              max={40}
              step={1}
              suffix="hrs"
              onChange={setManualHours}
            />
            <RangeControl
              icon={<Bot className="h-4 w-4" />}
              label="Typical follow-up delay"
              value={responseDelay}
              min={0}
              max={72}
              step={1}
              suffix="hrs"
              onChange={setResponseDelay}
            />
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,10.5rem),1fr))]">
            <MetricCard
              href={insightHref("monthly-exposure")}
              icon={<DollarSign className="h-4 w-4" />}
              label="Monthly exposure"
              value={fmt.format(stats.monthlyLeak)}
            />
            <MetricCard
              href={insightHref("hours-per-month")}
              icon={<Clock3 className="h-4 w-4" />}
              label="Hours/month"
              value={`${Math.round(stats.monthlyHours)}h`}
            />
            <MetricCard
              href={insightHref("build-estimate")}
              icon={<Sparkles className="h-4 w-4" />}
              label="Build estimate"
              value={`${stats.buildHours}h`}
            />
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <BarChart3 className="h-4 w-4 text-cyan-200" />
              Instant insight chart
            </div>
            <ChartLine label="Lead-flow exposure" value={stats.automationScore} color="bg-cyan-400" />
            <ChartLine label="Time waste pressure" value={Math.min(100, manualHours * 2.5)} color="bg-accent-400" />
            <ChartLine label="Follow-up urgency" value={Math.min(100, responseDelay * 1.4)} color="bg-rose-400" />
            <ChartLine label="Prompt clarity" value={stats.promptScore} color="bg-white" />
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Lightbulb className="h-4 w-4 text-accent-200" />
              Build level
            </div>
            <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,8.75rem),1fr))]">
              {BUILD_LEVELS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setBuildLevel(item.key)}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition active:scale-[0.98] ${
                    buildLevel === item.key
                      ? "border-accent-300 bg-accent-300/20 text-white"
                      : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.07]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="mt-4 flex w-full items-center justify-between rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-left text-sm font-semibold text-cyan-50"
          >
            See the prompt Ryan gets
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {expanded ? (
            <div className="mt-3 rounded-2xl border border-white/10 bg-slate-900 p-4 text-xs leading-relaxed text-slate-200">
              <pre className="whitespace-pre-wrap font-mono">{promptDraft}</pre>
            </div>
          ) : null}

          <div className="mt-4 rounded-xl border border-accent-300/25 bg-accent-300/10 px-4 py-3 text-sm font-semibold text-accent-50">
            These numbers attach to the request automatically. Next: write the tool in plain English below.
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  href,
  icon,
  label,
  value,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Link
      href={href}
      className="group min-w-0 rounded-2xl border border-white/10 bg-white/[0.06] p-3 transition hover:border-cyan-300/45 hover:bg-white/[0.09] focus:outline-none focus:ring-2 focus:ring-cyan-300/50"
    >
      <div className="flex min-w-0 items-start gap-2 text-xs font-semibold uppercase leading-tight tracking-[0.16em] text-slate-300">
        <span className="shrink-0 text-cyan-200">{icon}</span>
        <span className="min-w-0 break-words">{label}</span>
      </div>
      <div className="mt-3 break-words text-2xl font-bold tracking-tight text-white">{value}</div>
      <div className="mt-2 text-[10px] font-semibold uppercase leading-tight tracking-[0.16em] text-cyan-200 opacity-80 group-hover:opacity-100">
        Tap for breakdown
      </div>
    </Link>
  );
}

function ChartLine({ label, value, color }: { label: string; value: number; color: string }) {
  const bounded = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between gap-3 text-xs text-slate-300">
        <span>{label}</span>
        <span className="font-mono">{bounded}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${bounded}%` }} />
      </div>
    </div>
  );
}

function RangeControl({
  icon,
  label,
  value,
  min,
  max,
  step,
  prefix = "",
  suffix = "",
  onChange,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          <span className="text-cyan-200">{icon}</span>
          {label}
        </span>
        <span className="font-mono text-sm text-white">
          {prefix}
          {value.toLocaleString()}
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
        className="w-full accent-cyan-300"
      />
    </label>
  );
}
