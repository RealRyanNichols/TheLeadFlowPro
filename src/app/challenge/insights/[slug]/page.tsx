import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CalendarCheck,
  Clock3,
  Database,
  DollarSign,
  Lightbulb,
  MousePointerClick,
  Sparkles,
} from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { createSeoMetadata } from "@/lib/seo-metadata";

const INSIGHTS = {
  "monthly-exposure": {
    title: "Monthly Exposure",
    eyebrow: "What money is leaking?",
    metric: "$9,000",
    metricLabel: "example monthly exposure",
    description:
      "Monthly exposure is the rough dollar value sitting in missed leads, slow follow-up, or unclear routing. It is not a promise of revenue. It is a way to size the problem before Ryan builds the system.",
    formula: "Missed leads per week x average lead/customer value x 4.33 weeks",
    example: "6 missed leads/week x $350 average value x 4.33 = $9,093/month exposed",
    inputs: [
      "Missed calls, unanswered forms, DMs, texts, booking abandons, and quote requests",
      "Average customer value, average lead value, ticket size, or rough deal value",
      "Source path: post, ad, page, referral, search term, QR code, or share link",
      "Outcome status: answered, booked, quoted, paid, lost, no-show, or needs follow-up",
    ],
    liveData: [
      "Website forms and button clicks",
      "Call tracking and missed-call logs",
      "CRM stages and follow-up status",
      "Stripe, booking, and quote events",
      "UTMs, share links, and social platform click-backs",
    ],
    decisions: [
      "Which page or post is creating buyer intent?",
      "Which lead source needs faster follow-up?",
      "Which offer should get a stronger checkout or calendar path?",
      "Where should Ryan build automation first so the owner stops bleeding money?",
    ],
    build: [
      "Lead capture board",
      "Missed-call text-back system",
      "Source-to-sale dashboard",
      "Follow-up reminders and owner alerts",
    ],
  },
  "hours-per-month": {
    title: "Hours Per Month",
    eyebrow: "What time is being wasted?",
    metric: "30h",
    metricLabel: "example monthly time waste",
    description:
      "Hours per month estimates how much repeated manual work is eating the owner or team. The goal is not to make a pretty report. The goal is to find the work a tool should take off your plate.",
    formula: "Manual hours wasted each week x 4.33 weeks",
    example: "7 manual hours/week x 4.33 = 30.31 hours/month",
    inputs: [
      "How many hours are spent answering the same questions",
      "How much time goes into follow-up, quote prep, scheduling, file chasing, or reports",
      "How many people touch the same task before it gets finished",
      "Where the handoff breaks: owner, admin, salesperson, technician, content person, or client",
    ],
    liveData: [
      "Task timestamps and status changes",
      "Inbox, text, form, and CRM activity",
      "Calendar booking and no-show patterns",
      "Document upload and review status",
      "Team notes, internal comments, and owner approvals",
    ],
    decisions: [
      "What should become a template?",
      "What should trigger automatically?",
      "What should go into a client portal instead of a text thread?",
      "Which repeated task is expensive enough to justify a custom build?",
    ],
    build: [
      "Client portal",
      "Quote worksheet generator",
      "Task queue with reminders",
      "Owner dashboard showing what is stuck",
    ],
  },
  "build-estimate": {
    title: "Build Estimate",
    eyebrow: "What would the first useful build take?",
    metric: "12h",
    metricLabel: "example first build estimate",
    description:
      "Build estimate is a first-pass workload model. It is not a final quote. It tells Ryan whether the right first move is a prototype, a focused business tool, or a larger operating system.",
    formula:
      "max(4, round((4 base hours + manual hours x 0.65 + team size x 0.8 + delay hours x 0.12) x build level))",
    example: "(4 + 7 x .65 + 3 x .8 + 12 x .12) x 1 = 12.39, rounded to 12 hours",
    inputs: [
      "Manual work pressure",
      "Team size affected",
      "Response delay and urgency",
      "Build level: quick prototype, business tool, or operating system",
      "How many accounts, forms, files, dashboards, automations, and handoffs are involved",
    ],
    liveData: [
      "The tool request prompt",
      "Submitted business process details",
      "Connected CRM, calendar, email, form, payment, and analytics events",
      "Admin notes from Ryan after reviewing the business problem",
      "Client approval, refine, or scrap decisions",
    ],
    decisions: [
      "Do we start with a $250 build slot or talk first?",
      "Is the first version a one-page tool, a dashboard, a portal, or an automation chain?",
      "What should be built now, and what should wait until the data proves it?",
      "What does the owner need to control without an agency holding the keys?",
    ],
    build: [
      "Prototype scope",
      "Tool architecture",
      "Admin/client portal flow",
      "Automation and handoff plan",
    ],
  },
} as const;

type InsightSlug = keyof typeof INSIGHTS;
type Props = { params: { slug: string } };

