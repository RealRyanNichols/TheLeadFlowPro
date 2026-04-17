"use client";

import { useState } from "react";
import NextLink from "next/link";
import {
  CheckCircle2, Circle, Copy, Clock, Radar, Hand, Trophy, Pause,
  ArrowRight, Sparkles, RotateCcw
} from "lucide-react";
import type { Playbook, NextMove, VerifyKind } from "@/lib/playbooks";
import { cn } from "@/lib/utils";

type HistoryEntry = {
  stepId: string;
  situation: string;
  chosenMoveLabel: string;
  chosenVibe: NextMove["vibe"];
  verifiedAt: string;
};

const VIBE_STYLES: Record<NextMove["vibe"], string> = {
  good:    "border-lead-500/40 hover:border-lead-500 hover:bg-lead-500/5",
  neutral: "border-cyan-500/30 hover:border-cyan-500 hover:bg-cyan-500/5",
  bad:     "border-red-500/30 hover:border-red-500 hover:bg-red-500/5",
  bold:    "border-accent-500/40 hover:border-accent-500 hover:bg-accent-500/5"
};

const VIBE_PILL: Record<NextMove["vibe"], string> = {
  good:    "bg-lead-500/15 text-lead-400 border-lead-500/30",
  neutral: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  bad:     "bg-red-500/15 text-red-400 border-red-500/30",
  bold:    "bg-accent-500/15 text-accent-400 border-accent-500/30"
};

const VIBE_LABEL: Record<NextMove["vibe"], string> = {
  good:    "Safe bet",
  neutral: "Worth a shot",
  bad:     "Emergency",
  bold:    "Bold move"
};

const VERIFY_ICON: Record<VerifyKind, any> = {
  auto:  Radar,
  self:  Hand,
  timer: Clock
};

const VERIFY_LABEL: Record<VerifyKind, string> = {
  auto:  "Auto-verified",
  self:  "Self-reported",
  timer: "Timer-gated"
};

