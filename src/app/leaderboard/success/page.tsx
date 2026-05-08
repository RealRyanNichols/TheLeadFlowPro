// src/app/leaderboard/success/page.tsx — Stripe redirect target.
//
// Verifies the Checkout Session, finds-or-creates the BusinessProfile (issues
// a claim code on first creation), upserts the LeaderboardEntry, records the
// LeaderboardPurchase. Idempotent on stripeSessionId. Shows celebration +
// QR code + share buttons.

import Link from "next/link";
import {
  ArrowRight, Crown, ExternalLink, Globe2, KeyRound, MapPin,
  HeartHandshake, PartyPopper, ShieldCheck, Share2, Trophy,
} from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { currentWeekStart, leaderboardGivebackCents, resolveGivebackTarget } from "@/lib/leaderboard";
import { findOrCreateProfile } from "@/lib/business-profile";

export const dynamic = "force-dynamic";

type Props = { searchParams: { session_id?: string } };

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.theleadflowpro.com";

function qrUrl(target: string, size = 240): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(target)}`;
}

async function processCheckout(sessionId: string) {
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") {
    return { ok: false as const, reason: "Payment not completed yet." };
  }
  if (session.metadata?.type !== "leaderboard_point") {
    return { ok: false as const, reason: "Wrong checkout type." };
  }

  const publicName = session.metadata?.publicName || "";
  const city = session.metadata?.city || null;
  const category = session.metadata?.category || null;
  const websiteUrl = session.metadata?.websiteUrl || null;
  const socialUrl = session.metadata?.socialUrl || null;
  const imageUrl = session.metadata?.imageUrl || null;
  const dollars = Number(session.metadata?.dollars || 0);
  const givebackCents = session.metadata?.givebackCents
    ? Number(session.metadata.givebackCents)
    : leaderboardGivebackCents(dollars);
  const givebackTarget = resolveGivebackTarget(
    session.metadata?.givebackTargetId,
    session.metadata?.givebackTargetNote || session.metadata?.givebackTargetLabel
  );
  const weekStart = session.metadata?.weekStart
    ? new Date(session.metadata.weekStart)
    : currentWeekStart();
  const email = session.customer_email || session.customer_details?.email || null;

  if (!publicName || dollars <= 0) {
    return { ok: false as const, reason: "Bad metadata on the session." };
  }

  // Idempotent guard
  const already = await prisma.leaderboardPurchase.findUnique({
    where: { stripeSessionId: session.id },
  });

  // 1. Find or create the BusinessProfile (issues claim code on first creation)
  const { profile, isNew } = await findOrCreateProfile({
    publicName,
    city,
    category,
    email,
    websiteUrl,
    socialUrl,
    imageUrl,
  });
  if (!profile) {
    return { ok: false as const, reason: "Couldn't create business profile." };
  }

  if (!already) {
    // 2. Upsert leaderboard entry for this week
    await prisma.leaderboardEntry.upsert({
      where: { publicName_weekStart: { publicName, weekStart } },
      create: {
        publicName,
        city: city || profile.city,
        category: category || profile.category,
        email: email || profile.email,
        websiteUrl: websiteUrl || profile.websiteUrl,
        socialUrl: socialUrl || profile.socialUrl,
        imageUrl: imageUrl || profile.imageUrl,
        points: dollars,
        weekStart,
      },
      update: {
        points: { increment: dollars },
        city: city || undefined,
        category: category || undefined,
        websiteUrl: websiteUrl || undefined,
        socialUrl: socialUrl || undefined,
        imageUrl: imageUrl || undefined,
        email: email || undefined,
      },
    });

    // 3. Record the purchase
    await prisma.leaderboardPurchase.create({
      data: {
        publicName,
        city: city || profile.city,
        category: category || profile.category,
        amountDollars: dollars,
        buyerEmail: email,
        stripeSessionId: session.id,
        weekStart,
      },
    });

    // 4. Bump lifetime $ on profile
    await prisma.businessProfile.update({
      where: { id: profile.id },
      data: {
        totalLifetimeDollars: { increment: dollars },
      },
    });
  }

  // 5. Compute current rank this week
  const above = await prisma.leaderboardEntry.count({
    where: { weekStart, points: { gt: 0 } },
  });
  const me = await prisma.leaderboardEntry.findUnique({
    where: { publicName_weekStart: { publicName, weekStart } },
  });
  const rank = me
    ? (await prisma.leaderboardEntry.count({
        where: { weekStart, points: { gt: me.points } },
      })) + 1
    : null;

  return {
    ok: true as const,
    isNew,
    publicName,
    slug: profile.slug,
    claimCode: profile.claimCode,
    city: city || profile.city,
    category: category || profile.category,
    websiteUrl: websiteUrl || profile.websiteUrl,
    socialUrl: socialUrl || profile.socialUrl,
    dollars,
    givebackCents,
    givebackTargetLabel: session.metadata?.givebackTargetLabel || givebackTarget.label,
    rank,
    points: me?.points ?? dollars,
    totalEntries: above,
  };
}

export default async function LeaderboardSuccessPage({ searchParams }: Props) {
  const sessionId = searchParams.session_id;

  let result:
    | Awaited<ReturnType<typeof processCheckout>>
    | { ok: false; reason: string }
    | null = null;

  if (sessionId) {
    try {
      result = await processCheckout(sessionId);
    } catch (err) {
      result = { ok: false, reason: err instanceof Error ? err.message : "Verification failed." };
    }
  } else {
    result = { ok: false, reason: "Missing session id." };
  }

  if (!result?.ok) {
    return (
      <div className="min-h-screen bg-white text-slate-900">
        <LightHeader activePath="/leaderboard" />
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="text-3xl font-bold text-slate-950">Hmm.</h1>
          <p className="mt-3 text-slate-700">{result?.reason || "Couldn't verify the checkout."}</p>
          <Link href="/leaderboard"
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-800">
            Back to the leaderboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <LightFooter />
      </div>
    );
  }

  const businessUrl = `${SITE_URL}/b/${result.slug}`;
  const shareText = `${result.publicName}${result.city ? ` (${result.city}, TX)` : ""} just climbed to #${result.rank ?? "?"} on the East TX Top 10. Beat us: `;
  const xShare  = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(businessUrl)}`;
  const fbShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(businessUrl)}`;
  const smsShare = `sms:?&body=${encodeURIComponent(shareText + businessUrl)}`;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LightHeader activePath="/leaderboard" />

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

        <div className="relative mx-auto max-w-5xl px-4 py-16">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/70 backdrop-blur px-3 py-1 text-xs uppercase tracking-widest text-cyan-700 font-semibold shadow-sm">
              <PartyPopper className="h-3.5 w-3.5" /> {result.isNew ? "Welcome to the board" : "Climbed higher"}
            </div>
            <h1 className="mt-5 text-4xl sm:text-6xl font-bold tracking-tight text-slate-950">
              <span className="bg-gradient-to-r from-brand-700 via-cyan-500 to-accent-500 bg-clip-text text-transparent">
                {result.publicName}
              </span>{" "}
              — #{result.rank ?? "?"}
            </h1>
            <p className="mt-3 text-lg text-slate-700">
              +{result.dollars} points · {result.points} total this week
              {result.city ? ` · ${result.city}, TX` : ""}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-cyan-300 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-900">
              <HeartHandshake className="h-4 w-4 text-cyan-700" />
              {formatMoneyFromCents(result.givebackCents)} reserved for the East Texas local giveback pool
            </div>
            <div className="mx-auto mt-3 max-w-xl rounded-2xl border border-white/60 bg-white/75 px-4 py-3 text-sm text-slate-700 shadow-sm backdrop-blur">
              Giveback preference tracked:{" "}
              <strong className="text-slate-950">{result.givebackTargetLabel}</strong>
            </div>
            {result.rank && result.rank <= 3 && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-accent-300 bg-accent-300/15 px-4 py-2 text-sm">
                <Crown className="h-4 w-4 text-accent-600" /> Top 3 — featured spot live now
              </div>
            )}
          </div>

          {/* Two-column: claim code (if new) + QR + share */}
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {/* Claim code (only on first creation) */}
            {result.isNew && (
              <div className="lg:col-span-1 rounded-2xl border border-accent-400 bg-accent-300/15 backdrop-blur p-5 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.15)]">
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-accent-700 font-bold">
                  <KeyRound className="h-3.5 w-3.5" /> Your claim code
                </div>
                <div className="mt-3 text-4xl font-mono font-bold tracking-[0.4em] text-slate-950 text-center bg-white/70 rounded-xl py-4 border border-slate-200">
                  {result.claimCode}
                </div>
                <p className="mt-3 text-xs text-slate-700 leading-relaxed">
                  <strong>Save this.</strong> It locks <em>{result.publicName}</em> to you. Anyone
                  can ADD points to your business (it benefits you), but only this code edits your
                  website / social / category.
                </p>
              </div>
            )}

            {/* QR */}
            <div className={`${result.isNew ? "lg:col-span-1" : "lg:col-span-2"} rounded-2xl border border-white/60 bg-white/80 backdrop-blur-xl p-5 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.15)] ring-1 ring-slate-900/5 text-center`}>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                Your business page
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl(businessUrl)}
                alt={`QR code for ${result.publicName}`}
                width={240}
                height={240}
                className="mt-3 mx-auto rounded-2xl border border-slate-200 shadow-sm"
              />
              <div className="mt-3 text-xs text-slate-500 break-all">{businessUrl}</div>
              <Link href={`/b/${result.slug}`}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-cyan-700 hover:text-cyan-800">
                Open your page <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Share */}
            <div className={`${result.isNew ? "lg:col-span-1" : "lg:col-span-1"} rounded-2xl border border-cyan-300 bg-cyan-50/60 backdrop-blur p-5 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.15)]`}>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-cyan-700 font-bold">
                <Share2 className="h-3.5 w-3.5" /> Share & climb together
              </div>
              <p className="mt-2 text-sm text-slate-700">
                The fastest way to take #1: get your customers to push you there.
              </p>
              <div className="mt-4 space-y-2">
                <a href={xShare} target="_blank" rel="noopener noreferrer"
                   className="block rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white text-center hover:bg-slate-800">
                  Share on X / Twitter
                </a>
                <a href={fbShare} target="_blank" rel="noopener noreferrer"
                   className="block rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white text-center hover:bg-brand-800">
                  Share on Facebook
                </a>
                <a href={smsShare}
                   className="block rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white text-center hover:bg-cyan-700">
                  Text it
                </a>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/leaderboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800"
            >
              Back to the live board <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={`/leaderboard?prefill=${encodeURIComponent(result.publicName)}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white/80 backdrop-blur px-6 py-3 font-semibold text-slate-800 hover:border-brand-500 hover:text-brand-700"
            >
              Add more points
            </Link>
          </div>

          <p className="mt-8 text-center text-xs text-slate-500 max-w-xl mx-auto leading-relaxed">
            Pay-to-rank sponsored placement. Texas-law governed. Receipt sent via Stripe. 70% of
            leaderboard vote proceeds are reserved for East Texas organizations, charity events, or
            local causes. Resets Sunday midnight CT — every week is a fresh climb.
          </p>
        </div>
      </section>

      <LightFooter />
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