export function generateStaticParams() {
  return Object.keys(INSIGHTS).map((slug) => ({ slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const insight = INSIGHTS[params.slug as InsightSlug];
  if (!insight) return { title: "Insight · The LeadFlow Pro" };

  return createSeoMetadata({
    title: `${insight.title} Breakdown — The LeadFlow Pro`,
    description: insight.description,
    path: `/challenge/insights/${params.slug}`,
    imageTitle: `${insight.title} Breakdown`,
    imageSubtitle: "Formula, live data path, and business decisions behind the Stump Me calculator.",
  });
}

export default function ChallengeInsightPage({ params }: Props) {
  const insight = INSIGHTS[params.slug as InsightSlug];
  if (!insight) notFound();

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <LightHeader activePath="/challenge" />

      <main>
        <section className="relative overflow-hidden border-b border-slate-200">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, #fff8f1 0%, #f6f9ff 36%, #eef9ff 70%, #fff1df 100%)",
            }}
          />
          <div
            aria-hidden
            className="absolute -right-24 -top-28 h-[480px] w-[480px] rounded-full bg-cyan-300/35 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute -bottom-36 -left-24 h-[440px] w-[440px] rounded-full bg-accent-300/30 blur-3xl"
          />
          <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-14">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-700 shadow-sm backdrop-blur">
                <BarChart3 className="h-3.5 w-3.5" /> {insight.eyebrow}
              </div>
              <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                {insight.title}: what it means, where it comes from, and what to do with it.
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-700">
                {insight.description}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/challenge#tool-challenge-form"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800"
                >
                  Use this in my tool request <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/pulse"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cyan-300 bg-white/75 px-5 py-3 text-sm font-semibold text-cyan-900 shadow-sm backdrop-blur hover:bg-cyan-50"
                >
                  See the live pulse <Sparkles className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-900/10 bg-slate-950 text-white shadow-[0_30px_90px_-36px_rgba(15,23,42,0.75)]">
              <div className="border-b border-white/10 bg-white/[0.04] p-5">
                <div className="text-xs font-semibold uppercase tracking-widest text-cyan-200">
                  Current calculator example
                </div>
                <div className="mt-3 flex items-end gap-3">
                  <div className="text-6xl font-semibold tracking-tight tabular-nums">
                    {insight.metric}
                  </div>
                  <div className="pb-2 text-sm text-slate-300">{insight.metricLabel}</div>
                </div>
              </div>
              <div className="grid gap-3 p-5">
                <FormulaCard title="Formula" body={insight.formula} Icon={Bot} />
                <FormulaCard title="Example" body={insight.example} Icon={DollarSign} />
                <div className="rounded-2xl border border-accent-300/25 bg-accent-300/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-accent-100">
                    <Lightbulb className="h-4 w-4" />
                    Plain English
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    This number is a starting point for a conversation. Better connected data turns
                    it from an estimate into an operating signal.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 py-10 lg:grid-cols-3">
            <BreakdownColumn
              title="What you type or connect"
              Icon={Database}
              items={insight.inputs}
            />
            <BreakdownColumn
              title="Live data that can feed it"
              Icon={MousePointerClick}
              items={insight.liveData}
            />
            <BreakdownColumn
              title="Decisions it should drive"
              Icon={CalendarCheck}
              items={insight.decisions}
            />
          </div>
        </section>

        <section className="relative overflow-hidden bg-slate-950 text-white">
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)",
              backgroundSize: "36px 36px",
            }}
          />
          <div
            aria-hidden
            className="absolute -right-24 top-0 h-[420px] w-[420px] rounded-full bg-cyan-400/20 blur-3xl"
          />
          <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-200">
                What Ryan can build from this
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                The number is not the product. The tool that acts on it is the product.
              </h2>
              <p className="mt-4 text-slate-300">
                Once the data starts telling the same story repeatedly, Ryan can build the owner
                dashboard, client portal, automation, or follow-up system that turns the insight
                into action.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {insight.build.map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Clock3 className="h-4 w-4 text-cyan-200" />
                    {item}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">
                    Built around your accounts, your data, your process, and your control.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <LightFooter />
    </div>
  );
}

function FormulaCard({
  title,
  body,
  Icon,
}: {
  title: string;
  body: string;
  Icon: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
        <Icon className="h-4 w-4" />
        {title}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">{body}</p>
    </div>
  );
}

function BreakdownColumn({
  title,
  Icon,
  items,
}: {
  title: string;
  Icon: LucideIcon;
  items: readonly string[];
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-cyan-50/50 p-5 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.35)]">
      <Icon className="h-6 w-6 text-cyan-700" />
      <h2 className="mt-4 text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
      <div className="mt-4 grid gap-2">
        {items.map((item) => (
          <div key={item} className="rounded-2xl border border-cyan-100 bg-white/75 p-3 text-sm leading-relaxed text-slate-700">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
