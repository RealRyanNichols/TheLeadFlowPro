"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Car,
  CheckCircle2,
  Copy,
  DollarSign,
  Gauge,
  Heart,
  Home,
  Loader2,
  MapPin,
  Plane,
  RotateCw,
  Send,
  SlidersHorizontal,
  Sparkles,
  Utensils
} from "lucide-react";

type CategoryId = "home" | "vehicle" | "food" | "vacation" | "money" | "life" | "boat" | "community" | "business";
type UrgencyId = "now" | "this_week" | "this_month" | "researching";
type BudgetRangeId = "unknown" | "under_100" | "100_500" | "500_2500" | "2500_plus";
type TradeoffId = "speed" | "wow" | "certainty";

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
  anchors: string[];
  tradeoffs: Record<TradeoffId, number>;
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
  },
  {
    id: "boat",
    label: "Perfect boat or catch",
    prompt: "What boat, fishing day, water setup, or catch would feel like the right win?",
    quickWin: "An outdoor-fit map with use case, weather, budget comfort, gear clues, and local route signals.",
    icon: MapPin,
    problemCategories: ["home_lifestyle", "local_service_need", "buy_or_sell_asset"],
    interests: ["product_research", "local_providers", "real_world_events"],
    resultNoun: "outdoor fit map"
  },
  {
    id: "community",
    label: "Perfect church or group",
    prompt: "What church, group, neighborhood, class, or local circle would actually fit you?",
    quickWin: "A community-fit map that keeps sensitive details out of sellable targeting and focuses on stated preferences.",
    icon: Heart,
    problemCategories: ["home_lifestyle", "local_service_need", "career_or_skill"],
    interests: ["local_providers", "education_training", "real_world_events"],
    resultNoun: "community fit map"
  },
  {
    id: "business",
    label: "Perfect business help",
    prompt: "What would make your business easier, faster, more profitable, or less chaotic?",
    quickWin: "A business-fit map with pain, budget comfort, vendor clues, automation needs, and buyer-ready next steps.",
    icon: Gauge,
    problemCategories: ["business_growth", "find_customers", "ai_automation", "save_time"],
    interests: ["business_services", "software_ai", "marketing_sales"],
    resultNoun: "business solve map"
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

const anchorOptions: Record<CategoryId, string[]> = {
  home: ["safe neighborhood", "space to grow", "low payment", "land", "modern kitchen", "quiet"],
  vehicle: ["daily comfort", "family room", "tow power", "low payment", "good MPG", "status feel"],
  food: ["bold flavor", "healthy enough", "fast", "local favorite", "premium ingredients", "comfort food"],
  vacation: ["beach", "mountains", "kid friendly", "quiet", "nightlife", "all inclusive"],
  money: ["higher income", "less stress", "retirement target", "business cash flow", "debt plan", "skill path"],
  life: ["routine", "trust", "community", "family fit", "confidence", "new start"],
  boat: ["fish finder", "family day", "shallow water", "big catch", "easy towing", "low maintenance"],
  community: ["strong teaching", "family programs", "local people", "service opportunities", "quiet fit", "accountability"],
  business: ["more leads", "less manual work", "AI setup", "better follow-up", "higher ticket", "clean dashboard"]
};

const tradeoffOptions: Array<{
  id: TradeoffId;
  label: string;
  low: string;
  high: string;
}> = [
  { id: "speed", label: "Speed vs. exact fit", low: "Take my time", high: "Move now" },
  { id: "wow", label: "Value vs. wow factor", low: "Best value", high: "Make it impressive" },
  { id: "certainty", label: "Safe vs. exploratory", low: "Proven choice", high: "Show me wildcards" }
];

const initialState: FormState = {
  category: "vehicle",
  goal: "I want something that fits my real life, budget, taste, and next move.",
  location: "",
  style: "value",
  anchors: ["daily comfort", "low payment", "good MPG"],
  tradeoffs: {
    speed: 62,
    wow: 38,
    certainty: 44
  },
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
  const anchors = form.anchors.length ? form.anchors : anchorOptions[form.category].slice(0, 3);
  const specificity =
    (form.goal.trim().length > 80 ? 28 : form.goal.trim().length > 35 ? 18 : 8) +
    (form.location.trim().length > 2 ? 12 : 0) +
    (form.dealbreakers.trim().length > 12 ? 18 : 0) +
    Math.min(20, anchors.length * 4);
  const heat = form.urgency === "now" ? 28 : form.urgency === "this_week" ? 20 : form.urgency === "this_month" ? 12 : 4;
  const spend = form.budgetRange === "2500_plus" ? 24 : form.budgetRange === "500_2500" ? 18 : form.budgetRange === "100_500" ? 12 : form.budgetRange === "under_100" ? 8 : 4;
  const tradeoffSignal =
    Math.round((form.tradeoffs.speed + form.tradeoffs.wow + form.tradeoffs.certainty) / 30);
  const score = Math.min(99, 34 + specificity + heat + spend + tradeoffSignal);

  const plan = [
    `Define the non-negotiable: ${style.label.toLowerCase()} fit, ${budget.toLowerCase()}, ${timeline.toLowerCase()}, anchored by ${anchors.slice(0, 3).join(", ")}.`,
    `Filter the search around ${location} and remove ${dealbreakers}.`,
    `Turn this into a shortlist: best match, best value, fastest option, and ${form.tradeoffs.certainty >= 55 ? "two wildcards" : "one safe backup"}.`
  ];

  const dataSignals = [
    "category intent",
    "budget comfort",
    "timeline",
    "style preference",
    "must-have anchors",
    "tradeoff sliders",
    "location clue",
    "dealbreakers"
  ];

  const buyerSignal =
    form.urgency === "now" || form.urgency === "this_week"
      ? "active buyer signal"
      : form.budgetRange === "2500_plus" || form.budgetRange === "500_2500"
        ? "budget-backed research signal"
        : "preference research signal";

  const nextClick =
    score >= 82
      ? "Save the map or request a matched shortlist."
      : score >= 68
        ? "Add one location clue and one dealbreaker."
        : "Pick more anchors before this becomes useful.";

  return {
    category,
    style,
    budget,
    timeline,
    location,
    dealbreakers,
    anchors,
    score,
    plan,
    dataSignals,
    buyerSignal,
    nextClick,
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
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<null | { id: string; leadScore: number }>(null);
  const blueprint = useMemo(() => buildBlueprint(form), [form]);

  function pulse(target: string, value = 1) {
    window.dispatchEvent(
      new CustomEvent("leadflow:pulse", {
        detail: {
          eventType: "tool_interaction",
          path: "/",
          target,
          value
        }
      })
    );
  }

  function setValue<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => {
      if (key === "category") {
        const category = value as CategoryId;
        return {
          ...current,
          category,
          anchors: anchorOptions[category].slice(0, 3),
          goal: categoryFor(category).prompt
        };
      }
      return { ...current, [key]: value };
    });
    setGenerated(true);
    setCopied(false);
    setError(null);
    setSuccess(null);
    if (["category", "style", "budgetRange", "urgency"].includes(key)) {
      pulse(`preference:${String(key)}:${String(value)}`, key === "urgency" ? 3 : 2);
    }
  }

  function toggleAnchor(anchor: string) {
    setForm((current) => {
      const active = current.anchors.includes(anchor);
      const anchors = active
        ? current.anchors.filter((item) => item !== anchor)
        : [...current.anchors, anchor].slice(0, 6);
      return { ...current, anchors };
    });
    setGenerated(true);
    setCopied(false);
    pulse(`preference:anchor:${anchor}`, 2);
  }

  function setTradeoff(id: TradeoffId, value: number) {
    setForm((current) => ({
      ...current,
      tradeoffs: {
        ...current.tradeoffs,
        [id]: value
      }
    }));
    setGenerated(true);
  }

  function commitTradeoff(id: TradeoffId, value: number) {
    pulse(`preference:tradeoff:${id}:${value}`, Math.max(1, Math.round(value / 20)));
  }

  function resetMap() {
    setForm(initialState);
    setGenerated(true);
    setCopied(false);
    setError(null);
    setSuccess(null);
    pulse("preference:reset-map", 1);
  }

  async function copyReceipt() {
    const receipt = [
      `${blueprint.headline} (${blueprint.score}/99)`,
      `Signal: ${blueprint.buyerSignal}`,
      `Category: ${blueprint.category.label}`,
      `Anchors: ${blueprint.anchors.join(", ")}`,
      `Budget: ${blueprint.budget}`,
      `Timing: ${blueprint.timeline}`,
      `Context: ${blueprint.location}`,
      `Avoid: ${blueprint.dealbreakers}`,
      `Next click: ${blueprint.nextClick}`,
      ...blueprint.plan.map((step, index) => `${index + 1}. ${step}`)
    ].join("\n");

    try {
      await navigator.clipboard.writeText(receipt);
      setCopied(true);
      pulse("preference:copy-receipt", 4);
    } catch {
      setCopied(false);
      pulse("preference:copy-receipt-failed", 1);
    }
  }

  async function saveSignal(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    pulse("preference:save-attempt", 5);

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
          `Anchors: ${blueprint.anchors.join(", ")}`,
          `Tradeoffs: speed ${form.tradeoffs.speed}/100, wow ${form.tradeoffs.wow}/100, certainty ${form.tradeoffs.certainty}/100`,
          `Location/context: ${blueprint.location}`,
          `Dealbreakers: ${blueprint.dealbreakers}`
        ].join("\\n"),
        desiredOutcome: [
          blueprint.headline,
          blueprint.summary,
          ...blueprint.plan.map((step, index) => `${index + 1}. ${step}`)
        ].join("\\n"),
        activeSearches: `Preference Lab category: ${blueprint.category.label}. Style: ${blueprint.style.label}. Anchors: ${blueprint.anchors.join(", ")}. Budget: ${blueprint.budget}. Timeline: ${blueprint.timeline}. Tradeoffs: speed ${form.tradeoffs.speed}, wow ${form.tradeoffs.wow}, certainty ${form.tradeoffs.certainty}.`,
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
      pulse("preference:save-success", 8);
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
            boat, community, business fix, money target, or life fit. Get a fit
            score, a shortlist path, what to avoid, and the next move before
            you save anything.
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

              <div className="preference-signal-stack mt-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                    Pick the anchors
                  </p>
                  <span className="text-xs font-semibold text-cyan-300">
                    {form.anchors.length}/6
                  </span>
                </div>
                <div className="preference-anchor-grid mt-2">
                  {anchorOptions[form.category].map((anchor) => {
                    const active = form.anchors.includes(anchor);
                    return (
                      <button
                        key={anchor}
                        type="button"
                        onClick={() => toggleAnchor(anchor)}
                        className={["preference-anchor-chip", active ? "preference-anchor-chip-active" : ""].join(" ")}
                        data-pulse-target={`preference-anchor:${anchor}`}
                      >
                        {active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                        {anchor}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="preference-signal-stack mt-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
                  <SlidersHorizontal className="h-4 w-4 text-cyan-300" />
                  Tune the decision
                </div>
                <div className="preference-tuner-grid mt-3">
                  {tradeoffOptions.map((tradeoff) => (
                    <label key={tradeoff.id} className="preference-tuner">
                      <span className="flex items-center justify-between gap-3">
                        <strong>{tradeoff.label}</strong>
                        <em>{form.tradeoffs[tradeoff.id]}</em>
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={form.tradeoffs[tradeoff.id]}
                        onChange={(e) => setTradeoff(tradeoff.id, Number(e.target.value))}
                        onPointerUp={(e) => commitTradeoff(tradeoff.id, Number(e.currentTarget.value))}
                        onKeyUp={(e) => commitTradeoff(tradeoff.id, Number(e.currentTarget.value))}
                        aria-label={tradeoff.label}
                      />
                      <span className="preference-tuner-labels">
                        <small>{tradeoff.low}</small>
                        <small>{tradeoff.high}</small>
                      </span>
                    </label>
                  ))}
                </div>
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

          <div className="signal-receipt mt-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-accent-300">
                  Signal receipt
                </p>
                <h3 className="mt-1 text-xl font-extrabold text-white">
                  {blueprint.buyerSignal}
                </h3>
              </div>
              <button
                type="button"
                onClick={copyReceipt}
                className="signal-receipt-copy"
                aria-label="Copy signal receipt"
              >
                <Copy className="h-4 w-4" />
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="signal-receipt-grid mt-4">
              <div>
                <span>Anchors</span>
                <strong>{blueprint.anchors.slice(0, 4).join(", ")}</strong>
              </div>
              <div>
                <span>Next click</span>
                <strong>{blueprint.nextClick}</strong>
              </div>
              <div>
                <span>Tradeoff read</span>
                <strong>
                  {form.tradeoffs.speed >= 55 ? "fast" : "patient"} / {form.tradeoffs.wow >= 55 ? "wow" : "value"} /{" "}
                  {form.tradeoffs.certainty >= 55 ? "wildcards" : "safe"}
                </strong>
              </div>
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
              onClick={() => {
                setGenerated(true);
                pulse("preference:build-map-click", 4);
              }}
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

          <button
            type="button"
            onClick={resetMap}
            className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-sm font-bold text-ink-100 transition hover:border-cyan-300/35 hover:bg-white/[0.06]"
          >
            <RotateCw className="h-4 w-4 text-cyan-300" />
            Build another perfect map
          </button>
        </aside>
      </div>
    </section>
  );
}
