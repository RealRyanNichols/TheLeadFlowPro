import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CircleCheckBig } from "lucide-react";
import { LEAD_FOLLOW_UP } from "@/lib/leadFollowUp";
import IntakeForm from "./IntakeForm";
import styles from "../lead-follow-up.module.css";

// Where a paid Lead Follow-Up Campaign buyer lands. The writing does not
// start until this form comes back, which is exactly what the sales page
// promises. The Stripe session id rides along so the intake can be matched to
// the payment in the CRM.

export const metadata: Metadata = {
  title: "Your Campaign Intake | The LeadFlow Pro",
  robots: { index: false, follow: false },
};

export default async function LeadFollowUpIntakePage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;

  return (
    <main className={`cb-page ${styles.page}`}>
      <section className="cb-hero">
        <div className="cb-shell">
          <p className="cb-eyebrow">
            <CircleCheckBig aria-hidden="true" style={{ width: 16, verticalAlign: "-2px" }} /> Payment
            received
          </p>
          <h1 className="cb-h1">
            You are paid up.
            <em>Now tell me about the business.</em>
          </h1>
          <p className="cb-hero-lead">
            Nothing gets written until this form comes back, so the campaign is built on your actual
            business instead of a template. It takes about three minutes. Ryan writes it within{" "}
            {LEAD_FOLLOW_UP.turnaroundDays} business days of receiving it.
          </p>
        </div>
      </section>

      <section className="cb-band">
        <div className="cb-shell">
          <IntakeForm sessionId={typeof sessionId === "string" ? sessionId.slice(0, 200) : null} />
        </div>
      </section>

      <section className="cb-band cb-band--tint">
        <div className="cb-shell">
          <p className="cb-eyebrow">While you wait</p>
          <h2 className="cb-h2">The free tools stay free.</h2>
          <p className="cb-lead">
            Run your real numbers through the calculators. They are the same ones that inform what
            gets written for you.
          </p>
          <div className="cb-actions">
            <Link className="cb-btn cb-btn--ghost" href="/tools">
              Open the Tool Library
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
