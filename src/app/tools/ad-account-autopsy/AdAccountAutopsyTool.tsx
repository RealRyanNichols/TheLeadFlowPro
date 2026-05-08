"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  DollarSign,
  MousePointerClick,
  PhoneCall,
  ShieldCheck,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat("en-US");

function pct(part: number, whole: number) {
  if (!whole) return 0;
  return (part / whole) * 100;
}

function money(value: number) {
  if (!Number.isFinite(value)) return "$0";
  return currency.format(Math.max(0, value));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function grade(score: number) {
  if (score >= 86) return "A";
  if (score >= 74) return "B";
  if (score >= 62) return "C";
  if (score >= 50) return "D";
  return "F";
}

export function AdAccountAutopsyTool() {
  const [spend, setSpend] = useState(2500);
  const [clicks, setClicks] = useState(900);
  const [leads, setLeads] = useState(54);
  const [booked, setBooked] = useState(18);
  const [sales, setSales] = useState(5);
  const [avgSale, setAvgSale] = useState(1200);
  const [replyDelay, setReplyDelay] = useState(6);
  const [sourceTrail, setSourceTrail] = useState(2);

  const read = useMemo(() => {
    const leadRate = pct(leads, clicks);
    const bookRate = pct(booked, leads);
    const closeRate = pct(sales, booked);
    const revenue = sales * avgSale;
    const roas = spend > 0 ? revenue / spend : 0;
    const cpl = leads > 0 ? spend / leads : spend;
    const costPerBooked = booked > 0 ? spend / booked : spend;
    const clicksWithoutLead = Math.max(0, clicks - leads);
    const leadsWithoutBooking = Math.max(0, leads - booked);
    const bookedWithoutSale = Math.max(0, booked - sales);

    const trackingScore = sourceTrail * 12;
    const responseScore = clamp(24 - replyDelay, 0, 24);
    const funnelScore =
      clamp(leadRate * 3.1, 0, 24) +
      clamp(bookRate * 0.46, 0, 24) +
      clamp(closeRate * 0.48, 0, 24) +
      clamp(roas * 8, 0, 24);
    const score = Math.round(clamp(funnelScore + responseScore + trackingScore, 0, 100));

    const leak =
      sourceTrail < 3
        ? "source trail"
        : replyDelay > 4
          ? "reply speed"
          : leadRate < 6
            ? "page / offer"
            : bookRate < 25
              ? "follow-up"
              : closeRate < 20
                ? "sales handoff"
                : "scale path";

    const action =
      leak === "source trail"
        ? "Build the tracking chain first: ad -> page -> form/call/text -> CRM -> calendar -> payment."
        : leak === "reply speed"
          ? "Build missed-call and lead-response automation before buying more traffic."
          : leak === "page / offer"
            ? "Fix the landing page, CTA, and promise so clicks become leads."
            : leak === "follow-up"
              ? "Build an owner dashboard and follow-up queue so leads do not die after the form."
              : leak === "sales handoff"
                ? "Build scripts, reminders, and status tracking from booked call to close."
                : "This account may be ready for better retargeting, more creative, and offer expansion.";

    return {
      leadRate,
      bookRate,
      closeRate,
      revenue,
      roas,
      cpl,
      costPerBooked,
      clicksWithoutLead,
      leadsWithoutBooking,
      bookedWithoutSale,
      score,
      grade: grade(score),
      leak,
      action,
    };
  }, [avgSale, booked, clicks, leads, replyDelay, sales, sourceTrail, spend]);

  const stages = [
    {
      Icon: MousePointerClick,
      label: "Clicks",
      value: clicks,
      sub: `${money(spend)} spent`,
      width: 100,
      color: "from-cyan-300 to-cyan-500",
    },
    {
      Icon: Target,
      label: "Leads",
      value: leads,
      sub: `${read.leadRate.toFixed(1)}% click-to-lead`,
      width: clamp(read.leadRate * 7, 8, 100),
      color: "from-brand-300 to-cyan-400",
    },
    {
      Icon: PhoneCall,
      label: "Booked calls",
      value: booked,
      sub: `${read.bookRate.toFixed(1)}% lead-to-booked`,
      width: clamp(read.bookRate * 2.5, 8, 100),
      color: "from-accent-200 to-accent-500",
    },
    {
      Icon: DollarSign,
      label: "Sales",
      value: sales,
      sub: `${read.closeRate.toFixed(1)}% booked-to-sale`,
      width: clamp(read.closeRate * 3, 8, 100),
      color: "from-cyan-200 to-accent-300",
    },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
      <div className="rounded-3xl border border-slate-200 bg-white/85 p-4 shadow-[0_28px_70px_-38px_rgba(15,23,42,0.45)] backdrop-blur sm:p-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-700">
          <BarChart3 className="h-3.5 w-3.5" /> Enter rough numbers
        </div>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          Find the leak before buying more ads.
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          These do not have to be perfect. The point is to see where the account stops being an ad
          account and starts needing a business system.
        </p>

        <div className="mt-5 grid gap-3">
          <NumberSlider label="Monthly ad spend" value={spend} min={100} max={50000} step={100} prefix="$" onChange={setSpend} />
          <NumberSlider label="Landing page / link clicks" value={clicks} min={0} max={20000} step={25} onChange={setClicks} />
          <NumberSlider label="Leads captured" value={leads} min={0} max={5000} step={5} onChange={setLeads} />
          <NumberSlider label="Booked calls or appointments" value={booked} min={0} max={1000} step={1} onChange={setBooked} />
          <NumberSlider label="Closed sales" value={sales} min={0} max={500} step={1} onChange={setSales} />
          <NumberSlider label="Average sale / customer value" value={avgSale} min={50} max={25000} step={50} prefix="$" onChange={setAvgSale} />
          <NumberSlider label="Average reply delay" value={replyDelay} min={0} max={72} step={1} suffix="hrs" onChange={setReplyDelay} />
          <NumberSlider label="Source trail connected" value={sourceTrail} min={0} max={5} step={1} suffix="/5" onChange={setSourceTrail} />
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-900/10 bg-slate-950 text-white shadow-[0_32px_90px_-42px_rgba(15,23,42,0.8)]">
        <div className="border-b border-white/10 bg-gradient-to-r from-cyan-500/15 via-white/[0.03] to-accent-500/15 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-100">
                Autopsy read
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Grade {read.grade}: {read.leak.replace(/^\w/, (letter) => letter.toUpperCase())} is the first fix.
              </h2>
            </div>
            <div className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-center">
              <div className="text-3xl font-bold tabular-nums">{read.score}</div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">system score</div>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{read.action}</p>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1fr_0.85fr]">
          <div className="border-b border-white/10 p-4 sm:p-5 lg:border-b-0 lg:border-r">
            <div className="space-y-3">
              {stages.map((stage) => (
                <div key={stage.label} className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold">
                      <stage.Icon className="h-4 w-4 text-cyan-200" />
                      {stage.label}
                    </span>
                    <span className="font-mono text-sm font-semibold">{number.format(stage.value)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div className={`h-full rounded-full bg-gradient-to-r ${stage.color}`} style={{ width: `${stage.width}%` }} />
                  </div>
                  <div className="mt-2 text-xs text-slate-400">{stage.sub}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="grid gap-3">
              <Kpi label="Cost per lead" value={money(read.cpl)} />
              <Kpi label="Cost per booked call" value={money(read.costPerBooked)} />
              <Kpi label="Estimated revenue" value={money(read.revenue)} />
              <Kpi label="ROAS" value={`${read.roas.toFixed(1)}x`} />
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                {read.score >= 70 ? (
                  <CheckCircle2 className="h-4 w-4 text-cyan-200" />
                ) : (
                  <XCircle className="h-4 w-4 text-accent-200" />
                )}
                Lost movement
              </div>
              <div className="mt-3 grid gap-2 text-xs leading-relaxed text-slate-300">
                <div>{number.format(read.clicksWithoutLead)} clicks did not become leads.</div>
                <div>{number.format(read.leadsWithoutBooking)} leads did not book.</div>
                <div>{number.format(read.bookedWithoutSale)} booked calls did not close.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 bg-white/[0.04] p-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <ProofChip Icon={Clock3} label="Reply speed" value={`${replyDelay}h`} />
            <ProofChip Icon={ShieldCheck} label="Source trail" value={`${sourceTrail}/5`} />
            <ProofChip Icon={TrendingUp} label="Money trail" value={read.roas >= 1 ? "Visible" : "Leaking"} />
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/challenge?source=ad-autopsy"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-3 text-sm font-semibold text-white hover:bg-accent-600"
            >
              Challenge Ryan to build my tracker <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/book?source=ad-autopsy"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15"
            >
              Walk through my account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function NumberSlider({
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

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-semibold text-white">{value}</div>
    </div>
  );
}

function ProofChip({
  Icon,
  label,
  value,
}: {
  Icon: typeof Clock3;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        <Icon className="h-3.5 w-3.5 text-cyan-200" />
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-cyan-100">{value}</div>
    </div>
  );
}
