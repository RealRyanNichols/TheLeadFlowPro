// src/app/onboarding/page.tsx
// The Profile-Gate. Conversational coach-voice flow. NO skip button.
// No tool, no dashboard, no industry content unlocks until this hits 80%.
//
// Ryan rule (2026-04-17): "They can't see the rest of the tools until they build
// their personal profile. They WILL get overwhelmed if they see anything without
// their information inputed."

"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ArrowLeft, Check, Sparkles, Lock } from "lucide-react";

type StepKind = "mcq" | "mcq-grid" | "text-short" | "text-long" | "state-picker";

type Step = {
  slot: string;           // maps to BrainProfile column
  kind: StepKind;
  title: string;          // the question
  hint?: string;          // coach-voice context
  placeholder?: string;
  options?: { value: string; label: string; sub?: string; emoji?: string }[];
  maxLength?: number;
};

const STEPS: Step[] = [
  {
    slot: "industry",
    kind: "mcq-grid",
    title: "Alright. First question — what kind of business do you run?",
    hint: "Pick the one that fits best. If you do two things, pick the one you make more money on.",
    options: [
      { value: "home_services",      label: "Home services",         sub: "HVAC, plumbing, roofing, electrical, landscaping",  emoji: "🔧" },
      { value: "auto_services",      label: "Auto services",         sub: "Detailing, repair, body shop, mobile",               emoji: "🚗" },
      { value: "beauty_wellness",    label: "Beauty & wellness",     sub: "Salon, barber, nails, lashes, spa",                  emoji: "💇" },
      { value: "medical_dental",     label: "Medical & dental",      sub: "Dentist, chiro, physical therapy, clinic",           emoji: "🦷" },
      { value: "fitness_coaching",   label: "Fitness & coaching",    sub: "Gym, trainer, life coach, nutritionist",             emoji: "💪" },
      { value: "food_beverage",      label: "Food & beverage",       sub: "Restaurant, food truck, catering, bakery",           emoji: "🍽️" },
      { value: "cleaning",           label: "Cleaning services",     sub: "Residential, commercial, move-out, carpet",          emoji: "🧽" },
      { value: "retail",             label: "Retail store",          sub: "Brick-and-mortar shop, boutique, local store",        emoji: "🛍️" },
      { value: "ecommerce",          label: "E-commerce / online",   sub: "DTC, Shopify, Amazon, Etsy",                          emoji: "📦" },
      { value: "professional",       label: "Professional services", sub: "Accountant, lawyer, consultant, agency",              emoji: "💼" },
      { value: "education",          label: "Education & tutoring",  sub: "Teacher, tutor, academy, coach",                      emoji: "📚" },
      { value: "events",             label: "Events & creative",     sub: "Photography, planning, DJ, videography",              emoji: "📸" },
      { value: "real_estate",        label: "Real estate",           sub: "Agent, broker, investor",                             emoji: "🏡" },
      { value: "other",              label: "Something else",        sub: "We'll ask you in a sec",                              emoji: "✨" },
    ],
  },
  {
    slot: "subIndustry",
    kind: "text-short",
    title: "Got it. What specifically?",
    hint: "Two or three words is enough. Example: \"HVAC\" or \"hair salon\" or \"tax prep\".",
    placeholder: "e.g. hair salon, HVAC, tutoring",
    maxLength: 80,
  },
  {
    slot: "city",
    kind: "text-short",
    title: "Where do you work from?",
    hint: "Your main city. If you serve a whole region, pick the city you're based in.",
    placeholder: "e.g. Longview",
    maxLength: 60,
  },
  {
    slot: "state",
    kind: "state-picker",
    title: "What state?",
    hint: "We use this to match you with patterns from businesses near you.",
  },
  {
    slot: "teamSize",
    kind: "mcq",
    title: "How big is your team right now?",
    hint: "Including you. No judgement either way — solo is 100% legit.",
    options: [
      { value: "solo",        label: "Just me",                sub: "Solo operator" },
      { value: "small",       label: "2–5 people",             sub: "Small crew" },
      { value: "growing",     label: "6–20 people",            sub: "Growing shop" },
      { value: "established", label: "21+",                    sub: "Established team" },
    ],
  },
  {
    slot: "avgCustomerValue",
    kind: "mcq",
    title: "What's the average value of one customer transaction?",
    hint: "First job, not lifetime. Ballpark is fine.",
    options: [
      { value: "under_50",   label: "Under $50",        sub: "High volume, small ticket" },
      { value: "50_200",     label: "$50 – $200",       sub: "Mid-ticket services" },
      { value: "200_500",    label: "$200 – $500",      sub: "Premium services" },
      { value: "500_2000",   label: "$500 – $2,000",    sub: "High-ticket" },
      { value: "over_2000",  label: "Over $2,000",      sub: "Enterprise / luxury" },
    ],
  },
  {
    slot: "idealCustomer",
    kind: "text-long",
    title: "Describe your ideal customer in one or two sentences.",
    hint: "Who do you serve best? Age range, life stage, pain point — whatever's honest. This shapes every recommendation.",
    placeholder: "e.g. Women 35–55 in a 5-mile radius, busy professionals who want convenience, responds to 'save time' more than 'save money.'",
    maxLength: 400,
  },
  {
    slot: "topFrustration",
    kind: "mcq",
    title: "What's getting in your way the most right now?",
    hint: "One answer. The thing that bugs you every week.",
    options: [
      { value: "not_enough_leads",   label: "Not enough leads coming in",  emoji: "📉" },
      { value: "slow_follow_up",     label: "Can't follow up fast enough", emoji: "⏰" },
      { value: "dont_know_works",    label: "Don't know what's actually working",  emoji: "❓" },
      { value: "missing_calls",      label: "Missing calls, texts, DMs",   emoji: "📵" },
      { value: "too_many_tools",     label: "Too many tools, not enough time", emoji: "🧰" },
      { value: "burnout",            label: "Just burned out, honestly",   emoji: "😮‍💨" },
    ],
  },
  {
    slot: "topGoal90d",
    kind: "mcq",
    title: "If the next 90 days went great, what would be true?",
    hint: "Pick the one you'd notice most.",
    options: [
      { value: "more_leads",       label: "Double my leads",         emoji: "🚀" },
      { value: "better_close",     label: "Close a higher % of the leads I already get", emoji: "🎯" },
      { value: "cut_ad_spend",     label: "Cut my ad spend in half", emoji: "✂️" },
      { value: "add_team",         label: "Add a team member",       emoji: "👥" },
      { value: "automate_follow",  label: "Automate follow-up",      emoji: "🤖" },
      { value: "launch_new",       label: "Launch a new service",    emoji: "✨" },
    ],
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const params = useSearchParams();
  const cameFromGate = params.get("why") === "profile_required";

  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [completeness, setCompleteness] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const hydrated = useRef(false);

  // Hydrate from server: if the user already started onboarding, resume where they left off.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    (async () => {
      try {
        const res = await fetch("/api/onboarding", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        const prof = data.profile || {};
        const seeded: Record<string, string> = {};
        for (const s of STEPS) {
          if (prof[s.slot]) seeded[s.slot] = prof[s.slot];
        }
        setAnswers(seeded);
        setCompleteness(data.completeness ?? 0);
        setUnlocked(data.unlocked ?? false);
        // Jump to first unanswered step
        const firstMissing = STEPS.findIndex((s) => !seeded[s.slot]);
        setStepIdx(firstMissing === -1 ? STEPS.length - 1 : firstMissing);
      } catch { /* ignore */ }
    })();
  }, []);

  const step = STEPS[stepIdx];
  const totalSteps = STEPS.length;
  const progressPct = Math.round(((stepIdx + 1) / totalSteps) * 100);

  async function saveAnswer(value: string) {
    if (!value || !step) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [step.slot]: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "save_failed");
      setAnswers((a) => ({ ...a, [step.slot]: value }));
      setCompleteness(data.completeness ?? 0);
      setUnlocked(data.unlocked ?? false);
      // advance
      if (stepIdx < STEPS.length - 1) {
        setStepIdx(stepIdx + 1);
      } else {
        // last step done — if unlocked, send them in
        if (data.unlocked) router.push("/dashboard");
      }
    } catch (e: any) {
      setError(e.message || "Something went sideways. Try that again.");
    } finally {
      setSaving(false);
    }
  }

  function goBack() {
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
  }

  return (
    <main className="relative min-h-screen">
      <div className="absolute inset-0 -z-10 bg-promo-glow" />
      <div className="absolute inset-0 -z-10 bg-grid-fade" />

      <div className="container max-w-2xl mx-auto pt-6 md:pt-10 pb-20 px-4">
        {/* FLO INTRO */}
        <div className="mb-6 flex items-center gap-3 animate-fade-up">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-br from-cyan-300 via-amber-300 to-orange-400 text-slate-900 font-extrabold text-xl shadow-[0_0_20px_rgba(34,211,238,0.35)]">
            F
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-cyan-300">
              Meet Flo — your LeadFlow Pro copilot
            </div>
            <div className="text-sm text-ink-200">
              "Alright, let's figure out what you actually need."
            </div>
          </div>
        </div>

        {/* GATE EXPLAINER BANNER */}
        {cameFromGate && (
          <div className="mb-6 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 flex items-start gap-3 animate-fade-up">
            <Lock className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-100">
              <strong className="text-white">The tools don't unlock yet.</strong> Flo needs to
              learn a few things about you and your business first. 3 minutes. Worth every second —
              every tool inside will be tailored to YOU after this.
            </div>
          </div>
        )}

        {/* HEADER + PROGRESS */}
        <header className="mb-6 md:mb-8 animate-fade-up">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-300">
            <Sparkles className="h-4 w-4" />
            Flo is learning you
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-sm text-ink-300">
              Question {stepIdx + 1} of {totalSteps}
            </div>
            <div className="text-sm text-ink-300">
              {progressPct}% · saved
            </div>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-white/[0.05] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-amber-300 to-orange-400 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </header>

        {/* QUESTION */}
        <section className="animate-fade-up">
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
            {step.title}
          </h1>
          {step.hint && (
            <p className="mt-3 text-base md:text-lg text-ink-200 leading-relaxed">{step.hint}</p>
          )}

          <div className="mt-6 md:mt-8">
            {step.kind === "mcq-grid" && (
              <McqGrid step={step} current={answers[step.slot]} onPick={saveAnswer} disabled={saving} />
            )}
            {step.kind === "mcq" && (
              <McqList step={step} current={answers[step.slot]} onPick={saveAnswer} disabled={saving} />
            )}
            {step.kind === "text-short" && (
              <TextInput
                step={step}
                current={answers[step.slot] || ""}
                onSubmit={saveAnswer}
                disabled={saving}
              />
            )}
            {step.kind === "text-long" && (
              <TextArea
                step={step}
                current={answers[step.slot] || ""}
                onSubmit={saveAnswer}
                disabled={saving}
              />
            )}
            {step.kind === "state-picker" && (
              <StatePicker step={step} current={answers[step.slot] || ""} onPick={saveAnswer} disabled={saving} />
            )}
          </div>

          {error && (
            <p className="mt-4 text-sm text-rose-300">{error}</p>
          )}
        </section>

        {/* FOOTER NAV */}
        <footer className="mt-10 flex items-center justify-between text-sm">
          <button
            onClick={goBack}
            disabled={stepIdx === 0}
            className="inline-flex items-center gap-2 text-ink-300 hover:text-white disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </button>
          <span className="text-ink-300">
            {unlocked
              ? "✓ Flo's got enough. Finish up and she'll send you in."
              : `Flo needs ${Math.max(0, 80 - completeness)}% more before the dashboard unlocks`}
          </span>
        </footer>
      </div>
    </main>
  );
}

