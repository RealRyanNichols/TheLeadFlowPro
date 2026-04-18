"use client";

/**
 * Auto-approve config card.
 *
 * Lets the user set a monthly cap (in dollars) for $5 micro-purchases that
 * Flo can auto-trigger when their task credit balance dips below the cost
 * of the next task.
 *
 * Defaults: cap = $0 (off), increment = $5.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, Settings2 } from "lucide-react";
import { currency } from "@/lib/utils-money";

interface Props {
  currentCapCents: number;
  currentMicroCents: number;
  spentThisMonthCents: number;
}

const CAP_PRESETS = [0, 1000, 2500, 5000, 10000, 25000]; // $0 / 10 / 25 / 50 / 100 / 250
const MICRO_PRESETS = [200, 500, 1000]; // $2 / $5 / $10

export function AutoApproveCard({
  currentCapCents,
  currentMicroCents,
  spentThisMonthCents,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cap, setCap] = useState(currentCapCents);
  const [micro, setMicro] = useState(currentMicroCents);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = cap !== currentCapCents || micro !== currentMicroCents;

  const save = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        const res = await fetch("/api/billing/auto-approve", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ capCents: cap, microCents: micro }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setError(j?.reason ?? "Couldn't save settings.");
          return;
        }
        setSaved(true);
        router.refresh();
      } catch {
        setError("Network hiccup — please try again.");
      }
    });
  };

  return (
    <div className="glass rounded-2xl p-5 sm:p-6 space-y-5">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-cyan-500/15 text-cyan-300 flex items-center justify-center">
          <Settings2 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Auto top-up settings</h2>
          <p className="text-sm text-ink-300">
            When your task credits run low, Flo can auto-charge a small purchase
            so heavy work doesn&apos;t stall mid-flight. You set the ceiling — we
            never go over it without asking.
          </p>
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider text-ink-400 mb-2">
          Monthly auto-approve cap
        </label>
        <div className="flex flex-wrap gap-2">
          {CAP_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCap(c)}
              className={
                "text-sm px-3 py-1.5 rounded-md border transition " +
                (cap === c
                  ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-200"
                  : "bg-ink-900/40 border-white/10 text-ink-300 hover:border-white/20")
              }
            >
              {c === 0 ? "Off" : `$${(c / 100).toFixed(0)}/mo`}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-ink-400">
          Used so far this month: ${currency(spentThisMonthCents)}{cap > 0 ? ` of $${(cap / 100).toFixed(0)}` : ""}
        </p>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider text-ink-400 mb-2">
          Top-up size per purchase
        </label>
        <div className="flex flex-wrap gap-2">
          {MICRO_PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMicro(m)}
              className={
                "text-sm px-3 py-1.5 rounded-md border transition " +
                (micro === m
                  ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-200"
                  : "bg-ink-900/40 border-white/10 text-ink-300 hover:border-white/20")
              }
            >
              ${(m / 100).toFixed(0)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between border-t border-white/5 pt-4">
        <p className="flex items-start gap-2 text-xs text-ink-400">
          <ShieldCheck className="h-4 w-4 text-cyan-300 flex-shrink-0 mt-0.5" />
          Your card on file is charged in ${(micro / 100).toFixed(0)} increments.
          We email a receipt every time. Cancel auto-top-ups any time by setting cap to Off.
        </p>
        <div className="flex items-center gap-3">
          {saved && !pending && <span className="text-xs text-lead-400">Saved.</span>}
          {error && <span className="text-xs text-red-400">{error}</span>}
          <button
            type="button"
            disabled={!dirty || pending}
            onClick={save}
            className="btn-primary text-sm whitespace-nowrap disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
