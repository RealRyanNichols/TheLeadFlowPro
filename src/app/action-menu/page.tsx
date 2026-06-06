import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
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
  title: "Buy Menu | The LeadFlow Pro",
  description:
    "Pick the fastest next move with Ryan Nichols: $47 Quick-Look, $90 Sprint, $197 Lead Leak Audit, public leaderboard votes, ticker boosts, Voice topics, or custom build blueprint.",
  path: "/action-menu",
  imageTitle: "The LeadFlow Pro Buy Menu",
  imageSubtitle: "Micro-purchases, public loops, audits, and custom build paths in one place.",
});

const ICONS: Record<ActionMenuKind, LucideIcon> = {
  "quick-look": Eye,
  "decision-sprint": Gauge,
  audit: ClipboardCheck,
  leaderboard: Trophy,
  boost: Megaphone,
  voice: ThumbsUp,
  blueprint: Sparkles,
  message: MessageSquareText,
};

const MECHANISM_LADDER = [
  {
    label: "Attention",
    title: "Give them something to click.",
    body: "Proof cards, leaderboards, topics, boosts, audits, and build menus make the site feel alive instead of static.",
  },
  {
    label: "Signal",
    title: "Turn the click into a choice.",
    body: "Every path asks for money, business context, a public vote, a booking, or a blueprint request.",
  },
  {
    label: "Delivery",
    title: "Give them something for the spend.",
    body: "Video notes, working sessions, audit readouts, public rank movement, ticker time, or a build blueprint.",
  },
  {
    label: "Upsell",
    title: "Route serious buyers to the bigger move.",
    body: "The small purchase creates trust, then points to audit, custom build, consulting, social, or operator work.",
  },
];

export default function ActionMenuPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <LightHeader
        activePath="/action-menu"
        primaryAction={{
          href: "/offers/quick-look",
          label: "$47 Quick-Look",
          mobileDescription: "Fastest paid path to Ryan's eyes.",
          Icon: Eye,
        }}
        secondaryAction={{
          href: "/lead-leak-audit-197#audit-application",
          label: "$197 Audit",
          mobileDescription: "Apply for the paid lead leak audit.",
          Icon: ClipboardCheck,
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
                Pick a move
              </div>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Do not wander the site. Pick the action that fits where you are.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                The LeadFlow Pro is built around small useful moves that create momentum: buy a
                quick read, apply for the audit, move a public board, boost a message, vote on a
                topic, or ask Ryan to map the tool you wish existed.
              </p>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
                No guaranteed leads, sales, revenue, ROAS, followers, or ad approval. Each purchase
                should produce a real output, a public signal, or a clearer next move.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-4 shadow-2xl shadow-slate-950/30 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <HeroMetric label="Fastest buy" value="$47" body="Quick-Look video" />
                <HeroMetric label="Paid ad path" value="$197" body="Lead Leak Audit" />
                <HeroMetric label="Public loop" value="$1+" body="Rank or Voice vote" />
                <HeroMetric label="Custom build" value="$250" body="Continuation deposit after blueprint" />
              </div>
              <div className="mt-4 rounded-2xl border border-accent-300/25 bg-accent-300/10 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent-100">
                  <Zap className="h-4 w-4" />
                  What this page is for
                </div>
                <p className="mt-2 text-sm font-semibold leading-6 text-white">
                  A visitor should land here and know exactly how to spend, engage, share, or ask
                  for the next useful thing.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#fff8f1_0%,#eef9ff_100%)]">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                Action menu
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Start small, play the loop, or move straight into the serious path.
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
                The action menu gives different buyers a different door without making them read the
                whole site. Some people buy a quick look. Some apply for the audit. Some play the
                public boards. Some bring Ryan a custom build idea.
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
                The cheapest serious signal is the $47 Quick-Look. The strongest paid traffic path
                is the $197 audit. The custom-build path starts with Stump Ryan. Questions go
                through the message-first assistant path.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/offers/quick-look"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-accent-400"
              >
                Start with $47 <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/lead-leak-audit-197#audit-application"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/15"
              >
                Apply for $197 audit
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
