import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarCheck,
  Car,
  CheckCircle2,
  Eye,
  Gavel,
  HeartPulse,
  Home,
  Megaphone,
  MousePointerClick,
  Music2,
  Radar,
  Route,
  ShieldCheck,
  Trophy,
  XCircle,
} from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { LivePulseEngineRoom } from "@/components/site/LivePulseEngineRoom";
import { LiveLeadFlowPulse } from "@/components/site/LiveLeadFlowPulse";
import { PulseBusinessDemo } from "@/components/site/PulseBusinessDemo";
import { getCapacitySnapshot } from "@/lib/capacity";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createSeoMetadata({
  title: "Live Website Pulse — The LeadFlow Pro",
  description:
    "Watch The LeadFlow Pro's live website brain and engine: visitors, share links, click-backs, top pages, CTA clicks, learning signals, and Ryan's available capacity.",
  path: "/pulse",
  imageTitle: "Live Website Pulse",
  imageSubtitle: "A public look inside the site's live brain: attention, clicks, shares, bookings, learning signals, and capacity.",
});

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

const BUSINESS_SIGNAL_STACK = [
  {
    Icon: Car,
    label: "Dealerships",
    signal: "Vehicle page -> trade-in click -> phone call -> missed-call text -> appointment",
    decision: "Which inventory, ad, or salesperson is creating real showroom movement?",
  },
  {
    Icon: Gavel,
    label: "Attorneys",
    signal: "Case page -> intake question -> evidence upload -> consult request -> paid review",
    decision: "Which case type creates serious consults without leaking private details?",
  },
  {
    Icon: HeartPulse,
    label: "Doctors",
    signal: "Service page -> insurance question -> booking click -> reminder -> completed visit",
    decision: "Which procedure pages create patients instead of casual browsing?",
  },
  {
    Icon: Home,
    label: "Real estate",
    signal: "Listing content -> home-value click -> saved lead -> nurture -> showing request",
    decision: "Which neighborhoods, posts, and listings deserve more content or ad spend?",
  },
  {
    Icon: Music2,
    label: "Artists",
    signal: "Short -> profile click -> email capture -> merch click -> show ticket",
    decision: "Which clip, hook, city, and fan action should get pushed next?",
  },
  {
    Icon: Building2,
    label: "Local services",
    signal: "Before/after post -> quote click -> SMS follow-up -> deposit -> job booked",
    decision: "Where is the lead leaking: creative, page, reply speed, quote, or checkout?",
  },
];

const AD_OWNER_STACK = [
  {
    stat: "Ad click",
    title: "The click is not the win.",
    body: "A Facebook ad manager can show clicks. The owner needs to know which click became a lead, call, text, booked slot, checkout start, or lost opportunity.",
  },
  {
    stat: "Lead source",
    title: "The source must stay attached.",
    body: "If the lead came from an ad, reel, share link, SEO page, or live pulse post, that source should follow the customer into the CRM and client office.",
  },
  {
    stat: "Reply speed",
    title: "Follow-up is where money leaks.",
    body: "The system should show whether the business replied in seconds, minutes, hours, or never. That is usually where ads become expensive.",
  },
  {
    stat: "Owned system",
    title: "No agency percentage grab.",
    body: "Ryan builds it inside the client’s accounts: their page, pixel, list, automations, leads, dashboard, and sales process.",
  },
];

