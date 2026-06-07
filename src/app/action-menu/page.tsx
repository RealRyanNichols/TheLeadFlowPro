import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  Bot,
  ClipboardCheck,
  Eye,
  Gauge,
  Megaphone,
  MessageSquareText,
  MousePointerClick,
  Sparkles,
  ThumbsUp,
  Trophy,
  Zap,
} from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { ACTION_MENU_ITEMS, type ActionMenuItem, type ActionMenuKind } from "@/lib/action-menu";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const revalidate = 300;

export const metadata = createSeoMetadata({
  title: "Automated Growth Tools | The LeadFlow Pro",
  description:
    "Self-serve lead-flow, follow-up, content, automation, and analytics tools with free previews and paid document unlocks.",
  path: "/action-menu",
  imageTitle: "The LeadFlow Pro Automated Growth Tools",
  imageSubtitle: "Put in business data, get the readout, unlock the documents.",
});

const ICONS: Record<ActionMenuKind, LucideIcon> = {
  "quick-look": Eye,
  "decision-sprint": Gauge,
  audit: ClipboardCheck,
  leaderboard: Trophy,
  boost: Megaphone,
  voice: ThumbsUp,
  blueprint: Sparkles,
  "power-bundle": BarChart3,
  operator: Zap,
  message: MessageSquareText,
};

const MECHANISM_LADDER = [
  {
    label: "Attention",
    title: "Give them a tool, not a brochure.",
    body: "The visitor should enter real business data and see a useful readout before anyone asks for a bigger payment.",
  },
  {
    label: "Signal",
    title: "Turn the input into a score.",
    body: "Visitors reveal their offer, traffic, leads, response speed, tracking, content, and automation gaps while using the tool.",
  },
  {
    label: "Delivery",
    title: "Lock the documents they need.",
    body: "The free preview proves the value. The full report, scripts, blueprint, dashboard map, or export gets unlocked at the pressure point.",
  },
  {
    label: "Upsell",
    title: "Let the system route bigger buyers.",
    body: "Small unlocks can point to deeper reports, automation maps, Growth OS, or dashboard systems without forcing a call.",
  },
];

export default function ActionMenuPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <LightHeader
        activePath="/action-menu"
        primaryAction={{
          href: "/tools/growth-machine#unlock-47",
          label: "$47 Snapshot",
          mobileDescription: "Fastest paid report unlock.",
          Icon: Eye,
        }}
        secondaryAction={{
          href: "/tools/growth-machine#tool",
          label: "Run Tool",
          mobileDescription: "Start with the free machine snapshot.",
          Icon: Bot,
          muted: true,
        }}
      />

      <main>
        <section className="relative overflow-hidden border-b border-slate-200 bg-slate-950 text-white">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 16% 18%, rgba(35,184,255,0.24), transparent 30%), radial-gradient(circle at 84% 8%, rgba(255,154,31,0.2), transparent 28%)",
            }}
          />
          <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8 lg:py-16">
            <div>
              <div className="inline-flex items-center gap-2 rounded-md border border-accent-300/35 bg-accent-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-accent-100">
                <MousePointerClick className="h-3.5 w-3.5" />
                Automated tool menu
              </div>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                The site should run even if Ryan is not available.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                This menu is shifting to self-serve tools. The user enters business data, gets a
                useful free preview, then unlocks the report, scripts, automation map, dashboard
                spec, or export when the missing information matters.
              </p>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
                No guaranteed leads, sales, revenue, ROAS, followers, or ad approval. Each purchase
                should produce a real output, a public signal, or a clearer next move.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-4 shadow-2xl shadow-slate-950/30 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <HeroMetric label="Free first" value="Score" body="Business data snapshot" />
                <HeroMetric label="Fast unlock" value="$47" body="Full growth report" />
                <HeroMetric label="Deep unlock" value="$197" body="Lead leak document" />
                <HeroMetric label="System path" value="$1,497+" body="Growth OS output" />
              </div>
              <div className="mt-4 rounded-2xl border border-accent-300/25 bg-accent-300/10 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent-100">
                  <Zap className="h-4 w-4" />
                  What this page is
                </div>
                <p className="mt-2 text-sm font-semibold leading-6 text-white">
                  A vending machine for lead-flow data, follow-up scripts, automation maps,
                  dashboards, paid exports, and business memory.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#fff8f1_0%,#eef9ff_100%)]">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                Self-serve tools
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Put information in. Get the useful part out. Unlock the rest when it matters.
              </h2>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {ACTION_MENU_ITEMS.map((item) => (
                <ActionCard key={item.kind} item={item} />
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.76fr_1.24fr] lg:px-8 lg:py-16">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                Why this works
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                A site needs a reason to click before it earns a reason to buy.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-700">
                The page should not depend on a human making videos, explaining the offer, or
                jumping on calls. It should turn visitor input into a score, a preview, a locked
                document, and a next purchase path.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {MECHANISM_LADDER.map((step, index) => (
                <div key={step.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                      {step.label}
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">
                      {index + 1}
                    </div>
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-slate-950">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-950 text-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-accent-200">
                If you are serious
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                Pick one move. Do not wait on perfect.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                The cheapest serious unlock is the $47 Growth Snapshot. The stronger paid traffic
                path is the $197 Lead Leak Report. The bigger path is a tool, dashboard, automation,
                or Growth OS that keeps producing output without a human bottleneck.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/tools/growth-machine#tool"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-accent-400"
              >
                Run free tool <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/tools/growth-machine#unlock"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/15"
              >
                See paid unlocks
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LightFooter />
    </div>
  );
}

function HeroMetric({ label, value, body }: { label: string; value: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/68 p-4">
      <div className="text-xs font-semibold uppercase tracking-widest text-cyan-100">{label}</div>
      <div className="mt-2 text-3xl font-black text-white">{value}</div>
      <p className="mt-1 text-sm leading-5 text-slate-300">{body}</p>
    </div>
  );
}

function ActionCard({ item }: { item: ActionMenuItem }) {
  const Icon = ICONS[item.kind];
  const external = /^https?:\/\//i.test(item.href);

  return (
    <div className="flex min-h-full flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[0.7rem] font-black uppercase tracking-widest text-cyan-800">
          <Icon className="h-3.5 w-3.5" />
          {item.badge}
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-slate-950">{item.price}</div>
          <div className="text-[0.68rem] font-semibold uppercase tracking-widest text-slate-400">
            {item.speed}
          </div>
        </div>
      </div>

      <div className="mt-5 text-xs font-semibold uppercase tracking-widest text-slate-500">
        {item.label}
      </div>
      <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">{item.title}</h3>

      <div className="mt-4 grid gap-3 text-sm leading-6">
        <InfoBlock label="Best buyer" value={item.buyer} />
        <InfoBlock label="What they get" value={item.result} />
        <InfoBlock label="Mechanism" value={item.mechanism} />
      </div>

      <div className="mt-auto pt-5">
        <Link
          href={item.href}
          target={external ? "_blank" : undefined}
          rel={external ? "noreferrer" : undefined}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-slate-900/15 hover:bg-slate-800"
        >
          {item.primaryLabel} <ArrowRight className="h-4 w-4" />
        </Link>
        {item.secondaryHref && item.secondaryLabel ? (
          <Link
            href={item.secondaryHref}
            className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-950 hover:bg-slate-50"
          >
            {item.secondaryLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400">
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">{value}</p>
    </div>
  );
}
