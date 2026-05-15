import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Eye,
  MousePointerClick,
  RadioTower,
  Route,
  Share2,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { PulseShareButtons } from "@/components/site/PulseShareButtons";
import {
  PULSE_SIGNAL_LIST,
  getPulseSignalPage,
  type PulseSignalPage,
  type PulseSignalSlug,
} from "@/lib/pulse-signal-pages";
import { createSeoMetadata } from "@/lib/seo-metadata";
import { getSitePulseSnapshot, type SitePulseSnapshot } from "@/lib/site-pulse";

export const dynamic = "force-dynamic";

const ICONS: Record<PulseSignalSlug, typeof Eye> = {
  "live-views": Eye,
  "dwell-time": Clock3,
  "traffic-sources": Route,
  "click-intent": MousePointerClick,
  "share-backs": Share2,
  predictions: BarChart3,
  "speed-friction": ShieldCheck,
  "reward-loop": Trophy,
};

const ACCENT_CLASSES: Record<PulseSignalPage["accent"], string> = {
  cyan: "from-cyan-500 to-sky-400 text-cyan-950",
  accent: "from-accent-500 to-yellow-300 text-slate-950",
  brand: "from-brand-700 to-cyan-500 text-white",
  rose: "from-rose-500 to-accent-400 text-white",
};

const CALLOUT_CLASSES: Record<PulseSignalPage["accent"], string> = {
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-950",
  accent: "border-accent-200 bg-accent-50 text-slate-950",
  brand: "border-brand-200 bg-cyan-50 text-brand-950",
  rose: "border-rose-200 bg-rose-50 text-rose-950",
};

export function generateStaticParams() {
  return PULSE_SIGNAL_LIST.map((signal) => ({ signal: signal.slug }));
}

export function generateMetadata({ params }: { params: { signal: string } }): Metadata {
  const signal = getPulseSignalPage(params.signal);
  if (!signal) return {};

  return createSeoMetadata({
    title: `${signal.shortTitle} - Live Pulse Signal`,
    description: signal.description,
    path: `/pulse/${signal.slug}`,
    image: `/images/social/pulse-${signal.slug}.png`,
    imageTitle: signal.title,
    imageSubtitle: signal.description,
  });
}

function number(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.max(0, Math.round(value || 0)));
}

function percent(value: number) {
  return `${Math.max(0, Math.round((value || 0) * 100))}%`;
}

