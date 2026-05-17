import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { CheckoutSmsNotice } from "@/components/checkout/CheckoutSmsNotice";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { sendCheckoutSmsOnce, type CheckoutSmsResult } from "@/lib/checkout-sms";
import { OFFERS, type OfferSlug } from "@/lib/offers";
import { parseSmsOptOut } from "@/lib/phone";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

type Props = { searchParams: { session_id?: string } };

async function safeSms(input: {
  stripeSessionId: string;
  message: string;
  toPhone: string | null | undefined;
  smsOptOut: boolean;
}): Promise<CheckoutSmsResult> {
  try {
    return await sendCheckoutSmsOnce({
      stripeSessionId: input.stripeSessionId,
      template: "OfferPurchase",
      message: input.message,
      toPhone: input.toPhone,
      smsOptOut: input.smsOptOut,
    });
  } catch (err) {
    return {
      status: input.smsOptOut ? "skipped_opt_out" : "failed",
      message: input.message,
      toPhone: input.toPhone || null,
      error: err instanceof Error ? err.message : "SMS fallback active",
    };
  }
}

async function processOfferCheckout(sessionId: string) {
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") {
    return { ok: false as const, reason: "Payment not completed yet." };
  }
  if (session.metadata?.type !== "offer_purchase") {
    return { ok: false as const, reason: "Wrong checkout type." };
  }

  const offerSlug = (session.metadata.offerSlug || "") as OfferSlug;
  const offer = OFFERS[offerSlug] || null;
  const offerName =
    session.metadata.offerName ||
    offer?.metaTitle.replace(/\s*·\s*The LeadFlow Pro$/, "") ||
    "LeadFlow Pro offer";
  const phone = session.metadata.buyerPhone || null;
  const smsOptOut = parseSmsOptOut(session.metadata.smsOptOut);
  const message = `🤝 Got your ${offerName} order. I'll text you within 24h with the kickoff. — Ryan`;
  const sms = await safeSms({
    stripeSessionId: session.id,
    message,
    toPhone: phone,
    smsOptOut,
  });

  return {
    ok: true as const,
    offerSlug,
    offerName,
    customerEmail: session.customer_email || session.customer_details?.email || null,
    sms,
  };
}

export default async function OfferSuccessPage({ searchParams }: Props) {
  const sessionId = searchParams.session_id;
  let result:
    | Awaited<ReturnType<typeof processOfferCheckout>>
    | { ok: false; reason: string }
    | null = null;

  if (!sessionId) {
    result = { ok: false, reason: "Missing session id." };
  } else {
    try {
      result = await processOfferCheckout(sessionId);
    } catch (err) {
      result = { ok: false, reason: err instanceof Error ? err.message : "Verification failed." };
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LightHeader />
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, #fff8f1 0%, #f6f9ff 38%, #eef9ff 70%, #f3eaff 100%)",
          }}
        />
        <div className="relative mx-auto max-w-2xl px-4 py-16 text-center">
          {result?.ok ? (
            <>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-widest text-cyan-800 shadow-sm">
                <CheckCircle2 className="h-3.5 w-3.5" /> Order received
              </div>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                {result.offerName} is in.
              </h1>
              <p className="mt-3 text-lg leading-relaxed text-slate-700">
                Stripe handles the legal payment record. Ryan handles the working kickoff.
              </p>
              <CheckoutSmsNotice sms={result.sms} />
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/book?source=offer-success"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800"
                >
                  Book the kickoff call <ArrowRight className="h-4 w-4" />
                </Link>
                {result.offerSlug ? (
                  <Link
                    href={`/offers/${result.offerSlug}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 hover:border-cyan-400 hover:text-cyan-800"
                  >
                    Back to offer
                  </Link>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-slate-950">Hmm.</h1>
              <p className="mt-3 text-slate-700">{result?.reason || "Could not verify the checkout."}</p>
              <Link
                href="/offers/quick-look"
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-800"
              >
                Back to offers <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
      </section>
      <LightFooter />
    </div>
  );
}
