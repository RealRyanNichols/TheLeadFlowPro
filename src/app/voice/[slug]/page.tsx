// src/app/voice/[slug]/page.tsx — single Voice topic with YES/NO money voting.

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Clock, MapPin, ThumbsDown, ThumbsUp } from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { getTopicBySlug, toPublic } from "@/lib/voice";
import { VoiceVoteForm } from "@/components/voice/VoiceVoteForm";

export const dynamic = "force-dynamic";
export const revalidate = 30;

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props) {
  const t = await getTopicBySlug(params.slug);
  if (!t) return { title: "East TX Voice · The LeadFlow Pro" };
  return {
    title: `${t.question} — East TX Voice · The LeadFlow Pro`,
    description: `Money-weighted YES/NO sentiment voting on East Texas. Cast your voice with $1+. ${t.city ? `${t.city}, TX.` : ""}`,
  };
}

export default async function VoiceTopicPage({ params }: Props) {
  const row = await getTopicBySlug(params.slug);
  if (!row) notFound();
  const t = toPublic(row);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LightHeader />

      <section className="relative overflow-hidden">
        <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(135deg, #fff8f1 0%, #f6f9ff 38%, #eef9ff 70%, #f3eaff 100%)" }} />
        <div aria-hidden className="absolute -top-32 -right-32 h-[520px] w-[520px] rounded-full opacity-50 blur-3xl"
             style={{ background: "radial-gradient(circle, rgba(35,184,255,0.55) 0%, transparent 65%)" }} />
        <div aria-hidden className="absolute -bottom-40 -left-32 h-[560px] w-[560px] rounded-full opacity-50 blur-3xl"
             style={{ background: "radial-gradient(circle, rgba(255,154,31,0.45) 0%, transparent 65%)" }} />

        <div className="relative mx-auto max-w-5xl px-4 py-10 sm:py-14">
          <Link href="/voice" className="text-sm text-cyan-700 hover:text-cyan-800 inline-flex items-center gap-1">
            ← All East TX Voice topics
          </Link>

          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/70 backdrop-blur px-3 py-1 text-xs uppercase tracking-widest text-cyan-700 font-semibold shadow-sm">
            <Clock className="h-3.5 w-3.5" /> Closes in {fmtCountdown(t.closesInSeconds)}
          </div>

          <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-950 leading-tight">
            {t.question}
          </h1>
          {t.description && <p className="mt-4 text-lg text-slate-700 leading-relaxed">{t.description}</p>}
          {(t.city || t.category) && (
            <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-600">
              {t.city && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {t.city}</span>}
              {t.category && <span className="text-slate-500">· {t.category}</span>}
            </div>
          )}

          {/* Tally bar */}
          <div className="mt-8 rounded-3xl border border-white/60 bg-white/80 backdrop-blur-xl p-5 sm:p-6 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.15)] ring-1 ring-slate-900/5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="inline-flex items-center gap-1 text-cyan-700 font-bold">
                <ThumbsUp className="h-4 w-4" /> YES · ${t.yesDollars.toLocaleString()} ({t.yesPct}%)
              </span>
              <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
                NO · ${t.noDollars.toLocaleString()} ({t.noPct}%) <ThumbsDown className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 h-6 w-full rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex">
              <div className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 transition-all duration-700"
                   style={{ width: `${t.yesPct}%` }} />
              <div className="h-full bg-gradient-to-r from-rose-500 to-rose-600 transition-all duration-700"
                   style={{ width: `${t.noPct}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-slate-500">
              <span>{t.yesVotes} YES votes</span>
              <span className="text-slate-700 font-semibold">${t.totalDollars.toLocaleString()} total weight</span>
              <span>{t.noVotes} NO votes</span>
            </div>
          </div>

          {/* Vote forms */}
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <VoiceVoteForm slug={t.slug} side="yes" accent="cyan" />
            <VoiceVoteForm slug={t.slug} side="no" accent="rose" />
          </div>

          <p className="mt-6 text-xs text-slate-500 max-w-3xl leading-relaxed">
            <strong>Money-weighted public sentiment.</strong> Not a wager, not a prediction market.
            Money does not pay out to the winning side. A portion of every collection funds an
            East TX local non-profit each month; the rest funds the platform. All sales final.
            Texas-law governed.
          </p>
        </div>
      </section>

      <LightFooter />
    </div>
  );
}

function fmtCountdown(s: number): string {
  if (s <= 0) return "closed";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
