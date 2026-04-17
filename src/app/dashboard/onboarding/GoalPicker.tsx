"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Target, CheckCircle2, Circle, ArrowRight, Clock, Sparkles, RefreshCw
} from "lucide-react";
import { GOALS, planFor, type OnboardingGoal, type Step } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

export function GoalPicker({ firstName }: { firstName: string }) {
  const [goal, setGoal] = useState<OnboardingGoal | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});

  const plan = goal ? planFor(goal) : null;
  const completed = plan ? plan.steps.filter((s) => done[s.id]).length : 0;
  const total = plan?.steps.length ?? 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  function toggle(id: string) {
    setDone((x) => ({ ...x, [id]: !x[id] }));
  }
  function reset() {
    setGoal(null);
    setDone({});
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-cyan-400 font-semibold flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" /> Step 2 of 2
        </p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-white flex items-center gap-2 flex-wrap">
          <Target className="h-6 w-6 text-cyan-400" /> Nice to meet you, {firstName}.
        </h1>
        <p className="text-sm text-ink-300 mt-1">
          Pick the one outcome you care about this week. We'll hand you the exact
          5-step plan — no feature tour, no busywork.
        </p>
      </div>

      {!plan && (
        <div className="grid gap-3 sm:grid-cols-2">
          {GOALS.map((g) => (
            <button
              key={g.id}
              onClick={() => setGoal(g.id)}
              className="glass rounded-2xl p-5 text-left hover:border-cyan-500/30 border border-transparent transition group"
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl shrink-0">{g.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-white">{g.headline}</p>
                  <p className="text-xs text-ink-300 mt-1">{g.subhead}</p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-cyan-400 group-hover:text-cyan-300">
                    See my plan <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {plan && (
        <>
          {/* Plan header */}
          <div className="glass-strong rounded-2xl p-5 sm:p-6 border border-cyan-500/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-promo-glow opacity-30 -z-10" />
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3 min-w-0">
                <span className="text-3xl shrink-0">{plan.emoji}</span>
                <div className="min-w-0">
                  <p className="text-xs text-cyan-400 font-semibold uppercase tracking-wider">
                    Your goal
                  </p>
                  <h2 className="text-xl font-bold text-white mt-0.5">{plan.headline}</h2>
                  <p className="text-sm text-ink-300 mt-1">{plan.subhead}</p>
                </div>
              </div>
              <button
                onClick={reset}
                className="btn-ghost text-xs py-2 px-3 shrink-0 flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Pick a different goal
              </button>
            </div>

            {/* Progress */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-ink-300 font-semibold">
                  {completed} / {total} done
                </p>
                <p className="text-xs text-cyan-400 font-semibold">{pct}%</p>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-lead-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {completed === total && total > 0 && (
              <div className="mt-4 rounded-xl bg-lead-500/10 border border-lead-500/30 p-3 flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-lead-400 shrink-0 mt-0.5" />
                <p className="text-sm text-ink-100">
                  <span className="text-white font-semibold">Nice.</span>{" "}
                  That's the whole plan. Head to the{" "}
                  <Link href="/dashboard" className="text-cyan-400 underline">
                    Overview
                  </Link>{" "}
                  and look for the next moves.
                </p>
              </div>
            )}
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {plan.steps.map((step, i) => (
              <StepRow
                key={step.id}
                step={step}
                index={i}
                done={!!done[step.id]}
                onToggle={() => toggle(step.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StepRow({ step, index, done, onToggle }: {
  step: Step; index: number; done: boolean; onToggle: () => void;
}) {
  return (
    <div className={cn(
      "glass rounded-2xl p-4 flex items-start gap-3 transition border",
      done ? "border-lead-500/30 bg-lead-500/[0.04]" : "border-transparent"
    )}>
      <button
        onClick={onToggle}
        aria-label={done ? "Mark incomplete" : "Mark complete"}
        className="shrink-0 mt-0.5"
      >
        {done
          ? <CheckCircle2 className="h-6 w-6 text-lead-400" />
          : <Circle className="h-6 w-6 text-ink-500 hover:text-cyan-400 transition" />
        }
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <p className={cn(
            "text-sm font-semibold",
            done ? "text-ink-400 line-through" : "text-white"
          )}>
            Step {index + 1} · {step.label}
          </p>
          <span className="text-[11px] text-ink-400 flex items-center gap-1 shrink-0">
            <Clock className="h-3 w-3" /> {step.estMinutes} min
          </span>
        </div>
        <p className="text-xs text-ink-300 mt-1">{step.why}</p>
        {!done && (
          <Link
            href={step.href}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
          >
            {step.cta} <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
