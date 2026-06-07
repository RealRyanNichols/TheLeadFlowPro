import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileText,
  Lock,
  MessageSquareText,
  MousePointerClick,
  Route,
  Search,
  ShieldCheck,
  Trophy,
  Zap,
} from "lucide-react";
import { BuiltProjectCard } from "@/components/site/BuiltProjectCard";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { BUILT_PROJECTS } from "@/lib/built-projects";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const revalidate = 86400;

export const metadata = createSeoMetadata({
  title: "The LeadFlow Pro - Automated Growth Tools",
  description:
    "Run automated lead-flow, follow-up, analytics, content, and automation tools. Get a free snapshot, then unlock reports, scripts, maps, dashboards, and Growth OS paths.",
  path: "/",
  imageTitle: "The LeadFlow Pro",
  imageSubtitle: "Automated growth tools with free snapshots and paid document unlocks.",
});

const HERO_STATS = [
  { label: "Free first", value: "Snapshot", body: "Business data becomes a score." },
  { label: "Fast unlock", value: "$47", body: "Full growth snapshot." },
  { label: "Deep report", value: "$197", body: "Lead leak document path." },
  { label: "System path", value: "$1,497+", body: "Growth OS and dashboards." },
];

const MACHINE_INPUTS = [
  "Website and landing page",
  "Ad spend, clicks, leads, and close rate",
  "Missed calls, texts, DMs, and forms",
  "Response time and follow-up process",
  "Content, proof assets, and social signals",
  "Tool idea, automation gap, or dashboard need",
];

const MACHINE_OUTPUTS = [
  {
    title: "Free Growth Snapshot",
    price: "Free",
    body: "Buy-readiness score, first leaks, lead-flow score, tracking score, automation score, and next move.",
    href: "/tools/growth-machine#tool",
    cta: "Run free snapshot",
    Icon: Bot,
  },
  {
    title: "Full Growth Report",
    price: "$47",
    body: "Full ranked leak list, score breakdown, first-fix checklist, and copy-ready next-click angle.",
    href: "/tools/growth-machine#unlock-47",
    cta: "Unlock report",
    Icon: FileText,
  },
  {
    title: "Follow-Up Kit",
    price: "$90",
    body: "SMS, DM, email, missed-call, no-show, and first-24-hour scripts the business can copy into its tools.",
    href: "/tools/growth-machine#follow-up-kit",
    cta: "Open kit",
    Icon: MessageSquareText,
  },
  {
    title: "Lead Leak Document",
    price: "$197",
    body: "Leak math, source trail, dashboard fields, urgency ranking, and fix order for the business path.",
    href: "/tools/growth-machine#lead-leak-report",
    cta: "Open report path",
    Icon: ClipboardCheck,
  },
  {
    title: "Automation Blueprint",
    price: "$250",
    body: "Input-output map, first useful version, account handoff list, and build checklist.",
    href: "/tools/growth-machine#automation-map",
    cta: "Open blueprint",
    Icon: Route,
  },
  {
    title: "Growth OS",
    price: "$1,497+",
    body: "Pulse, content signals, dashboards, public proof, lead routing, and business memory in one operating path.",
    href: "/tools/growth-machine#growth-os",
    cta: "Open OS path",
    Icon: Database,
  },
];

const TOOL_SUITE = [
  {
    title: "Growth Machine",
    body: "Main self-serve tool. Enter rough business data, get scores, leaks, exposed value, and paid unlock paths.",
    href: "/tools/growth-machine",
    cta: "Run tool",
    Icon: Bot,
  },
  {
    title: "Ad Account Autopsy",
    body: "Enter spend, clicks, leads, booked calls, sales, close rate, and response speed to see where ad traffic dies.",
    href: "/tools/ad-account-autopsy",
    cta: "Check ads",
    Icon: BarChart3,
  },
  {
    title: "SEO Grader",
    body: "Paste a site and get a fast on-page SEO grade with basic fixes and next-step paths.",
    href: "/tools/seo-grader",
    cta: "Grade site",
    Icon: Search,
  },
  {
    title: "Live Pulse",
    body: "See site views, clicks, source paths, questions, and buyer movement so the site can learn from traffic.",
    href: "/pulse",
    cta: "View pulse",
    Icon: MousePointerClick,
  },
  {
    title: "Public Loops",
    body: "Leaderboards, boosts, votes, and shareable signals that give people a reason to revisit and move a public number.",
    href: "/leaderboard",
    cta: "Open loop",
    Icon: Trophy,
  },
  {
    title: "Assistant Handoff",
    body: "The AI-first message path routes visitors to the right tool, unlock, report, or context capture lane.",
    href: "/contact",
    cta: "Ask assistant",
    Icon: MessageSquareText,
  },
];