/* -------------- sub-components -------------- */

function McqGrid({ step, current, onPick, disabled }: any) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {step.options.map((o: any) => (
        <button
          key={o.value}
          disabled={disabled}
          onClick={() => onPick(o.value)}
          className={`text-left rounded-xl border p-4 transition ${
            current === o.value
              ? "border-cyan-300 bg-cyan-400/10 shadow-[0_0_20px_rgba(34,211,238,0.25)]"
              : "border-white/10 bg-white/[0.03] hover:border-cyan-300/50 hover:bg-white/[0.06]"
          } disabled:opacity-50`}
        >
          <div className="flex items-center gap-2 text-white font-bold">
            {o.emoji && <span>{o.emoji}</span>}
            <span>{o.label}</span>
            {current === o.value && <Check className="h-4 w-4 text-cyan-300 ml-auto" />}
          </div>
          {o.sub && <p className="mt-1 text-sm text-ink-300">{o.sub}</p>}
        </button>
      ))}
    </div>
  );
}

function McqList({ step, current, onPick, disabled }: any) {
  return (
    <div className="flex flex-col gap-2">
      {step.options.map((o: any) => (
        <button
          key={o.value}
          disabled={disabled}
          onClick={() => onPick(o.value)}
          className={`text-left rounded-xl border px-4 py-3 transition flex items-center gap-3 ${
            current === o.value
              ? "border-cyan-300 bg-cyan-400/10"
              : "border-white/10 bg-white/[0.03] hover:border-cyan-300/50 hover:bg-white/[0.06]"
          } disabled:opacity-50`}
        >
          {o.emoji && <span className="text-xl">{o.emoji}</span>}
          <div className="flex-1">
            <div className="text-white font-semibold">{o.label}</div>
            {o.sub && <div className="text-xs text-ink-300">{o.sub}</div>}
          </div>
          {current === o.value && <Check className="h-5 w-5 text-cyan-300" />}
        </button>
      ))}
    </div>
  );
}

