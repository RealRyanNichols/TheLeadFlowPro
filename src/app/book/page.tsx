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
  "https://cal.com/ryan-nichols-sl2yzx/leadflow-pro-strategy-call";

const RIGHT_FIT = [
  "Business owner trying to get the business off the ground (or scale it)",
  "Creator / influencer trying to actually move the needle on your following",
  "You make money — or you're 1–2 decisions away from making money",
  "You don't mind trading dollars for time when it gets you the answer",
  "You'll show up on time and tell me the real numbers, not the polished ones",
];

const WRONG_FIT = [
  "You want everything for free",
  "You're \"just curious\" — no real plans to buy anything, ever",
  "You want a guaranteed outcome before you commit a single dollar",
  "You're shopping consultants for the lowest price",
  "You want to chat. This is a business call, not a coffee chat — go elsewhere.",
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
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <Link href="/services" className="hover:text-slate-900">Social Media</Link>
            <Link href="/services/consulting" className="hover:text-slate-900">Consulting</Link>
            <Link href="/tiers" className="hover:text-slate-900">Pricing</Link>
            <Link href="/contact" className="hover:text-slate-900">Contact</Link>
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
          <span className="text-slate-500 font-semibold">Not a coffee chat. Not a courtesy call.</span>
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-slate-700">
          This is a <strong className="text-slate-950">business page</strong> — not legal, not dental,
          not a non-profit. If you're a business owner or a creator trying to take it off the ground,
          we'll know in 10 minutes whether we should work together.
        </p>
        <p className="mt-3 max-w-3xl text-base text-slate-700">
          If you're a tire-kicker, "just curious," or here to say <em>"hi Ryan, nice to meet you"</em>{" "}
          — please don't book. I'll hang up. I'm trying to make money with people who are making money
          (or about to), and I respect your time enough not to waste either of ours.
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

      {/* What to expect — moved up so it's the FIRST thing after right-fit/wrong-fit */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-10">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
          <div className="text-xs uppercase tracking-widest text-cyan-700">What the call is about</div>
          <h2 className="mt-1 text-2xl font-bold text-slate-950">
            10 minutes. We figure out if we should work together.
          </h2>
          <div className="mt-5 grid md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white text-xs font-bold">1</div>
              <div className="mt-2 font-semibold text-slate-950 text-sm">First 3 minutes</div>
              <p className="mt-1 text-sm text-slate-600">You tell me what you do, what's working, what isn't.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white text-xs font-bold">2</div>
              <div className="mt-2 font-semibold text-slate-950 text-sm">Middle 5 minutes</div>
              <p className="mt-1 text-sm text-slate-600">I tell you the single highest-leverage move I see + which package maps to it.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white text-xs font-bold">3</div>
              <div className="mt-2 font-semibold text-slate-950 text-sm">Last 2 minutes</div>
              <p className="mt-1 text-sm text-slate-600">We decide. Yes — we set up next step. No — you walk with the recommendation, no obligation.</p>
            </div>
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
              <p className="mt-1 text-sm text-slate-600 max-w-xl">
                Pick the date and time below. Cal.com will ask you a few intake questions so I have
                context before we hop on. No doom scroll.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock className="h-4 w-4 text-cyan-600" /> Times shown in your local timezone
            </div>
          </div>

          {BOOKING_URL ? (
            // Live calendar embed — height capped so the page doesn't doom-scroll.
            // ?layout=mobile gives a more compact column view than the default monthly grid.
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <iframe
                src={BOOKING_URL.includes("?") ? `${BOOKING_URL}&layout=mobile` : `${BOOKING_URL}?layout=mobile`}
                title="Book a 10-minute strategy call with Ryan Nichols"
                className="block w-full"
                style={{ height: "560px", border: 0 }}
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

// CallStep removed — its content was moved up into the "What the call is about" section.
