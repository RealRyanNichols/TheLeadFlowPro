import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock3,
  MessageSquareText,
  ShieldCheck,
  X,
} from "lucide-react";
import { LEAD_FOLLOW_UP, formatUsd } from "@/lib/leadFollowUp";
import LeadFollowUpFunnel from "./LeadFollowUpFunnel";
import styles from "./lead-follow-up.module.css";

// The $197 Lead Follow-Up Campaign. Front-end offer: it writes the follow-up
// for one offer in a business and hands it over. Everything it does not do is
// named on the page, because an offer this size earns trust by showing its
// edges before the buyer finds them.

export const metadata: Metadata = {
  title: "Lead Follow-Up Campaign | The LeadFlow Pro",
  description:
    "Your follow-up, written and ready to send. The five-minute first reply, a missed-call text-back, a five-message email sequence, and a review ask, written for one offer in your business. $197 one time.",
  alternates: { canonical: "https://www.theleadflowpro.com/go/lead-follow-up" },
  openGraph: {
    title: "Your follow-up, written and ready to send.",
    description:
      "The five-minute first reply, a missed-call text-back, a five-message email sequence, and a review ask, written for one offer in your business. $197 one time.",
    url: "https://www.theleadflowpro.com/go/lead-follow-up",
    siteName: "The LeadFlow Pro",
    type: "website",
  },
};

export default function LeadFollowUpPage() {
  const price = formatUsd(LEAD_FOLLOW_UP.priceUsd);

  return (
    <main className={`cb-page ${styles.page}`}>
      {/* -------------------------------------------------------------- hero --- */}
      <section className="cb-hero">
        <div className={`cb-shell ${styles.heroGrid}`}>
          <div>
            <p className="cb-eyebrow">Lead Follow-Up Campaign</p>
            <h1 className="cb-h1">
              Your follow-up,
              <em>written and ready to send.</em>
            </h1>
            <p className="cb-hero-lead">{LEAD_FOLLOW_UP.promise}</p>
            <ul className={styles.factList}>
              <li>
                <MessageSquareText aria-hidden="true" />
                <span>
                  Written for one offer in your business
                  <em>In your words, not a template with your name pasted in.</em>
                </span>
              </li>
              <li>
                <Clock3 aria-hidden="true" />
                <span>
                  {LEAD_FOLLOW_UP.turnaroundDays} business days
                  <em>Written by Ryan after your intake lands. One revision round included.</em>
                </span>
              </li>
              <li>
                <ShieldCheck aria-hidden="true" />
                <span>
                  {price} one time
                  <em>No subscription, no monthly seat, nothing recurring.</em>
                </span>
              </li>
            </ul>
            <div className="cb-actions">
              <a className="cb-btn cb-btn--primary" href="#order">
                Buy the Campaign | {price}
                <ArrowRight aria-hidden="true" />
              </a>
              <a className="cb-btn cb-btn--ghost" href="#included">
                See What You Get
              </a>
            </div>
          </div>

          <LeadFollowUpFunnel />
        </div>
      </section>

      {/* ---------------------------------------------------------- included --- */}
      <section id="included" className="cb-band" tabIndex={-1}>
        <div className="cb-shell">
          <p className="cb-eyebrow">What gets written</p>
          <h2 className="cb-h2">Five pieces, and the order to send them in.</h2>
          <div className={styles.cardGrid}>
            {LEAD_FOLLOW_UP.included.map((item) => (
              <div key={item.title} className={styles.miniCard}>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- steps --- */}
      <section className="cb-band cb-band--tint">
        <div className="cb-shell">
          <p className="cb-eyebrow">How it runs</p>
          <h2 className="cb-h2">Pay, tell me about the business, get it written.</h2>
          <div className={styles.steps}>
            {LEAD_FOLLOW_UP.steps.map((step) => (
              <div key={step.number} className={styles.step}>
                <span className={styles.stepNum}>{step.number}</span>
                <div>
                  <h3>{step.name}</h3>
                  <p>{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- honesty --- */}
      <section className="cb-band">
        <div className="cb-shell">
          <div className={styles.splitGrid}>
            <div className={styles.miniCard}>
              <h3>What this is</h3>
              <ul className={styles.checkList}>
                {LEAD_FOLLOW_UP.included.map((item) => (
                  <li key={item.title}>
                    <Check aria-hidden="true" />
                    {item.title}
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.miniCard}>
              <h3>What this is not</h3>
              <ul className={styles.crossList}>
                {LEAD_FOLLOW_UP.excluded.map((item) => (
                  <li key={item}>
                    <X aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- faq --- */}
      <section className="cb-band cb-band--tint">
        <div className="cb-shell">
          <p className="cb-eyebrow">Straight answers</p>
          <h2 className="cb-h2">Questions people ask first.</h2>
          <div className={styles.faq}>
            {LEAD_FOLLOW_UP.faq.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- cta --- */}
      <section className="cb-band cb-band--ink">
        <div className="cb-shell">
          <p className="cb-eyebrow">One offer, answered properly</p>
          <h2 className="cb-h2">Stop losing the leads you already paid for.</h2>
          <p className="cb-lead">
            {price} one time. Written for your business, handed to you, yours to keep and reuse.
          </p>
          <div className="cb-actions">
            <a className="cb-btn cb-btn--primary" href="#order">
              Buy the Campaign | {price}
              <ArrowRight aria-hidden="true" />
            </a>
            <Link className="cb-btn cb-btn--ghost" href="/book">
              Ask a Question First
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
