// src/app/contact/page.tsx — Contact page. Light theme matching the new homepage.
//
// Three paths to reach Ryan:
//   1. Book a 10-min call (Cal.com)
//   2. Hire direct (go to /tiers)
//   3. Email Ryan with context

import Link from "next/link";
import { ArrowRight, Mail, Phone, MapPin, Clock, Calendar } from "lucide-react";

export const metadata = {
  title: "Contact Ryan Nichols — The LeadFlow Pro",
  description:
    "Three ways to reach Ryan: book a 10-minute call, hire direct, or email. Reserved for serious buyers.",
};

const RYAN_EMAIL = "theflashflash24@gmail.com";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="font-bold text-slate-950 hover:text-brand-700">
            The LeadFlow Pro
          </Link>
          <Link
            href="/book"
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-600"
          >
            Book the 10-min call <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <section className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs uppercase tracking-widest text-cyan-700">
            Contact
          </div>
          <h1 className="mt-4 text-4xl sm:text-5xl font-semibold tracking-tight text-slate-950">
            Three ways to reach me. Pick the one that fits where you are.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-700">
            All three go to me directly — Ryan Nichols. Reserved for serious buyers.
          </p>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 grid gap-6 lg:grid-cols-3">
          <ContactCard
            icon={Calendar}
            heading="Book the 10-min call"
            line="Free. 10 minutes. No pitch decks. We figure out fast whether we should work together."
            cta="Pick a time"
            href="/book"
            recommended
          />
          <ContactCard
            icon={ArrowRight}
            heading="Hire me directly"
            line="Skip the call. Pick the package that fits. Pay. We start. For owners who already know what they need."
            cta="See packages & buy"
            href="/tiers"
          />
          <ContactCard
            icon={Mail}
            heading="Email me"
            line="Drop me a note with context — what you're doing, what's stuck, what you're willing to invest. I read every one."
            cta="Email Ryan"
            href={`mailto:${RYAN_EMAIL}?subject=${encodeURIComponent("LeadFlow Pro — serious inquiry")}`}
          />
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-12 grid gap-6 sm:grid-cols-3">
          <Detail icon={MapPin}  label="Based"        value="East Texas — virtual everywhere; in-person locally; client pays travel for everywhere else." />
          <Detail icon={Clock}   label="Response"     value="1 business day on email. Same-day on direct hires." />
          <Detail icon={Phone}   label="Phone"        value="Phone calls only after a paid engagement. The 10-min Discovery Call comes first." />
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-950">
            Don't waste either of our time.
          </h2>
          <p className="mt-3 text-slate-700">
            If you're "just looking," shopping for the lowest price, or want guarantees before you
            commit — this isn't the place. If you're ready to invest in growth and you want an
            operator in your corner — book the call or hire direct.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/tiers"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              Hire Ryan now <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/book"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-semibold text-white shadow-sm hover:bg-accent-600"
            >
              Book the 10-min call
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 text-xs text-slate-500 text-center">
          The LeadFlow Pro · A Real Ryan Nichols LLC company · Texas-governed under mutual NDA on
          every paid engagement.
        </div>
      </footer>
    </div>
  );
}

function ContactCard({
  icon: Icon, heading, line, cta, href, recommended,
}: {
  icon: any;
  heading: string;
  line: string;
  cta: string;
  href: string;
  recommended?: boolean;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition-shadow ${
        recommended ? "border-brand-500 ring-1 ring-brand-200" : "border-slate-200"
      }`}
    >
      {recommended && (
        <span className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white shadow">
          Most pick this
        </span>
      )}
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-brand-600 text-white shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-xl font-semibold text-slate-950">{heading}</h3>
      <p className="mt-2 text-sm text-slate-700 leading-relaxed">{line}</p>
      <Link
        href={href}
        className="mt-auto pt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
      >
        {cta} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function Detail({
  icon: Icon, label, value,
}: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3 text-xs uppercase tracking-widest text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-700">{value}</div>
    </div>
  );
}
