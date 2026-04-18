// src/app/onboarding/page.tsx
// The Profile-Gate. Conversational coach-voice flow, now endless:
//   - Core 9 questions unlock the dashboard at completeness ≥ 80
//   - Bonus questions (optional) keep sharpening Flo's picture of you
//   - User can hit "I'm ready — take me in" at any step after unlock
//
// Ryan rule (2026-04-17): "They can't see the rest of the tools until they
// build their personal profile. Then keep asking as many as they want until
// they tell you to stop."

"use client";

import { useEffect, useState, useRef, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowRight, ArrowLeft, Check, Sparkles, Lock, DoorOpen, Infinity as InfinityIcon,
} from "lucide-react";

// Top-level export wraps the flow in Suspense because useSearchParams() bails
// out of prerender without it under Next 14.
export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <OnboardingFlow />
    </Suspense>
  );
}

type StepKind = "mcq" | "mcq-grid" | "text-short" | "text-long" | "state-picker";

type Step = {
  slot: string;           // maps to BrainProfile column OR extras.<slot>
  kind: StepKind;
  title: string;          // the question
  hint?: string;          // coach-voice context
  placeholder?: string;
  options?: { value: string; label: string; sub?: string; emoji?: string }[];
  maxLength?: number;
  bonus?: boolean;        // true for questions after the core 9
};

/* ---------------- CORE 9 ---------------- */
const CORE_STEPS: Step[] = [
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
  { slot: "subIndustry", kind: "text-short",
    title: "Got it. What specifically?",
    hint: "Two or three words is enough. Example: \"HVAC\" or \"hair salon\" or \"tax prep\".",
    placeholder: "e.g. hair salon, HVAC, tutoring", maxLength: 80 },
  { slot: "city", kind: "text-short",
    title: "Where do you work from?",
    hint: "Your main city. If you serve a whole region, pick the city you're based in.",
    placeholder: "e.g. Longview", maxLength: 60 },
  { slot: "state", kind: "state-picker",
    title: "What state?",
    hint: "We use this to match you with patterns from businesses near you." },
  { slot: "teamSize", kind: "mcq",
    title: "How big is your team right now?",
    hint: "Including you. No judgement either way — solo is 100% legit.",
    options: [
      { value: "solo",        label: "Just me",                sub: "Solo operator" },
      { value: "small",       label: "2–5 people",             sub: "Small crew" },
      { value: "growing",     label: "6–20 people",            sub: "Growing shop" },
      { value: "established", label: "21+",                    sub: "Established team" },
    ] },
  { slot: "avgCustomerValue", kind: "mcq",
    title: "What's the average value of one customer transaction?",
    hint: "First job, not lifetime. Ballpark is fine.",
    options: [
      { value: "under_50",   label: "Under $50",        sub: "High volume, small ticket" },
      { value: "50_200",     label: "$50 – $200",       sub: "Mid-ticket services" },
      { value: "200_500",    label: "$200 – $500",      sub: "Premium services" },
      { value: "500_2000",   label: "$500 – $2,000",    sub: "High-ticket" },
      { value: "over_2000",  label: "Over $2,000",      sub: "Enterprise / luxury" },
    ] },
  { slot: "idealCustomer", kind: "text-long",
    title: "Describe your ideal customer in one or two sentences.",
    hint: "Who do you serve best? Age range, life stage, pain point — whatever's honest. This shapes every recommendation.",
    placeholder: "e.g. Women 35–55 in a 5-mile radius, busy professionals who want convenience, responds to 'save time' more than 'save money.'",
    maxLength: 400 },
  { slot: "topFrustration", kind: "mcq",
    title: "What's getting in your way the most right now?",
    hint: "One answer. The thing that bugs you every week.",
    options: [
      { value: "not_enough_leads",   label: "Not enough leads coming in",  emoji: "📉" },
      { value: "slow_follow_up",     label: "Can't follow up fast enough", emoji: "⏰" },
      { value: "dont_know_works",    label: "Don't know what's actually working",  emoji: "❓" },
      { value: "missing_calls",      label: "Missing calls, texts, DMs",   emoji: "📵" },
      { value: "too_many_tools",     label: "Too many tools, not enough time", emoji: "🧰" },
      { value: "burnout",            label: "Just burned out, honestly",   emoji: "😮‍💨" },
    ] },
  { slot: "topGoal90d", kind: "mcq",
    title: "If the next 90 days went great, what would be true?",
    hint: "Pick the one you'd notice most.",
    options: [
      { value: "more_leads",       label: "Double my leads",         emoji: "🚀" },
      { value: "better_close",     label: "Close a higher % of the leads I already get", emoji: "🎯" },
      { value: "cut_ad_spend",     label: "Cut my ad spend in half", emoji: "✂️" },
      { value: "add_team",         label: "Add a team member",       emoji: "👥" },
      { value: "automate_follow",  label: "Automate follow-up",      emoji: "🤖" },
      { value: "launch_new",       label: "Launch a new service",    emoji: "✨" },
    ] },
];

