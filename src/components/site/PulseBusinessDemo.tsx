"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarClock,
  Car,
  Gavel,
  HeartPulse,
  Home,
  Mic2,
  MousePointerClick,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

const INDUSTRIES = [
  {
    key: "dealership",
    label: "Dealership",
    Icon: Car,
    visitor: "Someone lands on an inventory, trade-in, or financing page.",
    build: "Lead source tracker, quote request board, missed-call follow-up, appointment reminders, and manager view.",
    insight: "Which vehicle, ad, or salesperson created the call, form, appointment, and sale attempt.",
    cta: "Reserve a dealership tracker",
    baselineValue: 420,
    leadMultiplier: 1.15,
  },
  {
    key: "law",
    label: "Attorney",
    Icon: Gavel,
    visitor: "A person with a problem reads a case page, FAQ, or intake offer.",
    build: "Matter intake, evidence upload, consultation routing, follow-up reminders, and source-backed status notes.",
    insight: "Which topic created qualified consultation requests without exposing private client facts.",
    cta: "Build an intake tracker",
    baselineValue: 650,
    leadMultiplier: 0.9,
  },
  {
    key: "medical",
    label: "Doctor",
    Icon: HeartPulse,
    visitor: "A patient checks services, insurance, reviews, or scheduling instructions.",
    build: "Appointment path tracker, missed-call queue, referral source board, and patient follow-up workflow.",
    insight: "Which service pages make people schedule, ask questions, or disappear before booking.",
    cta: "Map a patient flow",
    baselineValue: 300,
    leadMultiplier: 1,
  },
  {
    key: "real-estate",
    label: "Real estate",
    Icon: Home,
    visitor: "A buyer or seller looks at listings, valuation pages, or market updates.",
    build: "Listing interest tracker, buyer/seller router, showing requests, text follow-up, and lead temperature scoring.",
    insight: "Which neighborhoods, offers, and hooks create real conversations instead of dead traffic.",
    cta: "Build a lead board",
    baselineValue: 900,
    leadMultiplier: 0.7,
  },
  {
    key: "creator",
    label: "Artist / creator",
    Icon: Mic2,
    visitor: "A fan watches a clip, opens a story page, or checks event and merch links.",
    build: "Content pulse, fan capture, share tracker, event interest, merch clicks, and sponsor-ready proof.",
    insight: "Which post, song, story, or clip gets shared, clicked, and turned into a list you own.",
    cta: "Track my audience",
    baselineValue: 85,
    leadMultiplier: 2,
  },
  {
    key: "local-service",
    label: "Local service",
    Icon: Building2,
    visitor: "A homeowner or business owner checks price, reviews, proof, or a quote page.",
    build: "Quote intake, job pipeline, review request automation, dispatch notes, and follow-up reminders.",
    insight: "Which services create calls, which calls get missed, and which quotes need a second touch.",
    cta: "Build my quote system",
    baselineValue: 275,
    leadMultiplier: 1.3,
  },
] as const;

const STAGES = [
  { label: "Views", value: 100, color: "bg-cyan-400" },
  { label: "Clicks", value: 58, color: "bg-brand-500" },
  { label: "Captured", value: 34, color: "bg-accent-400" },
  { label: "Followed up", value: 23, color: "bg-rose-400" },
] as const;

