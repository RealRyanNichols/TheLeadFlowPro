import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Eye,
  Globe2,
  MessageSquareText,
  MousePointerClick,
  PhoneCall,
  Radar,
  Route,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { BuiltProjectCard } from "@/components/site/BuiltProjectCard";
import { VisitorIdField } from "@/components/site/VisitorIdField";
import { BUILT_PROJECTS } from "@/lib/built-projects";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const revalidate = 86400;

export const metadata = createSeoMetadata({
  title: "The LeadFlow Pro - Leads, Data, Automation, and AI Tools",
  description:
    "The LeadFlow Pro helps owner-led businesses turn sites, calls, DMs, ads, social content, and analytics into clearer lead flow, automation, and buyer action.",
  path: "/",
  imageTitle: "The LeadFlow Pro",
  imageSubtitle: "A business growth machine for leads, data, automation, and AI tools.",
});

const BEST_DEMOS = [
  {
    title: "Automated Growth Tools",
    body: "Enter business data, get the first readout, then unlock reports, scripts, maps, dashboards, and exports.",
    href: "/action-menu",
    cta: "Open menu",
    Icon: MousePointerClick,
  },
  {
    title: "Growth Machine Tool",
    body: "Put in visitors, leads, response speed, tracking, proof, automation, and offer data. Get the machine score.",
    href: "/tools/growth-machine",
    cta: "Run tool",
    Icon: ClipboardCheck,
  },
  {
    title: "Pulse Analytics",
    body: "See views, clicks, questions, source paths, and buying signals instead of guessing what happened.",
    href: "/pulse",
    cta: "Open pulse",
    Icon: BarChart3,
  },
  {
    title: "Automation Blueprint",
    body: "Turn a repeated task, customer path, or tool idea into an input-output map and build checklist.",
    href: "/tools/growth-machine#automation-map",
    cta: "Open blueprint",
    Icon: Bot,
  },
];

const ROUTES = [
  { label: "Automated Growth Tools", href: "/tools/growth-machine", body: "Run the free snapshot and unlock the document pack when the gap is clear." },
  { label: "Action Menu", href: "/action-menu", body: "Pick a report, script pack, public loop, automation map, or Growth OS." },
  { label: "$197 Lead Leak Report", href: "/tools/growth-machine#lead-leak-report", body: "Unlock the deeper leak math, source trail, dashboard fields, and fix order." },
  { label: "Pulse Analytics", href: "/pulse", body: "See views, clicks, questions, source paths, and buyer signals." },
  { label: "Proof", href: "/proof", body: "Receipts, tools, tracking, and examples." },
  { label: "Services", href: "/services", body: "Built paths for content, ads, websites, tools, and automation." },
];

const ATTENTION_MECHANISMS = [
  {
    title: "Micro-purchase entry points",
    body: "$47 reports, $90 script packs, $197 lead-leak documents, leaderboard votes, boost messages, and Growth OS paths give buyers a low-friction way to move now.",
    href: "/action-menu",
    cta: "Open buy menu",
    Icon: MousePointerClick,
  },
  {
    title: "Share loops",
    body: "Leaderboards, public proof cards, live pulse signals, badges, and build examples create reasons for visitors to come back and send someone else.",
    href: "/leaderboard",
    cta: "Open the loop",
    Icon: Trophy,
  },
  {
    title: "Skip-the-line paths",
    body: "Fast buyers can run the tool, pay, unlock, boost, export, or map a blueprint without waiting for a conversation.",
    href: "/tools/growth-machine#tool",
    cta: "Run tool",
    Icon: Zap,
  },
  {
    title: "Owner visibility",
    body: "Forms, UTMs, pulse events, chat memory, and admin queues keep the lead path visible so the business can see what came in and what needs the next move.",
    href: "/pulse",
    cta: "View pulse",
    Icon: Radar,
  },
];

