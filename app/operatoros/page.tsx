import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Check,
  CircleDollarSign,
  ClipboardCheck,
  Eye,
  FileClock,
  Gauge,
  LockKeyhole,
  MessageSquareText,
  Network,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  Workflow,
} from "lucide-react";
import {
  MANAGED_PLANS,
  managedPlanPrice,
  managedUpfrontSummary,
  managedCampaignSummary,
  managedCompletionExplanation,
  managedRenewalExplanation,
  managedAdvertisingExplanation,
} from "@/lib/site/managedPlans";
import { agencyIntakeHref } from "@/lib/site/agencyIntake";
import { buyerHref, type BuyerQuery } from "@/lib/site/publicBuyerRoutes";
import { CONSULTATION } from "@/lib/site/consultation";

export const metadata: Metadata = withPublicPageMetadata("/operatoros", {
  title: "OperatorOS | AI Workers You Can Watch Work | The LeadFlow Pro",
  description:
    "The LeadFlow Pro maps repetitive work, trains ChatGPT and Claude workers, adds human approval gates, and gives the owner a live operating screen.",
  alternates: { canonical: "https://www.theleadflowpro.com/operatoros" },
  openGraph: {
    title: "LeadFlow OperatorOS",
    description:
      "Show us the job. We map it, teach it, run it, and give you a live screen where you can watch the work move.",
    url: "https://www.theleadflowpro.com/operatoros",
    type: "website",
  },
});

const lanes = [
  { name: "Signal", job: "Find the attention and opportunity", icon: Target },
  { name: "Catcher", job: "Capture and route incoming demand", icon: Network },
  {
    name: "Scout",
    job: "Qualify and prioritize the work",
    icon: ClipboardCheck,
  },
  {
    name: "Drip",
    job: "Find follow-up that is slipping",
    icon: MessageSquareText,
  },
  { name: "Forge", job: "Track the build and delivery", icon: Workflow },
  { name: "Lens", job: "Turn completed work into proof", icon: Gauge },
];

const process = [
  {
    number: "01",
    title: "Show us the job",
    body: "You or your team perform the repetitive process once. We capture the trigger, decisions, steps, exceptions, finish line, and the moments that need a human.",
  },
  {
    number: "02",
    title: "We turn it into a Skill",
    body: "The procedure becomes an installable operating Skill with approved inputs, forbidden actions, an evidence standard, and a measurable definition of done.",
  },
  {
    number: "03",
    title: "ChatGPT or Claude runs the work",
    body: "The right AI worker analyzes the real business state, performs the permitted internal work, and routes consequential actions to the human stopline.",
  },
  {
    number: "04",
    title: "You watch it move",
    body: "Mission Control shows what started, what finished, what failed, what is blocked, what needs approval, and what the work produced.",
  },
];

const safeActions = [
  "Analyze live business records",
  "Prioritize leads and tasks",
  "Prepare internal recommendations",
  "Build evidence-backed reports",
  "Create an audit trail",
];

const stoplineActions = [
  "Send sensitive external messages",
  "Publish under your name",
  "Spend money or issue a refund",
  "Change pricing or sign an agreement",
  "Delete data or deploy production",
];