/* ---------------- BONUS STEPS (optional, endless) ---------------- */
// Each answered extra bumps completeness (+2 up to +20) and pushes into
// BrainProfile.extras. Tools pre-fill from these alongside the core slots.
const BONUS_STEPS: Step[] = [
  { slot: "voiceSample", kind: "text-long", bonus: true,
    title: "Write a text to a lead the way you'd actually send it.",
    hint: "Flo matches your voice in every message she drafts. Be specific, be you.",
    placeholder: "e.g. Hey — saw your message. I can definitely help with that. Want me to swing by Thursday at 10 or Friday at 2?",
    maxLength: 600 },
  { slot: "signatureOffer", kind: "text-short", bonus: true,
    title: "What's the one thing you're known for?",
    hint: "The offer, service, or outcome that makes you you.",
    placeholder: "e.g. Same-day service. Or: The honest estimate.", maxLength: 120 },
  { slot: "whyChooseYou", kind: "text-long", bonus: true,
    title: "Why do customers pick you over a competitor?",
    hint: "The real answer, not the brochure one. Flo uses this everywhere.",
    placeholder: "e.g. I actually call them back. Or: I don't upsell. Or: My crew is clean, quiet, and on time.",
    maxLength: 400 },
  { slot: "topCompetitor", kind: "text-short", bonus: true,
    title: "Who's the competitor you see most often?",
    hint: "Name one. Helps Flo spot what they're doing you can do better.",
    placeholder: "e.g. Big local franchise, specific competitor's name", maxLength: 120 },
  { slot: "objectionTop", kind: "text-short", bonus: true,
    title: "What's the #1 reason a lead says no?",
    hint: "Price? Timing? Trust? Write the exact objection you hear most.",
    placeholder: "e.g. 'Too expensive' / 'I'll think about it' / 'Got a quote from someone cheaper'",
    maxLength: 200 },
  { slot: "pricingModel", kind: "mcq", bonus: true,
    title: "How do you price your work?",
    options: [
      { value: "hourly",        label: "Hourly / by the visit" },
      { value: "per_project",   label: "Per project (flat rate)" },
      { value: "subscription",  label: "Subscription or recurring" },
      { value: "mixed",         label: "Mix of all of the above" },
    ] },
  { slot: "firstResponseSLA", kind: "mcq", bonus: true,
    title: "When a new lead comes in, how fast do you usually reply?",
    hint: "Be honest — this is one of the biggest levers on close rate.",
    options: [
      { value: "under_5m",   label: "Under 5 minutes",         emoji: "⚡" },
      { value: "under_1h",   label: "Within the hour",         emoji: "🏃" },
      { value: "same_day",   label: "Later that day",          emoji: "📅" },
      { value: "next_day",   label: "Next day-ish",            emoji: "🌒" },
      { value: "sporadic",   label: "Honestly, hit or miss",   emoji: "🎲" },
    ] },
  { slot: "phoneAnswerSpeed", kind: "mcq", bonus: true,
    title: "When someone calls your business line, what happens?",
    options: [
      { value: "always_live", label: "Always answered live" },
      { value: "usually_live", label: "Usually live, sometimes voicemail" },
      { value: "often_vm",    label: "Often voicemail" },
      { value: "rarely_answer", label: "Rarely answered — we're busy" },
      { value: "no_phone",    label: "We don't really use the phone" },
    ] },
  { slot: "preferredChannel", kind: "mcq", bonus: true,
    title: "When leads reach out, which channel closes best for you?",
    options: [
      { value: "sms",     label: "Text/SMS",        emoji: "💬" },
      { value: "call",    label: "Phone call",      emoji: "📞" },
      { value: "dm",      label: "Social DMs",      emoji: "📸" },
      { value: "email",   label: "Email",           emoji: "✉️" },
      { value: "in_person", label: "In person",     emoji: "🤝" },
      { value: "mixed",   label: "About even",      emoji: "🔀" },
    ] },
  { slot: "leadSourceToday", kind: "text-long", bonus: true,
    title: "Where do your leads come from TODAY?",
    hint: "Google, referrals, Instagram, door-hangers, word of mouth — whatever it is, just list them honestly.",
    placeholder: "e.g. Mostly referrals + Google. Some Instagram. A tiny bit of Facebook ads.",
    maxLength: 400 },
  { slot: "pastMarketingSpend", kind: "mcq", bonus: true,
    title: "About how much do you spend on marketing per month right now?",
    options: [
      { value: "zero",      label: "$0 — all organic / referrals",    emoji: "🌱" },
      { value: "under_500", label: "Under $500",                      emoji: "💵" },
      { value: "500_2k",    label: "$500 – $2,000",                   emoji: "💰" },
      { value: "2k_10k",    label: "$2,000 – $10,000",                emoji: "💎" },
      { value: "over_10k",  label: "More than $10,000",               emoji: "🔥" },
    ] },
  { slot: "currentTools", kind: "text-long", bonus: true,
    title: "What tools are you already using? (Even just paper.)",
    hint: "CRM, scheduling, text-back, email, DocuSign, QuickBooks, whiteboard — all of it. Flo won't rip anything out, just helps it work together.",
    placeholder: "e.g. Google Calendar + Stripe + a group text. Nothing fancy.",
    maxLength: 500 },
  { slot: "referralPercent", kind: "mcq", bonus: true,
    title: "Roughly what % of your business comes from referrals?",
    options: [
      { value: "lt_20", label: "Under 20%" },
      { value: "20_40", label: "20 – 40%" },
      { value: "40_60", label: "40 – 60%" },
      { value: "gt_60", label: "More than 60%" },
      { value: "unsure", label: "Not sure" },
    ] },
  { slot: "avgLifetimeValue", kind: "mcq", bonus: true,
    title: "Do your customers come back?",
    hint: "Lifetime value vs. first-job value.",
    options: [
      { value: "one_and_done", label: "Mostly one-and-done" },
      { value: "occasional",   label: "They come back occasionally" },
      { value: "recurring",    label: "Recurring / long-term" },
      { value: "membership",   label: "Membership-style" },
    ] },
  { slot: "travelRadius", kind: "mcq", bonus: true,
    title: "How far do you serve?",
    options: [
      { value: "5mi",       label: "Around 5 miles" },
      { value: "15mi",      label: "Around 15 miles" },
      { value: "30mi",      label: "Around 30 miles" },
      { value: "statewide", label: "Statewide" },
      { value: "national",  label: "Nationwide / remote" },
    ] },
  { slot: "seasonality", kind: "mcq", bonus: true,
    title: "Is your business seasonal?",
    options: [
      { value: "steady",     label: "Pretty steady year-round" },
      { value: "summer",     label: "Summer-heavy" },
      { value: "fall_winter", label: "Fall & winter heavy" },
      { value: "tax_season", label: "Tax season spike" },
      { value: "holiday",    label: "Holiday spike" },
      { value: "other",      label: "Other — describe in a second" },
    ] },
  { slot: "customerAgeRange", kind: "mcq", bonus: true,
    title: "What's the age range of your average customer?",
    options: [
      { value: "18_24", label: "18 – 24" },
      { value: "25_34", label: "25 – 34" },
      { value: "35_44", label: "35 – 44" },
      { value: "45_54", label: "45 – 54" },
      { value: "55_64", label: "55 – 64" },
      { value: "65_plus", label: "65+" },
      { value: "mixed",   label: "Pretty mixed" },
    ] },
  { slot: "bestDayOfWeek", kind: "mcq", bonus: true,
    title: "What day tends to be your busiest for new leads?",
    options: [
      { value: "mon", label: "Monday" },
      { value: "tue", label: "Tuesday" },
      { value: "wed", label: "Wednesday" },
      { value: "thu", label: "Thursday" },
      { value: "fri", label: "Friday" },
      { value: "sat", label: "Saturday" },
      { value: "sun", label: "Sunday" },
      { value: "steady", label: "Pretty even all week" },
    ] },
  { slot: "bestTimeOfDay", kind: "mcq", bonus: true,
    title: "When during the day do leads typically reach out?",
    options: [
      { value: "early_am", label: "Early morning (before 9)" },
      { value: "morning",  label: "Mornings (9 – 12)" },
      { value: "afternoon", label: "Afternoons (12 – 5)" },
      { value: "evening",  label: "Evenings (5 – 9)" },
      { value: "late",     label: "Late night (after 9)" },
      { value: "mixed",    label: "All over the place" },
    ] },
  { slot: "techComfort", kind: "mcq", bonus: true,
    title: "Be honest — how tech-comfortable are you?",
    hint: "Helps Flo know how much she should just do vs. show you how.",
    options: [
      { value: "new",        label: "Brand new — teach me" },
      { value: "basic",      label: "I handle email + SMS fine" },
      { value: "comfortable", label: "Comfortable with most apps" },
      { value: "advanced",   label: "Advanced — I actually like this stuff" },
    ] },
  { slot: "reviewGoal", kind: "mcq", bonus: true,
    title: "What's your top review goal?",
    options: [
      { value: "more_volume",  label: "More reviews overall" },
      { value: "higher_star",  label: "Push the average up" },
      { value: "respond_fast", label: "Respond to reviews faster" },
      { value: "fix_negatives", label: "Knock down a specific negative one" },
      { value: "none",         label: "Not a priority right now" },
    ] },
  { slot: "languagesSpoken", kind: "text-short", bonus: true,
    title: "Languages you (or your team) can work in?",
    hint: "Comma-separated. English-only is a perfectly normal answer.",
    placeholder: "e.g. English, Spanish", maxLength: 120 },
  { slot: "biggestWin", kind: "text-long", bonus: true,
    title: "Tell Flo about a win you're proud of.",
    hint: "A great customer, a big job, a referral chain — a specific story works.",
    placeholder: "e.g. Turned a one-time detail into a fleet contract after six months of showing up.",
    maxLength: 600 },
  { slot: "biggestMiss", kind: "text-long", bonus: true,
    title: "A lead or deal you wish you'd handled differently?",
    hint: "No judgment. Flo will use this to watch for the same trap.",
    placeholder: "e.g. Waited two days to reply. They'd already booked someone else.",
    maxLength: 600 },
  { slot: "doOffer", kind: "text-long", bonus: true,
    title: "What DO you offer? (In your own words.)",
    hint: "Flo's chatbot will answer questions in your voice. Paste your services list here.",
    placeholder: "e.g. HVAC repair, install, maintenance contracts, duct cleaning.",
    maxLength: 800 },
  { slot: "dontOffer", kind: "text-long", bonus: true,
    title: "What DON'T you offer?",
    hint: "Anything Flo's chatbot should politely decline or refer out.",
    placeholder: "e.g. We don't do roofing. We don't work on commercial fridges.",
    maxLength: 500 },
];

