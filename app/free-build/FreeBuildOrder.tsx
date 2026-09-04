"use client";

// Free Website Program application. Paid add-ons are recorded as requests,
// then reviewed with the website fit and written scope. Payment happens through
// a separate approved checkout; this form never reserves a build or takes money.

import { useState } from "react";
import { ArrowRight, Check, Lock } from "lucide-react";
import {
  FREE_BUILD,
  FREE_BUILD_OPTIONS,
  formatUsd,
  type FreeBuildTier,
} from "@/lib/freeBuild";
import styles from "./free-build.module.css";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export default function FreeBuildOrder() {
  const options = FREE_BUILD_OPTIONS;
  const [tier, setTier] = useState<FreeBuildTier>(options[0]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const business = String(form.get("business_name") ?? "").trim();
    const doing = String(form.get("what_you_do") ?? "").trim();
    const topService = String(form.get("top_service") ?? "").trim();
    const timeline = String(form.get("timeline") ?? "").trim();
    const params = new URLSearchParams(window.location.search);

    // The homepage qualifier forwards its yes/no answers as q_* params so the
    // application saves them with the lead instead of losing them on the way.
    const qualifierLabels: Record<string, string> = {
      q_leads: "Getting enough leads",
      q_money: "Making enough money",
      q_social: "Social media doing its job",
      q_website: "Website doing its job",
    };
    const qualifierAnswers = Object.entries(qualifierLabels)
      .map(([key, label]) => {
        const value = params.get(key);
        return value === "yes" || value === "no" ? `${label}: ${value}` : null;
      })
      .filter((line): line is string => line !== null);

    // 1. Save the lead. Always. Before anything else can fail.
    let leadRes: Response;
    try {
      leadRes = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.get("full_name"),
          business_name: business || null,
          email,
          phone: phone || null,
          website_url: String(form.get("website_url") ?? "").trim() || null,
          interest: "free_website_program",
          goals: [
            `FREE WEBSITE APPLICATION: ${tier.name} (${formatUsd(tier.priceUsd)}).`,
            doing ? `What they do: ${doing}` : "",
            topService ? `Service they want more customers for: ${topService}` : "",
            timeline ? `Preferred timeline: ${timeline}` : "",
            qualifierAnswers.length ? `Qualifier answers: ${qualifierAnswers.join("; ")}.` : "",
          ]
            .filter(Boolean)
            .join(" "),
          best_contact_method: "phone",
          sms_consent: form.get("sms_consent") === "on" && Boolean(phone),
          marketing_email_consent: form.get("marketing_email_consent") === "on",
          utm_source: params.get("utm_source"),
          utm_medium: params.get("utm_medium"),
          utm_campaign: params.get("utm_campaign"),
          diagnostic: {
            version: 2,
            source: "free_build_funnel",
            offer: tier.id,
            tier_name: tier.name,
            price_usd: tier.priceUsd,
            pages: tier.pages,
            what_you_do: doing || null,
            top_service: topService || null,
            timeline: timeline || null,
            qualifier_answers: qualifierAnswers.length ? qualifierAnswers : null,
            next_action:
              tier.priceUsd === 0
                ? "Review Free Website Program fit, confirm the written five-page scope, and book the intake."
                : "Review fit, confirm the optional paid work product, and book the intake before sending checkout.",
          },
        }),
      });
    } catch {
      setError("Could not reach the form. Check your connection and try again.");
      setSending(false);
      return;
    }

    if (!leadRes.ok) {
      const body = await leadRes.json().catch(() => ({}));
      setError(
        typeof body?.error === "string"
          ? body.error
          : "That did not go through. Please try again.",
      );
      setSending(false);
      return;
    }

    // Measurement is optional. A tracking failure cannot undo a saved request.
    try {
      window.fbq?.("track", "Lead");
    } catch {
      // Keep the successful application state even if a third-party tag fails.
    }

    setSaved(
      tier.priceUsd === 0
        ? "Your application is saved for review. Ryan will call or email you within one business day to review fit, capacity, and the written five-page scope. No paid add-on is required."
        : `Your website application and ${formatUsd(tier.priceUsd)} add-on request are saved for review. Ryan will call or email you within one business day to confirm fit, capacity, and the written scope. If approved, you can accept the paid add-on through a separate secure checkout. This request does not charge you or reserve a build slot.`,
    );
    setSending(false);
  }

  if (saved) {
    return (
      <div className={styles.notice} id="order" role="status" aria-live="polite">
        <h3>Your free build request is in.</h3>
        <p>{saved}</p>
        <p className={styles.noticeSmall}>
          Ryan Nichols &middot; The LeadFlow Pro &middot; Longview, Texas
        </p>
      </div>
    );
  }

  return (
    <div className={styles.orderWrap} id="order">
      {/* ------------------------------------------------------- tier cards --- */}
      <div className={styles.tierGrid} role="radiogroup" aria-label="Pick your engine">
        {options.map((t) => {
          const active = t.id === tier.id;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTier(t)}
              className={`${styles.tierCard} ${active ? styles.tierCardOn : ""}`}
            >
              {t.tag && <span className={styles.tierTag}>{t.tag}</span>}
              <span className={styles.tierName}>{t.name}</span>
              <span className={styles.tierPrice}>
                {t.priceUsd === 0 ? "$0" : formatUsd(t.priceUsd)}
                <em>{t.priceUsd === 0 ? "no required add-on" : "one time"}</em>
              </span>
              <span className={styles.tierPages}>{t.pages}</span>
              <span className={styles.tierEngine}>{t.engine}</span>
              <ul className={styles.tierList}>
                {t.includes.map((line) => (
                  <li key={line}>
                    <Check aria-hidden="true" />
                    {line}
                  </li>
                ))}
              </ul>
              <span className={styles.tierPick}>{active ? "Selected" : "Pick this one"}</span>
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- form --- */}
      <form onSubmit={submit} className={styles.form} aria-busy={sending}>
        <div className={styles.formHead}>
          <h3>
            {tier.name} &middot; {formatUsd(tier.priceUsd)}
          </h3>
          <p>{tier.pages}. Choose an optional add-on for review, or apply for the website by itself. No payment is taken by this form.</p>
        </div>

        <div className={styles.formGrid}>
          <div>
            <label className="label" htmlFor="fb-name">
              Your name *
            </label>
            <input className="input" id="fb-name" name="full_name" required maxLength={200} />
          </div>
          <div>
            <label className="label" htmlFor="fb-business">
              Business name *
            </label>
            <input
              className="input"
              id="fb-business"
              name="business_name"
              required
              maxLength={200}
            />
          </div>
        </div>

        <div className={styles.formGrid}>
          <div>
            <label className="label" htmlFor="fb-email">
              Email *
            </label>
            <input
              className="input"
              id="fb-email"
              name="email"
              type="email"
              required
              maxLength={200}
            />
          </div>
          <div>
            <label className="label" htmlFor="fb-phone">
              Cell phone *
            </label>
            <input className="input" id="fb-phone" name="phone" type="tel" required maxLength={50} />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="fb-site">
            Current website or Facebook page
          </label>
          <input
            className="input"
            id="fb-site"
            name="website_url"
            maxLength={300}
            placeholder="Leave it blank if you do not have one yet"
          />
        </div>

        <div>
          <label className="label" htmlFor="fb-service">
            What service do you want more customers for? *
          </label>
          <input
            className="input"
            id="fb-service"
            name="top_service"
            required
            maxLength={300}
            placeholder="Commercial roofing, dental implants, fleet washing..."
          />
        </div>

        <div>
          <label className="label" htmlFor="fb-timeline">
            When do you want the website moving?
          </label>
          <select className="input" id="fb-timeline" name="timeline" defaultValue="">
            <option value="">Choose one</option>
            <option value="As soon as I qualify">As soon as I qualify</option>
            <option value="Within 30 days">Within 30 days</option>
            <option value="Within 90 days">Within 90 days</option>
            <option value="I am researching">I am researching</option>
          </select>
        </div>

        <div>
          <label className="label" htmlFor="fb-doing">
            What does your business do, in one sentence?
          </label>
          <input
            className="input"
            id="fb-doing"
            name="what_you_do"
            maxLength={300}
            placeholder="Residential HVAC in Gregg and Harrison County"
          />
        </div>

        <label className={styles.consentRow}>
          <input type="checkbox" name="sms_consent" />
          <span>
            You may call or text me about this application at the number above. Message and data
            rates may apply. Reply STOP any time.
          </span>
        </label>

        <label className={styles.consentRow}>
          <input type="checkbox" name="marketing_email_consent" />
          <span>
            Send me Ryan&rsquo;s daily practical business emails for up to 30 days.
            Optional, and one click unsubscribes at any time.
          </span>
        </label>

        <p className={styles.noticeSmall}>Application confirmation and replies about this request are separate from optional marketing emails.</p>

        {error && <p className={styles.formError} role="alert">{error}</p>}

        <button type="submit" disabled={sending} className="cb-btn cb-btn--primary">
          {sending
            ? "Sending..."
            : tier.priceUsd === 0
              ? "Apply for My Free Website | $0"
              : `Request Website + Add-On | ${formatUsd(tier.priceUsd)}`}
          <ArrowRight aria-hidden="true" />
        </button>

        <p className={styles.secureNote}>
          <Lock aria-hidden="true" />
          {tier.priceUsd === 0
            ? "No card is required for the free website application. The LeadFlow Pro never asks for a password to any of your accounts."
            : "This is an application and scope request. Any paid add-on is confirmed in writing before a separate Stripe checkout."}
        </p>
      </form>
    </div>
  );
}
