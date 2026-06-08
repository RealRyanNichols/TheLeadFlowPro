import Link from "next/link";
import { ArrowRight, Gauge, Lock, RadioTower, Sparkles, TrendingUp, Zap } from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { BoardCard } from "@/components/weird-stats/BoardCard";
import { PublicRequestCard } from "@/components/weird-stats/PublicRequestCard";
import { StatGrid } from "@/components/weird-stats/StatGrid";
import { StatTile } from "@/components/weird-stats/StatTile";
import { StatsDisclaimer } from "@/components/weird-stats/StatsDisclaimer";
import { UnlockCard } from "@/components/weird-stats/UnlockCard";
import {
  PUBLIC_REQUEST_SEEDS,
  STARTER_WEIRD_STATS,
  WEIRD_BOARDS,
  WEIRD_PURCHASE_PRODUCTS,
} from "@/lib/weird-stats";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const revalidate = 60;

export const metadata = createSeoMetadata({
  title: "The Weird Stats Clock | The LeadFlow Pro",
  description:
    "A live clock for strange numbers nobody else is watching. Track weird formula-based stats, request custom counters, unlock boards, and share stat cards.",
  path: "/",
  imageTitle: "The Weird Stats Clock",
  imageSubtitle: "A live clock for the strange numbers nobody else is watching.",
});

const HERO_STATS = STARTER_WEIRD_STATS.slice(0, 6);
const FEATURED_STATS = STARTER_WEIRD_STATS.slice(6, 14);

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <LightHeader activePath="/" />

      <main>
        <HeroSection />
        <LiveClockSection />
        <BoardPreviewSection />
        <RequestPreviewSection />
        <UnlockPreviewSection />
        <FinalCtaSection />
      </main>

      <LightFooter />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-cyan-300/15 bg-slate-950">
      <div
        aria-hidden
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(circle at 16% 12%, rgba(34,211,238,0.22), transparent 30%), radial-gradient(circle at 84% 18%, rgba(251,146,60,0.2), transparent 30%), radial-gradient(circle at 50% 100%, rgba(217,70,239,0.16), transparent 34%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(125,211,252,0.32) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,0.22) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
        }}
      />

      <div className="relative mx-auto grid max-w-[96rem] gap-7 px-4 py-10 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:px-8 lg:py-14">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-cyan-100">
            <RadioTower className="h-3.5 w-3.5" />
            The Weird Stats Clock
          </div>
          <p className="mt-3 text-xs font-black uppercase tracking-[0.22em] text-slate-500">
            by The LeadFlow Pro
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-[0.94] tracking-tight sm:text-6xl lg:text-7xl">
            The live clock for numbers nobody else is watching.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
            Track strange, funny, oddly useful stats in real time. Request your own weird stat
            and watch the internet think with you.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/request"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 text-sm font-black text-slate-950 shadow-lg shadow-accent-500/20 hover:bg-accent-400"
            >
              Request a Weird Stat <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/unlock"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-6 py-3 text-sm font-black text-cyan-50 hover:bg-cyan-300/15"
            >
              Unlock Premium Boards <Lock className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6">
            <StatsDisclaimer compact />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {HERO_STATS.map((stat) => (
            <StatTile key={stat.slug} stat={stat} dense />
          ))}
        </div>
      </div>

      <div className="relative border-y border-cyan-300/15 bg-black/30">
        <div className="flex min-w-max animate-[marquee_28s_linear_infinite] gap-3 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-300">
          {STARTER_WEIRD_STATS.slice(0, 14).map((stat) => (
            <span key={stat.slug} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1">
              {stat.title}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function LiveClockSection() {
  return (
    <section id="live-clock" className="relative bg-slate-950 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-[96rem]">
        <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-cyan-100">
              <Gauge className="h-3.5 w-3.5" />
              Live weird stats
            </div>
            <h2 className="mt-4 max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">
              A dense wall of moving numbers, source labels, and weird little truths.
            </h2>
          </div>
          <Link
            href="/request"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-5 py-3 text-sm font-black text-slate-950 hover:bg-accent-400"
          >
            Add your own stat <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <StatGrid stats={STARTER_WEIRD_STATS} />
      </div>
    </section>
  );
}

function BoardPreviewSection() {
  return (
    <section className="border-y border-white/10 bg-slate-900/70 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-[96rem]">
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent-300/25 bg-accent-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-accent-100">
              <Lock className="h-3.5 w-3.5" />
              Premium boards
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              Browse by obsession, unlock the deeper cards when curiosity wins.
            </h2>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Each board has free preview tiles, locked deeper cards, and a clean path to
              sponsor the category or request a private research pull.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {WEIRD_BOARDS.slice(0, 4).map((board) => (
              <BoardCard key={board.key} board={board} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function RequestPreviewSection() {
  return (
    <section className="bg-slate-950 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-[96rem]">
        <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-cyan-100">
              <TrendingUp className="h-3.5 w-3.5" />
              Public request queue
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              The audience can vote, boost, follow, and share strange ideas.
            </h2>
          </div>
          <Link
            href="/requests"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-5 py-3 text-sm font-black text-cyan-50 hover:bg-cyan-300/15"
          >
            Open queue <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PUBLIC_REQUEST_SEEDS.map((request) => (
            <PublicRequestCard key={request.id} request={request} />
          ))}
        </div>
      </div>
    </section>
  );
}

function UnlockPreviewSection() {
  return (
    <section className="border-y border-white/10 bg-black/30 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-[96rem]">
        <div className="mb-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent-300/25 bg-accent-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-accent-100">
            <Zap className="h-3.5 w-3.5" />
            Micropurchase ladder
          </div>
          <h2 className="mt-4 max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">
            Tiny payments for tiny sparks, deeper pulls, and shareable stat pages.
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {WEIRD_PURCHASE_PRODUCTS.slice(0, 4).map((product) => (
            <UnlockCard key={product.key} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section className="bg-slate-950 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto grid max-w-[96rem] gap-6 rounded-[2rem] border border-cyan-300/20 bg-cyan-300/10 p-6 shadow-2xl shadow-black/20 lg:grid-cols-[1fr_auto] lg:items-center lg:p-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-slate-950/70 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-cyan-100">
            <Sparkles className="h-3.5 w-3.5" />
            Feed the machine
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
            Got a number nobody tracks? Put it in the clock.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-cyan-50/90">
            Public requests can become cards. Private pulls can become short answers.
            Sponsored boards can turn one weird topic into a recurring destination.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <Link
            href="/request"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 text-sm font-black text-slate-950 hover:bg-accent-400"
          >
            Request a Weird Stat <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/boards"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cyan-300/25 bg-slate-950/70 px-6 py-3 text-sm font-black text-cyan-50 hover:bg-slate-900"
          >
            Browse boards <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <div className="mx-auto mt-8 max-w-[96rem]">
        <div className="grid gap-4 lg:grid-cols-4">
          {FEATURED_STATS.slice(0, 4).map((stat) => (
            <StatTile key={stat.slug} stat={stat} dense />
          ))}
        </div>
      </div>
    </section>
  );
}