function secondsToLabel(seconds: number) {
  const safe = Math.max(0, Math.round(seconds || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const rest = safe % 60;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m ${rest}s`;
  return `${rest}s`;
}

function averageSeconds(snapshot: SitePulseSnapshot) {
  if (!snapshot.totalViews) return 0;
  return Math.round(snapshot.totalEngagementSeconds / snapshot.totalViews);
}

function signalStats(signal: PulseSignalPage, snapshot: SitePulseSnapshot) {
  const probability = snapshot.prediction.probabilities;
  const source = snapshot.topTrafficSources[0];
  const share = snapshot.topShares[0];

  switch (signal.slug) {
    case "live-views":
      return [
        { label: "Watching now", value: number(snapshot.activeNow), detail: "active in the last 2 minutes" },
        { label: "Views today", value: number(snapshot.viewsToday), detail: `${number(snapshot.visitorsToday)} visitors today` },
        { label: "Total tracked", value: number(snapshot.totalViews), detail: `since ${snapshot.trackingStartedAt || "tracking began"}` },
      ];
    case "dwell-time":
      return [
        { label: "Today watched", value: secondsToLabel(snapshot.engagementSecondsToday), detail: "visible active time" },
        { label: "Total watched", value: secondsToLabel(snapshot.totalEngagementSeconds), detail: "all tracked attention" },
        { label: "Avg per view", value: secondsToLabel(averageSeconds(snapshot)), detail: "attention quality" },
      ];
    case "traffic-sources":
      return [
        { label: "Top source", value: source?.source || "learning", detail: source ? `${number(source.views)} views` : "waiting for source events" },
        { label: "Source events", value: number(snapshot.trafficSourceSignalsToday), detail: "today's source signals" },
        { label: "Return visits", value: number(snapshot.returnVisitsToday), detail: "people coming back" },
      ];
    case "click-intent":
      return [
        { label: "All clicks today", value: number(snapshot.allClicksToday), detail: "button and page clicks" },
        { label: "Sales clicks", value: number(snapshot.serviceClicksToday + snapshot.bookClicksToday + snapshot.checkoutClicksToday), detail: "service, book, checkout" },
        { label: "Dead clicks", value: number(snapshot.deadClicksToday), detail: "confusion to fix" },
      ];
    case "share-backs":
      return [
        { label: "Share clicks", value: number(snapshot.totalShareClicks), detail: "tracked click-backs" },
        { label: "Reported views", value: number(snapshot.socialShareViewsToday), detail: "imported platform views today" },
        { label: "Top share", value: share?.platform || "learning", detail: share ? `${number(share.clicks)} clicks` : "create and share a link" },
      ];
    case "predictions":
      return [
        { label: "Confidence", value: snapshot.prediction.confidence, detail: `${number(snapshot.prediction.sampleSize)} signal sample` },
        { label: "Book odds", value: percent(probability.bookClickNext24h), detail: "next 24 hours" },
        { label: "Checkout odds", value: percent(probability.checkoutStartNext24h), detail: "next 24 hours" },
      ];
    case "speed-friction":
      return [
        { label: "CTA views", value: number(snapshot.ctaImpressionsToday), detail: "buttons seen today" },
        { label: "Friction clicks", value: number(snapshot.deadClicksToday + snapshot.rageClicksToday), detail: "dead clicks plus rage clicks" },
        { label: "Speed signals", value: number(snapshot.performanceSignalsToday), detail: "browser timing samples" },
      ];
    case "reward-loop":
      return [
        { label: "Tool actions", value: number(snapshot.toolInteractionsToday), detail: "today's active exploration" },
        { label: "Return odds", value: percent(probability.returnVisitNext7d), detail: "next 7 days" },
        { label: "Proof Points", value: number(snapshot.toolInteractionsToday + snapshot.returnVisitsToday + snapshot.shareClicksToday), detail: "off-chain beta signals" },
      ];
  }
}

function relatedSignals(current: PulseSignalSlug) {
  return PULSE_SIGNAL_LIST.filter((signal) => signal.slug !== current).slice(0, 3);
}

export default async function PulseSignalPage({ params }: { params: { signal: string } }) {
  const signal = getPulseSignalPage(params.signal);
  if (!signal) notFound();

  const snapshot = await getSitePulseSnapshot();
  const Icon = ICONS[signal.slug];
  const stats = signalStats(signal, snapshot);
  const accentClass = ACCENT_CLASSES[signal.accent];
  const calloutClass = CALLOUT_CLASSES[signal.accent];
  const related = relatedSignals(signal.slug);

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <LightHeader activePath="/pulse" />

      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-950 text-white">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "34px 34px",
          }}
        />
        <div aria-hidden className="absolute -right-28 -top-28 h-[460px] w-[460px] rounded-full bg-cyan-400/20 blur-3xl" />
        <div aria-hidden className="absolute -left-28 bottom-0 h-[380px] w-[380px] rounded-full bg-accent-400/20 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-7 px-4 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-10">
          <div>
            <Link
              href="/pulse"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100 hover:bg-white/15"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to live pulse
            </Link>
            <div className="mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-200">
              <RadioTower className="h-4 w-4" />
              {signal.eyebrow}
            </div>
            <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              {signal.title}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
              {signal.description}
            </p>
            <div className={`mt-5 rounded-3xl border p-4 ${calloutClass}`}>
              <div className="text-xs font-semibold uppercase tracking-widest opacity-80">
                The question this signal answers
              </div>
              <p className="mt-2 text-lg font-semibold leading-snug">{signal.primaryQuestion}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-4 shadow-[0_30px_90px_-40px_rgba(0,0,0,0.75)] backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-cyan-100">
                  Live readout
                </div>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                  Data from the real Pulse table
                </h2>
              </div>
              <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accentClass}`}>
                <Icon className="h-6 w-6" />
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                  <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    {stat.label}
                  </div>
                  <div className="mt-2 break-words text-3xl font-semibold tracking-tight text-white">
                    {stat.value}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{stat.detail}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-relaxed text-cyan-50">
              The public page shows anonymous totals. A client version can connect the same pattern
              to ads, forms, phone calls, texts, calendars, payments, and follow-up stages.
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-cyan-100">
                    Share this signal
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300">
                    These buttons create tracked links, so click-backs show up on Live Pulse.
                  </p>
                </div>
              </div>
              <PulseShareButtons
                path={`/pulse/${signal.slug}`}
                title={`${signal.shortTitle} - The LeadFlow Pro Live Pulse`}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-slate-200">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(135deg, #fff8f1 0%, #f6f9ff 42%, #eef9ff 76%, #f3eaff 100%)" }}
        />
        <div aria-hidden className="absolute -right-24 top-0 h-[420px] w-[420px] rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-12">
          <div className="grid gap-5 lg:grid-cols-3">
            <SignalPanel title="What it tracks" items={signal.whatItTracks} accent={signal.accent} />
            <SignalPanel title="What it signals" items={signal.whatItSignals} accent={signal.accent} />
            <SignalPanel title="What Ryan can build from it" items={signal.clientBuild} accent={signal.accent} />
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
            <div className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.42)] backdrop-blur">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
                <Sparkles className="h-3.5 w-3.5" />
                Longer you look, longer you win
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                Attention becomes a useful signal only when it predicts action.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                The reward loop should not pay people for empty time. It should reward learning,
                sharing, returning, clicking useful paths, and helping the site find better offers.
                That tells Ryan which tools people actually want before he spends hours building
                the wrong thing.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  ["Stay", "Visible time proves the page has pull."],
                  ["Interact", "Clicks show the next action people expect."],
                  ["Return", "Comebacks show the signal is worth watching again."],
                ].map(([label, body]) => (
                  <div key={label} className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-3">
                    <div className="text-sm font-semibold text-slate-950">{label}</div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-900/10 bg-slate-950 p-5 text-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.75)]">
              <div className="text-xs font-semibold uppercase tracking-widest text-accent-100">
                Crypto answer
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Start off-chain. Tokenize only after the behavior proves business value.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Crypto can fit later as a portable reward ledger, referral credit, community
                voting rail, or marketplace credit. It should not be the first move. The first move
                is proving people stay, learn, share, return, and buy because the system gives
                them value.
              </p>
              <div className="mt-4 rounded-2xl border border-accent-300/20 bg-accent-300/10 p-4 text-sm leading-relaxed text-accent-50">
                Current lane: Proof Points, stored off-chain. Future lane: a token only if the
                reward loop earns repeat usage, real referrals, and measurable revenue.
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/stump-ryan"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-500 to-accent-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-500/20 hover:from-accent-600 hover:to-accent-500"
            >
              {signal.cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/book"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Talk through my data
              <CalendarCheck className="h-4 w-4" />
            </Link>
            <Link
              href="/pulse"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:border-cyan-400"
            >
              Watch the full board
              <RadioTower className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                Keep walking the data
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Each signal gets its own page, social card, and business explanation.
              </h2>
            </div>
            <Link href="/pulse" className="text-sm font-semibold text-cyan-800 hover:text-cyan-950">
              Full Pulse page
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {related.map((item) => {
              const RelatedIcon = ICONS[item.slug];
              return (
                <Link
                  key={item.slug}
                  href={`/pulse/${item.slug}`}
                  className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:border-cyan-300 hover:shadow-[0_24px_60px_-38px_rgba(15,23,42,0.45)]"
                >
                  <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${ACCENT_CLASSES[item.accent]}`}>
                    <RelatedIcon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-semibold text-slate-950">{item.shortTitle}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-cyan-700" />
            Public Pulse pages use anonymous aggregate tracking only.
          </div>
          <div>Client dashboards can connect private sources after permission and setup.</div>
        </div>
      </section>

      <LightFooter />
    </div>
  );
}

function SignalPanel({
  title,
  items,
  accent,
}: {
  title: string;
  items: string[];
  accent: PulseSignalPage["accent"];
}) {
  return (
    <div className="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.42)] backdrop-blur">
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br ${ACCENT_CLASSES[accent]}`}>
        <CheckCircle2 className="h-4 w-4" />
      </div>
      <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <div key={item} className="flex gap-3 text-sm leading-relaxed text-slate-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
