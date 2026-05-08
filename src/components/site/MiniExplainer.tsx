"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeDollarSign,
  Bot,
  BriefcaseBusiness,
  CalendarCheck,
  Megaphone,
  PauseCircle,
  PlayCircle,
  Sparkles,
  Volume2,
} from "lucide-react";

export type MiniExplainerVariant = "home" | "challenge" | "book" | "services" | "consulting";

type ExplainerConfig = {
  eyebrow: string;
  title: string;
  frames: string[];
  script: string;
  ctaHref: string;
  ctaLabel: string;
  Icon: LucideIcon;
  accent: "cyan" | "orange" | "blue";
};

const EXPLAINERS: Record<MiniExplainerVariant, ExplainerConfig> = {
  home: {
    eyebrow: "60-second site guide",
    title: "Start with the move that gets you paid.",
    frames: [
      "The site is watching clicks, calls, shares, and service intent.",
      "Pick a service if you know what you need.",
      "Stump Ryan if you need a tool built inside your business.",
      "Book only if you are ready to decide the next move.",
    ],
    script:
      "This is The LeadFlow Pro. Ryan builds attention, lead flow, websites, automations, and business tools inside your accounts so the system belongs to you. If you already know the service, pick it. If you need a custom tool, stump Ryan. If you need ten minutes to decide, book the call.",
    ctaHref: "/start",
    ctaLabel: "Pick my next move",
    Icon: Sparkles,
    accent: "cyan",
  },
  challenge: {
    eyebrow: "How to use this page",
    title: "Describe the tool you wish existed.",
    frames: [
      "Move the sliders so Ryan can estimate exposure, hours, and build scope.",
      "Write the problem like a prompt: what happens, who does it, and what should happen instead.",
      "Submit it free, or put $250 down to reserve real build time.",
      "Ryan shapes the first useful version. You decide whether to buy, refine, or scrap it.",
    ],
    script:
      "Use this page to challenge Ryan with the tool your business needs. Move the sliders, describe the bottleneck, and tell him what the business would look like if the tool existed. Submit it free, or reserve the build slot if you want Ryan working on it now.",
    ctaHref: "#tool-challenge-form",
    ctaLabel: "Build the prompt",
    Icon: Bot,
    accent: "orange",
  },
  book: {
    eyebrow: "Before you pick a time",
    title: "Ten minutes should decide the lane.",
    frames: [
      "The calendar is for serious buyers, not free coaching.",
      "Ryan holds a buffer around calls so the work stays clean.",
      "Pick the reason first, then choose the calendar window.",
      "If you need a tool built, submit the challenge before the call.",
    ],
    script:
      "This page is simple on purpose. Pick the reason for the call, then pick a calendar window. The call is ten minutes because the goal is not a long free consultation. The goal is to decide the next move and whether Ryan should build with you.",
    ctaHref: "#calendar",
    ctaLabel: "Go to calendar",
    Icon: CalendarCheck,
    accent: "blue",
  },
  services: {
    eyebrow: "Social service guide",
    title: "Your accounts. Your leads. No percentage grab.",
    frames: [
      "Quick-Look is the low-cost entry point.",
      "Single-platform work fixes one channel at a time.",
      "Power Bundle runs the content rhythm across every major channel.",
      "Ads stay inside your account, your pixel, and your lead system.",
    ],
    script:
      "The social media page is built so you can choose quickly. Start with a Quick-Look if you want Ryan's eyes. Choose one platform if one channel matters most. Choose the bundle if you want the full rhythm. The account, leads, ads, and follow-up system stay in your hands.",
    ctaHref: "#service-options",
    ctaLabel: "Choose a service",
    Icon: Megaphone,
    accent: "cyan",
  },
  consulting: {
    eyebrow: "Consulting guide",
    title: "Pick the size of the business problem.",
    frames: [
      "Decision Sprint is for one stuck decision.",
      "Business Audit is for written clarity and leaks.",
      "Working Session ships one real deliverable.",
      "Build Sprint and retainers reserve deeper operator time.",
    ],
    script:
      "The consulting page is not a coaching menu. Pick the size of the problem. If one decision is stuck, use the Decision Sprint. If the business needs a written map, choose the audit. If something must get built, pick a working session or build sprint.",
    ctaHref: "#consulting-products",
    ctaLabel: "Pick the product",
    Icon: BriefcaseBusiness,
    accent: "orange",
  },
};

