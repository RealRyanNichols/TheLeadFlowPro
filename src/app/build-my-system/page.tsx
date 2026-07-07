import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Boxes,
  CheckCircle2,
  Database,
  DollarSign,
  GitBranch,
  Globe,
  GraduationCap,
  LayoutDashboard,
  Layers,
  Lock,
  Megaphone,
  Palette,
  Rocket,
  Route,
  Send,
  ShieldCheck,
  Sparkles,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Build My System — A System That's 100% Yours | The LeadFlow Pro",
  description:
    "For creators, coaches, and course sellers: a done-for-you website, lead-flow, marketing automation, and course system built on GitHub, Vercel, and Supabase that you own outright — no Wix, WordPress, or Kajabi lock-in.",
};

/* ─── who it's for ─────────────────────────────────────────────── */
const audience: Array<{ title: string; body: string; icon: LucideIcon }> = [
  { title: "Course creators", body: "You have knowledge to package into courses, quizzes, and content people pay for.", icon: GraduationCap },
  { title: "Coaches & teachers", body: "You sell a product and educate clients — schools, training, cohorts, memberships.", icon: Sparkles },
  { title: "Operators who want to own it", body: "You're done renting your business from Wix, Shopify, or a page builder you can't control.", icon: Lock },
];

/* ─── own vs rent ──────────────────────────────────────────────── */
const rented = [
  "Monthly rent forever, or it all disappears",
  "Their platform, their rules, their limits",
  "Your data and analytics live on their servers",
  "Locked into their templates and their checkout",
  "You never actually own what you built",
];
const owned = [
  "Built on GitHub, Vercel, and Supabase — yours to keep",
  "Your code, your database, your domain, your rules",
  "Track analytics like a real product, first-party",
  "Website + funnel + courses + automation in one owned stack",
  "If we ever part ways, the whole system stays with you",
];

/* ─── the stack ────────────────────────────────────────────────── */
const stack: Array<{ name: string; role: string; icon: LucideIcon }> = [
  { name: "GitHub", role: "Your code and version history — the source of truth you own.", icon: GitBranch },
  { name: "Vercel", role: "Hosting, deploys, and first-party analytics for your site.", icon: Globe },
  { name: "Supabase", role: "Your database: leads, members, courses, and orders.", icon: Database },
  { name: "Figma", role: "Design system and pages before a line of code ships.", icon: Palette },
  { name: "Claude · ChatGPT · Grok", role: "The AI build stack that makes a full system possible fast.", icon: Bot },
  { name: "Zapier · Make", role: "Automation glue between your tools and your CRM.", icon: Workflow },
  { name: "Resend · Kajabi · AWeber", role: "Email and courses — send campaigns, host lessons, run quizzes.", icon: Send },
  { name: "Meta Business Suite", role: "Facebook & Instagram ads wired to your owned funnel.", icon: Megaphone },
];

/* ─── what's included ──────────────────────────────────────────── */
const includes: Array<{ title: string; body: string; icon: LucideIcon; accent: "cyan" | "lead" | "accent" }> = [
  { title: "Your owned website + funnel", body: "A real site and lead-capture funnel on your domain — not a rented page builder.", icon: Route, accent: "cyan" },
  { title: "Lead flow + CRM", body: "Capture, score, route, and follow up on every call, form, DM, and click.", icon: LayoutDashboard, accent: "lead" },
  { title: "Email + SMS + ads automation", body: "Campaigns across email, SMS, and Facebook/Google ads, connected end to end.", icon: Send, accent: "accent" },
  { title: "Courses, quizzes & content", body: "Build and sell courses with quizzes and lessons on Kajabi or your own owned stack.", icon: GraduationCap, accent: "cyan" },
  { title: "Analytics you control", body: "Track traffic, leads, and sales first-party — like Vercel analytics, but yours.", icon: Boxes, accent: "lead" },
  { title: "Connectors + AI", body: "Wire it into Claude, ChatGPT, Grok, and the tools you already use.", icon: Layers, accent: "accent" },
];

/* ─── process ──────────────────────────────────────────────────── */
const steps: Array<{ n: string; title: string; body: string }> = [
  { n: "1", title: "Scope your offer & teaching", body: "What you sell, who you teach, and the outcome your clients pay for. We map it before we build." },
  { n: "2", title: "Design the system", body: "Pages, funnel, course structure, and data model — designed in Figma so you see it first." },
  { n: "3", title: "Build the owned stack", body: "GitHub + Vercel + Supabase, assembled with the AI build stack into a system that's yours." },
  { n: "4", title: "Wire automation & courses", body: "Email, SMS, ads, quizzes, and follow-up connected end to end and tested live." },
  { n: "5", title: "Hand off & train you", body: "You get the keys, a walkthrough, and the docs. You run it — or I keep running it for you." },
];

