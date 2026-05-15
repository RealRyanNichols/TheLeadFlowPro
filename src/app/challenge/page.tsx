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
  XCircle,
} from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { VisitorIdField } from "@/components/site/VisitorIdField";
import { PromptBuildLab } from "@/components/challenge/PromptBuildLab";
import { TOOL_CHALLENGE_DEPOSIT } from "@/lib/challenge-deposit";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = createSeoMetadata({
  title: "Stump Ryan Free Build Blueprint - The LeadFlow Pro",
  description:
    "Get a free Lead Leak + Dream Tool Build Blueprint. Ryan maps the leak, the tool, the account path, and the first build phase before you pay.",
  path: "/stump-ryan",
  imageTitle: "Stump Ryan Free Build Blueprint",
  imageSubtitle: "Submit the leak or dream tool. Ryan sends a 1-3 page plan before paid buildout.",
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
    body: "The tool is built in or transferred to your platform, repo, database, domain, and accounts.",
  },
  {
    Icon: LockKeyhole,
    title: "Your control",
    body: "The goal is to put the system in your hands so you are not trapped by an agency or developer.",
  },
  {
    Icon: BadgeDollarSign,
    title: "No hostage setup",
    body: "You pay for the build and setup. Your code, leads, keys, automations, and process stay yours.",
  },
];

