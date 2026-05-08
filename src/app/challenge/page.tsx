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

          <div className="relative mx-auto grid max-w-7xl gap-5 px-4 py-4 lg:grid-cols-[0.72fr_1.28fr] lg:items-start lg:py-6">
            <div className="lg:sticky lg:top-24">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-700 shadow-sm backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" /> Free tool challenge
              </div>
              <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Stump me with the tool your business needs.
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-700 sm:text-lg">
                Change the sliders, describe the dream tool, and send the request. If it would
                catch missed leads, remove repeated work, or make your business easier to run,
                put it in the form.
              </p>
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-950/10 bg-slate-950 text-white shadow-[0_22px_55px_-30px_rgba(15,23,42,0.72)]">
                <div className="bg-gradient-to-r from-cyan-500/20 via-white/[0.03] to-accent-500/20 px-4 py-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
                    <Sparkles className="h-3.5 w-3.5" /> Start here
                  </div>
                  <h2 className="mt-2 text-lg font-semibold tracking-tight">
                    Put in the current site first. Then build the request.
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-200">
                    The lab starts with the benchmark Ryan has to beat: your website, social page,
                    or current process. Then it walks you through the leak, the dream tool, and the
                    money case one screen at a time.
                  </p>
                </div>
              </div>

              {submitted ? <SubmissionReceivedCard /> : null}
              {depositCancelled ? <DepositCancelledCard /> : null}

            </div>

            <div className="grid gap-4">
              <PromptBuildLab />
              <div className="rounded-3xl border border-cyan-200/80 bg-gradient-to-br from-cyan-50 via-white to-accent-50 p-4 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.4)]">
                <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                  Your accounts. Your control. No percentage grab.
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
                  Convenient platforms make it easy to start and easy to get trapped. This challenge
                  is different: Ryan looks at the actual work, then builds a system your business can
                  own, understand, and keep improving.
                </p>
              </div>
              <div className="grid gap-4 xl:grid-cols-[minmax(260px,0.8fr)_minmax(360px,1.2fr)]">
                <div className="rounded-3xl border border-slate-200 bg-slate-950 p-3 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.7)]">
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

                <div className="grid gap-4">
                  <DecisionDeck />
                  <ReserveBuildSlotCard />
                </div>
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