const MACHINE_OUTPUTS = [
  {
    label: "Lead leak data",
    input: "Website, forms, calls, DMs, ads, booking, and follow-up",
    output: "Free snapshot, locked report, urgency ranking, and next practical fix",
    href: "/tools/growth-machine#lead-leak-report",
    cta: "Open report path",
    Icon: ClipboardCheck,
  },
  {
    label: "Engagement readout",
    input: "Social profiles, content, hooks, proof, comments, and shares",
    output: "What is getting attention, what is not, and what the system flags first",
    href: "/tools/growth-machine#unlock-47",
    cta: "Unlock snapshot",
    Icon: Eye,
  },
  {
    label: "Automation blueprint",
    input: "Repeated task, tool idea, customer path, platform, and ownership needs",
    output: "Input-output map, automation path, handoff checklist, and first useful version",
    href: "/tools/growth-machine#automation-map",
    cta: "Open blueprint",
    Icon: Bot,
  },
  {
    label: "Live pulse analytics",
    input: "Page views, clicks, chat questions, CTAs, UTMs, and source paths",
    output: "Traffic score, buy-readiness signal, and proof of what people are doing",
    href: "/pulse",
    cta: "View pulse",
    Icon: Database,
  },
  {
    label: "Public attention loop",
    input: "Votes, boosts, local boards, topics, and shareable proof",
    output: "A reason for people to click, share, revisit, and move a visible signal",
    href: "/leaderboard",
    cta: "Open loop",
    Icon: Trophy,
  },
  {
    label: "Bigger build path",
    input: "Offer, data, workflow, accounts, assets, and business goal",
    output: "Website, dashboard, AI assistant, funnel, automation, or client-owned tool",
    href: "/tools/growth-machine#growth-os",
    cta: "Open Growth OS",
    Icon: Zap,
  },
];

const GLOBE_NODES = [
  { label: "Calls", value: "12", x: "18%", y: "35%" },
  { label: "Forms", value: "7", x: "70%", y: "22%" },
  { label: "DMs", value: "18", x: "62%", y: "70%" },
  { label: "Ads", value: "$", x: "30%", y: "72%" },
];

const HERO_SYSTEM_NODES = [
  { label: "Leak", value: "missed calls", x: "8%", y: "22%" },
  { label: "Tool", value: "quote builder", x: "58%", y: "12%" },
  { label: "Memory", value: "client brain", x: "68%", y: "58%" },
  { label: "Handoff", value: "owned accounts", x: "16%", y: "70%" },
];

const HERO_BLUEPRINT_ROWS = [
  { label: "Lead leak", value: "Where buyers disappear" },
  { label: "Dream tool", value: "First useful version" },
  { label: "Memory loop", value: "Calls into actions" },
  { label: "Handoff", value: "Client owns the asset" },
];

const DAILY_BUILD_DROPS = [
  {
    label: "Instant Quote Tool",
    audience: "Contractors, cleaners, med spas, repair shops",
    title: "A calculator that prices the job and captures the buyer.",
    build: "Questions, price range, contact capture, and a follow-up path.",
    hook: "People play with the number, then leave their info.",
    Icon: MousePointerClick,
  },
  {
    label: "Missed-Call Rescue",
    audience: "Local service businesses and appointment shops",
    title: "A phone leak catcher that turns silence into a text-back.",
    build: "Missed-call page, SMS wording, callback task, and simple tracking.",
    hook: "Shows owners exactly how many buyers they are losing.",
    Icon: PhoneCall,
  },
  {
    label: "Lead Magnet Quiz",
    audience: "Coaches, gyms, consultants, real estate, legal support",
    title: "A quiz that tells the buyer what package fits them.",
    build: "Short quiz, result screen, email capture, and recommended offer.",
    hook: "Feels personal without forcing a conversation first.",
    Icon: Route,
  },
  {
    label: "Owner Dashboard",
    audience: "Any business tired of guessing what is working",
    title: "A command board for leads, calls, clicks, tasks, and sales.",
    build: "One screen with the numbers that decide the next move.",
    hook: "Makes the business feel like a game they can win.",
    Icon: BarChart3,
  },
  {
    label: "Before/After Builder",
    audience: "Beauty, fitness, home services, creative services",
    title: "A visual proof page that turns results into buyer action.",
    build: "Gallery, proof blocks, story captions, and CTA routing.",
    hook: "Lets prospects see themselves in the result.",
    Icon: Sparkles,
  },
  {
    label: "Referral Game",
    audience: "Restaurants, boutiques, creators, communities",
    title: "A simple points or reward page that gets customers sharing.",
    build: "Referral code, reward tracker, share CTA, and owner view.",
    hook: "Turns happy customers into a visible growth loop.",
    Icon: Zap,
  },
  {
    label: "File-to-Funnel Page",
    audience: "Experts with PDFs, forms, packets, or messy assets",
    title: "A download, checklist, or intake asset that becomes a lead path.",
    build: "Upload/download flow, lead capture, follow-up copy, and routing.",
    hook: "Turns old files into something that sells.",
    Icon: ClipboardCheck,
  },
];