export function PlaybookRunner({ playbook }: { playbook: Playbook }) {
  const [currentStepId, setCurrentStepId] = useState(playbook.rootStepId);
  const [pendingMove, setPendingMove] = useState<NextMove | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [copied, setCopied] = useState(false);

  const step = playbook.steps[currentStepId];
  if (!step) return null;

  const VerifyIcon = VERIFY_ICON[step.verify];
  const isTerminal = !!step.terminal;

  function pickMove(m: NextMove) {
    setPendingMove(m);
  }

  function confirmCompleted() {
    if (!pendingMove) return;
    setVerifying(true);

    // Simulate the verification call. In a real env, this hits your data
    // layer (Lead Inbox for outbound texts, Instagram API for story posts,
    // call logs for verified calls, etc).
    const delay = step.verify === "auto" ? 1200 : 400;
    setTimeout(() => {
      setHistory((h) => [
        ...h,
        {
          stepId: step.id,
          situation: step.situation,
          chosenMoveLabel: pendingMove.label,
          chosenVibe: pendingMove.vibe,
          verifiedAt: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
        }
      ]);
      setCurrentStepId(pendingMove.id);
      setPendingMove(null);
      setVerifying(false);
    }, delay);
  }

  function cancelPending() {
    setPendingMove(null);
  }

  function restart() {
    setCurrentStepId(playbook.rootStepId);
    setHistory([]);
    setPendingMove(null);
  }

  function copyScript() {
    if (!step.script) return;
    navigator.clipboard.writeText(step.script);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      {/* MAIN COLUMN */}
      <div className="space-y-6 min-w-0">
        {/* Current situation */}
        <div className="glass rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="stat-pill bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-[11px]">
              Step {history.length + 1}
            </span>
            {!isTerminal && (
              <span className="stat-pill bg-white/5 border border-white/10 text-[11px] text-ink-200">
                <VerifyIcon className="h-3 w-3" /> {VERIFY_LABEL[step.verify]}
              </span>
            )}
            {step.terminal === "win" && (
              <span className="stat-pill bg-lead-500/15 text-lead-400 border border-lead-500/30 text-[11px]">
                <Trophy className="h-3 w-3" /> Playbook complete
              </span>
            )}
            {step.terminal === "pause" && (
              <span className="stat-pill bg-accent-500/15 text-accent-400 border border-accent-500/30 text-[11px]">
                <Pause className="h-3 w-3" /> Paused
              </span>
            )}
          </div>

          <h2 className="mt-3 text-xl sm:text-2xl font-bold text-white leading-tight">
            {step.situation}
          </h2>
          <p className="mt-2 text-sm text-ink-300">{step.why}</p>

          {step.action && (
            <div className="mt-4 glass rounded-xl p-3 border-l-2 border-cyan-500/60">
              <p className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold">
                The action
              </p>
              <p className="mt-1 text-sm text-ink-100">{step.action}</p>
            </div>
          )}

          {step.script && (
            <div className="mt-3 glass rounded-xl p-3 border-l-2 border-accent-500">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-wider text-accent-400 font-semibold">
                  Copy-paste script
                </p>
                <button
                  onClick={copyScript}
                  className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
                >
                  <Copy className="h-3 w-3" /> {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="mt-2 text-sm text-ink-100 whitespace-pre-wrap font-sans">
{step.script}
              </pre>
            </div>
          )}

          {!isTerminal && (
            <p className="mt-3 text-[11px] text-ink-400 flex items-center gap-1.5">
              <VerifyIcon className="h-3 w-3 text-cyan-400" />
              {step.verifyHint}
            </p>
          )}
        </div>

        {/* Next moves */}
        {!isTerminal && step.moves.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              Pick your next move — each one rewrites what comes after
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {step.moves.map((m) => {
                const pending = pendingMove?.id === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => pickMove(m)}
                    disabled={verifying || (!!pendingMove && !pending)}
                    className={cn(
                      "glass rounded-2xl p-4 text-left border-2 transition active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed",
                      pending
                        ? "border-cyan-500 bg-cyan-500/5"
                        : VIBE_STYLES[m.vibe]
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span
                        className={
                          "stat-pill border text-[10px] " + VIBE_PILL[m.vibe]
                        }
                      >
                        {VIBE_LABEL[m.vibe]}
                      </span>
                      {pending && (
                        <span className="text-[10px] text-cyan-400 font-semibold">
                          Selected
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-bold text-white">{m.label}</p>
                    {m.detail && (
                      <p className="mt-1 text-xs text-ink-300">{m.detail}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Confirm bar */}
        {pendingMove && !verifying && (
          <div className="glass-strong rounded-2xl p-4 sm:p-5 border border-cyan-500/40">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
                <VerifyIcon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wider text-cyan-400 font-semibold">
                  Confirm this actually happened
                </p>
                <p className="text-sm text-white mt-1 font-semibold">
                  {pendingMove.label}
                </p>
                <p className="text-xs text-ink-300 mt-1">{step.verifyHint}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={confirmCompleted} className="btn-accent text-sm py-2 px-4 flex-1">
                <CheckCircle2 className="h-4 w-4" /> I did it — verify
              </button>
              <button onClick={cancelPending} className="btn-ghost text-sm py-2 px-4">
                Pick a different move
              </button>
            </div>
          </div>
        )}

        {verifying && (
          <div className="glass-strong rounded-2xl p-5 border border-cyan-500/40 flex items-center gap-3">
            <Radar className="h-5 w-5 text-cyan-400 animate-pulse" />
            <div>
              <p className="text-sm font-bold text-white">Verifying…</p>
              <p className="text-xs text-ink-300">
                Checking your data for evidence this move actually happened.
              </p>
            </div>
          </div>
        )}

        {/* Terminal state footer */}
        {isTerminal && (
          <div className="flex flex-wrap gap-2">
            <button onClick={restart} className="btn-ghost text-sm py-2 px-4">
              <RotateCcw className="h-4 w-4" /> Run this playbook again
            </button>
            <NextLink href="/dashboard/playbooks" className="btn-primary text-sm py-2 px-4">
              Browse other plays <ArrowRight className="h-4 w-4" />
            </NextLink>
          </div>
        )}
      </div>

      {/* TIMELINE */}
      <aside className="space-y-3">
        <h3 className="text-xs uppercase tracking-wider text-ink-400 font-semibold">
          Your timeline
        </h3>
        <div className="glass rounded-2xl p-4 space-y-3">
          {history.length === 0 && (
            <p className="text-xs text-ink-400">
              Nothing yet. Pick your first move.
            </p>
          )}
          {history.map((h, i) => (
            <div key={i} className="flex gap-2.5">
              <div className="flex flex-col items-center shrink-0">
                <CheckCircle2 className="h-4 w-4 text-lead-400" />
                {i < history.length - 1 && (
                  <div className="w-px flex-1 bg-white/10 mt-1" />
                )}
              </div>
              <div className="min-w-0 pb-2">
                <p className="text-xs text-ink-400">Step {i + 1} · {h.verifiedAt}</p>
                <p className="text-sm text-white font-semibold truncate">
                  {h.chosenMoveLabel}
                </p>
              </div>
            </div>
          ))}
          {!isTerminal && (
            <div className="flex gap-2.5 pt-1">
              <Circle className="h-4 w-4 text-cyan-400 shrink-0" />
              <div>
                <p className="text-xs text-cyan-400">In progress</p>
                <p className="text-sm text-white">Pick your next move</p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

