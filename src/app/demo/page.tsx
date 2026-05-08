// src/app/demo/page.tsx — Public, no-login demo of the back-office dashboard.
//
// Buyers see this BEFORE paying so they know what they're getting. It's a
// self-contained replica of the post-login dashboard with mock data and a
// banner that funnels visitors to /tiers, /book, or /login.
//
// Lives outside /dashboard/* so it skips the auth + BrainProfile middleware
// gates entirely.

import Link from "next/link";
import {
  ArrowRight, BadgeCheck, BarChart3, Bot, Calendar, Check, ChevronRight,
  FileText, IdCard, Inbox, LayoutDashboard, Lightbulb, MessageSquareQuote,
  Phone, Settings, ShieldCheck, Sparkles, Star, Target, TrendingUp, Users,
  Workflow, Zap,
} from "lucide-react";
import { LightHeader, LightFooter } from "@/components/site/LightHeader";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "Demo · Inside the Operator's Office — The LeadFlow Pro",
  description:
    "What you see after signing in: lead inbox, AI insights, automations, playbooks, FlowCard, and your social-growth scoreboard. No login required to look around.",
  path: "/demo",
  imageTitle: "Inside the Client Office",
  imageSubtitle: "Lead inbox, AI insights, automations, playbooks, and social-growth scoreboard.",
});

const SIDEBAR = [
  { label: "Overview",        icon: LayoutDashboard, active: true  },
  { label: "Lead Inbox",      icon: Inbox,           active: false },
  { label: "AI Chatbot",      icon: Bot,             active: false },
  { label: "Automations",     icon: Workflow,        active: false },
  { label: "Playbooks",       icon: FileText,        active: false },
  { label: "Scripts library", icon: MessageSquareQuote, active: false },
  { label: "AI Insights",     icon: Sparkles,        active: false },
  { label: "Target Audience", icon: Target,          active: false },
  { label: "Ad Copy",         icon: BadgeCheck,      active: false },
  { label: "Social Accounts", icon: Users,           active: false },
  { label: "FlowCard",        icon: IdCard,          active: false },
  { label: "Settings",        icon: Settings,        active: false },
];

const KPIS = [
  { label: "Leads this month",  value: "37",     sub: "+12 vs last 30 days", tone: "lead"   },
  { label: "Cost per lead",     value: "$24.18", sub: "Across all channels", tone: "cyan"   },
  { label: "Conversion rate",   value: "11.4%",  sub: "Lead → paying client", tone: "accent" },
  { label: "MRR managed",       value: "$8,420", sub: "From your funnels",    tone: "brand"  },
];

const NEXT_MOVES = [
  {
    title: "Reply to Maria @ Whitfield Roofing",
    note: "Submitted a quote request 4 hours ago. High score: 87.",
    eta: "Reply within 1 hour",
    cta: "Open conversation",
    tone: "rose",
    Icon: Phone,
  },
  {
    title: "Approve this week's TikTok script",
    note: "Hook v3 + caption variant for the 'algorithm rewards X' video.",
    eta: "Posts Friday 9 a.m.",
    cta: "Review draft",
    tone: "cyan",
    Icon: MessageSquareQuote,
  },
  {
    title: "Run Facebook Ads weekly check-in",
    note: "CPL trending down 18% this week. Reallocate budget toward 'Builders 35–55'?",
    eta: "Recommended now",
    cta: "Open ad insights",
    tone: "accent",
    Icon: BarChart3,
  },
];

const RECENT_LEADS = [
  { name: "Maria L. — Whitfield Roofing", source: "FB Ads",     status: "New",       score: 87, time: "4h ago" },
  { name: "Brian S. — East Tex Mortgage",  source: "Cal.com",    status: "Booked",    score: 76, time: "yesterday" },
  { name: "Tasha P. — Premier Dental",     source: "Site form",  status: "Won",       score: 91, time: "2d ago" },
  { name: "Cole R. — Solar Pro",           source: "X / Twitter", status: "Working",   score: 64, time: "3d ago" },
  { name: "Janet F. — Wholesale Universe", source: "TikTok DM",  status: "Nurturing", score: 58, time: "4d ago" },
];

const PLAYBOOKS = [
  { name: "Local Service Lead Engine", subs: "Roofers, dentists, contractors", classes: "border-cyan-200 bg-cyan-50"     },
  { name: "Mortgage Originator OS",     subs: "Independent originators",        classes: "border-accent-300 bg-accent-300/20" },
  { name: "Creator Growth Sprint",      subs: "0 → 10K followers in 90 days",   classes: "border-lead-200 bg-lead-50"     },
  { name: "B2B SaaS Demo Funnel",       subs: "Free demo → $1K MRR → $5K MRR",  classes: "border-brand-200 bg-brand-50"   },
];