const WEEKLY_BUILD_OFFERS = [
  {
    label: "Free Blueprint + $250 Continuation",
    title: "Submit the idea free. If the plan hits, $250 starts the first build.",
    body: "Website, landing page, app prototype, HTML tool, quote calculator, domain setup, lead magnet, or dashboard. The free blueprint maps the first useful version before the continuation deposit.",
    bullets: ["No vague agency retainer", "A real asset people can click", "Scope decided before buildout"],
  },
  {
    label: "72-Hour Funnel Flip",
    title: "Turn a dead homepage into a lead-capture path.",
    body: "A focused sprint for businesses whose site looks fine but does not make buyers leave a name, phone, email, or booking request.",
    bullets: ["One clear offer", "One clean intake", "One next-click path"],
  },
  {
    label: "Bright Object Build Week",
    title: "Give your business one interactive thing people remember.",
    body: "A quiz, calculator, scoreboard, checker, map, tracker, or booking tool that makes the business feel more advanced than the competition.",
    bullets: ["Fun to click", "Useful to the buyer", "Built around follow-up"],
  },
  {
    label: "Owner Control Room",
    title: "Stop asking where the leads came from.",
    body: "A small dashboard that shows lead source, status, follow-up, and the next move so an owner can stop hunting through tabs.",
    bullets: ["Lead visibility", "Simple status board", "Decision-ready metrics"],
  },
];

function todayBuildDrop() {
  const dayIndex = Math.floor(Date.now() / 86_400_000) % DAILY_BUILD_DROPS.length;
  return DAILY_BUILD_DROPS[dayIndex];
}

function weeklyBuildOffer() {
  const weekIndex = Math.floor(Date.now() / (86_400_000 * 7)) % WEEKLY_BUILD_OFFERS.length;
  return WEEKLY_BUILD_OFFERS[weekIndex];
}

export default function HomePage() {
  const buildDrop = todayBuildDrop();
  const weeklyOffer = weeklyBuildOffer();

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <LightHeader activePath="/" />

      <main>
        <Hero />
        <MachineSection />
        <BuildDropSection dailyDrop={buildDrop} weeklyOffer={weeklyOffer} />
        <CommandGlobeSection />
        <BestDemoSection />
        <AttentionMechanismSection />
        <LeadFunnelSection />
        <RouteSection />
      </main>

      <LightFooter />
    </div>
  );
}

