// src/app/book/page.tsx — Booking page for the free 10-minute call.
//
// This page intentionally limits choice before showing the scheduler. The
// Cal.com event type still needs to enforce the real calendar rules:
// duration=10, afterEventBuffer=10, slotInterval=20, limited booking window.

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Calendar,
  Check,
  Clock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { BandwidthMeter } from "@/components/BandwidthMeter";
import { BookingPathGuide } from "@/components/book/BookingPathGuide";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { PageValueModule } from "@/components/site/PageValueModule";
import { LEADFLOW_PUBLIC_EMAIL } from "@/lib/contact";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "Book a 10-Minute Call with Ryan — The LeadFlow Pro",
  description:
    "Free 10-minute fit call with Ryan Nichols for serious buyers considering done-for-you social media, AI agents, automation, and business systems.",
  path: "/book",
  imageTitle: "Book a 10-Minute Call",
  imageSubtitle: "Ten minutes. We decide the next move.",
  image: "/images/social/book-call.png",
});

const BOOKING_URL =
  process.env.NEXT_PUBLIC_BOOKING_URL ||
  "https://cal.com/realryannichols/leadflow-pro-strategy-call";

function withCalParams(url: string): string {
  const joiner = url.includes("?") ? "&" : "?";
  return `${url}${joiner}layout=column_view&hideEventTypeDetails=true&hideLandingPageDetails=true`;
}