const DECISION_OPTIONS = [
  {
    Icon: ThumbsUp,
    title: "Continue",
    body: "You like the blueprint, put down the $250 continuation deposit, and Ryan starts the first useful version.",
    tone: "border-cyan-300 bg-cyan-50 text-cyan-800",
  },
  {
    Icon: RefreshCw,
    title: "Refine",
    body: "The plan is close, but Ryan tightens the scope, platform path, or first-screen idea before you decide.",
    tone: "border-accent-300 bg-accent-50 text-accent-800",
  },
  {
    Icon: XCircle,
    title: "Scrap",
    body: "If the tool is not worth building, kill it cleanly before you spend money on the wrong project.",
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
      <LightHeader activePath="/stump-ryan" />

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

          <div className="relative mx-auto grid max-w-[92rem] gap-5 px-4 py-4 lg:grid-cols-[minmax(280px,0.68fr)_minmax(0,1.32fr)] lg:items-start lg:py-6">
            <div className="xl:sticky xl:top-24">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-700 shadow-sm backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" /> Free build blueprint
              </div>
              <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Stump Ryan with the tool your business wishes existed.
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-700 sm:text-lg">
                Show the lead leak, the repeated work, or the dream app in your head. Ryan sends
                back a free 1-3 page Build Blueprint: what is leaking, what tool to build first,
                where it should live, and what the $250 continuation would unlock.
              </p>
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-950/10 bg-slate-950 text-white shadow-[0_22px_55px_-30px_rgba(15,23,42,0.72)]">
                <div className="bg-gradient-to-r from-cyan-500/20 via-white/[0.03] to-accent-500/20 px-4 py-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
                    <Sparkles className="h-3.5 w-3.5" /> Start here
                  </div>
                  <h2 className="mt-2 text-lg font-semibold tracking-tight">
                    Put in the current site first. Then describe the tool.
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-200">
                    The lab starts with the benchmark Ryan has to beat: your website, social page,
                    Shopify, Wix, WordPress, or current process. Then it walks through the leak,
                    the dream tool, and the ownership path.
                  </p>
                </div>
              </div>

              {submitted ? <SubmissionReceivedCard /> : null}
              {depositCancelled ? <DepositCancelledCard /> : null}

            </div>

            <div>
              <PromptBuildLab />
            </div>
          </div>

          <div className="relative mx-auto grid max-w-[92rem] gap-4 px-4 pb-10">
            <div className="rounded-3xl border border-cyan-200/80 bg-gradient-to-br from-cyan-50 via-white to-accent-50 p-4 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.4)]">
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                Your accounts. Your code. Your control.
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {OWNERSHIP_POINTS.map(({ Icon, title, body }) => (
                  <div key={title} className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-cyan-200">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">{body}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                Convenient platforms make it easy to start and easy to get trapped. This is built
                in your account or transferred to your account: code, assets, data, keys, and access
                stay under your control.
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(220px,320px)_minmax(0,1fr)] xl:items-start">
              <div className="self-start rounded-3xl border border-slate-200 bg-slate-950 p-3 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.7)]">
                <div className="mb-3 flex items-center justify-between px-2 pt-1 text-xs font-semibold uppercase tracking-widest text-cyan-200">
                  <span className="inline-flex items-center gap-2">
                    <PlayCircle className="h-4 w-4" /> Watch the promise
                  </span>
                  <span>Under 1 minute</span>
                </div>
                <video
                  className="aspect-[9/16] max-h-[560px] w-full rounded-2xl bg-black object-cover"
                  controls
                  playsInline
                  preload="metadata"
                  poster="/images/stump-me-tool-challenge-poster.jpg"
                >
                  <source src="/videos/stump-me-tool-challenge.mp4" type="video/mp4" />
                </video>
              </div>

              <div className="grid gap-4">
                <DecisionDeck />
              </div>
            </div>

            <ReserveBuildSlotCard />
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
                  Not another agency leash. A tool your business owns.
                </h2>
                <p className="mt-3 text-slate-700">
                  Too many vendors keep the system, the process, the keys, and the data in their
                  world. Ryan's pitch is different: map the first useful tool, build it in or move it
                  into your account, and leave you with an asset you can run with or without him.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <BuildCard Icon={Brain} title="Find the real leak" body="The blueprint starts with the business problem, not random software features." />
                <BuildCard Icon={Code2} title="Map the useful version first" body="Ryan scopes the piece that saves time, creates leads, organizes work, or closes the gap." />
                <BuildCard Icon={ClipboardList} title="Show the build path" body="You see what it does, where it lives, what accounts it needs, and what comes first." />
                <BuildCard Icon={ShieldCheck} title="Keep ownership clear" body="Your accounts. Your code. Your customer data. Your operating power." />
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
                Tools worth putting in the blueprint
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                If it would change how your business runs, stump Ryan with it.
              </h2>
              <p className="mt-3 text-slate-300">
                The best first versions are usually not fancy. They catch the lead, answer the same
                question 200 times, follow up faster, organize chaos, or make it easier for a
                customer to pay.
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

function SubmissionReceivedCard() {
  return (
    <div className="mt-5 rounded-3xl border border-cyan-300 bg-cyan-50/90 p-5 text-cyan-950 shadow-[0_24px_60px_-34px_rgba(8,145,178,0.45)]">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700" />
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Blueprint request received.</h2>
          <p className="mt-1 text-sm leading-relaxed text-cyan-900/80">
            Ryan has the leak, the tool idea, and the account path. The next step is the free
            1-3 page blueprint. If the plan makes sense and you want Ryan building, the $250
            continuation below reserves the first build block.
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
          <h2 className="text-lg font-semibold tracking-tight">No problem. Get the blueprint first.</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">
            The deposit is only for continuing into buildout. You can still submit the business
            leak, get the free plan, and decide after Ryan maps the first useful version.
          </p>
        </div>
      </div>
    </div>
  );
}

function DecisionDeck() {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/75 p-4 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
            After Ryan sends the blueprint
          </div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
            You get three clean choices.
          </h2>
        </div>
        <div className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 sm:block">
          Continue / refine / scrap
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
      id="continue-build"
      className="scroll-mt-24 overflow-hidden rounded-3xl border border-slate-900/10 bg-slate-950 text-white shadow-[0_26px_70px_-30px_rgba(15,23,42,0.75)]"
    >
      <div className="p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_230px] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
              <BadgeDollarSign className="h-3.5 w-3.5" /> Optional continuation
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-balance">
              Like the blueprint? Reserve the first build block.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              The $250 deposit is optional. It is not required for the free blueprint, and it is not
              the total tool price. It reserves a {TOOL_CHALLENGE_DEPOSIT.reserveHours}-hour build
              block and credits toward the scoped version if you move forward.
            </p>
            <div className="mt-4 grid gap-2 text-xs text-slate-300 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-center sm:text-left">
                <div className="text-lg font-semibold text-white">$250</div>
                <div>deposit</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-center sm:text-left">
                <div className="text-lg font-semibold text-white">{TOOL_CHALLENGE_DEPOSIT.reserveHours}h</div>
                <div>reserved</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-center sm:text-left">
                <div className="text-lg font-semibold text-white">5 days</div>
                <div>target</div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/20 via-white/[0.03] to-accent-500/20 p-4">
            <form action="/api/challenge/deposit" method="POST" className="grid gap-3">
              <VisitorIdField />
              <button
                type="submit"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-500/20 hover:bg-accent-600"
              >
                Continue the build <ArrowRight className="h-4 w-4" />
              </button>
              <Link
                href="/book?source=stump-ryan-continuation"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15"
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
    </div>
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
