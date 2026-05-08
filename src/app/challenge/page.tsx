import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  Brain,
  CheckCircle2,
  ClipboardList,
  Code2,
  KeyRound,
  LockKeyhole,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  Wrench,
  XCircle,
} from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { VisitorIdField } from "@/components/site/VisitorIdField";
import { ChallengeInsightBuilder } from "@/components/challenge/ChallengeInsightBuilder";
import { TOOL_CHALLENGE_DEPOSIT } from "@/lib/challenge-deposit";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = createSeoMetadata({
  title: "Stump Ryan With a Business Tool — The LeadFlow Pro",
  description:
    "Submit the business tool you wish existed. If Ryan builds a useful direction and you like it, move forward to a proposal or jump the line with a $250 deposit.",
  path: "/challenge",
  imageTitle: "Stump Ryan With a Business Tool",
  imageSubtitle: "Submit the tool free. If you want Ryan working now, put $250 down and jump the build line.",
  image: "/images/stump-me-tool-challenge-poster.jpg",
});

const BUILD_TARGETS = [
  "Lead follow-up systems",
  "Client portals",
  "Internal dashboards",
  "Quote calculators",
  "Content workflows",
  "CRM automations",
  "Booking flows",
  "Document generators",
  "Ops trackers",
  "Sales scripts and tools",
];

const OWNERSHIP_POINTS = [
  {
    Icon: KeyRound,
    title: "Your accounts",
    body: "The tool is built around your business, your logins, your data, and your process.",
  },
  {
    Icon: LockKeyhole,
    title: "Your control",
    body: "The goal is to put the system in your hands so you are not trapped by an agency.",
  },
  {
    Icon: BadgeDollarSign,
    title: "No percentage grab",
    body: "You pay for the build and setup. Your leads, ads, automations, and sales process stay yours.",
  },
];

const BUDGET_OPTIONS = [
  { value: "2000-5000", label: "$2K-$5K", body: "Prototype, workflow, or focused internal tool." },
  { value: "5000-10000", label: "$5K-$10K", body: "Serious build with setup, handoff, and training." },
  { value: "10000-plus", label: "$10K+", body: "Larger operating system or multi-part business tool." },
];

const DECISION_OPTIONS = [
  {
    Icon: ThumbsUp,
    title: "Accept",
    body: "You like the direction, we price the real build, and you move forward with a proposal.",
    tone: "border-cyan-300 bg-cyan-50 text-cyan-800",
  },
  {
    Icon: RefreshCw,
    title: "Refine",
    body: "The idea is close, but it needs another pass before you decide.",
    tone: "border-accent-300 bg-accent-50 text-accent-800",
  },
  {
    Icon: XCircle,
    title: "Scrap",
    body: "If it is not the right move, kill it cleanly and we do not force the wrong project.",
    tone: "border-rose-200 bg-rose-50 text-rose-700",
  },
];

type ChallengePageProps = {
  searchParams?: {
    submitted?: string;
    deposit?: string;
  };
};

