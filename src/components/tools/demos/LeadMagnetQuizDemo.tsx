"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Lightbulb, Sparkles } from "lucide-react";

type BusinessType =
  | "local-service"
  | "coach-consultant"
  | "ecommerce"
  | "agency-creator";

type LeakType =
  | "missed-calls"
  | "slow-followup"
  | "no-traffic"
  | "no-conversion";

type RevenueBand = "0-10k" | "10-50k" | "50-200k" | "200k-plus";

const BUSINESS_OPTIONS: Array<{ id: BusinessType; label: string; sub: string }> = [
  { id: "local-service", label: "Local service business", sub: "Contractor, cleaner, repair, med spa, dental" },
  { id: "coach-consultant", label: "Coach or consultant", sub: "Fitness, life, biz, niche expertise" },
  { id: "ecommerce", label: "E-commerce / product", sub: "DTC, Shopify, physical goods" },
  { id: "agency-creator", label: "Agency or creator", sub: "Service agency, course, content brand" },
];

const LEAK_OPTIONS: Array<{ id: LeakType; label: string; sub: string }> = [
  { id: "missed-calls", label: "Missed calls / slow phone reply", sub: "Buyers ghost while we're working" },
  { id: "slow-followup", label: "Lead follow-up falls through cracks", sub: "We get leads, we lose them" },
  { id: "no-traffic", label: "Not enough buyers at the top", sub: "The site is fine, nobody sees it" },
  { id: "no-conversion", label: "Plenty of traffic, no conversions", sub: "Visitors come, visitors leave" },
];

const REVENUE_OPTIONS: Array<{ id: RevenueBand; label: string; sub: string }> = [
  { id: "0-10k", label: "Under $10k / mo", sub: "Early stage" },
  { id: "10-50k", label: "$10k - $50k / mo", sub: "Growing" },
  { id: "50-200k", label: "$50k - $200k / mo", sub: "Scaling" },
  { id: "200k-plus", label: "$200k+ / mo", sub: "Mature" },
];

const LEAK_PERCENTAGES: Record<LeakType, number> = {
  "missed-calls": 0.18,
  "slow-followup": 0.22,
  "no-traffic": 0.12,
  "no-conversion": 0.27,
};

const LEAK_LABEL: Record<LeakType, string> = {
  "missed-calls": "missed calls",
  "slow-followup": "slow lead follow-up",
  "no-traffic": "thin top-of-funnel traffic",
  "no-conversion": "low conversion on the site you already have",
};

const REVENUE_MIDPOINT_USD: Record<RevenueBand, number> = {
  "0-10k": 5000,
  "10-50k": 30000,
  "50-200k": 120000,
  "200k-plus": 300000,
};

const FIX_BY_LEAK: Record<LeakType, { headline: string; body: string }> = {
  "missed-calls": {
    headline: "Wire up the Missed-Call Rescue.",
    body: "Every missed call becomes a 15-second text-back. Buyers who'd have ghosted reply instead. Owners typically recover 1-3 jobs a week from this alone.",
  },
  "slow-followup": {
    headline: "Set up the Owner Dashboard + auto-prioritized lead inbox.",
    body: "One screen ranks who to call back first based on how hot the lead is. Stops the 'I meant to text them back' loop.",
  },
  "no-traffic": {
    headline: "Run the Lead Leak Audit and start a single-channel content engine.",
    body: "We pick the platform where your buyer actually scrolls and post the angle they'd stop for. No 'omnichannel'.",
  },
  "no-conversion": {
    headline: "Drop in the Instant Quote Tool or the Lead Magnet Quiz.",
    body: "Visitors play with a calculator or take a 90-second quiz, then leave their info because they want the personalized result.",
  },
};

type Step = 0 | 1 | 2 | 3 | 4; // 0-2: questions, 3: capture, 4: revealed