const AD_ACCOUNT_DIAGNOSTIC = {
  scale: [
    "The pixel, form, phone, calendar, checkout, and CRM all keep the same source trail.",
    "Every ad has one clear next action and a follow-up sequence after the click.",
    "The owner can see cost, lead quality, response speed, booked calls, and paid outcomes together.",
    "Winning hooks get turned into new pages, posts, retargeting audiences, and sales tools.",
  ],
  flop: [
    "The ad gets clicks, but the business cannot see who replied, booked, bought, or disappeared.",
    "Lead forms dump into email, DMs, spreadsheets, or memory with no owner dashboard.",
    "The page is slow, confusing, too wordy, or asks people to scroll before choosing a next step.",
    "Nobody studies the pattern, so the same weak creative and weak offer keep getting funded.",
  ],
};

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
              Look inside the brain and engine of this website.{" "}
              <span className="bg-gradient-to-r from-brand-700 via-cyan-500 to-accent-500 bg-clip-text text-transparent">
                Live while it runs.
              </span>
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-slate-700">
              The LeadFlow Pro should prove its own pitch. One site, one page, one post, one ad,
              one share link. If attention turns into clicks, bookings, buyers, and new product
              ideas, the site should show that movement in public.
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

      <LivePulseEngineRoom />

      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #eaf9ff 0%, #fff8f1 46%, #f3eaff 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute -left-24 top-10 h-[420px] w-[420px] rounded-full bg-cyan-300/30 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -right-24 bottom-0 h-[420px] w-[420px] rounded-full bg-accent-300/30 blur-3xl"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-14">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-700 shadow-sm backdrop-blur">
              <Megaphone className="h-3.5 w-3.5" /> What Facebook ad buyers should see
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Ads are not successful because Meta says people clicked.
              <span className="block bg-gradient-to-r from-brand-700 via-cyan-500 to-accent-500 bg-clip-text text-transparent">
                Ads are successful when the business can see the whole money trail.
              </span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-700">
              This is the part most businesses do not have: a single view connecting the ad, page,
              question, click, reply, calendar, payment, and follow-up. That is what makes the
              difference between buying traffic and building a machine.
            </p>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-cyan-200 bg-white/85 p-5 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.42)] backdrop-blur">
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-800">
                <CheckCircle2 className="h-3.5 w-3.5" /> Ads that scale
              </div>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                The account is connected to the business system.
              </h3>
              <div className="mt-4 grid gap-3">
                {AD_ACCOUNT_DIAGNOSTIC.scale.map((item) => (
                  <div key={item} className="flex gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/70 p-3 text-sm leading-relaxed text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-rose-200 bg-white/85 p-5 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.42)] backdrop-blur">
              <div className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-rose-700">
                <XCircle className="h-3.5 w-3.5" /> Ads that flop
              </div>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                The ad is separate from the follow-up machine.
              </h3>
              <div className="mt-4 grid gap-3">
                {AD_ACCOUNT_DIAGNOSTIC.flop.map((item) => (
                  <div key={item} className="flex gap-3 rounded-2xl border border-rose-100 bg-rose-50/70 p-3 text-sm leading-relaxed text-slate-700">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-accent-200 bg-gradient-to-r from-accent-50 via-white to-cyan-50 p-5 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.42)]">
            <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
              The build Ryan sells
            </div>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              A client version would show the owner where the ad money became real movement.
            </h3>
            <p className="mt-3 max-w-4xl text-sm leading-relaxed text-slate-700">
              The public pulse proves the concept with anonymous site behavior. A paid client
              office can connect Meta ads, page events, phone/text follow-up, CRM stages, calendar
              bookings, invoices, and status updates so the owner can decide what to fund, fix, or
              kill next.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/challenge"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Challenge Ryan with my tool <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/book"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:border-cyan-400"
              >
                Talk through my ad account <CalendarCheck className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mt-7 grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="overflow-hidden rounded-3xl border border-slate-900/10 bg-slate-950 text-white shadow-[0_30px_80px_-32px_rgba(15,23,42,0.72)]">
              <div className="border-b border-white/10 bg-gradient-to-r from-cyan-500/15 via-white/[0.03] to-accent-500/15 p-5">
                <div className="text-xs font-semibold uppercase tracking-widest text-cyan-100">
                  Owner's ad scoreboard
                </div>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                  The ad spend only matters if it creates owner-controlled movement.
                </h3>
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {AD_OWNER_STACK.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-accent-100">
                      {item.stat}
                    </div>
                    <h4 className="mt-2 text-base font-semibold text-white">{item.title}</h4>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">{item.body}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/10 bg-white/[0.04] p-4 text-sm leading-relaxed text-slate-300">
                A Facebook ad operator who understands data should recognize this immediately:
                the business does not need prettier reports. It needs an operating system that
                catches the lead and shows the owner what to do next.
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {BUSINESS_SIGNAL_STACK.map(({ Icon, label, signal, decision }) => (
                <div
                  key={label}
                  className="rounded-3xl border border-white/80 bg-white/80 p-4 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.4)] backdrop-blur"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-cyan-200">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                        Business type
                      </div>
                      <h3 className="font-semibold text-slate-950">{label}</h3>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50/70 p-3 text-xs font-semibold leading-relaxed text-cyan-950">
                    {signal}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-700">{decision}</p>
                </div>
              ))}
            </div>
          </div>
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

      <PulseBusinessDemo />

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
