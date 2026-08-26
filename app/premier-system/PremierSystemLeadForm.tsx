"use client";

// The lead form on /premier-system.
//
// WHY IT EXISTS: /go 308-redirects to this page with the UTMs intact, so this
// is where paid traffic lands. Until now the only thing on it that took an
// action was a raw Stripe Payment Link. A stranger who arrived from an ad and
// was interested but not ready to hand over $500 had nowhere to go: no form,
// no way to ask a question, nothing to leave behind. They left and we never
// knew they were here.
//
// It asks for the least it can. Name and email are required because a lead
// with neither is not a lead. Everything else is optional, including both
// consent boxes, which start unticked the same way every other form on the
// site does.
//
// UTMs are read off the current URL and passed through, so a lead that came
// from an ad is attributable back to the ad rather than showing up as
// unsourced website traffic.

import { useState } from "react";
import { AlertCircle, Check } from "lucide-react";
import styles from "./premier-system.module.css";

export default function PremierSystemLeadForm() {
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError(null);

    const fd = new FormData(event.currentTarget);
    const params =
      typeof window === "undefined" ? null : new URLSearchParams(window.location.search);

    const payload = {
      full_name: fd.get("full_name"),
      email: fd.get("email"),
      phone: fd.get("phone") || null,
      business_name: fd.get("business_name") || null,
      website_url: fd.get("website_url") || null,
      goals: fd.get("goals") || null,
      interest: "launch_system",
      marketing_email_consent: fd.get("marketing_email_consent") === "on",
      sms_consent: fd.get("sms_consent") === "on",
      utm_source: params?.get("utm_source") ?? null,
      utm_medium: params?.get("utm_medium") ?? null,
      utm_campaign: params?.get("utm_campaign") ?? null,
      diagnostic: { source: "premier_system_page", from: "premier-system" },
    };

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong. Try again.");
        setSending(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong. Try again.");
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className={styles.leadDone} role="status">
        <p>
          <Check aria-hidden="true" />
          Got it. That came straight to me.
        </p>
        <p>
          I read these myself and I reach out within one business day, usually a text first
          from (903) 500-8898. Save that number, it is my direct line. Nothing on this page
          is locked behind the form, so keep reading if you want the full scope.
        </p>
      </div>
    );
  }

  return (
    <form className={styles.leadForm} onSubmit={onSubmit}>
      <div className={styles.leadFields}>
        <div>
          <label htmlFor="premier-name">Your name *</label>
          <input id="premier-name" name="full_name" required maxLength={200} autoComplete="name" />
        </div>
        <div>
          <label htmlFor="premier-email">Email *</label>
          <input
            id="premier-email"
            name="email"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor="premier-business">Business name</label>
          <input
            id="premier-business"
            name="business_name"
            maxLength={200}
            autoComplete="organization"
          />
        </div>
        <div>
          <label htmlFor="premier-phone">Phone</label>
          <input id="premier-phone" name="phone" type="tel" maxLength={50} autoComplete="tel" />
        </div>
        <div className={styles.leadWide}>
          <label htmlFor="premier-website">Current website, if you have one</label>
          <input
            id="premier-website"
            name="website_url"
            maxLength={300}
            autoComplete="url"
            placeholder="yourbusiness.com"
          />
        </div>
        <div className={styles.leadWide}>
          <label htmlFor="premier-goals">
            What do you want the site to do that yours is not doing now?
          </label>
          <textarea id="premier-goals" name="goals" rows={3} maxLength={2000} />
        </div>
      </div>

      <div className={styles.leadConsents}>
        <label>
          <input type="checkbox" name="marketing_email_consent" />
          <span>Email me occasional tips and new tools. Unsubscribe any time.</span>
        </label>
        <label>
          <input type="checkbox" name="sms_consent" />
          <span>You can text me at the number above. Reply STOP to end it.</span>
        </label>
      </div>

      {error ? (
        <p className={styles.leadError}>
          <AlertCircle aria-hidden="true" />
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={sending}>
        {sending ? "Sending..." : "Send It To Ryan"}
      </button>
      <small>
        No spam, no list swapping, no call center. One person reads these. Sending this does
        not commit you to anything and it does not charge you.
      </small>
    </form>
  );
}