function mailto(subject: string, body: string): string {
  return `mailto:${LEADFLOW_PUBLIC_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const RIGHT_FIT = [
  "You want social media, lead flow, AI agents, or follow-up systems done with you and for you",
  "You can invest in a 30, 60, or 90-day buildout if the fit is obvious",
  "You already have a real offer, audience, business, or budget to put behind the work",
  "You want the account and business back under control before scaling harder",
  "You can explain the problem, budget, and next decision in plain English",
];

const WRONG_FIT = [
  "You need free coaching, free strategy, or a long exploratory conversation",
  "You have no budget and are not willing to start with a lower paid tier",
  "You want guaranteed followers, leads, sales, or revenue before you commit",
  "You are shopping every consultant for the lowest possible price",
  "You want someone to tell you magic is easy while you stay hands-off",
];

const LANES = [
  {
    title: "I want done-for-you social",
    body: "Use this path if you want posts, systems, agents, dashboards, or follow-up built around your business.",
    href: "/start",
    cta: "Start with the router",
    Icon: Bot,
  },
  {
    title: "I know I need Ryan's eyes",
    body: "Use this if you can explain the business fast and want the 10-minute fit call.",
    href: "#calendar",
    cta: "Pick a call window",
    Icon: Phone,
  },
  {
    title: "I need a lower paid entry",
    body: "Use this if you are not ready for a bigger buildout but still want a real next move.",
    href: "/tiers",
    cta: "See the price ladder",
    Icon: Sparkles,
  },
];

export default function BookPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LightHeader activePath="/book" />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-slate-200">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #fff8f1 0%, #f6f9ff 38%, #eef9ff 70%, #f3eaff 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute -right-24 -top-32 h-[520px] w-[520px] rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(35,184,255,0.55) 0%, transparent 65%)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-40 -left-24 h-[560px] w-[560px] rounded-full opacity-45 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(255,154,31,0.45) 0%, transparent 65%)" }}
        />

        <div className="relative mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:py-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(520px,1.08fr)] lg:items-start lg:py-10">
          <div className="order-2 pt-1 lg:order-1 lg:pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-700 shadow-sm backdrop-blur">
                <Calendar className="h-3.5 w-3.5" /> Free fit call
              </div>
              <BandwidthMeter variant="compact" />
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Pick the reason. Pick the time.{" "}
              <span className="bg-gradient-to-r from-brand-700 via-cyan-500 to-accent-500 bg-clip-text text-transparent">
                Move forward.
              </span>
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-700">
              This page should feel simple. Use the guide, then pick a calendar window. The call is
              for serious buyers considering done-for-you social media, AI agents, automation, lead
              follow-up, or a bigger 30/60/90-day buildout.
            </p>
            <PageValueModule variant="book" className="mt-5" />

            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
              <Link
                href="#calendar"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800"
              >
                Go to calendar <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/stump-ryan#tool-challenge-form"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white/80 px-6 py-3 font-semibold text-slate-900 shadow-sm hover:bg-white"
              >
                Submit a tool first
              </Link>
            </div>

            <div className="mt-4">
              <BookingPathGuide />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <CallRule
                icon={Clock}
                title="20 min held"
                body="10-minute call plus a 10-minute buffer."
              />
              <CallRule
                icon={BadgeCheck}
                title="Serious buyers"
                body="Fit check for paid work, not free coaching."
              />
              <CallRule
                icon={ShieldCheck}
                title="No promises"
                body="Clear next move, no fake guarantees."
              />
            </div>
          </div>

          <BookingPanel />
        </div>
      </section>

      {/* CHOOSE A LANE */}
      <section className="relative overflow-hidden border-b border-slate-200">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, #f6f9ff 0%, #fff8f1 100%)" }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-14">
          <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
            Choose one
          </div>
          <h2 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Do not overthink the calendar. Pick the lane that matches your situation.
          </h2>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {LANES.map((lane) => (
              <Link
                key={lane.title}
                href={lane.href}
                className="group rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-lg"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white">
                  <lane.Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-950">{lane.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{lane.body}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-cyan-700 group-hover:text-cyan-800">
                  {lane.cta} <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* RIGHT FIT */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:py-14">
        <div className="grid gap-5 md:grid-cols-2">
          <FitBlock
            tone="right"
            title="Book the call if"
            items={RIGHT_FIT}
          />
          <FitBlock
            tone="wrong"
            title="Do not book if"
            items={WRONG_FIT}
          />
        </div>
      </section>

      {/* WHAT TO EXPECT */}
      <section className="relative overflow-hidden border-y border-slate-200">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, #fff8f1 0%, #eef9ff 100%)" }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-14">
          <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
            The 10-minute script
          </div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            I am going to lead the call.
          </h2>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            <Step n="1" title="First 3 minutes" body="You tell me the business, the account, the offer, and what is currently stuck." />
            <Step n="2" title="Middle 5 minutes" body="I tell you the highest-leverage next move and whether this needs 30, 60, or 90 days." />
            <Step n="3" title="Last 2 minutes" body="We choose the next step: router, paid offer, bigger buildout, or no fit." />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <p className="mx-auto max-w-3xl text-center text-xs leading-relaxed text-slate-500">
          The LeadFlow Pro is operated by Real Ryan Nichols LLC, a Texas limited liability company.
          The 10-minute call is free and creates no obligation. Any later paid engagement is governed
          by Texas law under a separate engagement letter and mutual NDA.
        </p>
      </section>

      <LightFooter />
    </div>
  );
}

function BookingPanel() {
  return (
    <div
      id="calendar"
      className="order-1 rounded-3xl border border-white/70 bg-white/80 p-3 shadow-[0_30px_70px_-20px_rgba(15,23,42,0.28)] ring-1 ring-slate-900/5 backdrop-blur-xl sm:p-4 lg:sticky lg:top-20 lg:order-2"
    >
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-cyan-700">
            Pick one window
          </div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
            Free 10-minute fit call
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-600 sm:text-sm">
            The calendar is the action. Slots should run with a 10-minute call and a protected
            10-minute buffer so calls do not stack back-to-back.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
          <Clock className="h-3.5 w-3.5" /> Your timezone
        </div>
      </div>

      {BOOKING_URL ? (
        <div id="calendar-frame" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <iframe
            src={withCalParams(BOOKING_URL)}
            title="Book a 10-minute fit call with Ryan Nichols"
            className="block w-full"
            style={{
              height: "min(67vh, 610px)",
              minHeight: "465px",
              border: 0,
            }}
            loading="eager"
          />
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <Calendar className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-lg font-bold text-slate-950">Calendar coming online shortly</h3>
          <p className="mx-auto mt-2 max-w-xl text-slate-600">
            Email Ryan with three windows that work. Keep it short and include the business,
            budget range, and what you are trying to fix.
          </p>
          <a
            href={mailto(
              "Book the 10-min call — serious buyer",
              "Hi Ryan,\n\nI want to book the free 10-minute fit call.\n\nMy business/account:\n\nWhat I want built or fixed:\n\nBudget range I am considering:\n\nThree time windows:\n1.\n2.\n3.\n\nThanks,"
            )}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-semibold text-white hover:bg-accent-600"
          >
            <Mail className="h-4 w-4" /> Email Ryan to book
          </a>
        </div>
      )}

      <div className="mt-3 grid gap-2 text-[11px] leading-relaxed text-slate-500 sm:grid-cols-2">
        <p>Fewer choices. Pick a real window and move forward.</p>
        <p>Ryan decides the next paid path only if the fit is clear.</p>
      </div>
    </div>
  );
}

function CallRule({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/85 p-3 shadow-sm">
      <div className="flex items-start gap-2.5">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" />
        <div>
          <div className="text-sm font-semibold text-slate-950">{title}</div>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{body}</p>
        </div>
      </div>
    </div>
  );
}

function FitBlock({
  tone,
  title,
  items,
}: {
  tone: "right" | "wrong";
  title: string;
  items: string[];
}) {
  const right = tone === "right";
  const Icon = right ? Check : X;
  return (
    <div className={`rounded-2xl border p-6 ${right ? "border-cyan-200 bg-cyan-50" : "border-rose-200 bg-rose-50"}`}>
      <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest ${
        right ? "border-cyan-300 bg-cyan-100 text-cyan-800" : "border-rose-300 bg-rose-100 text-rose-800"
      }`}>
        <Icon className="h-3.5 w-3.5" /> {right ? "Right fit" : "Wrong fit"}
      </div>
      <h2 className="mt-3 text-lg font-bold text-slate-950">{title}</h2>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-slate-800">
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${right ? "text-cyan-600" : "text-rose-600"}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">
        {n}
      </div>
      <div className="mt-3 font-semibold text-slate-950">{title}</div>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}