const WORKFLOW = [
  {
    title: "Input",
    body: "The visitor gives the business data: offer, traffic, leads, follow-up, proof, tracking, and automation gaps.",
  },
  {
    title: "Score",
    body: "The site converts that data into a free readout: buy-readiness, lead-flow, response, tracking, proof, and automation scores.",
  },
  {
    title: "Pressure",
    body: "The preview shows the top leaks and the missing documents without pretending the whole fix is free.",
  },
  {
    title: "Unlock",
    body: "The buyer pays for the report, script pack, automation map, dashboard spec, export, or Growth OS path.",
  },
  {
    title: "Compound",
    body: "Each tool, click, form, UTM, and purchase signal feeds the Signal Warehouse so the machine gets clearer over time.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <LightHeader activePath="/" />

      <main>
        <HeroSection />
        <InputOutputSection />
        <UnlockLadderSection />
        <ToolSuiteSection />
        <WorkflowSection />
        <SignalWarehouseSection />
        <ProofSection />
        <FinalCtaSection />
      </main>

      <LightFooter />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-slate-950 text-white">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 18% 14%, rgba(35,184,255,0.27), transparent 30%), radial-gradient(circle at 86% 12%, rgba(255,154,31,0.2), transparent 28%), linear-gradient(180deg,#020617 0%,#07111f 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(125,211,252,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,0.18) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      <div className="relative mx-auto grid min-h-[calc(100svh-112px)] max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8 lg:py-20">
        <div>
          <div className="inline-flex items-center gap-2 rounded-md border border-cyan-300/35 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
            <Bot className="h-3.5 w-3.5" />
            100 percent automated direction
          </div>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            The vending machine for leads, follow-up, analytics, and automation.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
            The LeadFlow Pro is no longer built around a human taking calls. A visitor enters business
            data, gets a useful free snapshot, then unlocks the report, script pack, automation map,
            dashboard spec, export, or Growth OS path when the missing piece is obvious.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
            No guaranteed leads, sales, revenue, ROAS, follower growth, rankings, or ad approval.
            The product is structured output, clearer decisions, and usable documents.
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
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white hover:bg-white/15"
            >
              See paid unlocks <Lock className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {HERO_STATS.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
                <div className="text-[0.68rem] font-black uppercase tracking-widest text-cyan-100">
                  {stat.label}
                </div>
                <div className="mt-2 text-2xl font-black text-white">{stat.value}</div>
                <p className="mt-1 text-sm leading-5 text-slate-300">{stat.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-4 shadow-2xl shadow-slate-950/40 backdrop-blur">
          <div className="rounded-[1.5rem] border border-cyan-200/15 bg-slate-950/84 p-5">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-cyan-100">
                  Machine readout
                </div>
                <div className="mt-1 text-sm text-slate-400">Free preview, paid documents</div>
              </div>
              <div className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-center">
                <div className="text-4xl font-black text-white">78</div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  readiness
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {["No source trail", "Slow first response", "Manual follow-up", "Proof gap"].map(
                (item, index) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-300/15 text-sm font-black text-accent-100">
                        {index + 1}
                      </div>
                      <div className="font-bold text-white">{item}</div>
                    </div>
                  </div>
                ),
              )}
            </div>
            <div className="mt-4 rounded-2xl border border-accent-300/25 bg-accent-300/10 p-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-accent-100">
                Locked next asset
              </div>
              <div className="mt-2 text-xl font-black text-white">Lead Leak Document</div>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Leak math, source trail, scripts, dashboard fields, and fix order unlock after the
                free snapshot proves the gap.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function InputOutputSection() {
  return (
    <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#eef9ff_56%,#fff8f1_100%)]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8 lg:py-16">
        <div>
          <div className="inline-flex items-center gap-2 rounded-md border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-800">
            <Database className="h-3.5 w-3.5" />
            Input to output
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            The user should not need to understand the whole site.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-700">
            They should enter what they know, get the first useful readout, and see the exact
            document or system they need next.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
            <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
              What goes in
            </div>
            <div className="mt-4 grid gap-2">
              {MACHINE_INPUTS.map((input) => (
                <div key={input} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-800">
                  <CheckCircle2 className="h-4 w-4 text-cyan-700" />
                  {input}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-xl shadow-slate-300/70">
            <div className="text-xs font-semibold uppercase tracking-widest text-accent-200">
              What comes out
            </div>
            <div className="mt-4 grid gap-2">
              {[
                "Buy-readiness score",
                "Top leaks ranked by urgency",
                "Exposed value estimate",
                "Locked report or kit",
                "Automation and dashboard map",
                "Growth OS route",
              ].map((output) => (
                <div key={output} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.055] p-3 text-sm font-semibold text-slate-100">
                  <Zap className="h-4 w-4 text-accent-200" />
                  {output}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function UnlockLadderSection() {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
            Paid unlock ladder
          </div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Free preview first. Charge for the document they actually need.
          </h2>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {MACHINE_OUTPUTS.map((item) => (
            <OutputCard key={item.title} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

function OutputCard({ item }: { item: (typeof MACHINE_OUTPUTS)[number] }) {
  const Icon = item.Icon;
  return (
    <Link
      href={item.href}
      className="group flex min-h-full flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-cyan-100">
          <Icon className="h-5 w-5" />
        </div>
        <div className="rounded-full border border-accent-200 bg-accent-100 px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-950">
          {item.price}
        </div>
      </div>
      <h3 className="mt-4 text-xl font-black tracking-tight text-slate-950">{item.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{item.body}</p>
      <div className="mt-5 inline-flex items-center gap-1 text-sm font-black text-cyan-700 group-hover:text-cyan-900">
        {item.cta} <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
}

function ToolSuiteSection() {
  return (
    <section className="border-b border-slate-200 bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[0.76fr_1.24fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-cyan-300/35 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
              <Bot className="h-3.5 w-3.5" />
              Tool suite
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              A site with tools beats a site with explanations.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              The public site should keep adding small, useful tools that create a free signal and
              a paid next asset.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {TOOL_SUITE.map((tool) => (
              <ToolCard key={tool.title} tool={tool} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ToolCard({ tool }: { tool: (typeof TOOL_SUITE)[number] }) {
  const Icon = tool.Icon;
  return (
    <Link
      href={tool.href}
      className="group rounded-2xl border border-white/10 bg-white/[0.055] p-5 transition hover:-translate-y-0.5 hover:border-cyan-200/40 hover:bg-white/[0.08]"
    >
      <Icon className="h-6 w-6 text-cyan-200" />
      <h3 className="mt-4 text-lg font-bold text-white">{tool.title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{tool.body}</p>
      <div className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-accent-200 group-hover:text-accent-100">
        {tool.cta} <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
}

function WorkflowSection() {
  return (
    <section className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
            How it sells without a call
          </div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            The site should create the sales pressure itself.
          </h2>
        </div>
        <div className="mt-8 grid gap-3 md:grid-cols-5">
          {WORKFLOW.map((step, index) => (
            <div key={step.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">
                {index + 1}
              </div>
              <h3 className="mt-4 text-lg font-black text-slate-950">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SignalWarehouseSection() {
  return (
    <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#eef9ff_0%,#ffffff_100%)]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-16">
        <div>
          <div className="inline-flex items-center gap-2 rounded-md border border-cyan-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-800">
            <Database className="h-3.5 w-3.5" />
            Signal Warehouse
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Every tool should make the system smarter.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-700">
            The internal brain is not a chatbot. It is a warehouse of tool inputs, events, UTMs,
            form data, questions, purchases, reports, and outcomes. That is how the site learns
            where buyers are getting stuck and which product to show next.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
          <div className="grid gap-3">
            {[
              ["Traffic", "Views, sources, UTMs, campaigns, and scroll path"],
              ["Intent", "Tool selections, scores, leaks, unlock clicks, and questions"],
              ["Delivery", "Reports, scripts, maps, dashboards, exports, and paid paths"],
              ["Memory", "Saved inputs so a returning buyer does not start over"],
            ].map(([label, body]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-black uppercase tracking-widest text-cyan-700">
                  {label}
                </div>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProofSection() {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
            Built proof
          </div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Real sites and tools already shipped.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-700">
            The automation model is the next version of the same build pattern: clear problem,
            useful tool, owned asset, visible next step.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {BUILT_PROJECTS.map((project) => (
            <BuiltProjectCard key={project.name} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section className="bg-slate-950 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-accent-200">
            Start the machine
          </div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            Put the business data in first.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            The first screen should not ask for trust. It should produce a useful readout, then
            sell the locked asset the buyer needs next.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/tools/growth-machine#tool"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-accent-400"
          >
            Run free snapshot <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/action-menu"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/15"
          >
            See unlock menu
          </Link>
        </div>
      </div>
    </section>
  );
}
