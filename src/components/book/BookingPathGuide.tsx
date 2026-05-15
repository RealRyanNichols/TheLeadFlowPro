"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Bot, BriefcaseBusiness, CalendarCheck, MessageSquareText, Wrench } from "lucide-react";

const PATHS = [
  {
    key: "build",
    label: "Build me a tool",
    Icon: Wrench,
    prompt: "I have a business problem and I want Ryan to build the tool, dashboard, or automation that fixes it.",
    direction: "Book the call if you can explain the problem in ten minutes. Use Stump Ryan if you want the free blueprint first.",
    primaryHref: "#calendar-frame",
    primaryLabel: "Pick my time",
    secondaryHref: "/stump-ryan#tool-challenge-form",
    secondaryLabel: "Submit the tool first",
  },
  {
    key: "social",
    label: "Fix my lead flow",
    Icon: BriefcaseBusiness,
    prompt: "I need social, content, follow-up, ads, or a customer path that turns attention into conversations.",
    direction: "Book the call if you are serious about a paid 30, 60, or 90-day buildout. Ryan will tell you the cleanest next move.",
    primaryHref: "#calendar-frame",
    primaryLabel: "Pick my time",
    secondaryHref: "/services",
    secondaryLabel: "See social offers",
  },
  {
    key: "direction",
    label: "Tell me where to start",
    Icon: MessageSquareText,
    prompt: "I know something is leaking, but I am not sure if I need a call, audit, tool, or larger buildout.",
    direction: "Use the router if you want the site to narrow the path before you book. Book the call only if you are ready to act.",
    primaryHref: "/start",
    primaryLabel: "Use the router",
    secondaryHref: "#calendar-frame",
    secondaryLabel: "Still book the call",
  },
] as const;

export function BookingPathGuide() {
  const [activeKey, setActiveKey] = useState<(typeof PATHS)[number]["key"]>("build");
  const active = PATHS.find((path) => path.key === activeKey) ?? PATHS[0];

  return (
    <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-950 p-3 text-white shadow-[0_18px_45px_-32px_rgba(15,23,42,0.8)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-cyan-100">
            <Bot className="h-3.5 w-3.5" /> Call guide
          </div>
          <h3 className="mt-2 text-lg font-semibold tracking-tight">Pick why you are here. The next click becomes obvious.</h3>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-slate-300">
          <CalendarCheck className="h-3.5 w-3.5 text-accent-200" />
          Calendar is ready
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {PATHS.map(({ key, label, Icon }) => {
          const selected = key === activeKey;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveKey(key)}
              className={`min-h-12 rounded-xl border px-3 text-left text-sm font-semibold transition active:scale-[0.98] ${
                selected
                  ? "border-cyan-300 bg-cyan-300/15 text-white"
                  : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-300/40"
              }`}
            >
              <span className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${selected ? "text-cyan-100" : "text-slate-400"}`} />
                {label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-cyan-100">Say this on the call</div>
        <p className="mt-1 text-sm leading-relaxed text-slate-100">{active.prompt}</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">{active.direction}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Link
            href={active.primaryHref}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-600"
          >
            {active.primaryLabel} <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={active.secondaryHref}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.08] px-4 py-2 text-sm font-semibold text-white hover:bg-white/[0.12]"
          >
            {active.secondaryLabel} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
