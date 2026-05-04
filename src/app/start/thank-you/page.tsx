// src/app/start/thank-you/page.tsx — Generic post-intake confirmation.
// Used for the Free tier landing (other tiers redirect to /pricing or /book).

import Link from "next/link";
import { ArrowRight, Check, Sparkles, Users, Zap } from "lucide-react";

export const metadata = {
  title: "You're In — The LeadFlow Pro",
  description: "Welcome. Here's the journey from where you are to where you want to be.",
};

export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="font-semibold text-slate-900 hover:text-slate-700">
            The LeadFlow Pro
          </Link>
          <Link href="/grow" className="text-sm text-slate-600 hover:text-slate-900">Back to Grow</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 pt-16 pb-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 uppercase tracking-widest">
          <Check className="h-3.5 w-3.5" /> You're in
        </div>
        <h1 className="mt-4 text-4xl sm:text-5xl font-bold tracking-tight text-slate-950">
          Welcome. Now we show you the journey.
        </h1>
        <p className="mt-4 text-lg text-slate-700">
          You picked Free. That's the right place to start. Here's what happens next, and what
          your business can look like 90 days from now if you commit to the work.
        </p>
      </section>

      {/* What's next */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 pb-12">
        <div className="grid gap-5 md:grid-cols-3">
          <Step
            n={1}
            icon={Sparkles}
            title="Connect 1 social"
            body="Pick the channel that matters most. We start tracking your real numbers and build your baseline."
          />
          <Step
            n={2}
            icon={Zap}
            title="See what's possible"
            body="The Free dashboard shows you the journey: what your reach, leads, and revenue can look like in 30, 60, 90 days."
          />
          <Step
            n={3}
            icon={Users}
            title="Take the first action today"
            body="Looking Glass shows you ONE next move based on what's actually happening on your account right now."
          />
        </div>
      </section>

      {/* The why */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 pb-16">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-cyan-50 via-white to-accent-50 p-6 sm:p-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
            You won't go from 0 to 100K followers in a week. Nobody does.
          </h2>
          <p className="mt-4 text-slate-700 max-w-3xl">
            The flow gets you there. Show up, post with intention, watch what the algorithm
            rewards, double down. That's why we're called The LeadFlow Pro — every post,
            every reply, every action is part of a flow that compounds. Not random.{" "}
            <span className="font-semibold text-slate-900">Intentional.</span>
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-semibold text-slate-950 hover:bg-accent-400"
            >
              Go to your free dashboard <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-900 hover:bg-slate-50"
            >
              See what unlocks at paid tiers
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <p className="mx-auto max-w-3xl px-4 text-xs text-slate-500 text-center pb-12 leading-relaxed">
        The LeadFlow Pro is operated by Real Ryan Nichols LLC, a Texas LLC. Free tier is and
        will remain free — no credit card required, no surprise charges.
      </p>
    </div>
  );
}

function Step({ n, icon: Icon, title, body }: { n: number; icon: any; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white text-sm font-bold">
          {n}
        </div>
        <Icon className="h-5 w-5 text-cyan-600" />
      </div>
      <h3 className="mt-4 font-bold text-slate-950">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{body}</p>
    </div>
  );
}
