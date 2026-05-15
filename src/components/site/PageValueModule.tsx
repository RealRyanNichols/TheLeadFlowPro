"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarCheck,
  CheckCircle2,
  Gauge,
  MousePointerClick,
  Sparkles,
  Target,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { PlatformBrandMark, type PlatformBrandHandle } from "@/components/site/PlatformBrandMark";

export type PageValueModuleVariant = "home" | "services" | "consulting" | "book";

type ShellTone = "cyan" | "accent" | "brand" | "slate";

function getVisitorId() {
  const key = "leadflow_public_visitor_id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const next =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(key, next);
  return next;
}

function recordModuleEvent(variant: PageValueModuleVariant, target: string, value = 1) {
  if (typeof window === "undefined") return;

  fetch("/api/site-pulse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      visitorId: getVisitorId(),
      path: window.location.pathname,
      eventType: "tool_interaction",
      source: "page_value_module",
      target: `${variant}:${target}`,
      value,
    }),
    keepalive: true,
  }).catch(() => undefined);
}

function Shell({
  eyebrow,
  title,
  children,
  className = "",
  tone = "cyan",
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  className?: string;
  tone?: ShellTone;
}) {
  const toneClasses = {
    cyan: "from-slate-950 via-brand-950 to-cyan-950 border-cyan-300/35",
    accent: "from-slate-950 via-brand-950 to-[#3c1d05] border-accent-300/35",
    brand: "from-slate-950 via-brand-950 to-slate-900 border-cyan-300/35",
    slate: "from-slate-950 via-slate-900 to-brand-950 border-white/15",
  } satisfies Record<ShellTone, string>;

  return (
    <aside
      className={`overflow-hidden rounded-2xl border bg-gradient-to-br text-white shadow-[0_22px_60px_-26px_rgba(15,23,42,0.8)] ${toneClasses[tone]} ${className}`}
      aria-label={`${eyebrow}: ${title}`}
    >
      <div className="border-b border-white/10 bg-white/[0.04] px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100">
            <Sparkles className="h-3.5 w-3.5 text-accent-300" />
            {eyebrow}
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
            <MousePointerClick className="h-3.5 w-3.5 text-cyan-200" />
            Try it now
          </div>
        </div>
        <h3 className="mt-2 text-lg font-semibold tracking-tight text-white sm:text-xl">
          {title}
        </h3>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </aside>
  );
}

const HOME_MODES = [
  {
    id: "views",
    label: "Views",
    metric: "75K+",
    title: "Proof beats a pitch.",
    body: "Start with attention. Then route it into clicks, calls, deposits, and client work.",
    ctaHref: "/pulse",
    ctaLabel: "See live pulse",
    Icon: BarChart3,
    bars: [82, 48, 64, 92],
  },
  {
    id: "leads",
    label: "Leads",
    metric: "4 paths",
    title: "Every click needs a lane.",
    body: "Service buyers, blueprint requesters, calendar buyers, and supporters should not get the same page.",
    ctaHref: "/start",
    ctaLabel: "Pick my lane",
    Icon: Target,
    bars: [38, 74, 56, 88],
  },
  {
    id: "bookings",
    label: "Calls",
    metric: "10 min",
    title: "Short call. Clear next move.",
    body: "The site should collect enough context before the calendar so the call is not wasted.",
    ctaHref: "/book",
    ctaLabel: "Book call",
    Icon: CalendarCheck,
    bars: [44, 52, 76, 70],
  },
  {
    id: "tools",
    label: "Tools",
    metric: "$250",
    title: "Challenge me with the tool.",
    body: "If a tool would save time, catch leads, or unlock sales, submit it and let Ryan shape it.",
    ctaHref: "/stump-ryan",
    ctaLabel: "Stump Ryan",
    Icon: Wrench,
    bars: [28, 66, 84, 98],
  },
] as const;