function getVisitorId() {
  const key = "leadflow_public_visitor_id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const next =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(key, next);
  return next;
}

function recordExplainerEvent(variant: MiniExplainerVariant, target: string) {
  if (typeof window === "undefined") return;

  fetch("/api/site-pulse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      visitorId: getVisitorId(),
      path: window.location.pathname,
      eventType: "chat_cta",
      source: "mini_explainer",
      target: `${variant}:${target}`,
      value: 1,
    }),
    keepalive: true,
  }).catch(() => {});
}

export function MiniExplainer({ variant, className = "" }: { variant: MiniExplainerVariant; className?: string }) {
  const config = EXPLAINERS[variant];
  const [frameIndex, setFrameIndex] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const activeFrame = config.frames[frameIndex] ?? config.frames[0];
  const Icon = config.Icon;

  const accentClasses = useMemo(() => {
    if (config.accent === "orange") {
      return {
        dot: "bg-accent-300",
        glow: "from-accent-400/35 via-cyan-300/20 to-transparent",
        button: "bg-accent-500 text-white hover:bg-accent-600",
        border: "border-accent-300/30",
      };
    }
    if (config.accent === "blue") {
      return {
        dot: "bg-blue-300",
        glow: "from-blue-400/35 via-cyan-300/20 to-transparent",
        button: "bg-cyan-500 text-slate-950 hover:bg-cyan-400",
        border: "border-cyan-300/30",
      };
    }
    return {
      dot: "bg-cyan-300",
      glow: "from-cyan-400/35 via-accent-300/20 to-transparent",
      button: "bg-cyan-400 text-slate-950 hover:bg-cyan-300",
      border: "border-cyan-300/30",
    };
  }, [config.accent]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFrameIndex((index) => (index + 1) % config.frames.length);
    }, 3600);
    return () => window.clearInterval(timer);
  }, [config.frames.length]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function toggleVoice() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(config.script);
    utterance.rate = 0.94;
    utterance.pitch = 0.92;
    utterance.volume = 1;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
    recordExplainerEvent(variant, "voice_play");
  }

  return (
    <aside
      className={`overflow-hidden rounded-2xl border ${accentClasses.border} bg-slate-950 text-white shadow-[0_20px_55px_-24px_rgba(15,23,42,0.75)] ${className}`}
      aria-label={`${config.eyebrow}: ${config.title}`}
    >
      <div className="grid grid-cols-[92px_1fr] gap-0 sm:grid-cols-[112px_1fr]">
        <div className="relative min-h-[150px] overflow-hidden border-r border-white/10 bg-slate-900">
          <div className={`absolute inset-0 bg-gradient-to-br ${accentClasses.glow}`} />
          <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />
          <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/30 animate-ping" />
          <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_22px_rgba(92,208,255,0.85)]" />
          <div className={`absolute left-5 top-6 h-2.5 w-2.5 rounded-full ${accentClasses.dot} animate-bounce`} />
          <div className="absolute right-5 top-10 h-2 w-2 rounded-full bg-white/80 animate-pulse" />
          <div className="absolute bottom-7 left-7 h-2 w-2 rounded-full bg-accent-300 animate-pulse" />
          <div className="absolute bottom-5 right-5 rounded-full border border-white/15 bg-white/10 p-2 backdrop-blur">
            <Icon className="h-5 w-5 text-cyan-100" />
          </div>
          <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 animate-spin rounded-full border border-transparent border-t-cyan-200/60 border-r-accent-200/40 [animation-duration:7s]" />
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100">
              <BadgeDollarSign className="h-3.5 w-3.5 text-accent-300" />
              {config.eyebrow}
            </div>
            <button
              type="button"
              onClick={toggleVoice}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/15"
            >
              {speaking ? <PauseCircle className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              {speaking ? "Stop" : "Hear it"}
            </button>
          </div>

          <h3 className="mt-2 text-lg font-semibold tracking-tight text-white sm:text-xl">
            {config.title}
          </h3>
          <p aria-live="polite" className="mt-2 min-h-[44px] text-sm leading-relaxed text-slate-200">
            {activeFrame}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link
              href={config.ctaHref}
              onClick={() => recordExplainerEvent(variant, "cta_click")}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold shadow-lg shadow-black/20 ${accentClasses.button}`}
            >
              {config.ctaLabel} <ArrowRight className="h-4 w-4" />
            </Link>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-slate-300">
              <PlayCircle className="h-3.5 w-3.5 text-cyan-200" />
              Auto captions
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