function TextInput({ step, current, onSubmit, disabled }: any) {
  const [v, setV] = useState(current);
  useEffect(() => setV(current), [current]);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (v.trim()) onSubmit(v.trim());
      }}
      className="flex flex-col gap-3"
    >
      <input
        type="text"
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder={step.placeholder}
        maxLength={step.maxLength}
        disabled={disabled}
        className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white placeholder:text-ink-300 focus:border-cyan-300 focus:outline-none"
        autoFocus
      />
      <button
        type="submit"
        disabled={disabled || !v.trim()}
        className="self-start inline-flex items-center gap-2 btn-accent text-base px-5 py-2.5 disabled:opacity-50"
      >
        Continue <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}

function TextArea({ step, current, onSubmit, disabled }: any) {
  const [v, setV] = useState(current);
  useEffect(() => setV(current), [current]);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (v.trim()) onSubmit(v.trim());
      }}
      className="flex flex-col gap-3"
    >
      <textarea
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder={step.placeholder}
        maxLength={step.maxLength}
        disabled={disabled}
        rows={4}
        className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white placeholder:text-ink-300 focus:border-cyan-300 focus:outline-none resize-none"
        autoFocus
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={disabled || !v.trim()}
          className="inline-flex items-center gap-2 btn-accent text-base px-5 py-2.5 disabled:opacity-50"
        >
          Continue <ArrowRight className="h-4 w-4" />
        </button>
        {step.maxLength && (
          <span className="text-xs text-ink-300">{v.length}/{step.maxLength}</span>
        )}
      </div>
    </form>
  );
}

