"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Car,
  CheckCircle2,
  DollarSign,
  Heart,
  Home,
  Loader2,
  MapPin,
  Plane,
  Send,
  Sparkles,
  Utensils
} from "lucide-react";

type CategoryId = "home" | "vehicle" | "food" | "vacation" | "money" | "life";
type UrgencyId = "now" | "this_week" | "this_month" | "researching";
type BudgetRangeId = "unknown" | "under_100" | "100_500" | "500_2500" | "2500_plus";

type PreferenceCategory = {
  id: CategoryId;
  label: string;
  prompt: string;
  quickWin: string;
  icon: typeof Home;
  problemCategories: string[];
  interests: string[];
  resultNoun: string;
};

type Option = {
  id: string;
  label: string;
  description: string;
};

type FormState = {
  category: CategoryId;
  goal: string;
  location: string;
  style: string;
  budgetRange: BudgetRangeId;
  urgency: UrgencyId;
  dealbreakers: string;
  fullName: string;
  email: string;
  adultConfirmed: boolean;
};

const categories: PreferenceCategory[] = [
  {
    id: "home",
    label: "Perfect home",
    prompt: "What kind of house would actually feel right for your life?",
    quickWin: "A home-fit map with must-haves, tradeoffs, timing, and local search clues.",
    icon: Home,
    problemCategories: ["home_lifestyle", "buy_or_sell_asset", "local_service_need"],
    interests: ["local_providers", "product_research", "finance_education"],
    resultNoun: "home search map"
  },
  {
    id: "vehicle",
    label: "Perfect vehicle",
    prompt: "What vehicle would you love driving and still feel smart buying?",
    quickWin: "A vehicle-fit map with use case, budget comfort, feature stack, and dealer/search clues.",
    icon: Car,
    problemCategories: ["buy_or_sell_asset", "compare_tools", "home_lifestyle"],
    interests: ["product_research", "local_providers", "finance_education"],
    resultNoun: "vehicle build sheet"
  },
  {
    id: "food",
    label: "Perfect meal",
    prompt: "What food, drink, burger, steak, sushi roll, or craving would hit exactly right?",
    quickWin: "A taste map with flavor, texture, price, occasion, and where to look next.",
    icon: Utensils,
    problemCategories: ["home_lifestyle", "local_service_need"],
    interests: ["local_providers", "product_research", "real_world_events"],
    resultNoun: "taste profile"
  },
  {
    id: "vacation",
    label: "Perfect trip",
    prompt: "What vacation would you actually remember, not just book?",
    quickWin: "A trip map with mood, budget, timing, group fit, and destination shortlist clues.",
    icon: Plane,
    problemCategories: ["home_lifestyle", "compare_tools"],
    interests: ["product_research", "local_providers", "real_world_events"],
    resultNoun: "trip map"
  },
  {
    id: "money",
    label: "Perfect money target",
    prompt: "What yearly income, savings target, or retirement number would change your next move?",
    quickWin: "A money-target map with timeline, gap, next action, and education-only planning clues.",
    icon: DollarSign,
    problemCategories: ["make_more_money", "career_or_skill", "business_growth"],
    interests: ["finance_education", "education_training", "business_services"],
    resultNoun: "money target map"
  },
  {
    id: "life",
    label: "Perfect life fit",
    prompt: "What community, routine, relationship standard, hobby, or place would feel right?",
    quickWin: "A values-fit map that keeps sensitive details out of sellable targeting.",
    icon: Heart,
    problemCategories: ["home_lifestyle", "career_or_skill", "local_service_need"],
    interests: ["education_training", "local_providers", "real_world_events"],
    resultNoun: "life-fit map"
  }
];

const styleOptions: Option[] = [
  { id: "simple", label: "Simple", description: "Clean, low-friction, no drama." },
  { id: "premium", label: "Premium", description: "Better feel, better finish, worth paying for." },
  { id: "adventurous", label: "Adventurous", description: "Different, memorable, not boring." },
  { id: "family", label: "Family fit", description: "Works for real life, people, and routines." },
  { id: "practical", label: "Practical", description: "Fast, useful, reliable, easy to act on." },
  { id: "value", label: "Best value", description: "Smart spend, high utility, no waste." }
];

const budgetOptions: { id: BudgetRangeId; label: string }[] = [
  { id: "unknown", label: "Show me the fit" },
  { id: "under_100", label: "Under $100" },
  { id: "100_500", label: "$100 to $500" },
  { id: "500_2500", label: "$500 to $2,500" },
  { id: "2500_plus", label: "$2,500+" }
];