export default function ChallengePage({ searchParams }: ChallengePageProps) {
  const submitted = searchParams?.submitted === "1";
  const depositCancelled = searchParams?.deposit === "cancelled";

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
                "linear-gradient(135deg, #fff8f1 0%, #f6f9ff 36%, #eef9ff 70%, #f3eaff 100%)",
            }}
          />
          <div
            aria-hidden
            className="absolute -right-36 -top-40 h-[540px] w-[540px] rounded-full opacity-50 blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(35,184,255,0.58) 0%, transparent 64%)" }}
          />
          <div
            aria-hidden
            className="absolute -bottom-44 -left-24 h-[520px] w-[520px] rounded-full opacity-50 blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(255,154,31,0.46) 0%, transparent 62%)" }}
          />

          <div className="relative mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:py-8">
            <div className="lg:sticky lg:top-24">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-700 shadow-sm backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" /> Free tool challenge
              </div>
              <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Stump me with the tool your business needs.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-700 sm:text-lg">
                Fill out the form below and describe the tool you thought could not be created:
                the one that catches the missed leads, stops the repeated work, organizes the
                chaos, or finally makes your follow-up run the way it should.
              </p>
              <div className="mt-5 rounded-3xl border border-white/70 bg-white/75 p-4 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                  The path
                </div>
                <div className="mt-3 grid gap-3 text-sm leading-relaxed text-slate-700 sm:grid-cols-3 lg:grid-cols-1">
                  <div>
                    <span className="font-semibold text-slate-950">1. Dream it.</span> Tell me what
                    your business would look like if this tool existed.
                  </div>
                  <div>
                    <span className="font-semibold text-slate-950">2. I shape it.</span> I look for
                    the fastest useful version, not a bloated software fantasy.
                  </div>
                  <div>
                    <span className="font-semibold text-slate-950">3. You decide.</span> Move
                    forward, refine the direction, or scrap it clean.
                  </div>
                </div>
              </div>
              <div className="mt-5">
                <Link
                  href="#tool-challenge-form"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 sm:w-auto"
                >
                  Fill out the tool form <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                Free to submit. If you want me working now, the optional $250 fast lane appears
                after the form and credits toward the build if you move forward.
              </p>

              {submitted ? <SubmissionReceivedCard /> : null}
              {depositCancelled ? <DepositCancelledCard /> : null}

              <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {OWNERSHIP_POINTS.map(({ Icon, title, body }) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur"
                  >
                    <Icon className="h-5 w-5 text-cyan-700" />
                    <h2 className="mt-3 text-sm font-semibold text-slate-950">{title}</h2>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(360px,1fr)]">
              <div className="order-2 rounded-3xl border border-slate-200 bg-slate-950 p-3 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.7)] lg:order-1">
                <div className="mb-3 flex items-center justify-between px-2 pt-1 text-xs font-semibold uppercase tracking-widest text-cyan-200">
                  <span className="inline-flex items-center gap-2">
                    <PlayCircle className="h-4 w-4" /> Watch the challenge
                  </span>
                  <span>Under 1 minute</span>
                </div>
                <video
                  className="aspect-[9/16] w-full rounded-2xl bg-black object-cover"
                  controls
                  playsInline
                  preload="metadata"
                  poster="/images/stump-me-tool-challenge-poster.jpg"
                >
                  <source src="/videos/stump-me-tool-challenge.mp4" type="video/mp4" />
                </video>
              </div>

              <div className="order-1 grid gap-4 lg:order-2">
                <ToolChallengeForm />
                <DecisionDeck />
                <ReserveBuildSlotCard />
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-10">
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                  What this is
                </div>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Not another agency leash. A tool in your hands.
                </h2>
                <p className="mt-3 text-slate-700">
                  Agencies keep too much power by keeping the system, the process, and the data in
                  their world. I want to come into your business, build the thing that makes the work
                  easier, and hand you a system you can run with or without me.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <BuildCard Icon={Brain} title="Figure out the real bottleneck" body="The tool starts with the business problem, not random software features." />
                <BuildCard Icon={Code2} title="Build the useful version first" body="Prototype the piece that saves time, creates leads, organizes work, or closes the gap." />
                <BuildCard Icon={ClipboardList} title="Document the setup" body="You need to know what it does, where it lives, and how to use it." />
                <BuildCard Icon={ShieldCheck} title="Keep ownership clear" body="Your accounts. Your customer data. Your process. Your operating power." />
              </div>
            </div>
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
          <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-12 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-200">
                Tools worth challenging me with
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                If it would change how your business runs, submit it.
              </h2>
              <p className="mt-3 text-slate-300">
                The best ideas are usually not fancy. They remove friction, answer the same question
                200 times, follow up faster, organize chaos, or make it easier for a customer to pay.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {BUILD_TARGETS.map((target) => (
                <div
                  key={target}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-slate-100"
                >
                  <CheckCircle2 className="h-4 w-4 text-cyan-200" />
                  {target}
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

function ToolChallengeForm() {
  return (
    <form
      id="tool-challenge-form"
      action="/api/tool-challenge"
      method="POST"
      className="rounded-3xl border border-white/70 bg-white/90 p-4 shadow-[0_28px_70px_-28px_rgba(15,23,42,0.38)] backdrop-blur sm:p-5"
    >
      <VisitorIdField />
      <div className="inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-800">
        <Wrench className="h-3.5 w-3.5" /> Free challenge intake
      </div>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
        Fill this out so I can create the dream tool.
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Do not think like a software developer. Think like the owner who is tired of the same leak
        every day. Tell me what you wish existed, what it would remove from your plate, and what
        your business could become if that one tool handled the problem. This is where the idea
        comes out of thin air and starts becoming a system you can own.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <PromptChip title="What disappears?" body="Missed calls, manual texts, repeat questions, messy handoff, lost leads." />
        <PromptChip title="What wakes up?" body="Follow-up, quotes, reminders, intake, reports, content, or customer routing." />
        <PromptChip title="What do you own?" body="Your accounts, your process, your data, and the tool built around them." />
      </div>
      <div className="mt-4">
        <ChallengeInsightBuilder />
      </div>

      <div className="mt-5 grid gap-3">
        <TextField name="toolName" label="Give the tool a name" placeholder="Example: missed-call follow-up dashboard" required />
        <TextArea
          name="toolProblem"
          label="What problem would this solve?"
          placeholder="What is wasting time, costing money, losing leads, or making your team repeat the same work?"
          required
        />
        <TextArea
          name="businessImpact"
          label="If this existed, what would your business look like?"
          placeholder="More booked calls, faster estimates, fewer missed leads, better handoff, cleaner follow-up, faster content, fewer mistakes. Paint the picture."
        />
        <TextArea
          name="currentProcess"
          label="How are you stuck doing it now?"
          placeholder="Spreadsheets, texts, sticky notes, missed calls, manual follow-up, too many apps, one employee's memory."
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <TextField name="fullName" label="Your name" placeholder="First and last" required />
          <TextField name="email" label="Email" placeholder="you@business.com" type="email" required />
          <TextField name="phone" label="Phone" placeholder="+1 555 123 4567" />
          <TextField name="businessName" label="Business name" placeholder="Company name" />
          <TextField name="businessUrl" label="Website" placeholder="https://" />
          <TextField name="industry" label="Industry" placeholder="Dealership, doctor, attorney, real estate..." />
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold text-slate-800">
            If you like the direction, what budget range makes sense?
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {BUDGET_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 text-sm shadow-sm has-[:checked]:border-cyan-500 has-[:checked]:bg-cyan-50"
              >
                <input
                  type="radio"
                  name="budgetTier"
                  value={option.value}
                  defaultChecked={option.value === "2000-5000"}
                  className="sr-only"
                />
                <span className="block font-semibold text-slate-950">{option.label}</span>
                <span className="mt-1 block text-xs leading-relaxed text-slate-500">{option.body}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            name="monthlyRevenueRange"
            label="Business size"
            options={[
              ["under-10k", "Under $10K/mo"],
              ["10-50k", "$10K-$50K/mo"],
              ["50-250k", "$50K-$250K/mo"],
              ["250k-plus", "$250K+/mo"],
            ]}
          />
          <SelectField
            name="timeline"
            label="How soon do you need it?"
            options={[
              ["now", "Now"],
              ["30-days", "Next 30 days"],
              ["60-90-days", "60-90 days"],
              ["planning", "Planning"],
            ]}
          />
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
          <input
            type="checkbox"
            name="acknowledgment"
            value="yes"
            required
            className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
          />
          <span>
            I understand this is a free business tool submission, not a guarantee. Ryan may propose
            a paid build, working session, phased prototype, or the optional $250 build-slot deposit.
          </span>
        </label>

        <button
          type="submit"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800"
        >
          Submit the challenge <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}

function PromptChip({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-cyan-200 bg-cyan-50/70 p-3">
      <div className="text-xs font-semibold text-cyan-900">{title}</div>
      <p className="mt-1 text-[11px] leading-relaxed text-cyan-900/70">{body}</p>
    </div>
  );
}

function SubmissionReceivedCard() {
  return (
    <div className="mt-5 rounded-3xl border border-cyan-300 bg-cyan-50/90 p-5 text-cyan-950 shadow-[0_24px_60px_-34px_rgba(8,145,178,0.45)]">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700" />
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Challenge received.</h2>
          <p className="mt-1 text-sm leading-relaxed text-cyan-900/80">
            Ryan has the tool idea. If you want it treated like paid work now, use the $250 fast
            lane below. That reserves build time and credits toward the custom build if you move
            forward.
          </p>
        </div>
      </div>
    </div>
  );
}

function DepositCancelledCard() {
  return (
    <div className="mt-5 rounded-3xl border border-accent-200 bg-accent-50/90 p-5 text-slate-950 shadow-[0_24px_60px_-34px_rgba(240,122,16,0.45)]">
      <div className="flex items-start gap-3">
        <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-accent-700" />
        <div>
          <h2 className="text-lg font-semibold tracking-tight">No problem. Submit it free first.</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">
            The deposit is only the fast lane. You can still send the tool idea, get it reviewed,
            and decide after Ryan sees the business problem.
          </p>
        </div>
      </div>
    </div>
  );
}

function DecisionDeck() {
  return (
    <div className="mt-5 rounded-3xl border border-white/70 bg-white/75 p-4 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
            After Ryan builds the direction
          </div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
            You get three clean choices.
          </h2>
        </div>
        <div className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 sm:block">
          Accept / refine / scrap
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
        {DECISION_OPTIONS.map(({ Icon, title, body, tone }) => (
          <div key={title} className={`rounded-2xl border p-4 ${tone}`}>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Icon className="h-4 w-4" />
              {title}
            </div>
            <p className="mt-2 text-xs leading-relaxed opacity-80">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReserveBuildSlotCard() {
  return (
    <div
      id="jump-line"
      className="mt-5 scroll-mt-24 overflow-hidden rounded-3xl border border-slate-900/10 bg-slate-950 text-white shadow-[0_26px_70px_-30px_rgba(15,23,42,0.75)]"
    >
      <div className="grid gap-0 sm:grid-cols-[1fr_auto]">
        <div className="p-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
            <BadgeDollarSign className="h-3.5 w-3.5" /> Optional fast lane
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            Put $250 down and jump to the front of the build line.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            This is not required to submit an idea, and it is not the total tool price. It is the
            fast path for owners who already know they want an app, automation, dashboard, or website
            update. The deposit reserves a {TOOL_CHALLENGE_DEPOSIT.reserveHours}-hour capacity block
            and credits toward the final build if you move forward.
          </p>
          <div className="mt-4 grid gap-2 text-xs text-slate-300 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
              <div className="text-lg font-semibold text-white">$250</div>
              <div>down payment</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
              <div className="text-lg font-semibold text-white">{TOOL_CHALLENGE_DEPOSIT.reserveHours}h</div>
              <div>capacity reserved</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
              <div className="text-lg font-semibold text-white">5 days</div>
              <div>target first build window</div>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 bg-gradient-to-br from-cyan-500/20 via-slate-900 to-accent-500/20 p-5 sm:w-56 sm:border-l sm:border-t-0">
          <form action="/api/challenge/deposit" method="POST" className="grid gap-3">
            <VisitorIdField />
            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-500/20 hover:bg-accent-600"
            >
              Jump the line <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              href="/book?source=tool-challenge-deposit"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15"
            >
              Talk first
            </Link>
          </form>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-300">
            If the build needs more scope, Ryan quotes the next phase before continuing.
          </p>
        </div>
      </div>
    </div>
  );
}

function TextField({
  name,
  label,
  placeholder,
  type = "text",
  required,
}: {
  name: string;
  label: string;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-800">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
      />
    </label>
  );
}

function TextArea({
  name,
  label,
  placeholder,
  required,
}: {
  name: string;
  label: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-800">{label}</span>
      <textarea
        name={name}
        rows={3}
        maxLength={1800}
        required={required}
        placeholder={placeholder}
        className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
      />
    </label>
  );
}

function SelectField({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: Array<[string, string]>;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-800">{label}</span>
      <select
        name={name}
        className="block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
      >
        {options.map(([value, labelText]) => (
          <option key={value} value={value}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}

function BuildCard({
  Icon,
  title,
  body,
}: {
  Icon: typeof Brain;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-cyan-50/50 p-5 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.35)]">
      <Icon className="h-6 w-6 text-cyan-700" />
      <h3 className="mt-4 text-lg font-semibold tracking-tight text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}
