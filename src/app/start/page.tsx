// src/app/start/page.tsx — Universal intake form.
//
// Single page, no JS required. Big tappable card buttons styled as radios so
// the form FEELS like a journey instead of a wall of fields. Posts to
// /api/intake which redirects to the right next page based on budgetTier.
//
// Light theme, RepWatchr-inspired.

import Link from "next/link";
import {
  ArrowRight, Briefcase, Building2, Check, Clock, DollarSign, Globe2,
  Megaphone, MessageCircle, Sparkles, Target, TrendingUp, Users, Zap,
} from "lucide-react";

export const metadata = {
  title: "Start Here — Tell Us About Your Business · The LeadFlow Pro",
  description:
    "2-minute intake. Tell us where you're at, what you're trying to grow, and how we can help. We route you to the right tier — Free, Starter, Pro, Power, or 1:1 with Ryan.",
};

const REVENUE_OPTIONS = [
  { v: "<10k",      label: "Under $10K/mo",   note: "Just starting" },
  { v: "10-50k",    label: "$10K–$50K/mo",    note: "Building" },
  { v: "50-250k",   label: "$50K–$250K/mo",   note: "Scaling" },
  { v: "250k-1m",   label: "$250K–$1M/mo",    note: "Established" },
  { v: "1m+",       label: "$1M+/mo",         note: "Multi-7-figure" },
];

const GOAL_OPTIONS = [
  { v: "leads",     icon: Target,     label: "More qualified leads" },
  { v: "followers", icon: Users,      label: "More followers / reach" },
  { v: "sales",     icon: DollarSign, label: "More sales" },
  { v: "brand",     icon: Sparkles,   label: "Brand presence" },
  { v: "launch",    icon: Zap,        label: "Launch a product / offer" },
  { v: "ads",       icon: Megaphone,  label: "Paid ads that convert" },
];

const TIER_OPTIONS = [
  {
    v: "free",
    title: "Free",
    price: "$0",
    cadence: "/mo",
    note: "Connect 1 social, basic analytics, see what's possible",
    icon: Sparkles,
    color: "slate",
  },
  {
    v: "starter",
    title: "Starter",
    price: "$47",
    cadence: "/mo",
    note: "3 socials, actionable Looking Glass, template starter pack",
    icon: TrendingUp,
    color: "cyan",
  },
  {
    v: "pro",
    title: "Pro",
    price: "$197",
    cadence: "/mo",
    note: "All socials, unlimited Looking Glass, monthly office hours",
    icon: Briefcase,
    color: "brand",
  },
  {
    v: "power",
    title: "Power",
    price: "$497",
    cadence: "/mo",
    note: "Weekly office hours, direct Voxer/Slack, quarterly 1:1",
    icon: Zap,
    color: "accent",
  },
  {
    v: "vip",
    title: "1:1 with Ryan",
    price: "$1,997+",
    cadence: "/mo",
    note: "Fractional Operator, DFY social, FB Ads management, VIP",
    icon: ShieldStar,
    color: "lead",
  },
];

const CONTACT_METHODS = [
  { v: "email", label: "Email" },
  { v: "phone", label: "Phone call" },
  { v: "text",  label: "Text" },
  { v: "any",   label: "Any of the above" },
];

