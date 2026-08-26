"use client";

// The $197 Lead Follow-Up Campaign order form.
//
// Same contract as the Time Back funnel: the lead is saved BEFORE Stripe
// opens, so a customer who bails at the card screen is still a lead Ryan can
// answer. The price is never sent from here; /api/checkout reads it from
// lib/leadFollowUp.ts. This form posts no price field at all.

import { useState } from "react";
import { ArrowRight, Lock } from "lucide-react";
import { LEAD_FOLLOW_UP, formatUsd } from "@/lib/leadFollowUp";
import styles from "./lead-follow-up.module.css";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export default function LeadFollowUpFunnel() {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payNotice, setPayNotice] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError(null);
    setPayNotice(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const offer = String(form.get("offer") ?? "").trim();
    const params = new URLSearchParams(window.location.search);

    // 1. Save the lead first. A card that never gets entered still leaves
    //    Ryan someone to call.
    let saved: Response;
    try {
      saved = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.get("full_name"),
          business_name: form.get("business_name"),
          email,
          phone: phone || null,
          interest: "done_for_you",
          goals: [
            "LEAD FOLLOW-UP CAMPAIGN ORDER ($197).",
            offer ? `Offer this is for: ${offer}` : "",
          ]
            .filter(Boolean)
            .join(" "),
          best_contact_method: "email",
          sms_consent: false,
          marketing_email_consent: form.get("marketing_email_consent") === "on",
          utm_source: params.get("utm_source"),
          utm_medium: params.get("utm_medium"),
          utm_campaign: params.get("utm_campaign"),
          diagnostic: {
            version: 1,
            source: "lead_follow_up_funnel",
            offer: LEAD_FOLLOW_UP.id,
            price_usd: LEAD_FOLLOW_UP.priceUsd,
            target_offer: offer || null,
            next_action:
              "Lead Follow-Up Campaign order. Confirm payment in Stripe, then send the writing intake.",
          },
        }),
      });
    } catch {
      setError("Could not reach the order intake. Check your connection and try again.");
      setSending(false);
      return;
    }
    if (!saved.ok) {
      setError(
        (await saved.json().catch(() => ({}) as { error?: string })).error ??
          "The order did not go through. Please try again.",
      );
      setSending(false);
      return;
    }

    window.fbq?.("track", "Lead");
    window.fbq?.("track", "InitiateCheckout", {
      value: LEAD_FOLLOW_UP.priceUsd,
      currency: "USD",
    });

    // 2. Open Stripe. The amount comes from the server, not from this form.
    try {
      const checkout = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: LEAD_FOLLOW_UP.id, email }),
      });
      if (checkout.ok) {
        const body = await checkout.json();
        if (body.url) {
          window.location.href = body.url;
          return;
        }
      }
      setPayNotice(
        `Card checkout could not start, but your order is saved. Ryan will send a secure payment link for ${formatUsd(
          LEAD_FOLLOW_UP.priceUsd,
        )} shortly.`,
      );
    } catch {
      setPayNotice(
        `Card checkout could not start, but your order is saved. Ryan will send a secure payment link for ${formatUsd(
          LEAD_FOLLOW_UP.priceUsd,
        )} shortly.`,
      );
    } finally {
      setSending(false);
    }
  }

  if (payNotice) {
    return (
      <div className={styles.orderPanel} id="order">
        <div className={styles.notice}>
          <h3>Your order is saved.</h3>
          <p>{payNotice}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.orderPanel} id="order">
      <div className={styles.priceRow}>
        <span className={styles.price}>{formatUsd(LEAD_FOLLOW_UP.priceUsd)}</span>
        <span className={styles.priceUnit}>one time</span>
      </div>
      <p className={styles.priceNote}>
        No subscription and no monthly seat. Written within {LEAD_FOLLOW_UP.turnaroundDays} business
        days of your intake.
      </p>

      <form onSubmit={submit} className={styles.form}>
        <div className={styles.formGrid}>
          <div>
            <label className="label" htmlFor="lfu-name">
              Your name *
            </label>
            <input className="input" id="lfu-name" name="full_name" required maxLength={200} />
          </div>
          <div>
            <label className="label" htmlFor="lfu-email">
              Email *
            </label>
            <input
              className="input"
              id="lfu-email"
              name="email"
              type="email"
              required
              maxLength={200}
            />
          </div>
        </div>
        <div className={styles.formGrid}>
          <div>
            <label className="label" htmlFor="lfu-business">
              Business
            </label>
            <input className="input" id="lfu-business" name="business_name" maxLength={200} />
          </div>
          <div>
            <label className="label" htmlFor="lfu-phone">
              Phone
            </label>
            <input className="input" id="lfu-phone" name="phone" type="tel" maxLength={50} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="lfu-offer">
            What is the one offer this follow-up is for?
          </label>
          <input
            className="input"
            id="lfu-offer"
            name="offer"
            maxLength={200}
            placeholder="AC tune-up, new patient exam, roof inspection..."
          />
        </div>

        <label className={styles.consentRow}>
          <input type="checkbox" name="marketing_email_consent" />
          <span>
            Send me business emails from Ryan. Optional, and one click unsubscribes at any time.
          </span>
        </label>

        {error && <p className={styles.formError}>{error}</p>}

        <button type="submit" disabled={sending} className="cb-btn cb-btn--primary">
          {sending ? "Opening checkout..." : `Buy the Campaign | ${formatUsd(LEAD_FOLLOW_UP.priceUsd)}`}
          <ArrowRight aria-hidden="true" />
        </button>

        <p className={styles.secureNote}>
          <Lock aria-hidden="true" />
          Payment is processed by Stripe. The LeadFlow Pro never sees or stores your card number.
        </p>
      </form>
    </div>
  );
}
