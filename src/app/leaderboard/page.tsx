// src/app/leaderboard/page.tsx — East TX Top 10 public landing.
//
// Server component. Pulls snapshot, mounts LeaderboardLive (client) for
// the slider + ticker + chart. Add ?prefill=BusinessName to deep-link
// the buy form with that name pre-typed.

import Link from "next/link";
import { ArrowRight, Flame, HeartHandshake, Share2, ShieldCheck, Trophy } from "lucide-react";
import type { Metadata } from "next";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { LeaderboardLive } from "@/components/leaderboard/LeaderboardLive";
import { BoostMessageForm } from "@/components/leaderboard/BoostMessageForm";
import { GIVEBACK_TARGETS, getLeaderboardSnapshot } from "@/lib/leaderboard";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";
export const revalidate = 30;

export const metadata: Metadata = createSeoMetadata({
  title: "Top 10 Boards — East Texas Live Rankings · The LeadFlow Pro",
  description:
    "Many East Texas Top 10 boards in one place: coaches, teachers, teams, restaurants, businesses, artists, ministries, and local stories. $1 = 1 point, and 70% goes back local.",
  path: "/leaderboard",
  imageTitle: "Top 10 Boards",
  imageSubtitle: "Coaches, teachers, teams, restaurants, businesses, artists, ministries, and local stories.",
});

type Props = { searchParams: { prefill?: string; canceled?: string } };

