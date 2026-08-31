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
import { OPERATOR_OFFERS } from "@/lib/operatoros/catalog.ts";

export const metadata: Metadata = {
  title: "OperatorOS | AI Workers You Can Watch Work | The LeadFlow Pro",
  description:
    "The LeadFlow Pro maps repetitive work, trains ChatGPT and Claude workers, adds human approval gates, and gives the owner a live operating screen.",
  alternates: { canonical: "https://www.theleadflowpro.com/operatoros" },
  openGraph: {
    title: "LeadFlow OperatorOS",
    description: "Show us the job. We map it, teach it, run it, and give you a live screen where you can watch the work move.",
    url: "https://www.theleadflowpro.com/operatoros",
    type: "website",
  },
};

const lanes = [
  { name: "Signal", job: "Find the attention and opportunity", icon: Target },
  { name: "Catcher", job: "Capture and route incoming demand", icon: Network },
  { name: "Scout", job: "Qualify and prioritize the work", icon: ClipboardCheck },
  { name: "Drip", job: "Find follow-up that is slipping", icon: MessageSquareText },
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

export default function OperatorOSPage() {
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
    <main className="overflow-hidden bg-[#f5f7fb]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <section className="relative bg-[#07111f] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(18,64,232,0.42),transparent_38%),radial-gradient(circle_at_82%_20%,rgba(53,198,244,0.20),transparent_32%)]" />
        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_560px]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#50d4ff]">The LeadFlow Pro OperatorOS</p>
              <h1 className="mt-4 max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                AI workers you can actually watch work.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#bdc9da]">
                Show us one repetitive job inside your company. We map it, teach it to ChatGPT or Claude, put guardrails around it, and give you a live screen where you can see every handoff, result, failure, and approval.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/diagnostic?utm_source=operatoros&utm_medium=page&utm_campaign=operatoros"
                  className="inline-flex min-h-[50px] items-center gap-2 rounded-xl bg-[#1240e8] px-6 text-sm font-black text-white shadow-[0_0_32px_rgba(18,64,232,0.55)] transition hover:bg-[#2454ff]"
                >
                  Show us the job <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="#how-it-works"
                  className="inline-flex min-h-[50px] items-center gap-2 rounded-xl border border-[#ffffff2e] bg-[#ffffff0a] px-6 text-sm font-black text-white transition hover:bg-[#ffffff14]"
                >
                  <Play className="h-4 w-4" aria-hidden="true" /> See how it works
                </Link>
              </div>
              <p className="mt-5 text-xs font-bold uppercase tracking-wide text-[#7f91aa]">
                Built for serious operators with real work, real offers, and real accountability.
              </p>
            </div>

            <div className="rounded-[28px] border border-[#ffffff20] bg-[#0d1a2d]/90 p-5 shadow-[0_30px_100px_rgba(0,0,0,0.34)] backdrop-blur">
              <div className="flex items-center justify-between gap-3 border-b border-[#ffffff14] pb-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#50d4ff]">Mission Control</p>
                  <p className="mt-1 text-lg font-black">Your business is running</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-black text-emerald-200">
                  <span className="relative h-2 w-2 rounded-full bg-emerald-300">
                    <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-30 motion-reduce:animate-none" />
                  </span>
                  LIVE
                </span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {lanes.map(({ name, job, icon: Icon }, index) => (
                  <article key={name} className="relative rounded-2xl border border-[#ffffff18] bg-[#111f35] p-4">
                    <Icon className="h-5 w-5 text-[#50d4ff]" aria-hidden="true" />
                    <p className="mt-3 font-black">{name}</p>
                    <p className="mt-1 text-[11px] leading-4 text-[#9fb0c7]">{job}</p>
                    <span className={`mt-3 inline-flex rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide ${index === 2 || index === 3 ? "bg-emerald-400/10 text-emerald-200" : "bg-cyan-400/10 text-cyan-100"}`}>
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
                  <div key={label} className="rounded-xl border border-[#ffffff14] bg-[#0a1424] p-3 text-center">
                    <p className="text-xl font-black text-[#50d4ff]">{value}</p>
                    <p className="mt-1 text-[9px] font-black uppercase tracking-wide text-[#7f91aa]">{label}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-center text-[10px] text-[#657a96]">
                Illustrative layout. Customer dashboards display their own stored records.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#dfe5ef] bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:grid-cols-3 sm:px-6">
          {[
            { icon: BrainCircuit, title: "ChatGPT + Claude", body: "The right reasoning engine for the right job." },
            { icon: LockKeyhole, title: "Human stopline", body: "Consequential actions stop and ask." },
            { icon: Eye, title: "Visible proof", body: "Every run, result, failure, and handoff is recorded." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf2ff] text-[#1240e8]">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-black text-[#0a1220]">{title}</p>
                <p className="mt-1 text-sm text-[#5e6b7f]">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#1240e8]">Teach My Job</p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.035em] text-[#0a1220] sm:text-5xl">
            Record the job. Turn it into a system. Watch it run.
          </h2>
          <p className="mt-5 text-lg leading-8 text-[#5e6b7f]">
            We do not sell random bots or a bucket of credits. We install a defined operating capability with a trigger, procedure, finish line, guardrails, and an audit trail.
          </p>
        </div>
        <div className="mt-12 grid gap-4 lg:grid-cols-4">
          {process.map((step) => (
            <article key={step.number} className="rounded-3xl border border-[#dfe5ef] bg-white p-6 shadow-[0_18px_45px_rgba(10,18,32,0.05)]">
              <p className="text-sm font-black text-[#1240e8]">{step.number}</p>
              <h3 className="mt-5 text-xl font-black text-[#0a1220]">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#5e6b7f]">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#0a1424] text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/5 p-7">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-7 w-7 text-emerald-300" aria-hidden="true" />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Green lane</p>
                  <h2 className="mt-1 text-2xl font-black">The worker can do this automatically</h2>
                </div>
              </div>
              <ul className="mt-7 space-y-4">
                {safeActions.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-[#c7d1df]">
                    <Check className="h-5 w-5 shrink-0 text-emerald-300" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-amber-400/20 bg-amber-400/5 p-7">
              <div className="flex items-center gap-3">
                <LockKeyhole className="h-7 w-7 text-amber-300" aria-hidden="true" />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">Human stopline</p>
                  <h2 className="mt-1 text-2xl font-black">The worker stops and asks</h2>
                </div>
              </div>
              <ul className="mt-7 space-y-4">
                {stoplineActions.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-[#c7d1df]">
                    <FileClock className="h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
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
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#1240e8]">What you are buying</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.035em] text-[#0a1220] sm:text-5xl">
              A completed operating outcome, not AI credits.
            </h2>
            <p className="mt-5 text-lg leading-8 text-[#5e6b7f]">
              The system is scoped around the work product. That may be working every new lead, preparing every onboarding packet, clearing the follow-up queue, organizing delivery, or producing a verified daily brief.
            </p>
            <div className="mt-8 space-y-4">
              {[
                [Bot, "Defined AI workers", "Each worker has a job, provider, model, permissions, and status."],
                [Workflow, "Installable Skills", "The procedure stays reusable instead of disappearing inside one chat."],
                [Eye, "Mission Control", "The owner can see what moved and what still needs attention."],
                [CircleDollarSign, "Results layer", "Leads, pipeline, payments, delivery, and proof connect to the work."],
              ].map(([Icon, title, body]) => {
                const ItemIcon = Icon as typeof Bot;
                return (
                  <div key={String(title)} className="flex gap-3 rounded-2xl border border-[#dfe5ef] bg-white p-4">
                    <ItemIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#1240e8]" aria-hidden="true" />
                    <div>
                      <p className="font-black text-[#0a1220]">{String(title)}</p>
                      <p className="mt-1 text-sm leading-6 text-[#5e6b7f]">{String(body)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {OPERATOR_OFFERS.map((offer) => (
              <article key={offer.name} className={`rounded-3xl border p-6 shadow-[0_18px_50px_rgba(10,18,32,0.06)] ${offer.featured ? "border-[#1240e8] bg-[#0a1424] text-white" : "border-[#dfe5ef] bg-white text-[#0a1220]"}`}>
                {offer.featured && (
                  <span className="inline-flex rounded-full bg-[#1240e8] px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                    Complete operating layer
                  </span>
                )}
                <h3 className="mt-4 text-2xl font-black">{offer.name}</h3>
                <p className={`mt-2 text-sm leading-6 ${offer.featured ? "text-[#b8c5d9]" : "text-[#5e6b7f]"}`}>{offer.buyer}</p>
                <div className="mt-5 border-y border-current/10 py-4">
                  <p className="text-xl font-black">{offer.setup}</p>
                  <p className={`mt-1 text-sm font-bold ${offer.featured ? "text-[#50d4ff]" : "text-[#1240e8]"}`}>{offer.monthly}</p>
                </div>
                <ul className="mt-5 space-y-3">
                  {offer.includes.map((item) => (
                    <li key={item} className={`flex gap-2 text-sm ${offer.featured ? "text-[#d6deea]" : "text-[#465469]"}`}>
                      <Check className={`mt-0.5 h-4 w-4 shrink-0 ${offer.featured ? "text-[#50d4ff]" : "text-[#1240e8]"}`} aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-24">
          <Sparkles className="mx-auto h-8 w-8 text-[#1240e8]" aria-hidden="true" />
          <h2 className="mt-5 text-4xl font-black tracking-[-0.035em] text-[#0a1220] sm:text-5xl">
            Show us one job your company repeats every day.
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-[#5e6b7f]">
            We will tell you whether it should be automated, assisted, approval-gated, or left with a human. Serious buyers get a clear system map and the next move.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/diagnostic?utm_source=operatoros&utm_medium=page&utm_campaign=operatoros-bottom"
              className="inline-flex min-h-[50px] items-center gap-2 rounded-xl bg-[#1240e8] px-6 text-sm font-black text-white"
            >
              Start the business diagnostic <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/book"
              className="inline-flex min-h-[50px] items-center gap-2 rounded-xl border border-[#cfd7e5] bg-white px-6 text-sm font-black text-[#0a1220]"
            >
              Book the fit call
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