export function PulseBusinessDemo() {
  const [industryKey, setIndustryKey] = useState<(typeof INDUSTRIES)[number]["key"]>("dealership");
  const [visitors, setVisitors] = useState(420);
  const [closeRate, setCloseRate] = useState(18);

  const industry = INDUSTRIES.find((item) => item.key === industryKey) ?? INDUSTRIES[0];

  const model = useMemo(() => {
    const leads = Math.max(1, Math.round((visitors * 0.11 * industry.leadMultiplier)));
    const followedUp = Math.round(leads * 0.74);
    const neglected = Math.max(0, leads - followedUp);
    const possibleRevenue = Math.round((followedUp * closeRate * industry.baselineValue) / 100);
    const exposedRevenue = Math.round((neglected * closeRate * industry.baselineValue) / 100);

    return {
      leads,
      followedUp,
      neglected,
      possibleRevenue,
      exposedRevenue,
    };
  }, [closeRate, industry.baselineValue, industry.leadMultiplier, visitors]);

  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-slate-950 text-white">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
        }}
      />
      <div
        aria-hidden
        className="absolute -right-32 top-12 h-[520px] w-[520px] rounded-full bg-cyan-400/20 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -left-24 bottom-0 h-[420px] w-[420px] rounded-full bg-accent-400/15 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" /> Build this into your business
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              The Live Pulse is the sales demo. Your version tracks the money trail.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
              A normal website tells you page views. A useful business system tells you what got
              attention, what made someone click, what follow-up happened, what got ignored, and
              where the next dollar is hiding. That is what Ryan can build into your site, funnel,
              client portal, or internal dashboard.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <MiniStat Icon={MousePointerClick} value="Click" label="What did they touch?" />
              <MiniStat Icon={CalendarClock} value="Follow" label="Did anyone respond?" />
              <MiniStat Icon={TrendingUp} value="Sell" label="What should happen next?" />
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.06] p-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-accent-100">
                Ryan builds the owner view
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                The public can see the proof. You see the control room: names, source, status,
                follow-up, files, quote value, booked calls, deposits, and the next move.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)]">
            <div className="border-b border-white/10 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-cyan-100">
                    Example model, not a promise
                  </div>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                    Pick a business. Watch the tracker change.
                  </h3>
                </div>
                <Link
                  href="/challenge#tool-challenge-form"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-accent-500/20 hover:bg-accent-600"
                >
                  Submit my tracker <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {INDUSTRIES.map(({ key, label, Icon }) => {
                  const active = key === industryKey;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setIndustryKey(key)}
                      className={`min-h-14 rounded-2xl border px-3 text-left text-sm font-semibold transition active:scale-[0.98] ${
                        active
                          ? "border-cyan-300 bg-cyan-300/15 text-white"
                          : "border-white/10 bg-white/[0.04] text-slate-200 hover:border-cyan-300/40"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${active ? "text-cyan-100" : "text-slate-400"}`} />
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="border-b border-white/10 p-4 sm:p-5 lg:border-b-0 lg:border-r">
                <Control
                  label="Monthly visitors"
                  value={visitors}
                  min={50}
                  max={3000}
                  step={25}
                  onChange={setVisitors}
                />
                <Control
                  label="Estimated close rate"
                  value={closeRate}
                  min={1}
                  max={45}
                  step={1}
                  suffix="%"
                  onChange={setCloseRate}
                />

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Metric label="Leads seen" value={model.leads.toString()} />
                  <Metric label="Need follow-up" value={model.neglected.toString()} />
                  <Metric label="Tracked value" value={`$${model.possibleRevenue.toLocaleString()}`} />
                  <Metric label="At risk" value={`$${model.exposedRevenue.toLocaleString()}`} warning />
                </div>

                <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
                  This is a decision model. Real numbers come from your site events, forms, calls,
                  calendar, Stripe, CRM, ads, and follow-up tools.
                </p>
              </div>

              <div className="p-4 sm:p-5">
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <BarChart3 className="h-4 w-4 text-cyan-200" />
                    Funnel pulse
                  </div>
                  {STAGES.map((stage, index) => {
                    const adjusted =
                      index === 0
                        ? 100
                        : Math.max(8, Math.min(100, Math.round(stage.value * industry.leadMultiplier)));
                    return (
                      <div key={stage.label} className="mb-3 last:mb-0">
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                          <span>{stage.label}</span>
                          <span>{adjusted}%</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                          <div className={`h-full rounded-full ${stage.color}`} style={{ width: `${adjusted}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 grid gap-3">
                  <Readout title="Visitor action" body={industry.visitor} />
                  <Readout title="What Ryan builds" body={industry.build} />
                  <Readout title="What it reveals" body={industry.insight} />
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Link
                    href="/challenge#tool-challenge-form"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-50"
                  >
                    {industry.cta} <ArrowRight className="h-4 w-4" />
                  </Link>
                  <form action="/api/challenge/deposit" method="POST">
                    <button
                      type="submit"
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-600"
                    >
                      Reserve $250 slot <ArrowRight className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-relaxed text-cyan-50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-4xl">
              <span className="font-semibold text-white">Continuous build plan:</span> start with
              views and clicks, then connect forms, calendar, Stripe, calls, chat, email, CRM, client
              portal status, delivered work, reviews, repeat purchases, and share links. Every new
              signal gives the next page, offer, automation, or sales script better direction.
            </div>
            <div className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
              <ShieldCheck className="h-3.5 w-3.5" /> Private data stays private
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniStat({
  Icon,
  value,
  label,
}: {
  Icon: LucideIcon;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
      <Icon className="h-5 w-5 text-cyan-200" />
      <div className="mt-2 text-xl font-bold">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

function Control({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="mb-4 block last:mb-0">
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-slate-200">{label}</span>
        <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 font-mono text-xs text-cyan-100">
          {value.toLocaleString()}
          {suffix ?? ""}
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

function Metric({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 ${warning ? "border-rose-300/30 bg-rose-300/10" : "border-white/10 bg-white/[0.05]"}`}>
      <div className="text-xl font-bold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-slate-400">{label}</div>
    </div>
  );
}

function Readout({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="text-xs font-semibold uppercase tracking-widest text-cyan-100">{title}</div>
      <p className="mt-1 text-sm leading-relaxed text-slate-300">{body}</p>
    </div>
  );
}