export default function StartPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="font-semibold text-slate-900 hover:text-slate-700">
            The LeadFlow Pro
          </Link>
          <Link
            href="/grow"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            ← Back to Grow
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 pt-12 pb-6 sm:pt-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs uppercase tracking-widest text-slate-600">
          <Clock className="h-3.5 w-3.5 text-cyan-600" /> 2-minute intake
        </div>
        <h1 className="mt-4 text-3xl sm:text-5xl font-bold tracking-tight text-slate-950">
          Tell us where you are.{" "}
          <span className="text-slate-500">We'll route you to the right next move.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-700">
          No "contact sales" runaround. Answer a few questions, and the next page is the one
          that fits where you actually are — Free, Starter, Pro, Power, or 1:1 with Ryan.
        </p>
      </section>

      {/* Form */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 pb-20">
        <form action="/api/intake" method="POST" className="space-y-10">
          {/* 1. Socials */}
          <FormSection
            n={1}
            title="Where are you posting today?"
            sub="Drop your handle on any platform you're already on. Skip the ones you're not."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <SocialInput name="platforms.tiktok"    label="TikTok"      placeholder="@your_handle" tone="#000" />
              <SocialInput name="platforms.facebook"  label="Facebook"    placeholder="Page name or URL" tone="#1877F2" />
              <SocialInput name="platforms.x"         label="X / Twitter" placeholder="@your_handle" tone="#0F1419" />
              <SocialInput name="platforms.youtube"   label="YouTube"     placeholder="Channel name or URL" tone="#FF0000" />
              <SocialInput name="platforms.instagram" label="Instagram"   placeholder="@your_handle" tone="#E4405F" />
              <SocialInput name="platforms.linkedin"  label="LinkedIn"    placeholder="Profile or company URL" tone="#0A66C2" />
            </div>
          </FormSection>

          {/* 2. Stage / revenue */}
          <FormSection
            n={2}
            title="Where is your business right now?"
            sub="Be honest — there's a tier for every stage."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {REVENUE_OPTIONS.map((o) => (
                <CardRadio
                  key={o.v}
                  name="monthlyRevenueRange"
                  value={o.v}
                  title={o.label}
                  sub={o.note}
                />
              ))}
            </div>
          </FormSection>

          {/* 3. Biggest goal */}
          <FormSection
            n={3}
            title="What do you want most in the next 90 days?"
            sub="Pick one — what would matter most if it moved."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {GOAL_OPTIONS.map((o) => (
                <IconRadio
                  key={o.v}
                  name="biggestGoal"
                  value={o.v}
                  icon={o.icon}
                  title={o.label}
                />
              ))}
            </div>
          </FormSection>

          {/* 4. Biggest blocker (free text) */}
          <FormSection
            n={4}
            title="What's actually in the way?"
            sub="Be specific. The more we understand the blocker, the better we route you."
          >
            <textarea
              name="biggestBlocker"
              rows={4}
              maxLength={1500}
              placeholder="Time? Money? Don't know what to post? Tried agencies and got burned? Just write it like you'd say it."
              className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
          </FormSection>

          {/* 5. Budget tier */}
          <FormSection
            n={5}
            title="What can you invest right now?"
            sub="There's a free version. There's a 1:1. Pick the one that fits today — you can always upgrade."
          >
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {TIER_OPTIONS.map((t) => (
                <TierRadio key={t.v} {...t} />
              ))}
            </div>
          </FormSection>

          {/* 6. Contact info */}
          <FormSection
            n={6}
            title="How do we reach you?"
            sub="We send the routing decision to you immediately. Your info isn't shared, sold, or pitched to a third party — ever."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField name="fullName"     label="Your name"           placeholder="First and last"  required />
              <TextField name="email"        label="Email"               placeholder="you@business.com" type="email" required />
              <TextField name="phone"        label="Phone (optional)"    placeholder="+1 555 123 4567" />
              <TextField name="businessName" label="Business name"       placeholder="What you call it" />
              <TextField name="businessUrl"  label="Business URL"        placeholder="https://" />
              <TextField name="industry"     label="Industry / niche"    placeholder="What you do" />
            </div>

            <div className="mt-5">
              <div className="text-sm font-semibold text-slate-700 mb-2">Best way to reach you?</div>
              <div className="flex flex-wrap gap-2">
                {CONTACT_METHODS.map((c) => (
                  <PillRadio key={c.v} name="bestContactMethod" value={c.v} label={c.label} />
                ))}
              </div>
            </div>

            <div className="mt-5">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Anything else we should know? (optional)
              </label>
              <textarea
                name="notes"
                rows={3}
                maxLength={2000}
                placeholder="Existing tools, audience size, biggest win to date, anything that helps us help you faster."
                className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
          </FormSection>

          {/* Submit */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">Ready when you are.</div>
              <div className="text-sm text-slate-600">We route you instantly to the right next page.</div>
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-semibold text-slate-950 shadow-sm hover:bg-accent-400"
            >
              Submit & route me <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <p className="text-xs text-slate-500 text-center max-w-3xl mx-auto leading-relaxed">
            Submitted to Real Ryan Nichols LLC, a Texas LLC. Your contact info is used to route
            you and follow up — never sold, shared, or used for anything else.
          </p>
        </form>
      </section>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */

function FormSection({
  n, title, sub, children,
}: { n: number; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm">
      <div className="flex items-start gap-4 mb-5">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white font-bold shrink-0">
          {n}
        </div>
        <div>
          <legend className="text-xl sm:text-2xl font-bold text-slate-950">{title}</legend>
          {sub && <p className="mt-1 text-sm text-slate-600">{sub}</p>}
        </div>
      </div>
      {children}
    </fieldset>
  );
}

function SocialInput({
  name, label, placeholder, tone,
}: { name: string; label: string; placeholder: string; tone: string }) {
  return (
    <label className="block">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: tone }} />
        <span className="text-sm font-semibold text-slate-700">{label}</span>
      </div>
      <input
        type="text"
        name={name}
        placeholder={placeholder}
        maxLength={120}
        className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
      />
    </label>
  );
}

