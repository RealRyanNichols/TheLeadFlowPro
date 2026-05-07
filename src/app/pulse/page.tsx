import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, CalendarCheck, Eye, MousePointerClick, Radar, Route, ShieldCheck, Trophy } from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { LiveLeadFlowPulse } from "@/components/site/LiveLeadFlowPulse";
import { getCapacitySnapshot } from "@/lib/capacity";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live Website Pulse — The LeadFlow Pro",
  description:
    "Watch The LeadFlow Pro's live website effectiveness board: visitors, share links, click-backs, top pages, CTA clicks, and Ryan's available capacity.",
};

const SCORECARDS = [
  {
    Icon: Eye,
    title: "Can we get attention?",
    body: "Views and active visitors show whether the page is interesting enough for people to look.",
  },
  {
    Icon: MousePointerClick,
    title: "Do people click?",
    body: "Service, calendar, and capacity clicks show whether the page is moving people toward a real decision.",
  },
  {
    Icon: CalendarCheck,
    title: "Can Ryan fulfill it?",
    body: "The same board points back to capacity so the site is not selling more work than Ryan can actually handle.",
  },
];

const NEXT_LEVEL = [
  "Per-offer scoreboards: views, engaged time, service clicks, calendar clicks, Stripe starts, and paid conversions.",
  "Tracked share links: every social share gets its own URL, click-backs are counted, and platform-reported views can be imported.",
  "A public conversion ladder: Attention -> Time on page -> Click -> Calendar -> Payment -> Client office.",
  "A learning loop that classifies chat topics without publishing raw private questions.",
  "A Ryan-only control room that turns winning hooks into the next page, offer, short, email, or tool.",
];

export default async function PulsePage() {
  const capacitySnapshot = await getCapacitySnapshot().catch(() => null);

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <LightHeader activePath="/pulse" />

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
          className="absolute -right-28 -top-32 h-[520px] w-[520px] rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(35,184,255,0.55) 0%, transparent 64%)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-44 -left-24 h-[520px] w-[520px] rounded-full opacity-45 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(255,154,31,0.45) 0%, transparent 62%)" }}
        />

        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-start lg:py-12">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-700 shadow-sm backdrop-blur">
              <Radar className="h-3.5 w-3.5" /> Website effectiveness board
            </div>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">
              This is not a vanity counter.{" "}
              <span className="bg-gradient-to-r from-brand-700 via-cyan-500 to-accent-500 bg-clip-text text-transparent">
                It shows if the site is working.
              </span>
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-slate-700">
              The LeadFlow Pro should prove its own pitch. One site, one page, one post, one ad,
              one share link. If attention turns into clicks, bookings, and buyers, the site should
              show that movement in public.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:flex">
              <Link
                href="/start"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800"
              >
                Pick my service <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/book"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-500/20 hover:bg-accent-600"
              >
                Book call <CalendarCheck className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <LiveLeadFlowPulse capacity={capacitySnapshot} />
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="grid gap-4 md:grid-cols-3">
            {SCORECARDS.map(({ Icon, title, body }) => (
              <div
                key={title}
                className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-cyan-50/60 p-5 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.35)]"
              >
                <Icon className="h-6 w-6 text-cyan-700" />
                <h2 className="mt-4 text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
              </div>
            ))}
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
        <div
          aria-hidden
          className="absolute -right-24 top-0 h-[460px] w-[460px] rounded-full bg-cyan-400/20 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-cyan-200">
              The next version
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              It now studies what people do, then tells us what to build next.
            </h2>
            <p className="mt-4 text-slate-300">
              The board is becoming the business brain: what people view, where they stay, what
              they ask, what they share, what gets clicked back, and what makes it to checkout.
              That is how the site stops guessing and starts creating better offers from real behavior.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {NEXT_LEVEL.map((item, index) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-300 text-sm font-bold text-slate-950">
                  {index + 1}
                </div>
                <p className="text-sm leading-relaxed text-slate-200">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-12 md:grid-cols-3">
          <Link
            href="/services"
            className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:border-cyan-300"
          >
            <Route className="h-6 w-6 text-cyan-700" />
            <h2 className="mt-4 font-semibold text-slate-950">See the services</h2>
            <p className="mt-2 text-sm text-slate-600">Pick the offer that should be earning clicks.</p>
          </Link>
          <Link
            href="/availability"
            className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:border-cyan-300"
          >
            <BarChart3 className="h-6 w-6 text-cyan-700" />
            <h2 className="mt-4 font-semibold text-slate-950">Check capacity</h2>
            <p className="mt-2 text-sm text-slate-600">The site should never sell work Ryan cannot fulfill.</p>
          </Link>
          <Link
            href="/tiers"
            className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:border-cyan-300"
          >
            <Trophy className="h-6 w-6 text-cyan-700" />
            <h2 className="mt-4 font-semibold text-slate-950">Compare the ladder</h2>
            <p className="mt-2 text-sm text-slate-600">Watch which price point pulls people forward.</p>
          </Link>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-cyan-700" />
            Anonymous counter only: no names, emails, IPs, or private client data.
          </div>
          <div>Public proof. Private client details stay private.</div>
        </div>
      </section>

      <LightFooter />
    </div>
  );
}