const INSIGHTS = [
  "Your Facebook page is converting 2.3× better on weekday mornings than nights — shift 70% of posts to 7–10 a.m.",
  "Three leads from the same neighborhood (Bullard) — open a hyper-local ad set there next week.",
  "Your TikTok hook v2 outperformed v1 by 4.1× CTR — Flo is rewriting your next 3 scripts in the v2 voice.",
];

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <LightHeader />

      {/* Demo banner */}
      <div className="bg-gradient-to-r from-cyan-500 via-brand-600 to-accent-500 text-white">
        <div className="mx-auto max-w-7xl px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs sm:text-sm">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4" />
            DEMO MODE — this is exactly what you see after you sign in. Numbers below are sample data.
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/login" className="inline-flex items-center gap-1 rounded-lg bg-white/15 hover:bg-white/25 px-3 py-1 font-semibold">
              Sign in to your real one <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link href="/tiers" className="inline-flex items-center gap-1 rounded-lg bg-white text-slate-900 hover:bg-slate-100 px-3 py-1 font-semibold">
              See pricing
            </Link>
          </div>
        </div>
      </div>

      {/* Headline */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs uppercase tracking-widest text-cyan-700">
          <LayoutDashboard className="h-3.5 w-3.5" /> Inside the Operator's Office
        </div>
        <h1 className="mt-4 text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-slate-950 leading-tight max-w-4xl">
          Every lead, every move, every algorithm signal —{" "}
          <span className="bg-gradient-to-r from-brand-700 to-cyan-500 bg-clip-text text-transparent">
            one screen.
          </span>
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-slate-700">
          When you buy any package — even the $90 Decision Sprint — your email gets you in here.
          This is the dashboard your business runs on. Browse it before you decide.
        </p>
      </section>

      {/* Mock dashboard */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/50">
          <div className="flex flex-col lg:flex-row min-h-[640px]">
            {/* Sidebar mock */}
            <aside className="lg:w-64 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50">
              <div className="p-4 border-b border-slate-200 flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-brand-600 to-cyan-500" />
                <div>
                  <div className="text-sm font-bold text-slate-950 leading-tight">The LeadFlow Pro</div>
                  <div className="text-[10px] text-slate-500">Operator's Office</div>
                </div>
              </div>
              <nav className="p-3 space-y-1">
                {SIDEBAR.map((s) => (
                  <div
                    key={s.label}
                    className={
                      s.active
                        ? "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold text-cyan-800 bg-cyan-50 border border-cyan-200"
                        : "flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-white"
                    }
                  >
                    <s.icon className={`h-4 w-4 ${s.active ? "text-cyan-700" : "text-slate-400"}`} />
                    {s.label}
                  </div>
                ))}
              </nav>
              <div className="m-3 mt-1 rounded-xl border border-slate-200 bg-white p-3 text-xs">
                <div className="font-semibold text-slate-950">Pro plan</div>
                <div className="text-slate-500 mt-0.5">Unlimited AI insights · 5,000 leads/mo</div>
                <div className="mt-2 text-cyan-700 font-semibold flex items-center gap-1">
                  Manage plan <ChevronRight className="h-3 w-3" />
                </div>
              </div>
            </aside>

            {/* Main mock */}
            <div className="flex-1 p-5 sm:p-7 space-y-7">
              {/* Topbar */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-xs uppercase tracking-widest text-cyan-700 font-semibold">
                    Welcome, Operator
                  </div>
                  <h2 className="text-2xl font-bold text-slate-950">
                    Your dashboard — honest from day one
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-lead-300 bg-lead-50 px-2.5 py-0.5 text-xs font-semibold text-lead-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-lead-500 animate-pulse" />
                    Live
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs text-slate-600">
                    <Calendar className="h-3 w-3" /> Last 30 days
                  </span>
                </div>
              </div>

              {/* KPIs */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {KPIS.map((k) => (
                  <KpiCard key={k.label} {...k} />
                ))}
              </div>

              {/* Next moves + leads */}
              <div className="grid gap-5 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-950">Your next 3 moves</h3>
                    <span className="text-xs text-slate-500">Auto-prioritized by Flo</span>
                  </div>
                  {NEXT_MOVES.map((m) => (
                    <NextMove key={m.title} {...m} />
                  ))}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-950">Recent leads</h3>
                    <span className="text-xs text-cyan-700 font-semibold">View inbox →</span>
                  </div>
                  <ul className="mt-3 space-y-3">
                    {RECENT_LEADS.map((l) => (
                      <li key={l.name} className="rounded-xl bg-white border border-slate-200 p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-950 truncate">{l.name}</span>
                          <span className="text-[10px] uppercase tracking-widest text-slate-500 shrink-0">{l.time}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs">
                          <span className="text-slate-600">{l.source}</span>
                          <StatusPill status={l.status} score={l.score} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Insights + playbooks */}
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-brand-50 p-5">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-cyan-700 font-semibold">
                    <Sparkles className="h-3.5 w-3.5" /> AI insights · this week
                  </div>
                  <ul className="mt-3 space-y-3">
                    {INSIGHTS.map((i, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed">
                        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" />
                        <span>{i}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500 font-semibold">
                    <FileText className="h-3.5 w-3.5" /> Your active playbooks
                  </div>
                  <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PLAYBOOKS.map((p) => (
                      <li key={p.name} className={`rounded-xl border ${p.classes} p-3`}>
                        <div className="text-sm font-semibold text-slate-950">{p.name}</div>
                        <div className="text-xs text-slate-600 mt-1">{p.subs}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What unlocks when you log in */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:py-16">
          <div className="text-xs uppercase tracking-widest text-cyan-700 font-semibold mb-2">
            What unlocks the moment you sign in
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950 max-w-3xl">
            Not just a checkout receipt. A full operating system.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Feature Icon={Inbox}     title="Lead Inbox"     body="Every lead from every source — FB ads, site forms, Cal.com bookings, missed calls — in one queue, scored and prioritized." />
            <Feature Icon={Bot}       title="AI Chatbot"     body="Trained on your business, your offers, your tone. Answers leads at 2 a.m. and books them straight into your calendar." />
            <Feature Icon={Workflow}  title="Automations"    body="Missed-call text-back, follow-up sequences, review-request flows. Set once, work forever." />
            <Feature Icon={FileText}  title="Playbooks"      body="Step-by-step plans for ads, content, follow-up. Pick the one that fits your business and Flo runs the play with you." />
            <Feature Icon={Sparkles}  title="AI Insights"    body="Flo watches your data weekly and tells you what's working, what's bleeding money, and where to lean in next." />
            <Feature Icon={IdCard}    title="FlowCard"       body="Digital business card you can text in 2 taps. Tracks who scanned, who tapped, and who turned into a lead." />
            <Feature Icon={Target}    title="Target Audience" body="The exact ICP for your business — interests, demographics, locations — built from your data, not generic templates." />
            <Feature Icon={BadgeCheck} title="Ad Copy"        body="Headlines, hooks, descriptions tailored to YOUR offer — not 'use this for any business' boilerplate." />
            <Feature Icon={Users}     title="Social Accounts" body="Connect TikTok, FB, X, YouTube, Instagram. Live follower counts, engagement, post-by-post performance." />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-slate-200 bg-gradient-to-br from-slate-50 via-white to-cyan-50">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs uppercase tracking-widest text-cyan-700">
            <Zap className="h-3.5 w-3.5" /> Ready to step inside?
          </div>
          <h2 className="mt-5 text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950">
            Three doors to the same operating system.
          </h2>
          <p className="mt-3 text-slate-700 max-w-2xl mx-auto">
            Buy a package. Book the 10-min call. Or sign in if Ryan already created your account.
            Same dashboard either way.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/offers/decision-sprint"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              Buy the $90 Sprint <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/book"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-semibold text-white shadow-sm hover:bg-accent-600"
            >
              Book the 10-min call
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 hover:border-brand-500 hover:text-brand-700"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <LightFooter />
    </div>
  );
}

/* ─── components ──────────────────────────────────────────────── */

function KpiCard({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: string }) {
  const toneMap: Record<string, string> = {
    lead:   "from-lead-50 to-white border-lead-200",
    cyan:   "from-cyan-50 to-white border-cyan-200",
    accent: "from-accent-300/30 to-white border-accent-300",
    brand:  "from-brand-50 to-white border-brand-200",
  };
  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${toneMap[tone]} p-4`}>
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-950 tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-slate-600">{sub}</div>
    </div>
  );
}

function NextMove({ title, note, eta, cta, tone, Icon }: {
  title: string; note: string; eta: string; cta: string; tone: string; Icon: any;
}) {
  const toneMap: Record<string, string> = {
    rose:   "border-rose-200 bg-rose-50/50",
    cyan:   "border-cyan-200 bg-cyan-50/50",
    accent: "border-accent-300 bg-accent-300/20",
  };
  const iconTone: Record<string, string> = {
    rose:   "bg-rose-100 text-rose-700",
    cyan:   "bg-cyan-100 text-cyan-700",
    accent: "bg-accent-300/40 text-accent-600",
  };
  return (
    <div className={`rounded-2xl border ${toneMap[tone]} p-4 flex items-start gap-3`}>
      <div className={`h-10 w-10 shrink-0 rounded-xl ${iconTone[tone]} flex items-center justify-center`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-950">{title}</div>
        <div className="text-sm text-slate-600 mt-0.5">{note}</div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-[11px] uppercase tracking-widest text-slate-500">{eta}</span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-700">
            {cta} <ChevronRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status, score }: { status: string; score: number }) {
  const tone: Record<string, string> = {
    "New":        "bg-cyan-100 text-cyan-800",
    "Booked":     "bg-accent-300/40 text-accent-700",
    "Won":        "bg-lead-100 text-lead-800",
    "Working":    "bg-slate-100 text-slate-700",
    "Nurturing":  "bg-amber-100 text-amber-800",
  };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${tone[status] || "bg-slate-100 text-slate-700"}`}>
        {status}
      </span>
      <span className="text-[10px] text-slate-500 font-semibold">· {score}</span>
    </span>
  );
}

function Feature({ Icon, title, body }: { Icon: any; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-brand-600 text-white">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-semibold text-slate-950 text-lg">{title}</h3>
      <p className="mt-2 text-sm text-slate-700 leading-relaxed">{body}</p>
    </div>
  );
}