function Hero() {
  return (
    <section
      className="relative isolate min-h-[calc(100svh-112px)] overflow-hidden bg-slate-950 text-white"
      style={{
        background:
          "radial-gradient(circle at 20% 12%, rgba(35,184,255,0.28), transparent 30%), radial-gradient(circle at 85% 22%, rgba(255,154,31,0.2), transparent 32%), #020617",
      }}
    >
      <HeroBuildBackdrop />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.94)_0%,rgba(2,6,23,0.82)_45%,rgba(2,6,23,0.72)_100%)] sm:bg-[linear-gradient(90deg,rgba(2,6,23,0.98)_0%,rgba(2,6,23,0.86)_48%,rgba(2,6,23,0.48)_100%)]" />

      <div className="relative mx-auto flex min-h-[calc(100svh-112px)] w-full min-w-0 max-w-7xl flex-col justify-center px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-12 lg:px-8">
        <div className="min-w-0 max-w-5xl">
          <div className="inline-flex items-center gap-2 rounded-md border border-cyan-300/50 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
            <Sparkles className="h-3.5 w-3.5" />
            The LeadFlow Pro
          </div>
          <h1 className="mt-5 max-w-full break-words text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Put business data in. Get leads, automation, analytics, and the next move out.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-200 sm:text-lg">
            The LeadFlow Pro is a growth machine for owners who want more lead flow, more useful
            engagement, clearer analytics, better follow-up, and AI tools that turn scattered
            business information into action.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/tools/growth-machine#tool"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-accent-500/20 hover:bg-accent-400"
            >
              Run free snapshot <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/action-menu"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur hover:bg-white/15"
            >
              See paid unlocks <MousePointerClick className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-5 grid max-w-4xl gap-3 text-sm sm:grid-cols-3">
            <HeroInput label="Put in" value="Website, ads, calls, DMs, socials, analytics, offer, or tool idea" />
            <HeroInput label="Get out" value="Snapshot, report, scripts, automation, dashboard map, blueprint, or export" />
            <HeroInput label="Buy level" value="$1 public loops, $47 reports, $90 kits, $197 documents, monthly systems" />
          </div>
          <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-slate-950/78 p-3 shadow-2xl shadow-slate-950/35 sm:hidden">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-cyan-100">
                  Real builds Ryan shipped
                </div>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-300">
                  Tap one. These are live sites, not mockups.
                </p>
              </div>
              <Link
                href="/proof"
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-cyan-200/25 bg-cyan-200/10 px-3 py-1.5 text-[0.66rem] font-black uppercase tracking-widest text-cyan-100"
              >
                Proof <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid gap-2.5">
              {BUILT_PROJECTS.map((project) => (
                <BuiltProjectCard
                  key={project.name}
                  project={project}
                  variant="dark"
                  density="mini"
                  className="rounded-xl"
                />
              ))}
            </div>
          </div>
          <div className="mt-7 hidden max-w-6xl rounded-3xl border border-cyan-200/15 bg-slate-950/58 p-4 shadow-2xl shadow-slate-950/35 backdrop-blur sm:block">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-cyan-100">
                  Proof Ryan ships real sites
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  Four live builds. Four different problems solved.
                </p>
              </div>
              <Link
                href="/proof"
                className="inline-flex w-fit items-center gap-1 rounded-full border border-cyan-200/25 bg-cyan-200/10 px-3 py-1.5 text-[0.7rem] font-black uppercase tracking-widest text-cyan-100 hover:bg-cyan-200/15"
              >
                Full proof <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="mt-4 grid gap-3 text-sm text-slate-200 md:grid-cols-2 xl:grid-cols-4">
              {BUILT_PROJECTS.map((project) => (
                <BuiltProjectCard key={project.name} project={project} variant="dark" density="compact" />
              ))}
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              Premier Dental Academy of Longview, RepWatchr, Faretta.legal, and RealRyanNichols.com
              are live builds Ryan coded and deployed to solve different problems: local offer
              clarity, data organization, niche trust, and founder-led service intake.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroInput({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-cyan-200/20 bg-white/[0.07] p-3 backdrop-blur">
      <div className="text-[0.68rem] font-black uppercase tracking-widest text-cyan-100">
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold leading-5 text-slate-100">{value}</p>
    </div>
  );
}

