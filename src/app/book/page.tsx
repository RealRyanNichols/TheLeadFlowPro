// src/app/book/page.tsx — Booking page for the free 10-minute call.
//
// Hard pre-qualification: this is for SERIOUS BUYERS only. Ryan is filtering
// out tire-kickers and "just curious" by saying so up front. The page is
// designed to do that filtering visually + verbally.
//
// Calendar: env-driven so the embed URL can be set in Vercel later without
// touching code. Falls back to a clear "email me directly" CTA + a copy-able
// mailto if no booking URL is configured. Iframe is the simplest embed
// mechanic for Cal.com / TidyCal / SavvyCal / Calendly.

import Link from "next/link";
import {
  ArrowRight, Calendar, Check, Clock, Mail, Phone, ShieldCheck, X,
} from "lucide-react";

export const metadata = {
  title: "Book a 10-Minute Call with Ryan — The LeadFlow Pro",
  description:
    "Free 10-minute strategy call with Ryan Nichols. Reserved for serious buyers — owners, creators, and operators ready to invest in tools, services, or both. Not for tire-kickers.",
};

const RYAN_EMAIL = "theflashflash24@gmail.com";

// Pull booking URL from env so we can swap in Cal.com / TidyCal / SavvyCal /
// Calendly without redeploying code. NEXT_PUBLIC_BOOKING_URL stays public on
// purpose — it's just the public scheduling link.
//
// Default fallback = Ryan's Cal.com page (cal.com/ryan-nichols-sl2yzx). Once
// the LeadFlow-Pro-specific event type is created in Cal.com, the env var can
// be set in Vercel to point at the specific event slug (e.g.
// https://cal.com/ryan-nichols-sl2yzx/leadflow-pro-10min) without touching code.
const BOOKING_URL =
  process.env.NEXT_PUBLIC_BOOKING_URL ||
  "https://cal.com/ryan-nichols-sl2yzx";

const RIGHT_FIT = [
  "You have a real business — or are seriously building one",
  "You're committed to growth and willing to invest the work",
  "You want a partner / advisor, not a quick fix",
  "You're ready to spend on tools, services, or both",
];

const WRONG_FIT = [
  "You want everything for free",
  "You're \"just curious\" with no plan to buy",
  "You want a guaranteed outcome before you commit",
  "You're shopping consultants for the lowest price",
];

export default function BookPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="font-semibold text-slate-900 hover:text-slate-700">
            The LeadFlow Pro
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600">
            <Link href="/grow" className="hover:text-slate-900">Grow</Link>
            <Link href="/services" className="hover:text-slate-900">Social Growth</Link>
            <Link href="/services/consulting" className="hover:text-slate-900">Consulting</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-12 pb-8 sm:pt-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs uppercase tracking-widest text-slate-600">
          <Calendar className="h-3.5 w-3.5 text-cyan-600" /> Book the call
        </div>
        <h1 className="mt-4 text-3xl sm:text-5xl font-bold tracking-tight text-slate-950">
          A free 10-minute call with Ryan.{" "}
          <span className="text-slate-500 font-semibold">Reserved for serious buyers.</span>
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-slate-700">
          10 minutes is enough. We'll know if we're a fit, and you'll walk away with a clear
          recommendation — package, tool, or both. No pitch decks, no 60-minute "discovery" tour,
          no agenda padding. Just the call.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
            <Clock className="h-3.5 w-3.5 text-cyan-600" /> 10 minutes
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
            <Phone className="h-3.5 w-3.5 text-cyan-600" /> Video or phone
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Free
          </span>
        </div>
      </section>

      {/* Pre-qualification: who this is / isn't for */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-12">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 uppercase tracking-widest">
              <Check className="h-3.5 w-3.5" /> Right fit
            </div>
            <h2 className="mt-3 text-lg font-bold text-slate-950">Book the call if…</h2>
            <ul className="mt-3 space-y-2">
              {RIGHT_FIT.map((r) => (
                <li key={r} className="flex items-start gap-2 text-slate-800">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800 uppercase tracking-widest">
              <X className="h-3.5 w-3.5" /> Not the right fit
            </div>
            <h2 className="mt-3 text-lg font-bold text-slate-950">Please don't book if…</h2>
            <ul className="mt-3 space-y-2">
              {WRONG_FIT.map((r) => (
                <li key={r} className="flex items-start gap-2 text-slate-800">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* The booking widget */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-500">Pick a time</div>
              <div className="mt-0.5 text-xl font-bold text-slate-950">
                Free 10-Minute Strategy Call
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock className="h-4 w-4 text-cyan-600" /> All times shown in your local timezone
            </div>
          </div>

          {BOOKING_URL ? (
            // Live calendar embed (Cal.com, TidyCal, SavvyCal, Calendly all support this)
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <iframe
                src={BOOKING_URL}
                title="Book a 10-minute strategy call with Ryan Nichols"
                className="block w-full"
                style={{ height: "720px", border: 0 }}
                loading="lazy"
              />
            </div>
          ) : (
            // Graceful fallback: clear instructions + direct mailto until the
            // booking URL is set in Vercel env (NEXT_PUBLIC_BOOKING_URL).
            <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <Calendar className="mx-auto h-10 w-10 text-slate-400" />
              <h3 className="mt-3 text-lg font-bold text-slate-950">
                Calendar coming online shortly
              </h3>
              <p className="mt-2 text-slate-600 max-w-xl mx-auto">
                The live calendar is being wired up. In the meantime, email Ryan directly with
                three time windows that work for you and we'll lock one in within 24 hours.
              </p>
              <a
                href={`mailto:${RYAN_EMAIL}?subject=${encodeURIComponent("Book the 10-min call — serious buyer")}&body=${encodeURIComponent(
                  "Hi Ryan,\n\nI'd like to book the free 10-minute strategy call.\n\nA few time windows that work for me:\n  1.\n  2.\n  3.\n\nWhat I'm trying to figure out:\n\nWhat I'm willing to invest in if it's a fit:\n\nThanks,"
                )}`}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-semibold text-slate-950 hover:bg-accent-400"
              >
                <Mail className="h-4 w-4" /> Email Ryan to book
              </a>
              <p className="mt-3 text-xs text-slate-500">
                Goes to <span className="font-mono">{RYAN_EMAIL}</span>
              </p>
            </div>
          )}
        </div>
      </section>

      {/* What happens on the call */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-16">
        <div className="grid md:grid-cols-3 gap-5">
          <CallStep n={1} title="The first 3 minutes">
            You tell me what you do, what's working, and what isn't. No script — just the
            real picture.
          </CallStep>
          <CallStep n={2} title="The middle 5 minutes">
            I tell you the single highest-leverage move I see, and which of our packages or
            tools maps to it.
          </CallStep>
          <CallStep n={3} title="The last 2 minutes">
            We decide. Yes — we set up the next step (kickoff, payment, intake). No — that's
            fine, you walk with the recommendation.
          </CallStep>
        </div>
      </section>

      {/* Disclosure */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-20">
        <p className="text-xs text-slate-500 text-center max-w-3xl mx-auto leading-relaxed">
          The LeadFlow Pro is operated by Real Ryan Nichols LLC, a Texas limited liability
          company. The 10-minute call is free and creates no obligation. Any subsequent paid
          engagement is governed by Texas law under a separate engagement letter and mutual NDA.
        </p>
      </section>
    </div>
  );
}

function CallStep({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white text-sm font-bold">
          {n}
        </div>
        <div className="text-sm font-bold text-slate-950">{title}</div>
      </div>
      <p className="mt-3 text-sm text-slate-700">{children}</p>
    </div>
  );
}