function HomeValueTool({ className = "" }: { className?: string }) {
  const [activeId, setActiveId] = useState<(typeof HOME_MODES)[number]["id"]>("leads");
  const active = HOME_MODES.find((mode) => mode.id === activeId) ?? HOME_MODES[0];
  const Icon = active.Icon;

  return (
    <Shell
      eyebrow="Value selector"
      title="Pick what you want the site to create."
      className={className}
      tone="brand"
    >
      <div className="grid gap-4 lg:grid-cols-[0.86fr_1.14fr]">
        <div className="grid grid-cols-2 gap-2">
          {HOME_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => {
                setActiveId(mode.id);
                recordModuleEvent("home", `select_${mode.id}`);
              }}
              className={`min-h-20 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${
                activeId === mode.id
                  ? "border-cyan-200 bg-cyan-300/15 text-white shadow-lg shadow-cyan-950/20"
                  : "border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/[0.09]"
              }`}
            >
              <div className="text-xl font-semibold text-white">{mode.metric}</div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-widest">{mode.label}</div>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-300 text-slate-950">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <h4 className="font-semibold text-white">{active.title}</h4>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">{active.body}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2" aria-hidden>
            {active.bars.map((height, index) => (
              <span key={`${active.id}-${height}-${index}`} className="flex h-20 items-end rounded-xl bg-slate-950/35 p-1">
                <span
                  className="block w-full rounded-lg bg-gradient-to-t from-accent-400 to-cyan-300 motion-safe:transition-all"
                  style={{ height: `${height}%` }}
                />
              </span>
            ))}
          </div>

          <Link
            href={active.ctaHref}
            onClick={() => recordModuleEvent("home", `cta_${active.id}`)}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 text-sm font-semibold text-white shadow-lg shadow-accent-950/25 hover:bg-accent-600"
          >
            {active.ctaLabel} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </Shell>
  );
}

const SERVICE_PLATFORMS: Array<{
  id: PlatformBrandHandle;
  name: string;
  route: string;
  packageHref: string;
  result: string;
  fit: string;
  activity: number;
  color: string;
}> = [
  {
    id: "tiktok",
    name: "TikTok",
    route: "Short-form hook test",
    packageHref: "/platforms/tiktok",
    result: "Best when the business can show motion, personality, product, or field work.",
    fit: "Fast attention",
    activity: 92,
    color: "from-[#25F4EE] to-[#FE2C55]",
  },
  {
    id: "facebook",
    name: "Facebook",
    route: "Local trust engine",
    packageHref: "/platforms/facebook",
    result: "Best for East Texas services, owners, dentists, dealerships, attorneys, and local proof.",
    fit: "Local leads",
    activity: 76,
    color: "from-[#1877F2] to-cyan-300",
  },
  {
    id: "x",
    name: "X",
    route: "Authority feed",
    packageHref: "/platforms/x",
    result: "Best for strong opinions, public records, proof threads, founders, and issue-driven attention.",
    fit: "Authority",
    activity: 84,
    color: "from-slate-100 to-slate-500",
  },
  {
    id: "youtube",
    name: "YouTube",
    route: "Search + proof library",
    packageHref: "/platforms/youtube",
    result: "Best when the business needs a long-lived proof library that keeps working after posting.",
    fit: "Long shelf life",
    activity: 67,
    color: "from-[#FF0000] to-accent-300",
  },
];