/* ─── ways to start (real offers) ──────────────────────────────── */
const ladder: Array<{ price: string; title: string; fit: string; href: string; tone: "entry" | "core" | "premium" }> = [
  { price: "$497", title: "Lead Leak Audit", fit: "See what's leaking and the order to fix it before we build.", href: "/offers/business-audit", tone: "entry" },
  { price: "$1,500", title: "Funnel Page", fit: "One built, embedded funnel page wired to your CRM.", href: "/offers/funnel-page", tone: "core" },
  { price: "$2,500/mo", title: "Done-For-You", fit: "We run pixels, funnels, SEO, ranking, and delivery for you.", href: "/offers/done-for-you", tone: "premium" },
  { price: "Custom", title: "Full System Build", fit: "The whole owned system — site, courses, automation, analytics — tailor-made for you.", href: "/contact", tone: "core" },
];

export default function BuildMySystemPage() {
  return (
    <>
      <Header />
      <main className="pb-24">
        {/* Hero */}
        <section className="relative isolate overflow-hidden border-b border-white/10 py-14 md:py-20">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_10%,rgba(255,186,61,0.2),transparent_32%),radial-gradient(circle_at_80%_16%,rgba(35,184,255,0.18),transparent_34%),linear-gradient(135deg,#030711_0%,#07101c_50%,#101108_100%)]" />
          <div className="container">
            <p className="inline-flex items-center gap-2 rounded-lg border border-accent-300/30 bg-accent-300/10 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-accent-200">
              <Rocket className="h-4 w-4" />
              Build my system · for creators, coaches &amp; course sellers
            </p>
            <h1 className="mt-6 max-w-5xl text-4xl font-black leading-[0.96] tracking-normal text-white md:text-7xl">
              Own the whole system.
              <span className="mt-3 block bg-gradient-to-r from-cyan-200 via-white to-accent-200 bg-clip-text text-transparent">
                Not another account you rent.
              </span>
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-ink-100 md:text-xl">
              I build creators, coaches, and course sellers a complete system that is <strong>100% yours</strong> —
              website, lead flow, email + SMS + ads automation, and your courses — on GitHub, Vercel, and Supabase.
              You own it. You track it. It is tailor-made for you.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/contact?topic=build-my-system" className="btn-accent text-base">
                Book a build call
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/problem-intake" className="btn-ghost text-base">
                Start with a plan
              </Link>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ["7–8 months, 60–80 hrs/wk", "Spent learning this stack with AI so you don't have to."],
                ["You own it outright", "GitHub, Vercel, Supabase — no monthly hostage fees."],
                ["Built for teaching", "Sell a product and educate your clients in one system."],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
                  <p className="mt-2 text-sm font-bold leading-5 text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Who it's for */}
        <section className="py-14 md:py-20">
          <div className="container">
            <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Who this is for</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight text-white md:text-5xl">
              You want to sell a product and teach your clients.
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {audience.map((a) => {
                const Icon = a.icon;
                return (
                  <article key={a.title} className="lead-panel flex min-h-52 flex-col p-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-2xl font-black leading-tight text-white">{a.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-ink-200">{a.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Own vs rent */}
        <section className="border-y border-white/10 bg-ink-900/45 py-14 md:py-20">
          <div className="container">
            <div className="max-w-3xl">
              <p className="text-xs font-extrabold uppercase tracking-wider text-accent-300">Own it, don't rent it</p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-white md:text-5xl">
                Stop renting your business from a page builder.
              </h2>
              <p className="mt-4 text-base leading-7 text-ink-200 md:text-lg">
                Wix, WordPress, Shopify, GoDaddy, and locked-in course platforms rent you a business you never own. I
                build you the real thing on GitHub, Vercel, and Supabase — a system that stays yours.
              </p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-red-300/20 bg-red-400/[0.06] p-6">
                <p className="text-xs font-extrabold uppercase tracking-wider text-red-200">Rented</p>
                <ul className="mt-4 space-y-3">
                  {rented.map((r) => (
                    <li key={r} className="flex gap-3 text-sm leading-6 text-ink-100">
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-lead-300/25 bg-lead-300/[0.08] p-6">
                <p className="text-xs font-extrabold uppercase tracking-wider text-lead-200">Owned — what I build</p>
                <ul className="mt-4 space-y-3">
                  {owned.map((o) => (
                    <li key={o} className="flex gap-3 text-sm leading-6 text-ink-100">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-lead-300" />
                      {o}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* The stack */}
        <section className="py-14 md:py-20">
          <div className="container">
            <div className="max-w-3xl">
              <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">The stack I build on</p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-white md:text-5xl">
                The tools most people can't figure out — handled for you.
              </h2>
              <p className="mt-4 text-base leading-7 text-ink-200 md:text-lg">
                GitHub, Vercel, Supabase, Figma, and the AI build stack are how modern software gets made. Most owners
                never learn them. That's the point — I do the work, you own the result.
              </p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stack.map((t) => {
                const Icon = t.icon;
                return (
                  <div key={t.name} className="lead-panel flex min-h-44 flex-col p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-cyan-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-lg font-black text-white">{t.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink-300">{t.role}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* What's included */}
        <section className="border-y border-white/10 bg-ink-900/45 py-14 md:py-20">
          <div className="container">
            <div className="max-w-3xl">
              <p className="text-xs font-extrabold uppercase tracking-wider text-accent-300">What your system includes</p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-white md:text-5xl">
                One owned system, not ten subscriptions duct-taped together.
              </h2>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {includes.map((item) => {
                const Icon = item.icon;
                const accentClass = {
                  accent: "border-accent-300/25 bg-accent-300/10 text-accent-100",
                  cyan: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
                  lead: "border-lead-300/25 bg-lead-300/10 text-lead-100",
                }[item.accent];
                return (
                  <article key={item.title} className="lead-panel flex min-h-56 flex-col p-5">
                    <div className={cn("flex h-11 w-11 items-center justify-center rounded-lg border", accentClass)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-xl font-black leading-tight text-white">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-ink-200">{item.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Process */}
        <section className="py-14 md:py-20">
          <div className="container">
            <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">How the build works</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight text-white md:text-5xl">
              From your idea to a system you own — in clear steps.
            </h2>
            <div className="mt-8 grid gap-3">
              {steps.map((s) => (
                <div key={s.n} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-4 rounded-lg border border-white/10 bg-white/[0.035] p-5 md:grid-cols-[3.5rem_minmax(0,1fr)]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-lg font-black text-cyan-100">
                    {s.n}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">{s.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-ink-300">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Ways to start */}
        <section className="border-y border-white/10 bg-ink-900/45 py-14 md:py-20">
          <div className="container">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-extrabold uppercase tracking-wider text-accent-300">Ways to start</p>
                <h2 className="mt-3 text-3xl font-black leading-tight text-white md:text-5xl">Start small or build the whole thing.</h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-ink-300">
                No revenue or ranking promises. Real strategy, build, tracking, and execution. Every paid engagement
                runs under a Texas-law letter + mutual NDA.
              </p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {ladder.map((offer) => {
                const toneClass = {
                  entry: "border-white/10 bg-white/[0.035]",
                  core: "border-cyan-300/20 bg-cyan-300/10",
                  premium: "border-accent-300/25 bg-accent-300/10",
                }[offer.tone];
                return (
                  <article key={offer.title} className={cn("flex flex-col rounded-lg border p-5 shadow-2xl shadow-black/20", toneClass)}>
                    <div className="grid min-h-12 min-w-20 place-items-center self-start rounded-lg border border-white/10 bg-ink-950/60 px-3 text-center">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5 text-accent-300" />
                        <strong className="text-base font-black leading-none text-white">{offer.price}</strong>
                      </div>
                    </div>
                    <h3 className="mt-4 text-xl font-black leading-tight text-white">{offer.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-6 text-ink-200">{offer.fit}</p>
                    <Link href={offer.href} className="btn-ghost mt-5 w-full justify-center text-sm">
                      {offer.price === "Custom" ? "Scope it" : "See details"}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-14 md:py-20">
          <div className="container">
            <div className="lead-shell overflow-hidden p-6 md:p-10">
              <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-lg border border-lead-300/25 bg-lead-300/10 px-3 py-2 text-xs font-extrabold uppercase tracking-wider text-lead-100">
                    <ShieldCheck className="h-4 w-4" /> Tailor-made for you
                  </div>
                  <h2 className="mt-5 max-w-3xl text-3xl font-black leading-tight text-white md:text-5xl">
                    Tell me what you teach. I&apos;ll design the system you&apos;ll own.
                  </h2>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-ink-200 md:text-lg">
                    Bring your offer, your audience, and where you&apos;re stuck. I&apos;ll map the build — site, funnel,
                    courses, and automation — and show you exactly what becomes yours.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <Link href="/contact?topic=build-my-system" className="btn-accent justify-center text-base">
                    Book a build call <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/connectors" className="btn-ghost justify-center text-base">
                    See the connector system
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