function MachineSection() {
  return (
    <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#eef9ff_52%,#fff8f1_100%)]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.78fr_1.22fr] lg:px-8 lg:py-16">
        <div className="flex flex-col justify-center">
          <div className="inline-flex w-fit items-center gap-2 rounded-md border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-800">
            <Database className="h-3.5 w-3.5" />
            Growth machine
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            A vending machine for data, lead flow, automation, and AI tools.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-700">
            Put in the business problem. Pick the output. Get a readout, public signal,
            automation plan, dashboard path, or client-owned build instead of waiting on a long
            sales process.
          </p>

          <div className="mt-6 grid gap-3">
            <MachineRail
              label="What goes in"
              value="Website, offer, social handles, ad path, missed calls, DMs, forms, analytics, repeated tasks, or the tool idea."
            />
            <MachineRail
              label="What comes out"
              value="Leak readout, full report, script pack, blueprint, dashboard map, automation path, public loop, or export."
            />
            <MachineRail
              label="Internal brain"
              value="The Signal Warehouse connects site events, forms, UTMs, chat questions, and offer clicks so every build learns from the last one."
            />
          </div>

          <p className="mt-5 text-sm leading-6 text-slate-600">
            No guaranteed leads, sales, revenue, ROAS, rankings, follower growth, or ad approval.
            The site sells useful outputs and clearer decisions.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {MACHINE_OUTPUTS.map((item) => {
            const Icon = item.Icon;

            return (
              <div
                key={item.label}
                className="flex min-h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-cyan-100">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[0.66rem] font-black uppercase tracking-widest text-cyan-800">
                    Output
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-black tracking-tight text-slate-950">
                  {item.label}
                </h3>
                <div className="mt-4 grid gap-3 text-sm leading-6">
                  <MachineCardField label="Put in" value={item.input} />
                  <MachineCardField label="Get out" value={item.output} />
                </div>
                <Link
                  href={item.href}
                  className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                >
                  {item.cta} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MachineRail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm">
      <div className="text-[0.68rem] font-black uppercase tracking-widest text-cyan-800">
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">{value}</p>
    </div>
  );
}

function MachineCardField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400">
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">{value}</p>
    </div>
  );
}

function HeroBuildBackdrop() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden bg-slate-950">
      <div
        className="absolute inset-0 opacity-[0.11]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(125,211,252,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,0.18) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(8,47,73,0.42)_0%,rgba(2,6,23,0)_42%,rgba(251,146,60,0.24)_100%)]" />

      <div className="absolute -right-44 top-10 hidden h-[620px] w-[780px] rotate-[-7deg] rounded-[2rem] border border-cyan-200/20 bg-white/[0.05] p-5 shadow-[0_38px_110px_rgba(8,47,73,0.42)] lg:block">
        <div className="h-full rounded-[1.5rem] border border-white/10 bg-slate-950/86 p-5 shadow-2xl shadow-slate-950/80">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-300/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-300/80" />
            </div>
            <div className="rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-100">
              Build blueprint
            </div>
          </div>

          <div className="grid h-[calc(100%-3.75rem)] grid-cols-[0.82fr_1.18fr] gap-4 pt-5">
            <div className="space-y-3">
              {HERO_BLUEPRINT_ROWS.map((row) => (
                <div key={row.label} className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
                    {row.label}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-white">{row.value}</div>
                </div>
              ))}
            </div>

            <div className="relative rounded-2xl border border-cyan-200/15 bg-[linear-gradient(145deg,rgba(8,47,73,0.64),rgba(15,23,42,0.94))] p-5">
              <div className="absolute left-8 top-16 h-[1px] w-72 rotate-12 bg-cyan-200/25" />
              <div className="absolute left-20 top-36 h-[1px] w-64 -rotate-12 bg-accent-200/25" />
              <div className="absolute left-16 top-60 h-[1px] w-72 rotate-6 bg-cyan-200/20" />
              {HERO_SYSTEM_NODES.map((node) => (
                <div
                  key={node.label}
                  className="absolute w-36 rounded-2xl border border-cyan-200/20 bg-slate-950/80 p-3 shadow-xl shadow-slate-950/40"
                  style={{ left: node.x, top: node.y }}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-200">
                    {node.label}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white">{node.value}</div>
                </div>
              ))}
              <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
                      Next move
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">Ship the first useful tool</div>
                  </div>
                  <div className="h-14 w-14 rounded-2xl border border-accent-200/30 bg-accent-300/20" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-5 bottom-6 top-[56%] rounded-[1.5rem] border border-cyan-200/10 bg-[linear-gradient(145deg,rgba(8,47,73,0.18),rgba(15,23,42,0.3))] shadow-2xl shadow-slate-950/60 sm:hidden" />
    </div>
  );
}