function ServicesValueTool({ className = "" }: { className?: string }) {
  const [activeId, setActiveId] = useState<PlatformBrandHandle>("facebook");
  const active = SERVICE_PLATFORMS.find((platform) => platform.id === activeId) ?? SERVICE_PLATFORMS[0];

  return (
    <Shell
      eyebrow="Platform picker"
      title="Tap a platform. See the lane."
      className={className}
      tone="cyan"
    >
      <div className="grid gap-4 xl:grid-cols-[0.94fr_1.06fr]">
        <div className="grid grid-cols-2 gap-2">
          {SERVICE_PLATFORMS.map((platform) => (
            <button
              key={platform.id}
              type="button"
              onClick={() => {
                setActiveId(platform.id);
                recordModuleEvent("services", `platform_${platform.id}`);
              }}
              className={`rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${
                activeId === platform.id
                  ? "border-cyan-200 bg-white text-slate-950"
                  : "border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.1]"
              }`}
            >
              <PlatformBrandMark platform={platform.id} showLabel={false} />
              <div className="mt-3 text-sm font-semibold">{platform.name}</div>
              <div className={`mt-2 h-1.5 overflow-hidden rounded-full bg-white/15 ${activeId === platform.id ? "bg-slate-200" : ""}`}>
                <span
                  className={`block h-full rounded-full bg-gradient-to-r ${platform.color}`}
                  style={{ width: `${platform.activity}%` }}
                />
              </div>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-100">
                Recommended lane
              </div>
              <h4 className="mt-1 text-xl font-semibold text-white">{active.route}</h4>
            </div>
            <span className="rounded-full bg-accent-400 px-3 py-1 text-xs font-bold uppercase tracking-widest text-slate-950">
              {active.fit}
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{active.result}</p>
          <div className="mt-4 rounded-2xl border border-cyan-200/20 bg-cyan-300/10 p-3 text-sm text-cyan-50">
            Start with one platform if you need control. Use the bundle when the whole business needs rhythm.
          </div>
          <Link
            href={active.packageHref}
            onClick={() => recordModuleEvent("services", `cta_${active.id}`)}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
          >
            Open {active.name} page <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </Shell>
  );
}

const CONSULTING_STEPS = [
  {
    label: "One decision",
    title: "Decision Sprint",
    price: "$90",
    href: "/offers/decision-sprint",
    body: "Use this when one question is blocking sales, content, hiring, pricing, or your next move.",
    hours: "2-4 hrs real workload",
  },
  {
    label: "Written clarity",
    title: "Business Audit",
    price: "$497",
    href: "/offers/business-audit",
    body: "Use this when you need the leaks, priorities, and next moves written down.",
    hours: "6-10 hrs review",
  },
  {
    label: "Ship one asset",
    title: "Working Session",
    price: "$2,997",
    href: "/offers/working-session",
    body: "Use this when you need one page, offer, workflow, dashboard, or sales asset built with you.",
    hours: "1 intensive block",
  },
  {
    label: "Build the system",
    title: "4-Week Sprint",
    price: "$9,997",
    href: "/offers/sprint-4-week",
    body: "Use this when the business needs a system, not a suggestion.",
    hours: "4-week operator sprint",
  },
] as const;

function ConsultingValueTool({ className = "" }: { className?: string }) {
  const [step, setStep] = useState(1);
  const active = CONSULTING_STEPS[step] ?? CONSULTING_STEPS[0];

  const progress = useMemo(() => ((step + 1) / CONSULTING_STEPS.length) * 100, [step]);

  return (
    <Shell
      eyebrow="Decision sizer"
      title="Slide to the size of the problem."
      className={className}
      tone="accent"
    >
      <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
        <label htmlFor="consulting-size" className="flex items-center justify-between gap-3 text-sm font-semibold text-white">
          <span>{active.label}</span>
          <span className="rounded-full bg-white px-3 py-1 text-slate-950">{active.price}</span>
        </label>
        <input
          id="consulting-size"
          type="range"
          min={0}
          max={CONSULTING_STEPS.length - 1}
          value={step}
          onChange={(event) => {
            const next = Number(event.target.value);
            setStep(next);
            recordModuleEvent("consulting", `slider_${CONSULTING_STEPS[next]?.title ?? "unknown"}`, next + 1);
          }}
          className="mt-4 w-full accent-cyan-300"
        />
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10" aria-hidden>
          <span className="block h-full rounded-full bg-gradient-to-r from-cyan-300 to-accent-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.07] p-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-400 text-slate-950">
            <BriefcaseBusiness className="h-5 w-5" />
          </span>
          <div>
            <h4 className="text-xl font-semibold text-white">{active.title}</h4>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">{active.body}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-slate-950/35 p-3">
            <Gauge className="h-4 w-4 text-cyan-200" />
            <div className="mt-2 text-sm font-semibold text-white">{active.hours}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/35 p-3">
            <CheckCircle2 className="h-4 w-4 text-accent-300" />
            <div className="mt-2 text-sm font-semibold text-white">Clear product match</div>
          </div>
        </div>
        <Link
          href={active.href}
          onClick={() => recordModuleEvent("consulting", `cta_${active.title}`)}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 text-sm font-semibold text-white hover:bg-accent-600"
        >
          Open {active.title} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </Shell>
  );
}

const BOOK_REASONS = [
  {
    id: "tool",
    label: "Need a tool",
    title: "Submit the blueprint request first.",
    body: "Put the business problem in writing so Ryan sees the process, the leak, and the dream outcome before the call.",
    href: "/stump-ryan#tool-challenge-form",
    cta: "Build the prompt",
    slots: ["Prompt", "Scope", "Call"],
  },
  {
    id: "service",
    label: "Need service",
    title: "Choose the lane before the calendar.",
    body: "Social media, consulting, or build sprint. A cleaner lane makes the 10-minute call more useful.",
    href: "/start",
    cta: "Pick my service",
    slots: ["Lane", "Budget", "Call"],
  },
  {
    id: "ready",
    label: "Ready now",
    title: "Go straight to the calendar.",
    body: "Use this if you already know you want Ryan involved and need to lock a fit check.",
    href: "#calendar",
    cta: "Go to calendar",
    slots: ["Reason", "Time", "Next move"],
  },
] as const;

function BookValueTool({ className = "" }: { className?: string }) {
  const [activeId, setActiveId] = useState<(typeof BOOK_REASONS)[number]["id"]>("ready");
  const active = BOOK_REASONS.find((reason) => reason.id === activeId) ?? BOOK_REASONS[0];

  return (
    <Shell
      eyebrow="Call path"
      title="Pick the reason before the time."
      className={className}
      tone="slate"
    >
      <div className="grid gap-2 sm:grid-cols-3">
        {BOOK_REASONS.map((reason) => (
          <button
            key={reason.id}
            type="button"
            onClick={() => {
              setActiveId(reason.id);
              recordModuleEvent("book", `reason_${reason.id}`);
            }}
            className={`rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition hover:-translate-y-0.5 ${
              activeId === reason.id
                ? "border-cyan-200 bg-cyan-300 text-slate-950"
                : "border-white/10 bg-white/[0.06] text-slate-200 hover:bg-white/[0.1]"
            }`}
          >
            {reason.label}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.07] p-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-400 text-slate-950">
            <CalendarCheck className="h-5 w-5" />
          </span>
          <div>
            <h4 className="text-xl font-semibold text-white">{active.title}</h4>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">{active.body}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {active.slots.map((slot, index) => (
            <div key={slot} className="rounded-xl border border-white/10 bg-slate-950/35 p-2 text-center">
              <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-cyan-100">
                {index + 1}
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-200">{slot}</div>
            </div>
          ))}
        </div>
        <Link
          href={active.href}
          onClick={() => recordModuleEvent("book", `cta_${active.id}`)}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-200"
        >
          {active.cta} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </Shell>
  );
}

export function PageValueModule({
  variant,
  className = "",
}: {
  variant: PageValueModuleVariant;
  className?: string;
}) {
  if (variant === "home") return <HomeValueTool className={className} />;
  if (variant === "services") return <ServicesValueTool className={className} />;
  if (variant === "consulting") return <ConsultingValueTool className={className} />;
  return <BookValueTool className={className} />;
}