export default async function LeaderboardPage({ searchParams }: Props) {
  let snap;
  try {
    snap = await getLeaderboardSnapshot();
  } catch {
    snap = null;
  }

  // JSON-LD ItemList of top businesses for AI / search citation
  const jsonLd = snap && snap.entries.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "East TX Top 10 — Live Leaderboard",
    url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://theleadflowpro.com"}/leaderboard`,
    numberOfItems: snap.entries.length,
    itemListElement: snap.entries.slice(0, 10).map((e) => ({
      "@type": "ListItem",
      position: e.rank,
      item: {
        "@type": "LocalBusiness",
        name: e.publicName,
        image: e.imageUrl || undefined,
        url: e.websiteUrl || undefined,
        address: e.city
          ? { "@type": "PostalAddress", addressLocality: e.city, addressRegion: "TX", addressCountry: "US" }
          : undefined,
        knowsAbout: e.category || undefined,
      },
    })),
  } : null;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {jsonLd && (
        /* eslint-disable-next-line react/no-danger */
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
      <LightHeader activePath="/leaderboard" />

      {/* HERO */}
      <section className="relative overflow-hidden">
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
          className="absolute -top-32 -right-32 h-[520px] w-[520px] rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(35,184,255,0.55) 0%, transparent 65%)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-40 -left-32 h-[560px] w-[560px] rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(255,154,31,0.45) 0%, transparent 65%)" }}
        />

        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/70 backdrop-blur px-3 py-1 text-xs uppercase tracking-widest text-cyan-700 font-semibold shadow-sm">
              <Flame className="h-3.5 w-3.5 animate-pulse" /> Live · East Texas only · 70% goes back local
            </div>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-slate-950 leading-[1.05]">
              One Top 10 tab.{" "}
              <span className="bg-gradient-to-r from-brand-700 via-cyan-500 to-accent-500 bg-clip-text text-transparent">
                Many local boards.
              </span>
            </h1>
            <p className="mt-5 text-lg sm:text-xl text-slate-700 max-w-3xl mx-auto leading-relaxed">
              Top coach. Top teacher. Top high school team. Top restaurant. Top attorney. Top
              doctor. Top artist. Top local story. Pick the board, add points, watch the ranking
              move. <strong>No payouts, no gambling, no fake votes.</strong> Seventy cents of every
              dollar placed is reserved for East Texas organizations, charity events, or local causes.
            </p>

            <div className="mt-6 grid gap-2 sm:grid-cols-3 max-w-2xl mx-auto text-left">
              <Pill Icon={Trophy} title="Top 3 = featured" body="Homepage banner + a digital badge for your site/socials" />
              <Pill Icon={HeartHandshake} title="70% local giveback" body="We keep the lights on, then send most vote proceeds back into East Texas." />
              <Pill Icon={Share2} title="Share-ready" body="Each business gets a QR + sharable URL for customers" />
            </div>
          </div>
        </div>
      </section>

      {/* LIVE BOARD + BUY */}
      <section className="relative overflow-hidden border-y border-slate-200">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, #f3eaff 0%, #fff8f1 100%)" }}
        />
        <div className="relative mx-auto max-w-5xl px-4 py-10 sm:py-14">
          {searchParams.canceled === "1" && (
            <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              You canceled the checkout. No charge. Pick a new amount and try again whenever.
            </div>
          )}
          {snap ? (
            <LeaderboardLive initial={snap} prefill={searchParams.prefill} />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
              Leaderboard is warming up. Refresh in a moment.
            </div>
          )}
        </div>
      </section>

      {/* BOOST — paid scrolling shoutouts */}
      <section className="relative overflow-hidden border-b border-slate-200">
        <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, #eef9ff 0%, #fff8f1 100%)" }} />
        <div className="relative mx-auto max-w-3xl px-4 py-10 sm:py-14">
          <BoostMessageForm />
        </div>
      </section>

      {/* WHY THIS WORKS — three short blocks */}
      <section className="relative overflow-hidden border-b border-slate-200">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, #fff8f1 0%, #eef9ff 100%)" }}
        />
        <div className="relative mx-auto max-w-5xl px-4 py-12 sm:py-16">
          <div className="text-xs uppercase tracking-widest text-cyan-700 font-bold mb-2">
            How this works
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 max-w-3xl">
            Cheaper than a Facebook ad. Louder than a billboard. Better for home.
          </h2>
          <div className="mt-7 grid gap-5 md:grid-cols-3">
            <Block
              n="01"
              title="Type your business"
              body="Name + East TX city + (optional) website + social. Takes 30 seconds. First payer for a name claims it with a one-time code."
            />
            <Block
              n="02"
              title="Slide your vote"
              body="$1 = 1 point. Pay $5, get 5 points. Pay $500, leap toward #1. The projected rank updates before you pay."
            />
            <Block
              n="03"
              title="70% goes back local"
              body="Apple Pay, Google Pay, card. 70% of leaderboard vote proceeds are reserved for East Texas organizations, charity events, or local causes."
            />
          </div>
        </div>
      </section>

      {/* GIVEBACK PROOF */}
      <section id="giveback" className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-brand-950 to-cyan-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(92,208,255,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,154,31,0.22),transparent_30%)]" />
        <div className="relative mx-auto max-w-5xl px-4 py-12 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-cyan-200">
                <HeartHandshake className="h-3.5 w-3.5" /> Local giveback rule
              </div>
              <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight">
                Every vote makes noise. Most of it goes back into East Texas.
              </h2>
              <p className="mt-3 text-slate-300 leading-relaxed">
                The leaderboard is a business visibility product, but it is also a public local
                support engine. For every dollar placed on a leaderboard vote, 70 cents is reserved
                for organizations, charity events, and local causes around East Texas.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {GIVEBACK_TARGETS.filter((target) => target.id !== "ryan-routes").map((target) => (
                  <GivebackTargetCard key={target.id} title={target.shortLabel} body={target.description} />
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl shadow-cyan-950/40 backdrop-blur">
              <div className="grid gap-3">
                <ProofRow title="70% local giveback" body="Reserved from leaderboard vote proceeds." />
                <ProofRow title="30% operating margin" body="Keeps the platform running, payment fees covered, and the business growing." />
                <ProofRow title="Public proof wall" body="As checks are delivered, photos and recipient notes go here. No fake giving numbers." />
              </div>
              <div className="mt-5 rounded-2xl border border-accent-300/30 bg-accent-300/10 p-4 text-sm text-accent-100">
                <ShieldCheck className="mb-2 h-5 w-5 text-accent-200" />
                We will show the people, the checks, and the local organizations when distributions
                happen. Until then, the live pool is calculated from real paid leaderboard votes.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LEGAL DISCLOSURE STRIP */}
      <section className="bg-white">
        <div className="mx-auto max-w-4xl px-4 py-10 text-center text-xs text-slate-500 leading-relaxed">
          <strong>Pay-to-rank sponsored placement.</strong> Not a contest of chance, sweepstakes, or
          gambling. Your payment buys visible ranking points; top weekly ranks receive featured
          placement and a digital badge. 70% of leaderboard vote proceeds are reserved for East Texas
          organizations, charity events, or local causes. No prize awarded by random draw. All sales
          final. Texas-law governed. Operated by Real Ryan Nichols LLC dba The LeadFlow Pro.
        </div>
      </section>

      {/* CTA STRIP */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-brand-900 to-cyan-900 text-white">
        <div className="relative mx-auto max-w-4xl px-4 py-14 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Want this for your town next?
          </h2>
          <p className="mt-3 text-slate-300 max-w-xl mx-auto">
            East Texas is the first. Tell us your town and we'll launch one there too.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-bold text-white shadow-lg shadow-accent-500/30 hover:bg-accent-600"
            >
              Tell me your town <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/services"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 backdrop-blur px-6 py-3 font-bold text-white hover:bg-white/10"
            >
              See done-for-you services
            </Link>
          </div>
        </div>
      </section>

      <LightFooter />
    </div>
  );
}

function Pill({ Icon, title, body }: { Icon: any; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur p-4 shadow-sm">
      <Icon className="h-5 w-5 text-cyan-600" />
      <div className="mt-2 text-sm font-bold text-slate-950">{title}</div>
      <div className="mt-0.5 text-xs text-slate-700 leading-relaxed">{body}</div>
    </div>
  );
}

function Block({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-5 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.10)]">
      <div className="text-3xl font-bold text-cyan-700 tabular-nums">{n}</div>
      <div className="mt-2 text-lg font-bold text-slate-950">{title}</div>
      <p className="mt-2 text-sm text-slate-700 leading-relaxed">{body}</p>
    </div>
  );
}

function ProofRow({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
      <div className="text-sm font-bold text-white">{title}</div>
      <div className="mt-1 text-xs leading-relaxed text-slate-300">{body}</div>
    </div>
  );
}

function GivebackTargetCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
      <div className="text-sm font-bold text-white">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-slate-300">{body}</p>
    </div>
  );
}