const timelineOptions: { id: UrgencyId; label: string }[] = [
  { id: "now", label: "Now" },
  { id: "this_week", label: "This week" },
  { id: "this_month", label: "This month" },
  { id: "researching", label: "Just exploring" }
];

const initialState: FormState = {
  category: "vehicle",
  goal: "I want something that fits my real life, budget, taste, and next move.",
  location: "",
  style: "value",
  budgetRange: "unknown",
  urgency: "this_week",
  dealbreakers: "",
  fullName: "",
  email: "",
  adultConfirmed: false
};

function categoryFor(id: CategoryId) {
  return categories.find((item) => item.id === id) ?? categories[0];
}

function optionLabel<T extends string>(items: { id: T; label: string }[], id: T) {
  return items.find((item) => item.id === id)?.label ?? id;
}

function buildBlueprint(form: FormState) {
  const category = categoryFor(form.category);
  const style = styleOptions.find((item) => item.id === form.style) ?? styleOptions[0];
  const budget = optionLabel(budgetOptions, form.budgetRange);
  const timeline = optionLabel(timelineOptions, form.urgency);
  const location = form.location.trim() || "wherever the best fit exists";
  const dealbreakers = form.dealbreakers.trim() || "anything that wastes money, time, or trust";
  const specificity =
    (form.goal.trim().length > 80 ? 28 : form.goal.trim().length > 35 ? 18 : 8) +
    (form.location.trim().length > 2 ? 12 : 0) +
    (form.dealbreakers.trim().length > 12 ? 18 : 0);
  const heat = form.urgency === "now" ? 28 : form.urgency === "this_week" ? 20 : form.urgency === "this_month" ? 12 : 4;
  const spend = form.budgetRange === "2500_plus" ? 24 : form.budgetRange === "500_2500" ? 18 : form.budgetRange === "100_500" ? 12 : form.budgetRange === "under_100" ? 8 : 4;
  const score = Math.min(99, 38 + specificity + heat + spend);

  const plan = [
    `Define the non-negotiable: ${style.label.toLowerCase()} fit, ${budget.toLowerCase()}, ${timeline.toLowerCase()}.`,
    `Filter the search around ${location} and remove ${dealbreakers}.`,
    `Turn this into a shortlist: best match, best value, fastest option, and one wildcard.`
  ];

  const dataSignals = [
    "category intent",
    "budget comfort",
    "timeline",
    "style preference",
    "location clue",
    "dealbreakers"
  ];

  return {
    category,
    style,
    budget,
    timeline,
    location,
    dealbreakers,
    score,
    plan,
    dataSignals,
    headline: `${style.label} ${category.resultNoun}`,
    summary: category.quickWin,
    immediateAnswer:
      score >= 82
        ? "Strong signal. This is specific enough to produce a useful shortlist now."
        : score >= 68
          ? "Good signal. Add one location clue or dealbreaker and the map gets much sharper."
          : "Early signal. Pick a style, budget comfort, timing, and one dealbreaker before saving."
  };
}

