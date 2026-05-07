// src/app/leaderboard/boost-success/page.tsx — verifies + persists boost.

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { searchParams: { session_id?: string } };

async function processBoost(sessionId: string) {
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") return { ok: false as const, reason: "Payment not completed." };
  if (session.metadata?.type !== "leaderboard_boost") return { ok: false as const, reason: "Wrong checkout type." };

  const publicName  = session.metadata?.publicName || "";
  const city        = session.metadata?.city || null;
  const message     = session.metadata?.message || "";
  const imageUrl    = session.metadata?.imageUrl || null;
  const websiteUrl  = session.metadata?.websiteUrl || null;
  const dollars     = Number(session.metadata?.dollars || 0);
  const hours       = Number(session.metadata?.hours || 1);

  if (!publicName || !message || !dollars) return { ok: false as const, reason: "Bad metadata." };

  const already = await prisma.boostMessage.findUnique({ where: { stripeSessionId: session.id } });
  if (!already) {
    await prisma.boostMessage.create({
      data: {
        publicName,
        city,
        message,
        imageUrl,
        websiteUrl,
        amountDollars: dollars,
        expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000),
        stripeSessionId: session.id,
      },
    });
  }

  return { ok: true as const, publicName, message, dollars, hours };
}

export default async function BoostSuccessPage({ searchParams }: Props) {
  const sessionId = searchParams.session_id;
  let r: Awaited<ReturnType<typeof processBoost>> | { ok: false; reason: string } | null = null;

  if (!sessionId) r = { ok: false, reason: "Missing session id." };
  else {
    try { r = await processBoost(sessionId); }
    catch (err) { r = { ok: false, reason: err instanceof Error ? err.message : "Verification failed." }; }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LightHeader />
      <section className="relative overflow-hidden">
        <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(135deg, #fff8f1 0%, #f6f9ff 38%, #eef9ff 70%, #f3eaff 100%)" }} />
        <div className="relative mx-auto max-w-2xl px-4 py-20 text-center">
          {r?.ok ? (
            <>
              <div className="inline-flex items-center gap-2 rounded-full border border-accent-300 bg-accent-300/15 px-3 py-1 text-xs uppercase tracking-widest text-accent-700 font-semibold shadow-sm">
                <Sparkles className="h-3.5 w-3.5" /> Boost is live
              </div>
              <h1 className="mt-5 text-4xl sm:text-5xl font-bold tracking-tight text-slate-950">
                <span className="bg-gradient-to-r from-brand-700 via-cyan-500 to-accent-500 bg-clip-text text-transparent">
                  {r.publicName}
                </span>{" "}
                — boosted
              </h1>
              <p className="mt-3 text-slate-700">
                &ldquo;{r.message}&rdquo; is scrolling in the ticker for the next {r.hours} hour{r.hours === 1 ? "" : "s"}.
              </p>
              <Link href="/leaderboard"
                className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800">
                See the live board <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-slate-950">Hmm.</h1>
              <p className="mt-3 text-slate-700">{r?.reason || "Couldn't verify the checkout."}</p>
              <Link href="/leaderboard"
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-800">
                Back to the leaderboard <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
      </section>
      <LightFooter />
    </div>
  );
}