const US_STATES: { v: string; n: string }[] = [
  ["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],
  ["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["FL","Florida"],["GA","Georgia"],
  ["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],["IN","Indiana"],["IA","Iowa"],
  ["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],["ME","Maine"],["MD","Maryland"],
  ["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],["MO","Missouri"],
  ["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],["NH","New Hampshire"],["NJ","New Jersey"],
  ["NM","New Mexico"],["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],
  ["OK","Oklahoma"],["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],
  ["SD","South Dakota"],["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VT","Vermont"],
  ["VA","Virginia"],["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"],
  ["DC","Washington D.C."],
].map(([v, n]) => ({ v, n }));

function StatePicker({ current, onPick, disabled }: any) {
  const [q, setQ] = useState("");
  const filtered = q
    ? US_STATES.filter((s) => s.n.toLowerCase().includes(q.toLowerCase()) || s.v.toLowerCase() === q.toLowerCase())
    : US_STATES;
  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Type your state or 2-letter code"
        className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white placeholder:text-ink-300 focus:border-cyan-300 focus:outline-none"
        autoFocus
      />
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-80 overflow-y-auto pr-1">
        {filtered.map((s) => (
          <button
            key={s.v}
            disabled={disabled}
            onClick={() => onPick(s.v)}
            className={`rounded-lg border px-2 py-2 text-sm transition ${
              current === s.v
                ? "border-cyan-300 bg-cyan-400/10 text-white"
                : "border-white/10 bg-white/[0.03] text-ink-100 hover:border-cyan-300/50 hover:bg-white/[0.06]"
            } disabled:opacity-50`}
            title={s.n}
          >
            <div className="font-bold">{s.v}</div>
            <div className="text-[10px] text-ink-300 truncate">{s.n}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
