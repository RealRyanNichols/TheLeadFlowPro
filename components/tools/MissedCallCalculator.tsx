"use client";

import { useState } from "react";
import { PhoneMissed } from "lucide-react";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function MissedCallCalculator() {
  const [missed, setMissed] = useState(5);
  const [closeRate, setCloseRate] = useState(30);
  const [ticket, setTicket] = useState(250);
  const [repeats, setRepeats] = useState(2);

  const lostWeekly = missed * (closeRate / 100) * ticket * Math.max(1, repeats);
  const monthly = (lostWeekly * 52) / 12;
  const yearly = lostWeekly * 52;

  const Row = ({
    label,
    value,
    set,
    min,
    max,
    step,
    prefix,
    suffix,
  }: {
    label: string;
    value: number;
    set: (n: number) => void;
    min: number;
    max: number;
    step: number;
    prefix?: string;
    suffix?: string;
  }) => (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-slate-300">{label}</span>
        <span className="text-sm font-black text-white">
          {prefix}
          {value.toLocaleString()}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        className="w-full accent-sky-400"
      />
    </label>
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-7">
      <div className="flex items-center gap-3">
        <PhoneMissed className="h-6 w-6 text-red-400" />
        <h2 className="text-xl font-black text-white">Missed Call Money Calculator</h2>
      </div>
      <div className="mt-6 space-y-5">
        <Row label="Calls you miss per week" value={missed} set={setMissed} min={0} max={50} step={1} />
        <Row label="How many callers would have bought" value={closeRate} set={setCloseRate} min={5} max={100} step={5} suffix="%" />
        <Row label="Average first sale" value={ticket} set={setTicket} min={25} max={5000} step={25} prefix="$" />
        <Row label="Times a customer comes back" value={repeats} set={setRepeats} min={1} max={20} step={1} suffix="x" />
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-center">
          <div className="text-3xl font-black text-red-300">{fmt(monthly)}</div>
          <div className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">
            Lost every month
          </div>
        </div>
        <div className="rounded-xl border border-red-400/40 bg-red-500/15 p-4 text-center">
          <div className="text-3xl font-black text-red-200">{fmt(yearly)}</div>
          <div className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">
            Lost every year
          </div>
        </div>
      </div>
      {/* live proof chart: 12 months of losses piling up */}
      {yearly > 0 && (
        <figure className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
          <figcaption className="text-sm font-black text-white">
            Watch it pile up, month by month
          </figcaption>
          <div className="mt-3 flex h-28 items-end gap-1.5">
            {Array.from({ length: 12 }, (_, i) => {
              const v = monthly * (i + 1);
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t"
                  style={{ height: `${((i + 1) / 12) * 100}%`, background: "#dc4747", opacity: 0.55 + (i / 12) * 0.45 }}
                  title={`Month ${i + 1}: ${fmt(v)} gone`}
                />
              );
            })}
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <span>Month 1: {fmt(monthly)}</span>
            <span>Month 12: {fmt(yearly)}</span>
          </div>
        </figure>
      )}
      <p className="mt-4 text-center text-sm text-slate-400">
        An instant text-back system catches most of these.{" "}
        <a href="https://www.theleadflowpro.com/free-build" className="font-bold text-sky-300 underline" target="_top">
          I will build you one free.
        </a>
      </p>
    </div>
  );
}
