"use client";

import { useState } from "react";
import { Receipt } from "lucide-react";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const ITEMS = [
  { key: "builder", label: "Website builder (Wix, Squarespace, Shopify)", def: 39 },
  { key: "email", label: "Email tool (Mailchimp, Constant Contact)", def: 45 },
  { key: "booking", label: "Booking or scheduling app", def: 29 },
  { key: "crm", label: "CRM seats", def: 50 },
  { key: "reviews", label: "Review or reputation software", def: 99 },
  { key: "phone", label: "Business phone or texting service", def: 30 },
  { key: "forms", label: "Forms, popups, or chat widgets", def: 25 },
  { key: "other", label: "Everything else you forgot about", def: 20 },
] as const;

export default function RentReceiptCalculator() {
  const [vals, setVals] = useState<Record<string, number>>(
    Object.fromEntries(ITEMS.map((i) => [i.key, i.def])),
  );

  const monthly = Object.values(vals).reduce((a, b) => a + (Number(b) || 0), 0);
  const yearly = monthly * 12;
  const fiveYears = yearly * 5;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-7">
      <div className="flex items-center gap-3">
        <Receipt className="h-6 w-6 text-emerald-300" />
        <h2 className="text-xl font-black text-white">The Rent Receipt</h2>
      </div>
      <p className="mt-2 text-sm text-slate-400">
        What do you pay every month just to exist online? Fill in your real numbers.
        Zero out anything you do not pay for.
      </p>
      <div className="mt-5 space-y-3">
        {ITEMS.map((i) => (
          <label key={i.key} className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-300">{i.label}</span>
            <span className="flex items-center gap-1 text-sm font-black text-white">
              $
              <input
                type="number"
                min={0}
                value={vals[i.key]}
                onChange={(e) =>
                  setVals((v) => ({ ...v, [i.key]: Math.max(0, Number(e.target.value) || 0) }))
                }
                className="w-20 rounded-lg border border-white/15 bg-black/25 px-2 py-1.5 text-right text-sm text-white focus:border-sky-400/60 focus:outline-none"
              />
              /mo
            </span>
          </label>
        ))}
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/15 bg-white/[0.05] p-4 text-center">
          <div className="text-2xl font-black text-white">{fmt(monthly)}</div>
          <div className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">
            Per month
          </div>
        </div>
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-center">
          <div className="text-2xl font-black text-amber-300">{fmt(yearly)}</div>
          <div className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">
            Per year
          </div>
        </div>
        <div className="rounded-xl border border-red-400/40 bg-red-500/15 p-4 text-center">
          <div className="text-2xl font-black text-red-300">{fmt(fiveYears)}</div>
          <div className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">
            Over 5 years
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-slate-400">
        That five-year number buys a system you own outright.{" "}
        <a href="https://www.theleadflowpro.com/free-build" className="font-bold text-sky-300 underline" target="_top">
          See what yours would look like, free.
        </a>
      </p>
    </div>
  );
}
