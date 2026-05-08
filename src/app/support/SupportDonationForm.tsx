"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, HeartHandshake, RadioTower, Wrench } from "lucide-react";
import { VisitorIdField } from "@/components/site/VisitorIdField";

const PRESETS = [10, 25, 50, 100, 250, 500];

const FOCUS = [
  {
    id: "live-pulse",
    title: "Live pulse lab",
    body: "Build public dashboards that show exactly how attention turns into clicks.",
    icon: RadioTower,
  },
  {
    id: "community-connector",
    title: "Community connector",
    body: "Help East Texas people find work, leads, help, and practical connections.",
    icon: HeartHandshake,
  },
  {
    id: "client-tools",
    title: "Client tools",
    body: "Build portals, calculators, automations, and business tools owners can keep.",
    icon: Wrench,
  },
  {
    id: "east-texas-giveback",
    title: "East Texas give-back",
    body: "Support local causes, ministry work, and proof-backed community projects.",
    icon: HeartHandshake,
  },
  {
    id: "content-engine",
    title: "Content engine",
    body: "Fund videos, proof posts, screenshots, and public experiments that teach the market.",
    icon: RadioTower,
  },
  {
    id: "where-needed",
    title: "Where needed most",
    body: "Let Ryan put the support toward the next highest-leverage build.",
    icon: CheckCircle2,
  },
];

export function SupportDonationForm() {
  const [amount, setAmount] = useState(25);
  const [custom, setCustom] = useState("");
  const [focus, setFocus] = useState("live-pulse");

  const activeAmount = useMemo(() => {
    const customNumber = Number(custom);
    if (Number.isFinite(customNumber) && customNumber >= 5) return Math.round(customNumber);
    return amount;
  }, [amount, custom]);

  const focusLabel = FOCUS.find((item) => item.id === focus)?.title || "The mission";

  return (
    <form
      action="/api/support/donate"
      method="POST"
      className="overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-[0_30px_90px_-34px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/5 backdrop-blur"
    >
      <VisitorIdField />
      <input type="hidden" name="amount" value={activeAmount} />
      <input type="hidden" name="focus" value={focus} />

      <div className="bg-gradient-to-r from-slate-950 via-brand-950 to-slate-900 p-5 text-white">
        <div className="text-xs font-semibold uppercase tracking-widest text-cyan-200">
          Support checkout
        </div>
        <div className="mt-3 flex items-end justify-between gap-4">
          <div>
            <div className="text-5xl font-semibold tracking-tight">${activeAmount}</div>
            <div className="mt-1 text-sm text-slate-300">toward {focusLabel}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-2 text-right text-xs text-slate-300">
            Voluntary support
            <br />
            no outcome guarantee
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setAmount(preset);
                setCustom("");
              }}
              className={`min-h-11 rounded-xl border text-sm font-semibold ${
                activeAmount === preset && !custom
                  ? "border-cyan-500 bg-cyan-100 text-cyan-950"
                  : "border-slate-200 bg-white text-slate-700 hover:border-cyan-300"
              }`}
            >
              ${preset}
            </button>
          ))}
        </div>

        <label className="mt-3 block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-800">Custom amount</span>
          <input
            value={custom}
            onChange={(event) => setCustom(event.target.value.replace(/[^\d]/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="Minimum $5"
            className="block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
        </label>

        <div className="mt-5">
          <div className="text-sm font-semibold text-slate-900">Choose what you want Ryan to focus on</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {FOCUS.map((item) => {
              const Icon = item.icon;
              const active = focus === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFocus(item.id)}
                  className={`rounded-2xl border p-3 text-left transition ${
                    active
                      ? "border-cyan-400 bg-cyan-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-cyan-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${active ? "text-cyan-700" : "text-slate-500"}`} />
                    <div className="text-sm font-semibold text-slate-950">{item.title}</div>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.body}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <TextField name="displayName" label="Display name" placeholder="Ryan supporter, business name, or anonymous" />
          <TextField name="email" label="Email for receipt" placeholder="you@example.com" type="email" required />
        </div>
        <label className="mt-3 block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-800">Comment to keep live</span>
          <textarea
            name="comment"
            rows={4}
            maxLength={1200}
            placeholder="Why are you supporting this? What do you want Ryan and The LeadFlow Pro to build next?"
            className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
        </label>

        <label className="mt-3 flex items-start gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 p-3 text-xs leading-relaxed text-slate-700">
          <input
            type="checkbox"
            name="showPublic"
            value="yes"
            defaultChecked
            className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
          />
          <span>
            Keep my display name and comment live on the supporter wall after payment. Email and
            private payment details stay private.
          </span>
        </label>

        <button
          type="submit"
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-500 to-accent-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-500/20 hover:from-accent-600 hover:to-accent-500"
        >
          Support the vision <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}

function TextField({
  name,
  label,
  placeholder,
  type = "text",
  required,
}: {
  name: string;
  label: string;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-800">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
      />
    </label>
  );
}