export function PreferenceSignalLab() {
  const [form, setForm] = useState<FormState>(initialState);
  const [generated, setGenerated] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<null | { id: string; leadScore: number }>(null);
  const blueprint = useMemo(() => buildBlueprint(form), [form]);

  function setValue<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setGenerated(true);
    setError(null);
    setSuccess(null);
  }

  async function saveSignal(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (form.fullName.trim().length < 2 || !form.email.includes("@")) {
      setError("Add your name and email if you want this map saved and sent back to you.");
      return;
    }

    if (!form.adultConfirmed) {
      setError("Confirm you are 18 or older before saving this preference map.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        fullName: form.fullName,
        email: form.email,
        phone: "",
        companyName: `Preference Lab - ${blueprint.category.label}`,
        requestType: form.urgency === "now" || form.urgency === "this_week" ? "buy_soon" : "get_recommendations",
        problemCategories: blueprint.category.problemCategories.slice(0, 5),
        interests: blueprint.category.interests.slice(0, 6),
        urgency: form.urgency,
        budgetRange: form.budgetRange,
        preferredContact: "email",
        problemStatement: [
          blueprint.category.prompt,
          `What they want: ${form.goal.trim() || "A better fit."}`,
          `Location/context: ${blueprint.location}`,
          `Dealbreakers: ${blueprint.dealbreakers}`
        ].join("\\n"),
        desiredOutcome: [
          blueprint.headline,
          blueprint.summary,
          ...blueprint.plan.map((step, index) => `${index + 1}. ${step}`)
        ].join("\\n"),
        activeSearches: `Preference Lab category: ${blueprint.category.label}. Style: ${blueprint.style.label}. Budget: ${blueprint.budget}. Timeline: ${blueprint.timeline}.`,
        sourceContext:
          "Saved from the public Preference Lab. Use as first-party preference data for relevant recommendations only. Do not use for minors, private addresses, medical data, protected-trait targeting, or sensitive personal targeting.",
        adultConfirmed: true,
        consentAccepted: true,
        sensitiveDataAcknowledged: true
      };

      const res = await fetch("/api/problem-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save this preference map.");
      setSuccess({ id: data.intake.id, leadScore: data.intake.leadScore });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this preference map.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="preference-lab" className="preference-hero">
      <div className="preference-grid" aria-hidden="true" />
      <div className="container relative z-10 grid min-h-[calc(100svh-4rem)] min-w-0 gap-5 py-6 md:gap-6 md:py-10 xl:grid-cols-[minmax(0,0.82fr)_minmax(22rem,0.68fr)] xl:grid-rows-[auto_auto] xl:items-start">
        <div className="order-1 min-w-0 xl:col-start-1 xl:row-start-1">
          <div className="signal-eyebrow">
            <Sparkles className="h-4 w-4" />
            Build your perfect map
          </div>
          <h1 className="mt-5 max-w-4xl break-words text-4xl font-extrabold leading-tight text-white md:text-6xl">
            Tell us what perfect looks like. Get a useful map immediately.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-ink-100 md:text-xl">
            Pick the decision in front of you: house, vehicle, meal, trip,
            money target, or life fit. Get a fit score, a shortlist path, what
            to avoid, and the next move before you save anything.
          </p>

          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            <div className="hero-signal-chip hero-signal-lead">
              <span>Live fit score</span>
              <strong>{blueprint.score}</strong>
            </div>
            <div className="hero-signal-chip hero-signal-cyan">
              <span>Preference type</span>
              <strong>{blueprint.category.label.replace("Perfect ", "")}</strong>
            </div>
            <div className="hero-signal-chip hero-signal-accent">
              <span>Output</span>
              <strong>Map</strong>
            </div>
          </div>
        </div>

        <form
          onSubmit={saveSignal}
          className="preference-lab-card order-3 xl:col-start-1 xl:row-start-2"
          data-conversion-event="preference_lab_save_submit"
          data-conversion-cta="Save my perfect map"
          data-conversion-source-page="/"
          data-conversion-destination="/api/problem-intake"
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => {
              const Icon = category.icon;
              const active = form.category === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setValue("category", category.id)}
                  className={["preference-category", active ? "preference-category-active" : ""].join(" ")}
                  data-conversion-event="preference_lab_category_click"
                  data-conversion-cta={category.label}
                  data-conversion-source-page="/"
                  data-conversion-destination="#preference-lab"
                >
                  <Icon className="h-4 w-4" />
                  <span>{category.label}</span>
                </button>
              );
            })}
          </div>

          <label className="mt-5 block">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
              {blueprint.category.prompt}
            </span>
            <textarea
              value={form.goal}
              onChange={(e) => setValue("goal", e.target.value)}
              rows={3}
              className="lead-control mt-2 w-full resize-y leading-6"
              placeholder="Example: I want a truck that looks sharp, handles family weekends, can tow when needed, and does not bury me in payment."
            />
          </label>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.75fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">What should it feel like?</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {styleOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setValue("style", option.id)}
                    className={["preference-style", form.style === option.id ? "preference-style-active" : ""].join(" ")}
                  >
                    <strong>{option.label}</strong>
                    <span>{option.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">Where or context?</span>
                <input
                  value={form.location}
                  onChange={(e) => setValue("location", e.target.value)}
                  className="lead-control mt-2 w-full"
                  placeholder="City, use case, family size, occasion..."
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">Dealbreakers</span>
                <input
                  value={form.dealbreakers}
                  onChange={(e) => setValue("dealbreakers", e.target.value)}
                  className="lead-control mt-2 w-full"
                  placeholder="Too expensive, too far, too small, too risky..."
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">Budget</span>
                  <select
                    value={form.budgetRange}
                    onChange={(e) => setValue("budgetRange", e.target.value as BudgetRangeId)}
                    className="lead-control mt-2 w-full"
                  >
                    {budgetOptions.map((option) => (
                      <option key={option.id} value={option.id} className="bg-ink-950">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">Timing</span>
                  <select
                    value={form.urgency}
                    onChange={(e) => setValue("urgency", e.target.value as UrgencyId)}
                    className="lead-control mt-2 w-full"
                  >
                    {timelineOptions.map((option) => (
                      <option key={option.id} value={option.id} className="bg-ink-950">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label>
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">Name to save</span>
              <input
                value={form.fullName}
                onChange={(e) => setValue("fullName", e.target.value)}
                className="lead-control mt-2 w-full"
                placeholder="Your name"
              />
            </label>
            <label>
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">Email to send the map</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setValue("email", e.target.value)}
                className="lead-control mt-2 w-full"
                placeholder="you@example.com"
              />
            </label>
            <button type="submit" disabled={submitting} className="btn-accent min-h-12 whitespace-nowrap text-sm">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {submitting ? "Saving..." : "Save map"}
            </button>
          </div>

          <label className="mt-3 flex items-start gap-3 text-xs leading-5 text-ink-300">
            <input
              type="checkbox"
              checked={form.adultConfirmed}
              onChange={(e) => setValue("adultConfirmed", e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-white/20 bg-ink-950 text-lead-400 focus:ring-lead-400"
            />
            <span>
              I am 18 or older. Save my answers so LeadFlow can score this preference
              map and send relevant recommendations. Do not enter minors' data,
              private addresses, medical information, financial account data, or
              protected-trait targeting.
            </span>
          </label>

          {error ? (
            <div className="mt-4 flex gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-ink-100">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="mt-4 rounded-lg border border-lead-400/30 bg-lead-400/10 p-4 text-sm text-ink-100">
              <p className="flex items-center gap-2 font-bold text-white">
                <CheckCircle2 className="h-4 w-4 text-lead-400" />
                Preference map saved
              </p>
              <p className="mt-1">
                Intake ID <span className="font-mono text-cyan-300">{success.id}</span>.
                Lead score {success.leadScore}/100.
              </p>
            </div>
          ) : null}
        </form>

        <aside className="preference-output order-2 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:self-center">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Immediate answer</p>
              <h2 className="mt-2 text-2xl font-extrabold leading-tight text-white md:text-3xl">
                {blueprint.headline}
              </h2>
            </div>
            <div className="min-w-16 shrink-0 rounded-lg border border-lead-400/30 bg-lead-400/10 px-4 py-3 text-right">
              <p className="text-3xl font-extrabold text-lead-400">{blueprint.score}</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">fit</p>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-ink-200">{generated ? blueprint.immediateAnswer : blueprint.summary}</p>

          <div className="preference-map-viz" aria-label="Preference map preview">
            <div className="preference-map-line preference-map-line-a" />
            <div className="preference-map-line preference-map-line-b" />
            <div className="preference-map-line preference-map-line-c" />
            <div className="preference-map-node preference-map-node-center">
              <strong>{blueprint.score}</strong>
              <span>{blueprint.category.label}</span>
            </div>
            <div className="preference-map-node preference-map-node-style">
              <span>Style</span>
              <strong>{blueprint.style.label}</strong>
            </div>
            <div className="preference-map-node preference-map-node-budget">
              <span>Budget</span>
              <strong>{blueprint.budget}</strong>
            </div>
            <div className="preference-map-node preference-map-node-time">
              <span>Timing</span>
              <strong>{blueprint.timeline}</strong>
            </div>
            <div className="preference-map-node preference-map-node-local">
              <span>Context</span>
              <strong>{blueprint.location}</strong>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {blueprint.plan.map((step, index) => (
              <div key={step} className="preference-plan-row">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{step}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-lg border border-white/10 bg-[#05080d]/70 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-white">
              <MapPin className="h-4 w-4 text-cyan-300" />
              What LeadFlow learns
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {blueprint.dataSignals.map((signal) => (
                <span key={signal} className="signal-rail-pill">
                  <CheckCircle2 className="h-3.5 w-3.5 text-lead-400" />
                  {signal}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setGenerated(true)}
              className="btn-accent text-sm"
              data-conversion-event="preference_lab_result_click"
              data-conversion-cta="Build my map"
              data-conversion-source-page="/"
              data-conversion-destination="#preference-lab"
            >
              Build my map
              <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href="/problem-intake"
              className="btn-ghost text-sm"
              data-conversion-event="preference_lab_deep_intake_click"
              data-conversion-cta="Answer deeper questions"
              data-conversion-source-page="/"
            >
              Answer deeper questions
            </a>
          </div>
        </aside>
      </div>
    </section>
  );
}
