"use client";

import { useState } from "react";
import { ArrowRight, CircleCheckBig } from "lucide-react";
import { track } from "@/lib/analytics/client";
import { BUSINESS } from "@/lib/site/business";
import { CONSULTATION } from "@/lib/site/consultation";

// The homepage's one ask. Posts to the same /api/leads route as the book and
// agency forms, so a consultation request lands in the leads pipeline with
// the owner alert, the welcome email, and the SMS ping already wired. The
// meeting preference rides in the diagnostic payload; the admin lead
// workspace shows it, and the welcome email names the phone number Ryan
// will call from.

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export default function ConsultationForm({ placement = CONSULTATION.placement }: { placement?: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  function onStart() {
    if (started) return;
    setStarted(true);
    track("form_start", { label: CONSULTATION.funnel });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("full_name") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const smsConsent = form.get("sms_consent") === "on";
    const meeting = String(form.get("meeting") ?? "");
    const contact = String(form.get("best_contact_method") ?? "");
    const params = new URLSearchParams(window.location.search);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          business_name: String(form.get("business_name") ?? "").trim(),
          email: String(form.get("email") ?? "").trim(),
          phone,
          website_url: String(form.get("website_url") ?? "").trim() || null,
          goals: String(form.get("goals") ?? "").trim(),
          interest: CONSULTATION.interest,
          best_contact_method: contact || null,
          sms_consent: smsConsent && Boolean(phone),
          utm_source: params.get("utm_source"),
          utm_medium: params.get("utm_medium") ?? placement,
          utm_campaign: params.get("utm_campaign") ?? CONSULTATION.funnel,
          diagnostic: {
            source: CONSULTATION.funnel,
            placement,
            meeting,
            minutes: CONSULTATION.minutes,
          },
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(
          typeof data?.error === "string"
            ? data.error
            : "That did not go through. Check the fields and try again.",
        );
        return;
      }
      track("form_submit", { label: CONSULTATION.funnel });
      try {
        window.fbq?.("track", "Lead");
      } catch {
        // Optional pixel must never change the saved-lead result.
      }
      setDone(fullName.split(" ")[0] || "there");
    } catch {
      setError("Could not reach the form. Your answers are still here. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="lf-consult-done" role="status" aria-live="polite">
        <CircleCheckBig aria-hidden="true" />
        <strong>Got it, {done}.</strong>
        <p>
          Ryan will call or text you within one business day to set the time and the place. Save
          this number, it is his direct line.
        </p>
        <a href={BUSINESS.phone.tel}>Call or text {BUSINESS.phone.display} now</a>
      </div>
    );
  }

  return (
    <form className="lf-consult-form" onSubmit={onSubmit} onFocus={onStart} aria-busy={busy}>
      <div className="lf-consult-row">
        <label className="lf-field">
          <span>Your name *</span>
          <input name="full_name" autoComplete="name" required maxLength={200} />
        </label>
        <label className="lf-field">
          <span>Business name *</span>
          <input name="business_name" autoComplete="organization" required maxLength={200} />
        </label>
      </div>
      <div className="lf-consult-row">
        <label className="lf-field">
          <span>Cell phone *</span>
          <input name="phone" type="tel" autoComplete="tel" inputMode="tel" required maxLength={50} />
        </label>
        <label className="lf-field">
          <span>Email *</span>
          <input name="email" type="email" autoComplete="email" inputMode="email" required maxLength={200} />
        </label>
      </div>
      <label className="lf-field">
        <span>Website or Facebook page (if you have one)</span>
        <input name="website_url" type="text" inputMode="url" autoComplete="url" maxLength={300} placeholder="yourbusiness.com or facebook.com/yourbusiness" />
      </label>
      <label className="lf-field">
        <span>What is getting in the way? *</span>
        <textarea
          name="goals"
          rows={3}
          required
          maxLength={2000}
          placeholder="Not enough calls. Leads nobody follows up on. A website that does nothing. Say it plain."
        />
      </label>

      <fieldset className="lf-consult-fieldset">
        <legend>Where do you want the thirty minutes?</legend>
        <div className="lf-consult-options">
          {CONSULTATION.meetings.map((option, index) => (
            <label className="lf-consult-option" key={option.id}>
              <input type="radio" name="meeting" value={option.id} defaultChecked={index === 0} />
              <span>
                <strong>{option.label}</strong>
                <small>{option.detail}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="lf-consult-fieldset">
        <legend>Best way to reach you</legend>
        <div className="lf-consult-segment">
          {CONSULTATION.contactMethods.map((method, index) => (
            <label key={method.id}>
              <input
                type="radio"
                name="best_contact_method"
                value={method.id}
                defaultChecked={index === 0}
              />
              {method.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="lf-consult-consent">
        <input type="checkbox" name="sms_consent" />
        <span>
          You may call or text me about this consultation at the number above. Message and data
          rates may apply. Reply STOP any time.
        </span>
      </label>

      {error ? (
        <p className="lf-consult-error" role="alert">
          {error}
        </p>
      ) : null}

      <button
        className="lf-consult-submit"
        type="submit"
        disabled={busy}
        data-cta="consultation_request"
        data-cta-placement={placement}
      >
        {busy ? "Sending..." : "Book my free consultation"} <ArrowRight size={21} aria-hidden="true" />
      </button>
      <p className="lf-consult-note">
        No spam. No list-selling. Ryan reads every one of these himself.
      </p>
    </form>
  );
}
