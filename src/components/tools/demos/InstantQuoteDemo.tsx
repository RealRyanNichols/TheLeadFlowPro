"use client";

import { useMemo, useState } from "react";
import { Calculator, MapPin, Sparkles, Timer } from "lucide-react";

const JOB_MIN = 500;
const JOB_MAX = 50000;
const URGENCY_MIN = 1;
const URGENCY_MAX = 10;
const DISTANCE_MIN = 0;
const DISTANCE_MAX = 200;

function fmt(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export function InstantQuoteDemo() {
  const [jobSize, setJobSize] = useState(3500);
  const [urgency, setUrgency] = useState(5);
  const [distance, setDistance] = useState(15);

  const breakdown = useMemo(() => {
    const base = jobSize;
    const urgencyMultiplier = 1 + (urgency - 1) * 0.04; // 1.00x at urgency 1, 1.36x at urgency 10
    const urgencyFee = base * (urgencyMultiplier - 1);
    const distanceFee = distance <= 10 ? 0 : (distance - 10) * 3.5; // free under 10 mi, $3.50/mi after
    const materialsBuffer = base * 0.08;
    const subtotal = base + urgencyFee + distanceFee + materialsBuffer;
    const tax = subtotal * 0.0825;
    const total = subtotal + tax;
    return {
      base,
      urgencyFee,
      distanceFee,
      materialsBuffer,
      subtotal,
      tax,
      total,
    };
  }, [jobSize, urgency, distance]);

  const urgencyLabel =
    urgency <= 3 ? "Whenever fits" : urgency <= 6 ? "This week" : urgency <= 8 ? "Within 48 hours" : "Today / emergency";

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-700">
          <Calculator className="h-3.5 w-3.5" /> Pick your job
        </div>
        <h3 className="mt-2 text-xl font-bold text-slate-950">
          Move the sliders. The quote updates live.
        </h3>

        <div className="mt-6 space-y-6">
          <SliderRow
            label="Job size"
            value={fmt(jobSize)}
            min={JOB_MIN}
            max={JOB_MAX}
            step={100}
            sliderValue={jobSize}
            onChange={setJobSize}
            Icon={Sparkles}
            help="Approximate ticket size for the job."
          />

          <SliderRow
            label="Urgency"
            value={`${urgency}/10 · ${urgencyLabel}`}
            min={URGENCY_MIN}
            max={URGENCY_MAX}
            step={1}
            sliderValue={urgency}
            onChange={setUrgency}
            Icon={Timer}
            help="Higher urgency = same-day priority surcharge."
          />

          <SliderRow
            label="Distance"
            value={`${distance} mi`}
            min={DISTANCE_MIN}
            max={DISTANCE_MAX}
            step={1}
            sliderValue={distance}
            onChange={setDistance}
            Icon={MapPin}
            help="First 10 miles are free. After that, $3.50/mile."
          />
        </div>
      </div>

      <div className="rounded-3xl border border-slate-900/10 bg-slate-950 p-5 text-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.7)] sm:p-6">
        <div className="text-xs font-semibold uppercase tracking-widest text-cyan-200">
          Quote breakdown
        </div>
        <div className="mt-3 grid grid-cols-2 items-end gap-3">
          <div className="text-sm text-slate-300">Estimated total</div>
          <div className="text-right text-3xl font-black tracking-tight">
            {fmt(breakdown.total)}
          </div>
        </div>

        <div className="mt-5 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.04]">
          <LineItem label="Base job" value={fmt(breakdown.base)} />
          <LineItem
            label={`Urgency (${urgency}/10)`}
            value={fmt(breakdown.urgencyFee)}
            muted={breakdown.urgencyFee === 0}
          />
          <LineItem
            label={`Distance (${distance} mi)`}
            value={fmt(breakdown.distanceFee)}
            muted={breakdown.distanceFee === 0}
          />
          <LineItem label="Materials buffer (8%)" value={fmt(breakdown.materialsBuffer)} />
          <LineItem label="Subtotal" value={fmt(breakdown.subtotal)} bold />
          <LineItem label="Tax (8.25%)" value={fmt(breakdown.tax)} />
        </div>

        <div className="mt-5 rounded-2xl border border-cyan-300/30 bg-cyan-300/10 p-4 text-sm leading-relaxed text-cyan-50">
          This number is generated in your browser using sample pricing logic. Your
          version uses your real price ranges, your real urgency rules, and captures
          the buyer's contact info on submit.
        </div>
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  sliderValue,
  onChange,
  Icon,
  help,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  sliderValue: number;
  onChange: (next: number) => void;
  Icon: React.ComponentType<{ className?: string }>;
  help: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Icon className="h-4 w-4 text-cyan-700" />
          {label}
        </div>
        <div className="text-sm font-bold tabular-nums text-slate-950">{value}</div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={sliderValue}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-cyan-600"
        aria-label={label}
      />
      <p className="mt-1.5 text-xs text-slate-500">{help}</p>
    </div>
  );
}

function LineItem({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <div className={`text-sm ${bold ? "font-bold text-white" : muted ? "text-slate-500" : "text-slate-300"}`}>
        {label}
      </div>
      <div className={`text-sm tabular-nums ${bold ? "font-bold text-white" : muted ? "text-slate-500" : "text-slate-100"}`}>
        {value}
      </div>
    </div>
  );
}