function BuildDropSection({
  dailyDrop,
  weeklyOffer,
}: {
  dailyDrop: (typeof DAILY_BUILD_DROPS)[number];
  weeklyOffer: (typeof WEEKLY_BUILD_OFFERS)[number];
}) {
  const DropIcon = dailyDrop.Icon;

  return (
    <section id="build-drops" className="border-b border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-16">
        <div className="flex flex-col justify-center">
          <div className="inline-flex w-fit items-center gap-2 rounded-md border border-accent-300 bg-accent-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-950">
            <Sparkles className="h-3.5 w-3.5" />
            Weekly business teaser
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Do not sell "anything." Show them the thing they did not know their business could have.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-700">
            The free tool makes the paid unlock easier: first show the leak, the score, the
            platform path, and the locked document they need next. Then the owner can continue
            without waiting on a call.
          </p>

          <div className="mt-7 rounded-lg border border-slate-200 bg-slate-950 p-5 text-white shadow-xl shadow-slate-200/80">
            <div className="text-xs font-semibold uppercase tracking-widest text-accent-200">
              {weeklyOffer.label}
            </div>
            <h3 className="mt-3 text-2xl font-black tracking-tight">{weeklyOffer.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">{weeklyOffer.body}</p>
            <div className="mt-5 grid gap-2">
              {weeklyOffer.bullets.map((bullet) => (
                <div key={bullet} className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                  <CheckCircle2 className="h-4 w-4 text-accent-300" />
                  {bullet}
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/tools/growth-machine#automation-map"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-accent-400"
              >
                Open blueprint tool <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/tools/growth-machine#tool"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/15"
              >
                Run free snapshot
              </Link>
            </div>
          </div>
        </div>

        <div>
          <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-5 shadow-xl shadow-cyan-100/70 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-cyan-800">
                  Today's bright object
                </div>
                <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                  {dailyDrop.label}
                </h3>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white text-cyan-700 shadow-sm">
                <DropIcon className="h-6 w-6" />
              </div>
            </div>

            <p className="mt-4 text-xl font-semibold leading-8 text-slate-950">{dailyDrop.title}</p>

            <div className="mt-6 grid gap-3">
              <BuildDropDetail label="Best fit" value={dailyDrop.audience} />
              <BuildDropDetail label="What gets built" value={dailyDrop.build} />
              <BuildDropDetail label="Why it gets attention" value={dailyDrop.hook} />
            </div>

            <div className="mt-6 rounded-lg border border-cyan-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Simple public copy
              </div>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">
                "Enter the business problem. Get the first machine readout free. If the locked
                document is the missing piece, unlock the report, scripts, map, or export."
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {DAILY_BUILD_DROPS.slice(0, 4).map((drop) => (
              <div key={drop.label} className="rounded-lg border border-slate-200 bg-white p-4">
                <drop.Icon className="h-5 w-5 text-cyan-700" />
                <div className="mt-3 text-sm font-black text-slate-950">{drop.label}</div>
                <p className="mt-1 text-xs leading-5 text-slate-600">{drop.hook}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BuildDropDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-cyan-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-widest text-cyan-800">{label}</div>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">{value}</p>
    </div>
  );
}

function CommandGlobeSection() {
  return (
    <section className="border-b border-slate-200 bg-slate-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-16">
        <div className="flex flex-col justify-center">
          <div className="inline-flex w-fit items-center gap-2 rounded-md border border-cyan-300/35 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
            <Globe2 className="h-3.5 w-3.5" />
            Business command globe
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            A business should feel like a control room, not a pile of tabs.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-300">
            The homepage demo is built around one idea: view the business in a control layer where
            leads, files, analytics, calls, ads, and follow-up make sense fast.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <MiniMetric icon={MousePointerClick} label="Clicks" value="Tracked" />
            <MiniMetric icon={MessageSquareText} label="Follow-up" value="Queued" />
            <MiniMetric icon={BarChart3} label="Analytics" value="Readable" />
            <MiniMetric icon={Zap} label="Next move" value="Obvious" />
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/30">
          <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
            <div className="relative min-h-[360px] overflow-hidden rounded-lg border border-white/10 bg-[radial-gradient(circle_at_center,rgba(34,184,255,0.22),rgba(15,23,42,0.98)_58%)]">
              <div className="absolute inset-8 rounded-full border border-cyan-200/20" />
              <div className="absolute inset-16 rounded-full border border-cyan-200/15" />
              <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/35 bg-cyan-300/10" />
              <div className="absolute left-1/2 top-1/2 h-px w-[76%] -translate-x-1/2 bg-cyan-200/20" />
              <div className="absolute left-1/2 top-1/2 h-[76%] w-px -translate-y-1/2 bg-cyan-200/20" />
              {GLOBE_NODES.map((node) => (
                <div
                  key={node.label}
                  className="absolute min-w-24 rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2 shadow-lg shadow-black/25"
                  style={{ left: node.x, top: node.y }}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-cyan-200">
                    {node.label}
                  </div>
                  <div className="mt-1 text-xl font-black text-white">{node.value}</div>
                </div>
              ))}
              <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-accent-300/25 bg-accent-300/10 p-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-accent-100">
                  Recommended move
                </div>
                <div className="mt-1 text-sm font-semibold text-white">
                  Fix intake first, then scale traffic.
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <PipelineStep n="01" title="Lead arrives" body="Call, form, DM, ad click, or referral." />
              <PipelineStep n="02" title="System tags it" body="Source, intent, service fit, urgency." />
              <PipelineStep n="03" title="Follow-up fires" body="Text, email, task, checkout, or message path." />
              <PipelineStep n="04" title="System shows the move" body="The dashboard shows what to fix next." />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MousePointerClick;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <Icon className="h-5 w-5 text-cyan-200" />
      <div className="mt-3 text-sm font-semibold text-slate-300">{label}</div>
      <div className="mt-1 text-lg font-bold text-white">{value}</div>
    </div>
  );
}

function PipelineStep({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="text-xs font-semibold uppercase tracking-widest text-cyan-200">{n}</div>
      <div className="mt-2 font-bold text-white">{title}</div>
      <p className="mt-1 text-sm leading-5 text-slate-300">{body}</p>
    </div>
  );
}

function BestDemoSection() {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
            Best of what is here
          </div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Show the strongest tools first. Let the rest live where it belongs.
          </h2>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {BEST_DEMOS.map((demo) => (
            <Link
              key={demo.title}
              href={demo.href}
              className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-lg"
            >
              <demo.Icon className="h-6 w-6 text-cyan-700" />
              <h3 className="mt-4 text-lg font-bold text-slate-950">{demo.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{demo.body}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-cyan-700 group-hover:text-cyan-900">
                {demo.cta} <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function AttentionMechanismSection() {
  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-slate-950 text-white">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 15% 20%, rgba(35,184,255,0.18), transparent 28%), radial-gradient(circle at 86% 8%, rgba(255,154,31,0.18), transparent 30%)",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-accent-300/35 bg-accent-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-accent-100">
              <Zap className="h-3.5 w-3.5" />
              Attention into action
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              The site should not just explain. It should make people click, share, pay, and come back.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              The operating idea is simple: show a useful thing, collect the signal, offer a small
              paid next step, then route serious buyers into audit, build, consulting, or community
              mechanics.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {ATTENTION_MECHANISMS.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-xl shadow-slate-950/20 transition hover:-translate-y-0.5 hover:border-cyan-200/40 hover:bg-white/[0.08]"
              >
                <item.Icon className="h-6 w-6 text-cyan-200" />
                <h3 className="mt-4 text-lg font-bold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-accent-200 group-hover:text-accent-100">
                  {item.cta} <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function LeadFunnelSection() {
  return (
    <section id="lead-funnel" className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.88fr_1.12fr] lg:px-8 lg:py-16">
        <div>
          <div className="inline-flex items-center gap-2 rounded-md border border-accent-300 bg-accent-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-950">
            <Target className="h-3.5 w-3.5" />
            The clean funnel
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Leave the info. Let the system route it. Move.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-700">
            This is the home-page job: collect a real buyer, get the business context, and send
            them to the right next step. No clutter. No maze.
          </p>
          <div className="mt-6 space-y-3">
            <FunnelPoint title="For fast buyers" body="They can buy, apply, or leave a message without waiting on a calendar." />
            <FunnelPoint title="For uncertain buyers" body="The router asks enough to place them in the right offer." />
            <FunnelPoint title="For the system" body="The intake saves context so the next tool starts with what the buyer already entered." />
          </div>
        </div>

        <form
          action="/api/intake"
          method="post"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70 sm:p-6"
        >
          <VisitorIdField />
          <input type="hidden" name="workStyle" value="hands-on-build" />
          <input type="hidden" name="budgetTier" value="2000-5000" />
          <input type="hidden" name="urgency" value="this-week" />
          <input type="hidden" name="bestContactMethod" value="any" />

          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-700">
            <CheckCircle2 className="h-4 w-4" />
            Start the business review
          </div>
          <h3 className="mt-3 text-2xl font-bold text-slate-950">
            Send the machine the signal.
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This goes into the intake system and routes you to the cleanest next page.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Name" name="fullName" placeholder="Your name" required />
            <Field label="Phone" name="phone" placeholder="Best number" required />
            <Field label="Email" name="email" type="email" placeholder="you@business.com" required />
            <Field label="Business" name="businessName" placeholder="Business name" />
          </div>

          <label className="mt-4 block">
            <span className="text-sm font-bold text-slate-800">What do you need first?</span>
            <select
              name="primaryNeed"
              defaultValue="working-session"
              className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            >
              <option value="working-session">Build my website, app, funnel, or HTML tool</option>
              <option value="managed-social">Run my social and content machine</option>
              <option value="ads">Fix or launch my Meta ads</option>
              <option value="audit">Show me what is leaking</option>
              <option value="operator">Open the automated Growth OS path</option>
              <option value="one-decision">Unstick one important decision</option>
            </select>
          </label>

          <label className="mt-4 block">
            <span className="text-sm font-bold text-slate-800">Short context</span>
            <textarea
              name="notes"
              rows={4}
              placeholder="What are you selling, where are leads coming from, and what is currently broken?"
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/15 hover:bg-slate-800"
            >
              Send and route me <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              href="/contact?source=home-funnel"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-950 hover:bg-slate-50"
            >
              Message instead
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
}

function Field({
  label,
  name,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-800">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
      />
    </label>
  );
}

function FunnelPoint({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="font-bold text-slate-950">{title}</div>
      <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
    </div>
  );
}

function RouteSection() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
              Everything else has a place
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              The homepage points. The inside pages explain.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {ROUTES.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className="group rounded-lg border border-slate-200 bg-slate-50 p-5 transition hover:border-cyan-300 hover:bg-white hover:shadow-lg"
              >
                <div className="font-bold text-slate-950">{route.label}</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{route.body}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-cyan-700 group-hover:text-cyan-900">
                  Go there <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
