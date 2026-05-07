// src/app/b/[slug]/page.tsx — public business profile page.
// Lives at theleadflowpro.com/b/smith-roofing. Shareable. Has QR code.

import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, ExternalLink, Globe2, HeartHandshake, MapPin, ShieldCheck, Trophy,
} from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { prisma } from "@/lib/prisma";
import { currentWeekStart, leaderboardGivebackCents } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";
export const revalidate = 60;

type Props = { params: { slug: string } };

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.theleadflowpro.com";

function qrUrl(target: string, size = 280): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(target)}`;
}

export async function generateMetadata({ params }: Props) {
  const profile = await prisma.businessProfile.findUnique({
    where: { slug: params.slug },
    select: { publicName: true, city: true, category: true },
  });
  if (!profile) return { title: "Business · The LeadFlow Pro" };
  return {
    title: `${profile.publicName} — East TX Top 10 · The LeadFlow Pro`,
    description: `${profile.publicName}${profile.city ? ` of ${profile.city}, TX` : ""} on the East Texas Top 10 leaderboard. Climb past them by adding points to your own.`,
  };
}

export default async function BusinessPage({ params }: Props) {
  const profile = await prisma.businessProfile.findUnique({
    where: { slug: params.slug },
  });
  if (!profile) notFound();

  const weekStart = currentWeekStart();
  const [thisWeek, allTime] = await Promise.all([
    prisma.leaderboardEntry.findUnique({
      where: { publicName_weekStart: { publicName: profile.publicName, weekStart } },
    }),
    prisma.leaderboardPurchase.aggregate({
      where: { publicName: profile.publicName },
      _sum: { amountDollars: true },
      _count: true,
    }),
  ]);

  // Compute current rank this week
  let rank: number | null = null;
  if (thisWeek) {
    const above = await prisma.leaderboardEntry.count({
      where: {
        weekStart,
        points: { gt: thisWeek.points },
      },
    });
    rank = above + 1;
  }

  const businessUrl = `${SITE_URL}/b/${profile.slug}`;
  const directionsUrl = profile.city
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${profile.publicName} ${profile.city} TX`)}`
    : null;

  // JSON-LD schema for AI / search citation
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: profile.publicName,
    url: businessUrl,
    image: profile.imageUrl || undefined,
    sameAs: [profile.websiteUrl, profile.socialUrl].filter(Boolean) as string[],
    address: profile.city
      ? {
          "@type": "PostalAddress",
          addressLocality: profile.city,
          addressRegion: "TX",
          addressCountry: "US",
        }
      : undefined,
    areaServed: { "@type": "Place", name: profile.city ? `${profile.city}, TX` : "East Texas" },
    knowsAbout: profile.category || undefined,
    aggregateRating: thisWeek && thisWeek.points > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: Math.min(5, Math.max(1, Math.round((thisWeek.points / 50) + 3))),
          reviewCount: Math.max(1, allTime._count),
        }
      : undefined,
  };

  const shareText = `${profile.publicName}${profile.city ? ` (${profile.city}, TX)` : ""} is climbing the East TX Top 10. Push them past #1: `;
  const xShare  = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(businessUrl)}`;
  const fbShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(businessUrl)}`;
  const smsShare = `sms:?&body=${encodeURIComponent(shareText + businessUrl)}`;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LightHeader />

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

        <div className="relative mx-auto max-w-5xl px-4 py-12 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-5 lg:items-start">
            <div className="lg:col-span-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/70 backdrop-blur px-3 py-1 text-xs uppercase tracking-widest text-cyan-700 font-semibold shadow-sm">
                <Trophy className="h-3.5 w-3.5" /> East TX Top 10
              </div>
              <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-950 leading-tight">
                {profile.publicName}
              </h1>
              <p className="mt-2 text-lg text-slate-700 flex items-center gap-2 flex-wrap">
                {profile.city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-cyan-600" /> {profile.city}, TX
                  </span>
                )}
                {profile.category && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span>{profile.category}</span>
                  </>
                )}
              </p>

              {/* Rank cards */}
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="This week's rank" value={rank ? `#${rank}` : "—"} accent="accent" />
                <Stat label="Points this week" value={(thisWeek?.points ?? 0).toLocaleString()} accent="cyan" />
                <Stat label="Lifetime votes" value={`$${(allTime._sum.amountDollars ?? 0).toLocaleString()}`} accent="brand" />
                <Stat
                  label="Local giveback generated"
                  value={formatMoneyFromCents(leaderboardGivebackCents(allTime._sum.amountDollars ?? 0))}
                  accent="rose"
                />
              </div>

              {/* CTAs */}
              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  href={`/leaderboard?prefill=${encodeURIComponent(profile.publicName)}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800"
                >
                  Add points to {profile.publicName} <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/leaderboard#giveback"
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-300 bg-cyan-50 px-5 py-3 font-semibold text-cyan-900 hover:border-cyan-500"
                >
                  <HeartHandshake className="h-4 w-4" /> 70% local giveback
                </Link>
                {profile.websiteUrl && (
                  <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer nofollow"
                     className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/80 backdrop-blur px-5 py-3 font-semibold text-slate-800 hover:border-brand-500 hover:text-brand-700">
                    <Globe2 className="h-4 w-4" /> Website
                  </a>
                )}
                {profile.socialUrl && (
                  <a href={profile.socialUrl} target="_blank" rel="noopener noreferrer nofollow"
                     className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/80 backdrop-blur px-5 py-3 font-semibold text-slate-800 hover:border-brand-500 hover:text-brand-700">
                    <ExternalLink className="h-4 w-4" /> Social
                  </a>
                )}
                {directionsUrl && (
                  <a href={directionsUrl} target="_blank" rel="noopener noreferrer nofollow"
                     className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/80 backdrop-blur px-5 py-3 font-semibold text-slate-800 hover:border-brand-500 hover:text-brand-700">
                    <MapPin className="h-4 w-4" /> Directions
                  </a>
                )}
              </div>

              {/* Share */}
              <div className="mt-6 flex flex-wrap gap-2 text-sm">
                <span className="text-slate-600 self-center">Share this profile:</span>
                <a href={xShare} target="_blank" rel="noopener noreferrer nofollow"
                   className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 hover:border-cyan-400">
                  X / Twitter
                </a>
                <a href={fbShare} target="_blank" rel="noopener noreferrer nofollow"
                   className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 hover:border-cyan-400">
                  Facebook
                </a>
                <a href={smsShare}
                   className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 hover:border-cyan-400">
                  SMS / iMessage
                </a>
              </div>
            </div>

            {/* QR card */}
            <div className="lg:col-span-2">
              <div className="rounded-3xl border border-white/60 bg-white/80 backdrop-blur-xl p-5 shadow-[0_30px_70px_-20px_rgba(15,23,42,0.20)] ring-1 ring-slate-900/5 text-center">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                  Scan to send people here
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrUrl(businessUrl)}
                  alt={`QR code for ${profile.publicName}`}
                  width={280}
                  height={280}
                  className="mt-3 mx-auto rounded-2xl border border-slate-200 shadow-sm"
                />
                <div className="mt-3 text-xs text-slate-500 break-all">{businessUrl}</div>
                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-cyan-700">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified business · slug locked
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Climb past CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-brand-900 to-cyan-900 text-white">
        <div className="relative mx-auto max-w-4xl px-4 py-14 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold">Want to outrank {profile.publicName}?</h2>
          <p className="mt-3 text-slate-300 max-w-xl mx-auto">
            Type your business name on the leaderboard. Slide your vote. Take the throne.
          </p>
          <Link
            href="/leaderboard"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-bold text-white shadow-lg shadow-accent-500/30 hover:bg-accent-600"
          >
            Climb the East TX Top 10 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <LightFooter />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: "cyan" | "accent" | "brand" | "rose" }) {
  const tone = {
    cyan: "border-cyan-300 bg-cyan-50/80",
    accent: "border-accent-300 bg-accent-300/20",
    brand: "border-brand-300 bg-brand-50",
    rose: "border-rose-200 bg-rose-50/80",
  }[accent];
  return (
    <div className={`rounded-2xl border ${tone} backdrop-blur p-3`}>
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-950 tabular-nums">{value}</div>
    </div>
  );
}

function formatMoneyFromCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
