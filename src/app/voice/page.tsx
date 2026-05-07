// src/app/voice/page.tsx — East TX Voice landing.
//
// Money-weighted YES/NO sentiment voting on East Texas topics. Submit a
// new topic free; pay $1+ to weight YES or NO with cash. Public live
// tallies + weekly closes. Money goes to platform + monthly local-charity
// donation; never to winning side.

import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Megaphone, ThumbsDown, ThumbsUp } from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { getActiveTopics } from "@/lib/voice";
import { TopicSubmitForm } from "@/components/voice/TopicSubmitForm";

export const dynamic = "force-dynamic";
export const revalidate = 30;

export const metadata: Metadata = {
  title: "East TX Voice — Money-Weighted YES/NO Voting · The LeadFlow Pro",
  description:
    "Vote with your money on East Texas issues. $1 = 1 weight unit on YES or NO. Pure sentiment market — no wagers, no payouts. A portion funds a local non-profit each month.",
};

export default async function VoiceLandingPage() {
  let topics: Awaited<ReturnType<typeof getActiveTopics>> = [];
  try { topics = await getActiveTopics(); } catch {}

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LightHeader />

      <section className="relative overflow-hidden">
        <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(135deg, #fff8f1 0%, #f6f9ff 38%, #eef9ff 70%, #f3eaff 100%)" }} />
        <div aria-hidden className="absolute -top-32 -right-32 h-[520px] w-[520px] rounded-full opacity-50 blur-3xl"
             style={{ background: "radial-gradient(circle, rgba(35,184,255,0.55) 0%, transparent 65%)" }} />
        <div aria-hidden className="absolute -bottom-40 -left-32 h-[560px] w-[560px] rounded-full opacity-50 blur-3xl"
             style={{ background: "radial-gradient(circle, rgba(255,154,31,0.45) 0%, transparent 65%)" }} />

        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/70 backdrop-blur px-3 py-1 text-xs uppercase tracking-widest text-cyan-700 font-semibold shadow-sm">
              <Megaphone className="h-3.5 w-3.5" /> East Texas only · sentiment market
            </div>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-slate-950 leading-[1.05]">
              East TX Voice.{" "}
              <span className="bg-gradient-to-r from-brand-700 via-cyan-500 to-accent-500 bg-clip-text text-transparent">
                Vote with your money. YES or NO.
              </span>
            </h1>
            <p className="mt-5 text-lg sm:text-xl text-slate-700 max-w-3xl mx-auto leading-relaxed">
              Hail this week? New Buc-ee&rsquo;s in Tyler? Will the donkey get out in Harleton again?
              Tell East Texas what you actually think — with cash. $1 = 1 weight unit.
              <strong> Whichever side has the most money wins the week.</strong>
            </p>
            <div className="mt-3 text-xs text-slate-500 max-w-2xl mx-auto">
              Sentiment market — not a wager, not a prediction market. Money does not pay out to
              winners. A portion funds a local East TX non-profit every month.
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-slate-200">
        <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, #f3eaff 0%, #fff8f1 100%)" }} />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:py-14">
          <div className="text-xs uppercase tracking-widest text-cyan-700 font-bold mb-3">
            Open topics · {topics.length} this week
          </div>

          {topics.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
              No topics open right now. Submit the first one below.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {topics.map((t) => (
                <Link key={t.slug} href={`/voice/${t.slug}`}
                  className="block rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-5 hover:border-cyan-400 hover:shadow-md transition-all">
                  <div className="text-base font-bold text-slate-950 leading-tight line-clamp-2">{t.question}</div>
                  {(t.city || t.category) && (
                    <div className="mt-1 text-xs text-slate-500">
                      {t.city || "East TX"}{t.category ? ` · ${t.category}` : ""}
                    </div>
                  )}
                  <div className="mt-3 flex items-baseline justify-between text-xs">
                    <span className="inline-flex items-center gap-1 text-cyan-700 font-bold">
                      <ThumbsUp className="h-3 w-3" /> ${t.yesDollars.toLocaleString()} ({t.yesPct}%)
                    </span>
                    <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
                      ${t.noDollars.toLocaleString()} ({t.noPct}%) <ThumbsDown className="h-3 w-3" />
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex">
                    <div className="h-full bg-cyan-500" style={{ width: `${t.yesPct}%` }} />
                    <div className="h-full bg-rose-500" style={{ width: `${t.noPct}%` }} />
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-10 max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-slate-950">Got a topic?</h2>
            <p className="mt-1 text-sm text-slate-600">Submit it free. Topic stays open for 7 days.</p>
            <TopicSubmitForm />
          </div>
        </div>
      </section>

      <LightFooter />
    </div>
  );
}