function CardRadio({
  name, value, title, sub,
}: { name: string; value: string; title: string; sub?: string }) {
  return (
    <label className="group relative cursor-pointer">
      <input type="radio" name={name} value={value} className="peer sr-only" />
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all
                      hover:border-cyan-400 hover:bg-cyan-50/40
                      peer-checked:border-cyan-600 peer-checked:bg-cyan-50 peer-checked:ring-2 peer-checked:ring-cyan-500/30">
        <div className="font-semibold text-slate-950">{title}</div>
        {sub && <div className="mt-0.5 text-xs text-slate-600">{sub}</div>}
      </div>
    </label>
  );
}

function IconRadio({
  name, value, icon: Icon, title,
}: { name: string; value: string; icon: any; title: string }) {
  return (
    <label className="group relative cursor-pointer">
      <input type="radio" name={name} value={value} className="peer sr-only" />
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all
                      hover:border-cyan-400 hover:bg-cyan-50/40
                      peer-checked:border-cyan-600 peer-checked:bg-cyan-50 peer-checked:ring-2 peer-checked:ring-cyan-500/30">
        <Icon className="h-5 w-5 text-cyan-600 shrink-0" />
        <div className="font-semibold text-slate-950">{title}</div>
      </div>
    </label>
  );
}

function PillRadio({
  name, value, label,
}: { name: string; value: string; label: string }) {
  return (
    <label className="group cursor-pointer">
      <input type="radio" name={name} value={value} className="peer sr-only" />
      <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700
                       hover:border-cyan-400 hover:bg-cyan-50/40
                       peer-checked:border-cyan-600 peer-checked:bg-cyan-600 peer-checked:text-white">
        {label}
      </span>
    </label>
  );
}

function TextField({
  name, label, placeholder, type = "text", required = false,
}: { name: string; label: string; placeholder?: string; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        {required && <span className="text-xs text-rose-500">required</span>}
      </div>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        maxLength={300}
        className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
      />
    </label>
  );
}

function TierRadio({
  v, title, price, cadence, note, icon: Icon, color,
}: {
  v: string; title: string; price: string; cadence: string; note: string; icon: any; color: string;
}) {
  // Tone classes per tier
  const ringMap: Record<string, string> = {
    slate:  "peer-checked:border-slate-600 peer-checked:bg-slate-50 peer-checked:ring-slate-500/30",
    cyan:   "peer-checked:border-cyan-600 peer-checked:bg-cyan-50 peer-checked:ring-cyan-500/30",
    brand:  "peer-checked:border-brand-600 peer-checked:bg-brand-50 peer-checked:ring-brand-500/30",
    accent: "peer-checked:border-accent-500 peer-checked:bg-accent-50 peer-checked:ring-accent-400/40",
    lead:   "peer-checked:border-lead-600 peer-checked:bg-lead-400/10 peer-checked:ring-lead-500/30",
  };
  const iconMap: Record<string, string> = {
    slate:  "text-slate-600",
    cyan:   "text-cyan-600",
    brand:  "text-brand-600",
    accent: "text-accent-600",
    lead:   "text-lead-600",
  };
  return (
    <label className="group relative cursor-pointer block">
      <input type="radio" name="budgetTier" value={v} required className="peer sr-only" />
      <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all
                       hover:border-slate-400 hover:bg-slate-50
                       peer-checked:ring-2 ${ringMap[color]}`}>
        <div className="flex items-start justify-between gap-2">
          <Icon className={`h-6 w-6 ${iconMap[color]}`} />
          <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">{v}</span>
        </div>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-2xl font-bold text-slate-950">{price}</span>
          <span className="text-sm text-slate-500">{cadence}</span>
        </div>
        <div className="mt-1 font-semibold text-slate-900">{title}</div>
        <div className="mt-1 text-xs text-slate-600">{note}</div>
      </div>
    </label>
  );
}

// Lucide doesn't ship a "ShieldStar" — quick inline SVG so we don't add a dep.
function ShieldStar({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="M12 8.5l1.4 2.8 3.1.4-2.2 2.2.5 3.1L12 15.5l-2.8 1.5.5-3.1-2.2-2.2 3.1-.4Z" />
    </svg>
  );
}
