// src/app/contact/page.tsx - mobile-first contact command center.

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Lock,
  Mail,
  MessageSquareText,
  Route,
  ShieldCheck,
} from "lucide-react";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { OpenChatButton } from "@/components/site/OpenChatButton";
import { LEADFLOW_PUBLIC_EMAIL, leadflowMailto } from "@/lib/contact";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "Automated Message Router | The LeadFlow Pro",
  description:
    "Use The LeadFlow Pro automated router, assistant, paid unlocks, or message path to get the next business growth output without booking a call.",
  path: "/contact",
  imageTitle: "Automated Message Router",
  imageSubtitle: "Run the tool, unlock the report, ask the assistant, or leave context.",
});

function mailto(subject: string, body = "") {
  return leadflowMailto(subject, body);
}

const CONTEXT_BODY =
  "Business/account:\n\nWhat I need scored, fixed, or automated:\n\nBudget range I am considering:\n\nTimeline:\n\nBest next step:\n\n";

const SHOULD_USE = [
  {
    Icon: Route,
    title: "Run the Growth Machine",
    body: "Best first move if you want a free score before paying for the full report, script pack, map, or Growth OS path.",
    href: "/tools/growth-machine#tool",
    cta: "Run free snapshot",
  },
  {
    Icon: Lock,
    title: "Open the paid unlocks",
    body: "Best if you already know you need the $47 report, $90 follow-up kit, $197 lead leak report, or bigger system path.",
    href: "/action-menu",
    cta: "View unlocks",
  },
  {
    Icon: MessageSquareText,
    title: "Leave a message",
    body: "Best if the assistant cannot finish the route or the site needs extra context before the next automated step.",
    href: "#contact-options",
    cta: "Open message options",
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen text-ink-50">
      <Header />

      <main>
        <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_18%_8%,rgba(35,184,255,0.17),transparent_32%),radial-gradient(circle_at_82%_10%,rgba(255,214,107,0.13),transparent_28%),linear-gradient(135deg,#030711,#070c18_55%,#07100d)]">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(92,208,255,0.07) 0%, transparent 38%, rgba(255,154,31,0.08) 70%, transparent 100%)",
            }}
          />
          <div
            aria-hidden
            className="absolute -right-24 -top-28 h-[420px] w-[420px] rounded-full opacity-45 blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(35,184,255,0.55) 0%, transparent 65%)" }}
          />
          <div
            aria-hidden
            className="absolute -bottom-36 -left-24 h-[480px] w-[480px] rounded-full opacity-40 blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(255,154,31,0.45) 0%, transparent 65%)" }}
          />

          <div className="relative mx-auto grid max-w-7xl gap-7 px-4 py-8 sm:py-12 lg:grid-cols-5 lg:items-center">
            <div className="lg:col-span-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-cyan-200 shadow-sm backdrop-blur">
                Automated router
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
                Do not wait on a calendar.{" "}
                <span className="bg-gradient-to-r from-brand-700 via-cyan-500 to-accent-500 bg-clip-text text-transparent">
                  Let the site route the next move.
                </span>
              </h1>
              <p className="mt-4 text-base leading-relaxed text-ink-100 sm:text-lg">
                The LeadFlow Pro now routes through automated paths first. Run the tool, unlock a
                report, ask the assistant, or leave clean context so the system can point you to the
                right next output.
              </p>
              <div className="lead-panel mt-5 p-4 text-sm leading-relaxed text-ink-100">
                The first goal is simple: figure out whether you need a free snapshot, paid report,
                script kit, lead leak document, automation blueprint, or full Growth OS path.
              </div>
            </div>

            <div id="contact-options" className="lg:col-span-3">
              <div className="lead-shell p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-ink-400">
                      Contact command panel
                    </div>
                    <div className="mt-1 text-lg font-black text-white">
                      Choose one. The site routes from there.
                    </div>
                  </div>
                  <span className="hidden rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-200 sm:inline-flex">
                    Mobile first
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <QuickLink
                    href="/tools/growth-machine#tool"
                    Icon={Route}
                    label="Run the Growth Machine"
                    body="Enter business data and get the free score before unlocking anything."
                    primary
                  />
                  <QuickLink
                    href="/action-menu"
                    Icon={Lock}
                    label="Open paid unlocks"
                    body="Reports, scripts, lead leak documents, public loops, and Growth OS paths."
                    accent
                  />
                  <QuickLink
                    href="#contact-options"
                    Icon={MessageSquareText}
                    label="Leave a message"
                    body="Use this only when the tool or assistant cannot finish the route."
                  />
                  <OpenChatButton className="lead-panel group flex min-h-[112px] flex-col p-4 text-left">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/15 text-cyan-200">
                      <Bot className="h-5 w-5" />
                    </span>
                    <span className="mt-3 text-sm font-bold text-white">Ask LeadFlow Assistant</span>
                    <span className="mt-1 text-xs leading-relaxed text-ink-300">
                      Opens the site assistant for tool fit, pricing, and next-step questions.
                    </span>
                  </OpenChatButton>
                  <QuickLink
                    href={mailto("LeadFlow Pro automated route", CONTEXT_BODY)}
                    Icon={Mail}
                    label="Email context"
                    body={`${LEADFLOW_PUBLIC_EMAIL}. Fallback path for links and longer context.`}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden border-b border-white/10 bg-white/[0.02]">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(92,208,255,0.055) 0%, rgba(255,154,31,0.035) 100%)" }}
          />
          <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-14">
            <div className="text-xs font-bold uppercase tracking-widest text-cyan-300">
              Fastest path
            </div>
            <h2 className="mt-2 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl">
              Use the lane that matches where you are right now.
            </h2>
            <div className="mt-7 grid gap-4 lg:grid-cols-3">
              {SHOULD_USE.map((item) => (
                <PathCard key={item.title} {...item} />
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-5 px-4 py-12 sm:py-14 lg:grid-cols-3">
          <InfoCard
            Icon={CheckCircle2}
            title="Send the useful context"
            body="Business name, account links, current offer, budget range, timeline, and the one decision you need made. That beats a long vague message."
          />
          <InfoCard
            Icon={ShieldCheck}
            title="No fake promises"
            body="The tools give scores, documents, scripts, maps, and next-step paths. They do not guarantee followers, leads, sales, or revenue."
          />
          <InfoCard
            Icon={Lock}
            title="Pay at the pressure point"
            body="Free previews should be useful. The full document, script pack, report, export, or system map unlocks when the missing piece is obvious."
          />
        </section>

        <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-brand-900 to-cyan-900 text-white">
          <div
            aria-hidden
            className="absolute -top-28 left-1/2 h-[420px] w-[620px] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
            style={{ background: "radial-gradient(circle, #ff9a1f 0%, transparent 60%)" }}
          />
          <div className="relative mx-auto max-w-3xl px-4 py-14 text-center sm:py-16">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Ready means ready to choose.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-300">
              Start with the router if you want the cleanest path. Use the message lane if the
              assistant needs extra context before it can route the next output.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/tools/growth-machine#tool"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-semibold text-white shadow-lg shadow-accent-500/25 hover:bg-accent-600"
              >
                Run free snapshot <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/action-menu"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur hover:bg-white/15"
              >
                View paid unlocks
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function QuickLink({
  href,
  Icon,
  label,
  body,
  primary,
  accent,
}: {
  href: string;
  Icon: LucideIcon;
  label: string;
  body: string;
  primary?: boolean;
  accent?: boolean;
}) {
  const classes = primary
    ? "border-cyan-300/30 bg-white/[0.06] text-white hover:border-cyan-300/50 hover:bg-white/[0.08]"
    : accent
      ? "border-accent-400 bg-accent-500 text-slate-950 hover:bg-accent-400"
      : "border-white/10 bg-white/[0.035] text-white hover:border-cyan-300/40 hover:bg-white/[0.06]";

  return (
    <Link
      href={href}
      className={`group flex min-h-[112px] flex-col rounded-lg border p-4 shadow-sm transition hover:-translate-y-0.5 ${classes}`}
    >
      <span
        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${
          accent ? "bg-white/20 text-slate-950" : "bg-cyan-300/10 text-cyan-200"
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="mt-3 text-sm font-bold">{label}</span>
      <span className={`mt-1 text-xs leading-relaxed ${accent ? "text-slate-900/75" : "text-ink-300"}`}>
        {body}
      </span>
    </Link>
  );
}

function PathCard({
  Icon,
  title,
  body,
  href,
  cta,
}: {
  Icon: LucideIcon;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="lead-panel group p-5"
    >
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-brand-700 text-white">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-300">{body}</p>
      <div className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-cyan-300 group-hover:text-cyan-200">
        {cta} <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
}

function InfoCard({
  Icon,
  title,
  body,
}: {
  Icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="lead-panel p-5">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-200">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-300">{body}</p>
    </div>
  );
}