const ALL_STEPS: Step[] = [...CORE_STEPS, ...BONUS_STEPS];
const FIRST_BONUS_INDEX = CORE_STEPS.length;

function OnboardingFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const { update: updateSession } = useSession();
  const cameFromGate = params.get("why") === "profile_required";

  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [completeness, setCompleteness] = useState(0);
  const [saving, setSaving] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const hydrated = useRef(false);

  // Hydrate from server: if the user already started onboarding, resume where they left off.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    (async () => {
      try {
        const res = await fetch("/api/onboarding", { credentials: "include", cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const prof = data.profile || {};
        const extras = (prof.extras && typeof prof.extras === "object" && !Array.isArray(prof.extras))
          ? prof.extras as Record<string, string>
          : {};
        const seeded: Record<string, string> = {};
        for (const s of ALL_STEPS) {
          const v = prof[s.slot] ?? extras[s.slot];
          if (typeof v === "string" && v) seeded[s.slot] = v;
        }
        setAnswers(seeded);
        setCompleteness(data.completeness ?? 0);
        setUnlocked(data.unlocked ?? (data.completeness ?? 0) >= 80);
        // Jump to first unanswered step
        const firstMissing = ALL_STEPS.findIndex((s) => !seeded[s.slot]);
        setStepIdx(firstMissing === -1 ? ALL_STEPS.length - 1 : firstMissing);
      } catch { /* ignore */ }
    })();
  }, []);

  const step = ALL_STEPS[stepIdx];
  const inBonus = stepIdx >= FIRST_BONUS_INDEX;

  // Progress bar logic: during core, it tracks question number; once in
  // bonus mode it reflects completeness (0..100).
  const progressPct = useMemo(() => {
    if (!inBonus) return Math.round(((stepIdx + 1) / FIRST_BONUS_INDEX) * 100);
    return completeness;
  }, [inBonus, stepIdx, completeness]);

  const bonusAnsweredCount = useMemo(
    () => BONUS_STEPS.filter((b) => !!answers[b.slot]).length,
    [answers],
  );

  async function exitToDashboard() {
    if (exiting) return;
    setExiting(true);
    // Triple-belt-and-suspenders from before: session update, explicit session
    // fetch, then hard navigation. No cookie race.
    try { await updateSession(); } catch { /* noop */ }
    try { await fetch("/api/auth/session", { credentials: "include", cache: "no-store" }); } catch { /* noop */ }
    window.location.href = "/dashboard";
  }

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
      setUnlocked(data.unlocked ?? (data.completeness ?? 0) >= 80);

      // Advance to the next question automatically.
      if (stepIdx < ALL_STEPS.length - 1) {
        setStepIdx(stepIdx + 1);
      } else {
        // Final bonus answered. Silently stay on the last step and surface
        // the "Take me in" CTA — don't auto-navigate the user out.
        setStepIdx(ALL_STEPS.length - 1);
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

  if (!step) return null;

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
              {inBonus
                ? "\"Keep going — every answer makes me sharper. Or tap in whenever you're ready.\""
                : "\"Alright, let's figure out what you actually need.\""}
            </div>
          </div>
        </div>

        {/* GATE EXPLAINER BANNER */}
        {cameFromGate && !unlocked && (
          <div className="mb-6 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 flex items-start gap-3 animate-fade-up">
            <Lock className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-100">
              <strong className="text-white">The tools don't unlock yet.</strong> Flo needs to
              learn a few things about you and your business first. 3 minutes. Worth every second —
              every tool inside will be tailored to YOU after this.
            </div>
          </div>
        )}

        {/* UNLOCK BANNER — shows the moment completeness passes 80 */}
        {unlocked && (
          <div className="mb-6 rounded-xl border border-lead-400/30 bg-lead-500/10 p-4 flex items-start gap-3 animate-fade-up">
            <DoorOpen className="h-5 w-5 text-lead-300 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 text-sm text-lead-50">
              <strong className="text-white">The dashboard is unlocked.</strong> You can keep
              answering as long as you like — every answer pushes straight into your tools — or hop
              in anytime.
            </div>
            <button
              onClick={exitToDashboard}
              disabled={exiting}
              className="btn-accent text-xs py-2 px-3 shrink-0 disabled:opacity-60"
            >
              {exiting ? "Taking you in…" : (<>Take me in <ArrowRight className="h-3.5 w-3.5" /></>)}
            </button>
          </div>
        )}

        {/* HEADER + PROGRESS */}
        <header className="mb-6 md:mb-8 animate-fade-up">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-300">
            {inBonus ? <InfinityIcon className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            {inBonus ? "Deepen Flo's picture of you" : "Flo is learning you"}
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-sm text-ink-300">
              {inBonus
                ? <>Bonus question {stepIdx - FIRST_BONUS_INDEX + 1} of {BONUS_STEPS.length} <span className="text-ink-400">· optional</span></>
                : <>Question {stepIdx + 1} of {FIRST_BONUS_INDEX}</>}
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
              <TextInput step={step} current={answers[step.slot] || ""} onSubmit={saveAnswer} disabled={saving} />
            )}
            {step.kind === "text-long" && (
              <TextArea step={step} current={answers[step.slot] || ""} onSubmit={saveAnswer} disabled={saving} />
            )}
            {step.kind === "state-picker" && (
              <StatePicker step={step} current={answers[step.slot] || ""} onPick={saveAnswer} disabled={saving} />
            )}
          </div>

          {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
        </section>

        {/* FOOTER NAV */}
        <footer className="mt-10 flex items-center justify-between gap-3 flex-wrap text-sm">
          <button
            onClick={goBack}
            disabled={stepIdx === 0 || saving}
            className="inline-flex items-center gap-2 text-ink-300 hover:text-white disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </button>

          <div className="flex items-center gap-3 flex-wrap justify-end">
            {inBonus && (
              <span className="text-xs text-ink-400">
                {bonusAnsweredCount} of {BONUS_STEPS.length} bonus answered
              </span>
            )}
            {unlocked ? (
              <button
                onClick={exitToDashboard}
                disabled={exiting}
                className="btn-accent text-xs py-2 px-3 inline-flex items-center gap-1 disabled:opacity-60"
              >
                {exiting ? "Taking you in…" : (<>I'm ready — take me in <ArrowRight className="h-3.5 w-3.5" /></>)}
              </button>
            ) : (
              <span className="text-ink-300">
                Flo needs {Math.max(0, 80 - completeness)}% more before the dashboard unlocks
              </span>
            )}
          </div>
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
      onSubmit={(e) => { e.preventDefault(); if (v.trim()) onSubmit(v.trim()); }}
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
      onSubmit={(e) => { e.preventDefault(); if (v.trim()) onSubmit(v.trim()); }}
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