export function LeadMagnetQuizDemo() {
  const [step, setStep] = useState<Step>(0);
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [leak, setLeak] = useState<LeakType | null>(null);
  const [revenue, setRevenue] = useState<RevenueBand | null>(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const monthlyRevenue = revenue ? REVENUE_MIDPOINT_USD[revenue] : 0;
  const leakPct = leak ? LEAK_PERCENTAGES[leak] : 0;
  const estimatedLeak = Math.round(monthlyRevenue * leakPct);

  const result = useMemo(() => {
    if (!leak || !revenue) return null;
    return {
      headline: `Your ~$${monthlyRevenue.toLocaleString("en-US")}/mo business is losing roughly $${estimatedLeak.toLocaleString("en-US")}/mo to ${LEAK_LABEL[leak]}.`,
      fix: FIX_BY_LEAK[leak],
    };
  }, [leak, revenue, monthlyRevenue, estimatedLeak]);

  function selectBusiness(id: BusinessType) {
    setBusinessType(id);
    setStep(1);
  }
  function selectLeak(id: LeakType) {
    setLeak(id);
    setStep(2);
  }
  function selectRevenue(id: RevenueBand) {
    setRevenue(id);
    setStep(3);
  }

  function onReveal(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    setSubmitting(true);
    // We don't POST anywhere in the demo — the email capture IS the
    // conversion event for the real version. In production this routes to
    // the dashboard. Keep it client-side here.
    setTimeout(() => {
      setSubmitting(false);
      setStep(4);
    }, 400);
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-700">
          <Sparkles className="h-3.5 w-3.5" /> Quiz preview
        </div>
        <StepIndicator step={step} />
      </div>

      {step === 0 ? (
        <Question
          title="What kind of business?"
          subtitle="Pick the closest match — the result tailors to this."
        >
          <OptionGrid>
            {BUSINESS_OPTIONS.map((opt) => (
              <OptionCard
                key={opt.id}
                label={opt.label}
                sub={opt.sub}
                selected={businessType === opt.id}
                onClick={() => selectBusiness(opt.id)}
              />
            ))}
          </OptionGrid>
        </Question>
      ) : null}

      {step === 1 ? (
        <Question
          title="What's your biggest leak right now?"
          subtitle="One answer. The thing that bugs you most."
        >
          <OptionGrid>
            {LEAK_OPTIONS.map((opt) => (
              <OptionCard
                key={opt.id}
                label={opt.label}
                sub={opt.sub}
                selected={leak === opt.id}
                onClick={() => selectLeak(opt.id)}
              />
            ))}
          </OptionGrid>
        </Question>
      ) : null}

      {step === 2 ? (
        <Question
          title="What's your monthly revenue?"
          subtitle="Rough estimate. We use it to size the leak."
        >
          <OptionGrid>
            {REVENUE_OPTIONS.map((opt) => (
              <OptionCard
                key={opt.id}
                label={opt.label}
                sub={opt.sub}
                selected={revenue === opt.id}
                onClick={() => selectRevenue(opt.id)}
              />
            ))}
          </OptionGrid>
        </Question>
      ) : null}

      {step === 3 ? (
        <div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Your result is ready
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              Drop your email and we'll reveal the leak size and the first fix.
              The email is the conversion event — that's the whole point of this tool.
            </p>
          </div>

          <form onSubmit={onReveal} className="mt-4 space-y-3">
            <label className="block">
              <span className="text-sm font-bold text-slate-800">Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                placeholder="you@business.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? "Revealing…" : "Reveal my result"}
              {submitting ? null : <ArrowRight className="h-4 w-4" />}
            </button>
            <p className="text-xs leading-5 text-slate-500">
              Demo only — email isn't stored. Your real version captures it to your
              dashboard and routes a result-specific follow-up automatically.
            </p>
          </form>
        </div>
      ) : null}

      {step === 4 && result ? (
        <div>
          <div className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-accent-50 p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Your result
            </div>
            <h3 className="mt-2 text-xl font-bold leading-snug text-slate-950">
              {result.headline}
            </h3>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-900/10 bg-slate-950 p-5 text-white">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-200">
              <Lightbulb className="h-3.5 w-3.5" /> First fix
            </div>
            <h4 className="mt-2 text-lg font-bold">{result.fix.headline}</h4>
            <p className="mt-2 text-sm leading-6 text-slate-200">{result.fix.body}</p>
          </div>

          <button
            type="button"
            onClick={() => {
              setStep(0);
              setBusinessType(null);
              setLeak(null);
              setRevenue(null);
              setEmail("");
            }}
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-cyan-700 hover:text-cyan-900"
          >
            Reset the quiz
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Question({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mt-3 text-xl font-bold leading-snug text-slate-950 sm:text-2xl">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function OptionGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

function OptionCard({
  label,
  sub,
  selected,
  onClick,
}: {
  label: string;
  sub: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-2xl border p-4 transition ${
        selected
          ? "border-cyan-400 bg-cyan-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-cyan-300 hover:shadow-sm"
      }`}
    >
      <div className="text-sm font-bold text-slate-950">{label}</div>
      <div className="mt-1 text-xs leading-5 text-slate-600">{sub}</div>
    </button>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const totalDots = 4; // q1, q2, q3, capture
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: totalDots }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 w-6 rounded-full ${
            step > i || (step === 4 && i === 3) ? "bg-cyan-600" : i === step ? "bg-cyan-300" : "bg-slate-200"
          }`}
        />
      ))}
    </div>
  );
}
