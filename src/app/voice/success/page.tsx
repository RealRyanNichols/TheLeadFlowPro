// src/app/voice/success/page.tsx — verifies + applies the voice vote.

import Link from "next/link";
import { ArrowRight, ThumbsDown, ThumbsUp } from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { searchParams: { session_id?: string } };

async function process(sessionId: string) {
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") return { ok: false as const, reason: "Payment not completed." };
  if (session.metadata?.type !== "voice_vote") return { ok: false as const, reason: "Wrong checkout type." };

  const topicId   = session.metadata?.topicId || "";
  const topicSlug = session.metadata?.topicSlug || "";
  const side      = (session.metadata?.side === "no" ? "no" : "yes") as "yes" | "no";
  const dollars   = Number(session.metadata?.dollars || 0);
  const displayName = session.metadata?.displayName || null;
  const city      = session.metadata?.city || null;
  const email     = session.customer_email || session.customer_details?.email || null;

  if (!topicId || !topicSlug || !dollars) return { ok: false as const, reason: "Bad metadata." };

  // Idempotent
  const already = await prisma.voiceVote.findUnique({ where: { stripeSessionId: session.id } });
  if (!already) {
    await prisma.voiceVote.create({
      data: {
        topicId,
        topicSlug,
        side,
        amountDollars: dollars,
        displayName: displayName || null,
        city: city || null,
        buyerEmail: email,
        stripeSessionId: session.id,
      },
    });
    await prisma.voiceTopic.update({
      where: { id: topicId },
      data: side === "yes"
        ? { yesDollars: { increment: dollars }, yesVotes: { increment: 1 } }
        : { noDollars: { increment: dollars }, noVotes: { increment: 1 } },
    });
  }

  const topic = await prisma.voiceTopic.findUnique({ where: { id: topicId } });
  return { ok: true as const, topic, side, dollars };
}

export default async function VoiceSuccessPage({ searchParams }: Props) {
  const sessionId = searchParams.session_id;
  let r: Awaited<ReturnType<typeof process>> | { ok: false; reason: string } | null = null;
  if (!sessionId) r = { ok: false, reason: "Missing session id." };
  else {
    try { r = await process(sessionId); }
    catch (err) { r = { ok: false, reason: err instanceof Error ? err.message : "Verification failed." }; }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LightHeader />
      <section className="relative overflow-hidden">
        <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(135deg, #fff8f1 0%, #f6f9ff 38%, #eef9ff 70%, #f3eaff 100%)" }} />
        <div className="relative mx-auto max-w-2xl px-4 py-16 text-center">
          {r?.ok && r.topic ? (
            <>
              <div className={`inline-flex items-center gap-2 rounded-full border ${r.side === "yes" ? "border-cyan-300 bg-cyan-50/80" : "border-rose-300 bg-rose-50"} px-3 py-1 text-xs uppercase tracking-widest font-semibold shadow-sm`}>
                {r.side === "yes" ? <ThumbsUp className="h-3.5 w-3.5 text-cyan-700" /> : <ThumbsDown className="h-3.5 w-3.5 text-rose-700" />}
                Voice cast: <span className={r.side === "yes" ? "text-cyan-800" : "text-rose-800"}>{r.side.toUpperCase()}</span>
              </div>
              <h1 className="mt-5 text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
                +${r.dollars} weight on {r.side.toUpperCase()}
              </h1>
              <p className="mt-3 text-slate-700 text-lg leading-relaxed">
                &ldquo;{r.topic.question}&rdquo;
              </p>
              <Link href={`/voice/${r.topic.slug}`}
                className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800">
                See the live tally <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-slate-950">Hmm.</h1>
              <p className="mt-3 text-slate-700">{r?.reason || "Couldn't verify the vote."}</p>
              <Link href="/voice"
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-800">
                Back to East TX Voice <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
      </section>
      <LightFooter />
    </div>
  );
}