export default async function OperatorOSPage({
  searchParams,
}: {
  searchParams: Promise<BuyerQuery>;
}) {
  const incoming = await searchParams;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "LeadFlow OperatorOS",
    provider: { "@type": "Organization", name: "The LeadFlow Pro" },
    areaServed: "United States",
    description:
      "A done-for-you AI operating layer that maps repetitive work, installs bounded ChatGPT and Claude workers, and provides live Mission Control with human approvals.",
    url: "https://www.theleadflowpro.com/operatoros",
  };

  return (
    <main className="overflow-hidden bg-[#f3efe8]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="relative bg-[#f3efe8] text-[#20212b]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(81,53,229,0.10),transparent_38%),radial-gradient(circle_at_82%_20%,rgba(255,180,67,0.12),transparent_32%)]" />
        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_560px]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#5135e5]">
                The LeadFlow Pro OperatorOS
              </p>
              <h1 className="mt-4 max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                AI workers you can actually watch work.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#625f6d]">
                Show us one repetitive job inside your company. We map it, teach
                it to ChatGPT or Claude, put guardrails around it, and give you
                a live screen where you can see every handoff, result, failure,
                and approval.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/diagnostic?utm_source=operatoros&utm_medium=page&utm_campaign=operatoros"
                  className="inline-flex min-h-[50px] items-center gap-2 rounded-xl bg-[#ffb443] px-6 text-sm font-black text-[#20212b] shadow-[0_0_32px_rgba(143,104,49,0.15)] transition hover:bg-[#ffca76]"
                >
                  Show us the job{" "}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="#how-it-works"
                  className="inline-flex min-h-[50px] items-center gap-2 rounded-xl border border-[#dbd0c5] bg-[#fff9ef] px-6 text-sm font-black text-[#20212b] transition hover:bg-[#fff9ef]"
                >
                  <Play className="h-4 w-4" aria-hidden="true" /> See how it
                  works
                </Link>
              </div>
              <p className="mt-5 text-xs font-bold uppercase tracking-wide text-[#625f6d]">
                Built for serious operators with real work, real offers, and
                real accountability.
              </p>
            </div>

            <div className="rounded-[28px] border border-[#dbd0c5] bg-[#fff9ef] p-5 shadow-[0_30px_100px_rgba(67,54,76,0.10)] backdrop-blur">
              <div className="flex items-center justify-between gap-3 border-b border-[#dbd0c5] pb-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#5135e5]">
                    Mission Control
                  </p>
                  <p className="mt-1 text-lg font-black">
                    Your business is running
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-[#e5eee3] px-3 py-1.5 text-[11px] font-black text-[#23643c]">
                  <span className="relative h-2 w-2 rounded-full bg-emerald-300">
                    <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-30 motion-reduce:animate-none" />
                  </span>
                  EXAMPLE
                </span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {lanes.map(({ name, job, icon: Icon }, index) => (
                  <article
                    key={name}
                    className="relative rounded-2xl border border-[#dbd0c5] bg-[#ede6f3] p-4"
                  >
                    <Icon
                      className="h-5 w-5 text-[#5135e5]"
                      aria-hidden="true"
                    />
                    <p className="mt-3 font-black">{name}</p>
                    <p className="mt-1 text-[11px] leading-4 text-[#625f6d]">
                      {job}
                    </p>
                    <span
                      className={`mt-3 inline-flex rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide ${index === 2 || index === 3 ? "bg-[#e5eee3] text-[#23643c]" : "bg-[#ede6f3] text-[#5135e5]"}`}
                    >
                      {index === 2 || index === 3 ? "working" : "waiting"}
                    </span>
                  </article>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  ["14", "Jobs moved"],
                  ["2", "Needs approval"],
                  ["100%", "Work recorded"],
                ].map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-[#dbd0c5] bg-[#ede6f3] p-3 text-center"
                  >
                    <p className="text-xl font-black text-[#5135e5]">{value}</p>
                    <p className="mt-1 text-[9px] font-black uppercase tracking-wide text-[#625f6d]">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-center text-[10px] text-[#625f6d]">
                Illustrative layout. Customer dashboards display their own
                stored records.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#dbd0c5] bg-[#fff9ef]">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:grid-cols-3 sm:px-6">
          {[
            {
              icon: BrainCircuit,
              title: "ChatGPT + Claude",
              body: "The right reasoning engine for the right job.",
            },
            {
              icon: LockKeyhole,
              title: "Human stopline",
              body: "Consequential actions stop and ask.",
            },
            {
              icon: Eye,
              title: "Visible proof",
              body: "Every run, result, failure, and handoff is recorded.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ede6f3] text-[#5135e5]">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-black text-[#20212b]">{title}</p>
                <p className="mt-1 text-sm text-[#625f6d]">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28"
      >
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#5135e5]">
            Teach My Job
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.035em] text-[#20212b] sm:text-5xl">
            Record the job. Turn it into a system. Watch it run.
          </h2>
          <p className="mt-5 text-lg leading-8 text-[#625f6d]">
            We do not sell random bots or a bucket of credits. We install a
            defined operating capability with a trigger, procedure, finish line,
            guardrails, and an audit trail.
          </p>
        </div>
        <div className="mt-12 grid gap-4 lg:grid-cols-4">
          {process.map((step) => (
            <article
              key={step.number}
              className="rounded-3xl border border-[#dbd0c5] bg-[#fff9ef] p-6 shadow-[0_18px_45px_rgba(10,18,32,0.05)]"
            >
              <p className="text-sm font-black text-[#5135e5]">{step.number}</p>
              <h3 className="mt-5 text-xl font-black text-[#20212b]">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-[#625f6d]">
                {step.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#ede6f3] text-[#20212b]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="rounded-3xl border border-emerald-400/20 bg-[#e5eee3] p-7">
              <div className="flex items-center gap-3">
                <ShieldCheck
                  className="h-7 w-7 text-[#23643c]"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#23643c]">
                    Green lane
                  </p>
                  <h2 className="mt-1 text-2xl font-black">
                    The worker can do this automatically
                  </h2>
                </div>
              </div>
              <ul className="mt-7 space-y-4">
                {safeActions.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-[#34313f]"
                  >
                    <Check
                      className="h-5 w-5 shrink-0 text-[#23643c]"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-amber-400/20 bg-[#f6e9dc] p-7">
              <div className="flex items-center gap-3">
                <LockKeyhole
                  className="h-7 w-7 text-[#855115]"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#855115]">
                    Human stopline
                  </p>
                  <h2 className="mt-1 text-2xl font-black">
                    The worker stops and asks
                  </h2>
                </div>
              </div>
              <ul className="mt-7 space-y-4">
                {stoplineActions.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-[#34313f]"
                  >
                    <FileClock
                      className="h-5 w-5 shrink-0 text-[#855115]"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#5135e5]">
              What you are buying
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.035em] text-[#20212b] sm:text-5xl">
              Scope the workflow within the campaign.
            </h2>
            <p className="mt-5 text-lg leading-8 text-[#625f6d]">
              AI workflows belong in a written scope around your business,
              connected accounts, permissions, and the work you want handled. We
              define the supported workflow and review steps before work begins.
            </p>
            <div className="mt-8 space-y-4">
              {[
                [
                  Bot,
                  "Defined AI workers",
                  "Each worker has a job, provider, model, permissions, and status.",
                ],
                [
                  Workflow,
                  "Installable Skills",
                  "The procedure stays reusable instead of disappearing inside one chat.",
                ],
                [
                  Eye,
                  "Mission Control",
                  "The owner can see what moved and what still needs attention.",
                ],
                [
                  CircleDollarSign,
                  "Results layer",
                  "Leads, pipeline, payments, delivery, and proof connect to the work.",
                ],
              ].map(([Icon, title, body]) => {
                const ItemIcon = Icon as typeof Bot;
                return (
                  <div
                    key={String(title)}
                    className="flex gap-3 rounded-2xl border border-[#dbd0c5] bg-[#fff9ef] p-4"
                  >
                    <ItemIcon
                      className="mt-0.5 h-5 w-5 shrink-0 text-[#5135e5]"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-black text-[#20212b]">
                        {String(title)}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[#625f6d]">
                        {String(body)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-5 text-sm leading-6 text-[#625f6d]">
              {managedUpfrontSummary()} {managedCampaignSummary()} {managedAdvertisingExplanation()}
              Custom integrations and work beyond the approved scope receive a
              separate written quote. Existing agreements keep their terms.
            </p>
            <div className="grid gap-4">
              {MANAGED_PLANS.map((plan) => {
                const price = managedPlanPrice(plan);
                return (
                  <article
                    key={plan.id}
                    className="flex flex-col rounded-3xl border border-[#dbd0c5] bg-[#fff9ef] p-6 shadow-[0_18px_50px_rgba(10,18,32,0.06)]"
                  >
                    <h3 className="text-2xl font-black text-[#20212b]">
                      {plan.name}
                    </h3>
                    <p className="mt-4 text-2xl font-black text-[#5135e5]">
                      {price.amount}{" "}
                      <span className="text-sm">{price.unit}</span>
                    </p>
                    <p className="mt-3 text-sm leading-6 text-[#625f6d]">
                      {plan.description}
                    </p>
                    <Link
                      href={agencyIntakeHref(plan.id, incoming)}
                      className="mt-5 inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-[#dbd0c5] px-4 text-sm font-black text-[#5135e5]"
                    >
                      Scope this plan{" "}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </article>
                );
              })}
            </div>
            <p className="mt-5 text-sm leading-6 text-[#625f6d]">
              {managedCompletionExplanation()}
            </p>
            <p className="mt-5 text-sm leading-6 text-[#625f6d]">
              {managedRenewalExplanation()}
            </p>
            <Link
              href={buyerHref("/pricing", incoming)}
              className="mt-5 inline-block text-sm font-bold text-[#5135e5] underline"
            >
              See campaign and renewal terms
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#fff9ef]">
        <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-24">
          <Sparkles
            className="mx-auto h-8 w-8 text-[#5135e5]"
            aria-hidden="true"
          />
          <h2 className="mt-5 text-4xl font-black tracking-[-0.035em] text-[#20212b] sm:text-5xl">
            Show us one job your company repeats every day.
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-[#625f6d]">
            We will tell you whether it should be automated, assisted,
            approval-gated, or left with a human. Serious buyers get a clear
            system map and the next move.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/diagnostic?utm_source=operatoros&utm_medium=page&utm_campaign=operatoros-bottom"
              className="inline-flex min-h-[50px] items-center gap-2 rounded-xl bg-[#ffb443] px-6 text-sm font-black text-[#20212b]"
            >
              Start the business diagnostic{" "}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href={buyerHref(CONSULTATION.href, incoming)}
              className="inline-flex min-h-[50px] items-center gap-2 rounded-xl border border-[#dbd0c5] bg-[#fff9ef] px-6 text-sm font-black text-[#20212b]"
            >
              Request a free 30-minute consultation
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
