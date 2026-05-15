"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  Clock3,
  MessageSquareText,
  PenLine,
  Radio,
  Sparkles,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type ToolTab = "leaks" | "followup" | "workload";

export function ClientOfficeTools() {
  const [tab, setTab] = useState<ToolTab>("leaks");

  return (
    <section id="tools" className="glass rounded-3xl border border-cyan-400/20 p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent-400/30 bg-accent-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-accent-300">
            <Sparkles className="h-3.5 w-3.5" /> Client tools
          </div>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-white">
            Use the office, do not just stare at it.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-300">
            These tools turn owner guesses into next actions Ryan can build around:
            leaks, follow-up, workload, and what to purchase next.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
          <ToolButton active={tab === "leaks"} onClick={() => setTab("leaks")} icon={Calculator} label="Leaks" />
          <ToolButton active={tab === "followup"} onClick={() => setTab("followup")} icon={MessageSquareText} label="Follow-up" />
          <ToolButton active={tab === "workload"} onClick={() => setTab("workload")} icon={Clock3} label="Workload" />
        </div>
      </div>

      <div className="mt-5">
        {tab === "leaks" && <LeadLeakTool />}
        {tab === "followup" && <FollowUpTool />}
        {tab === "workload" && <WorkloadTool />}
      </div>
    </section>
  );
}

function ToolButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Calculator;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-ink-950 shadow"
          : "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-ink-300 hover:bg-white/5 hover:text-white"
      }
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function LeadLeakTool() {
  const [leads, setLeads] = useState(20);
  const [missedPercent, setMissedPercent] = useState(25);
  const [closeRate, setCloseRate] = useState(18);
  const [value, setValue] = useState(750);

  const math = useMemo(() => {
    const missed = Math.round(leads * (missedPercent / 100));
    const recoveredSales = missed * (closeRate / 100);
    const monthlyLeak = recoveredSales * value * 4.33;
    return { missed, recoveredSales, monthlyLeak };
  }, [leads, missedPercent, closeRate, value]);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberInput label="Leads per week" value={leads} setValue={setLeads} min={0} max={500} />
        <NumberInput label="Missed / slow follow-up %" value={missedPercent} setValue={setMissedPercent} min={0} max={100} />
        <NumberInput label="Close rate %" value={closeRate} setValue={setCloseRate} min={0} max={100} />
        <NumberInput label="Average customer value" value={value} setValue={setValue} min={1} max={100000} prefix="$" />
      </div>
      <ToolResult
        eyebrow="Revenue leak estimate"
        title={`${formatCurrency(math.monthlyLeak)} / month`}
        body={`${math.missed} leads per week look exposed. If even ${math.recoveredSales.toFixed(1)} convert, the follow-up system matters now.`}
        cta="Build the recovery system"
        href="/stump-ryan"
      />
    </div>
  );
}

function FollowUpTool() {
  const [industry, setIndustry] = useState("your business");
  const [offer, setOffer] = useState("the thing they asked about");
  const [tone, setTone] = useState("direct");

  const script = [
    `First touch: "Hey, this is ${industry}. You asked about ${offer}. What is the best outcome you are trying to get from this?"`,
    `Second touch: "I do not want this sitting in your inbox. If you want it handled, reply with a time and I will tell you the cleanest next step."`,
    `Final touch: "Closing the loop here. If this still matters, reply 'move' and I will help you get it moving. If not, I will stop bugging you."`,
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        <TextInput label="Industry / business" value={industry} setValue={setIndustry} />
        <TextInput label="Offer / service" value={offer} setValue={setOffer} />
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">Voice</span>
          <select
            value={tone}
            onChange={(event) => setTone(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-ink-950/70 px-3 py-3 text-sm text-white outline-none focus:border-cyan-400"
          >
            <option value="direct">Direct</option>
            <option value="calm">Calm</option>
            <option value="owner">Owner-to-owner</option>
          </select>
        </label>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-300">
            Draft sequence - {tone}
          </p>
          <ol className="mt-3 space-y-3">
            {script.map((line, index) => (
              <li key={line} className="flex gap-3 text-sm leading-relaxed text-ink-100">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-400 text-xs font-bold text-ink-950">
                  {index + 1}
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <ToolResult
        eyebrow="Next move"
        title="Turn this into a real automation."
        body="The script is the start. The money is in connecting it to forms, calls, DMs, reminders, and owner approval."
        cta="Request the build blueprint"
        href="/stump-ryan"
      />
    </div>
  );
}

function WorkloadTool() {
  const [calls, setCalls] = useState(3);
  const [content, setContent] = useState(5);
  const [followups, setFollowups] = useState(20);
  const [systems, setSystems] = useState(1);

  const hours = useMemo(() => {
    return calls * 0.5 + content * 0.35 + followups * 0.08 + systems * 3;
  }, [calls, content, followups, systems]);

  const recommendation =
    hours < 2
      ? { label: "Quick-Look", href: "/offers/quick-look" }
      : hours < 6
        ? { label: "Decision Sprint", href: "/offers/decision-sprint" }
        : hours < 14
          ? { label: "Working Session", href: "/offers/working-session" }
          : { label: "Monthly Operator", href: "/offers/monthly-operator" };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberInput label="Calls / meetings this week" value={calls} setValue={setCalls} min={0} max={100} />
        <NumberInput label="Posts / clips needed" value={content} setValue={setContent} min={0} max={200} />
        <NumberInput label="Follow-ups needed" value={followups} setValue={setFollowups} min={0} max={1000} />
        <NumberInput label="Systems / pages to build" value={systems} setValue={setSystems} min={0} max={50} />
      </div>
      <ToolResult
        eyebrow="Owner workload"
        title={`${hours.toFixed(1)} hrs/week exposed`}
        body={`This points toward ${recommendation.label}. The goal is to move repeatable work out of your head and into a system you own.`}
        cta={`Open ${recommendation.label}`}
        href={recommendation.href}
      />
    </div>
  );
}

function NumberInput({
  label,
  value,
  setValue,
  min,
  max,
  prefix,
}: {
  label: string;
  value: number;
  setValue: (value: number) => void;
  min: number;
  max: number;
  prefix?: string;
}) {
  return (
    <label className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">{label}</span>
      <div className="mt-3 flex items-center gap-3">
        {prefix && <span className="text-sm font-bold text-cyan-300">{prefix}</span>}
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(event) => setValue(Number(event.target.value))}
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-ink-950/70 px-3 py-3 text-lg font-bold text-white outline-none focus:border-cyan-400"
        />
      </div>
    </label>
  );
}

function TextInput({
  label,
  value,
  setValue,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="mt-2 w-full rounded-xl border border-white/10 bg-ink-950/70 px-3 py-3 text-sm text-white outline-none placeholder:text-ink-500 focus:border-cyan-400"
      />
    </label>
  );
}

function ToolResult({
  eyebrow,
  title,
  body,
  cta,
  href,
}: {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  href: string;
}) {
  return (
    <aside className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-accent-500 text-white">
        <Radio className="h-5 w-5" />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-cyan-200">{eyebrow}</p>
      <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-white">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-ink-200">{body}</p>
      <Link href={href} className="btn-accent mt-5 w-full text-sm">
        {cta} <ArrowRight className="h-4 w-4" />
      </Link>
      <Link
        href="/dashboard/work"
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5"
      >
        Add this to a work note <PenLine className="h-4 w-4" />
      </Link>
    </aside>
  );
}
