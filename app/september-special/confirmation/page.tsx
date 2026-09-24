import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { paidSpecialReservation } from "@/lib/septemberSpecial";
import { recordSpecialSession } from "@/lib/septemberSpecialServer";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe";
import { BUSINESS } from "@/lib/site/business";
import styles from "../special.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your next step | The LeadFlow Pro",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function SpecialConfirmation({ searchParams }: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  let paid = false;
  if (sessionId && /^cs_[a-zA-Z0-9_]{10,240}$/.test(sessionId)) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      paid = !!paidSpecialReservation(session);
      if (paid) {
        try { await recordSpecialSession(createServiceClient(), session); } catch { /* The signed webhook also records payment and retries independently. */ }
      }
    } catch { /* No identity or provider error details are exposed. */ }
  }
  return (
    <main className={styles.page}>
      <section className={styles.closed}>
        <span className={styles.kicker}>{paid ? "Stripe payment confirmed" : "Payment not yet verified"}</span>
        <h1>{paid ? "You are in. Let’s get to work." : "Let’s check your payment first."}</h1>
        <p>{paid
          ? "Your one-time payment is confirmed. Your receipt is your record. Ryan will coordinate your kickoff, account access, content and commercial shoot with you. Your service month starts on the agreed kickoff date."
          : "We could not verify a completed payment from this link. If you already paid, check your Stripe receipt or contact Ryan before paying again. Opening this page does not charge you."}</p>
        {paid && <Link className={styles.primary} href="/connect">Connect your business accounts <ArrowRight size={18} /></Link>}
        <a className={styles.contact} href={BUSINESS.phone.tel}>Call Ryan: {BUSINESS.phone.display}</a>
        <a className={styles.contact} href={`mailto:${BUSINESS.email.hello}`}>{BUSINESS.email.hello}</a>
      </section>
    </main>
  );
}
