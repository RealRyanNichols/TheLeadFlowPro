"use client";

import { useState } from "react";
import { ArrowUpRight, Info, ShieldAlert } from "lucide-react";

// Sample metrics that mirror /demo. They are intentionally hard-coded:
// the demo MUST NOT show real Stripe / Google Business / Quo data even
// if a session cookie exists.
const METRICS = [
  {
    key: "leads",
    label: "Leads this month",
    value: "47",
    sub: "+16 vs prior 30 days",
    tooltip:
      "This would be your real lead count, pulled from ads, calls, forms, and DMs once those integrations are connected.",
    tone: "cyan" as const,
  },
  {
    key: "cpl",
    label: "Cost per lead",
    value: "$24.18",
    sub: "Across all channels",
    tooltip:
      "This would be your real cost per lead with your Stripe revenue and Meta / Google ad spend connected.",
    tone: "brand" as const,
  },
  {
    key: "conversion",
    label: "Conversion rate",
    value: "11.4%",
    sub: "Lead → paying client",
    tooltip:
      "This would be your real conversion rate with Stripe and your CRM connected. We never use demo data once your real numbers are flowing.",
    tone: "accent" as const,
  },
  {
    key: "mrr",
    label: "MRR managed",
    value: "$8,420",
    sub: "From your funnels",
    tooltip:
      "This would be your real MRR with Stripe connected (read-only). We never charge through this view — your Stripe payment pages stay the source of truth.",
    tone: "rose" as const,
  },
  {
    key: "gbp",
    label: "GBP profile views",
    value: "1,284",
    sub: "+22% week over week",
    tooltip:
      "This would be your real Google Business Profile view + call count once you connect GBP. The demo never shows your real GBP data.",
    tone: "cyan" as const,
  },
  {
    key: "quo",
    label: "Quo conversations",
    value: "63",
    sub: "Avg first reply 4m",
    tooltip:
      "This would be your real Quo (SMS) conversation count and reply speed once you connect Quo. The demo uses sample numbers only.",
    tone: "brand" as const,
  },
] as const;

const TONE_STYLES = {
  cyan: "border-cyan-200 bg-cyan-50",
  brand: "border-slate-200 bg-slate-50",
  accent: "border-accent-300/50 bg-accent-100/40",
  rose: "border-rose-200 bg-rose-50",
} as const;

const NEXT_MOVES = [
  {
    title: "Reply to Maria @ Whitfield Roofing",
    note: "Quote request 4 hours ago. Demo score: 87. (Your real version uses your scoring rules.)",
    eta: "Reply within 1 hour",
  },
  {
    title: "Approve this week's TikTok script",
    note: "Hook v3 + caption variant. (Your real version pulls from your actual content lane.)",
    eta: "Posts Friday 9 a.m.",
  },
  {
    title: "Run Facebook Ads weekly check-in",
    note: "CPL trending down 18% in the demo. (Your real version reads your live Meta data.)",
    eta: "Recommended now",
  },
];

export function OwnerDashboardDemo() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
        <span className="inline-flex items-center gap-2 font-semibold">
          <ShieldAlert className="h-4 w-4" />
          DEMO MODE — every metric here is sample data, even if you're signed in.
        </span>
        <span className="text-xs leading-5">
          Real Stripe / Google Business Profile / Quo data never appears in the public demo.
        </span>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-cyan-200">
              DEMO MODE
            </span>
            <span className="text-sm font-semibold text-slate-700">Owner Dashboard preview</span>
          </div>
          <a
            href="/demo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 hover:text-cyan-900"
          >
            Open the full /demo view <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {METRICS.map(({ key, ...m }) => (
            <MetricTile key={key} {...m} />
          ))}
        </div>

        <div className="border-t border-slate-200 p-5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Your next 3 moves
          </div>
          <div className="space-y-3">
            {NEXT_MOVES.map((move) => (
              <div
                key={move.title}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-bold text-slate-950">{move.title}</div>
                  <div className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-cyan-700">
                    {move.eta}
                  </div>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-600">{move.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm leading-6 text-cyan-950">
        Every tile above has a tooltip on hover that says "This would be your real
        &lt;metric&gt; with Google Business Profile / Stripe / Quo connected." The demo
        never pulls live data, even when you're signed in.
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  sub,
  tooltip,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tooltip: string;
  tone: keyof typeof TONE_STYLES;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`group relative rounded-2xl border ${TONE_STYLES[tone]} p-4 transition hover:shadow-sm`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          {label}
        </div>
        <Info className="h-4 w-4 text-slate-400 group-hover:text-slate-700" aria-hidden />
      </div>
      <div className="mt-1 text-2xl font-black tracking-tight text-slate-950">{value}</div>
      <div className="mt-0.5 text-xs text-slate-600">{sub}</div>

      <div
        role="tooltip"
        className={`pointer-events-none absolute left-3 right-3 top-full z-10 mt-2 rounded-xl border border-slate-900/15 bg-slate-950 p-3 text-xs leading-5 text-slate-100 shadow-xl shadow-slate-900/20 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
      >
        {tooltip}
      </div>
    </div>
  );
}
