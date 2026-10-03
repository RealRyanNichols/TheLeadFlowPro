"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, CircleCheckBig } from "lucide-react";
import { BUSINESS } from "@/lib/site/business";
import {
  CONSULTATION,
  type ConsultationContact,
  type ConsultationMeeting,
} from "@/lib/site/consultation";
import { CALL_LABEL, TEXT_LABEL, smsHref } from "@/lib/site/textLinks";
import { SmsConsentText } from "@/components/site/SmsConsentText";
import {
  consultationReplyMethod,
  validateConversationForm,
  type InquiryErrors,
} from "@/lib/site/inquiryValidation";
import styles from "./consultation-form.module.css";
import { campaignTags, storedCampaignTags } from "@/lib/site/campaignTags";
import { useFormReady } from "./useFormReady";

// The homepage's one ask. Posts to the same /api/leads route as the book and
// agency forms, so a consultation request lands in the leads pipeline with
// the owner alert, the welcome email, and the SMS ping already wired.
//
// The meeting choice and the contact preference are written into the top of
// the goals field, so they read in the owner alert, the admin lead table, and
// the sales pipeline without a schema change; the diagnostic payload carries
// them as fields too. Analytics: the global tracker in lib/analytics/client.ts
// already records form_start and form_submit for every form, labelled by the
// data-analytics attribute, so this component records nothing by hand.

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const REACH = {
  text: "text you",
  call: "call you",
  email: "email you",
} as const satisfies Record<ConsultationContact, string>;

function meetingLabel(id: string): string {
  return CONSULTATION.meetings.find((m) => m.id === id)?.label ?? id;
}

function contactLabel(id: string): string {
  return CONSULTATION.contactMethods.find((m) => m.id === id)?.label ?? id;
}

export default function ConsultationForm({
  placement = CONSULTATION.placement,
  labelledBy,
}: {
  placement?: string;
  labelledBy?: string;
}) {
  const ready = useFormReady();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{
    first: string;
    contact: ConsultationContact;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [issues, setIssues] = useState<InquiryErrors>({});
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  useEffect(() => {
    errorRef.current?.focus();
  }, [error, attempts]);

  function fieldProps(name: string) {
    return {
      id: `consultation-${name}`,
      "aria-invalid": issues[name] ? true : undefined,
      "aria-describedby": issues[name]
        ? `consultation-${name}-error`
        : undefined,
    };
  }
  function fieldIssue(name: string) {
    return issues[name] ? (
      <small className={styles.issue} id={`consultation-${name}-error`}>
        {issues[name]}
      </small>
    ) : null;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || busy) return;
    const form = new FormData(event.currentTarget);
    const problems = validateConversationForm(form, "consultation");
    setAttempts((current) => current + 1);
    setIssues(problems);
    setError(null);
    if (Object.keys(problems).length) return;
    setBusy(true);
    const fullName = String(form.get("full_name") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const smsConsent = form.get("sms_consent") === "on";
    const meeting = String(
      form.get("meeting") ?? CONSULTATION.meetings[0].id,
    ) as ConsultationMeeting;
    const contact = consultationReplyMethod(form);
    const goals = String(form.get("goals") ?? "").trim();
    const params = new URLSearchParams(window.location.search);
    const tags = campaignTags(params, storedCampaignTags(), placement);

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
          goals: [
            `Free ${CONSULTATION.minutes}-minute consultation. Meet: ${meetingLabel(meeting)}. Reach me by: ${contactLabel(contact)}.`,
            "",
            goals,
          ].join("\n"),
          interest: CONSULTATION.interest,
          best_contact_method: contact,
          sms_consent: smsConsent && Boolean(phone),
          utm_source: tags.utm_source,
          utm_medium: tags.utm_medium,
          utm_campaign: tags.utm_campaign ?? CONSULTATION.funnel,
          diagnostic: {
            source: CONSULTATION.funnel,
            placement,
            meeting,
            contact,
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
      try {
        window.fbq?.("track", "Lead");
      } catch {
        // Optional pixel must never change the saved-lead result.
      }
      setDone({ first: fullName.split(" ")[0] || "there", contact });
    } catch {
      setError(
        "Could not reach the form. Your answers are still here. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Always mounted so the confirmation is announced as a change, not an insertion. */}
      <div
        ref={doneRef}
        className={`lf-consult-done${done ? " lf-consult-done--shown" : ""}`}
        role="status"
        aria-live="polite"
        tabIndex={-1}
        aria-labelledby={labelledBy}
      >
        {done ? (
          <>
            <CircleCheckBig aria-hidden="true" />
            <strong>Got it, {done.first}.</strong>
            <p>
              Ryan will {REACH[done.contact]} within one business day to set the
              time and the place.
              {done.contact === "email"
                ? ""
                : " Save this number, it is his direct line."}
            </p>
            <a
              className="lf-consult-done-link"
              href={BUSINESS.phone.tel}
              data-cta="call"
              data-cta-placement="consultation_sent"
            >
              Call {BUSINESS.phone.display} now
            </a>
            <a
              className="lf-consult-done-link"
              href={smsHref("consultation_sent")}
              data-cta="text"
              data-cta-placement="consultation_sent"
            >
              {TEXT_LABEL} instead
            </a>
          </>
        ) : null}
      </div>
      {done ? null : (
        <form
          className="lf-consult-form"
          onSubmit={onSubmit}
          method="post"
          action="/api/leads"
          noValidate
          onInput={(event) => {
            const name = (event.target as HTMLInputElement).name;
            if (issues[name])
              setIssues((current) => {
                const next = { ...current };
                delete next[name];
                return next;
              });
          }}
          aria-busy={!ready || busy}
          aria-labelledby={labelledBy}
          data-analytics={CONSULTATION.funnel}
        >
          {(error || Object.keys(issues).length > 0) && (
            <div
              ref={errorRef}
              className={styles.error}
              role="alert"
              tabIndex={-1}
            >
              <strong>{error || "Check these details before sending."}</strong>
              {Object.keys(issues).length > 0 && (
                <ul>
                  {Object.entries(issues).map(([name, message]) => (
                    <li key={name}>
                      <a
                        href={`#consultation-${name}`}
                        onClick={() =>
                          document
                            .getElementById(`consultation-${name}`)
                            ?.focus()
                        }
                      >
                        {message}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <fieldset className={styles.controls} disabled={!ready || busy}>
            <legend className="sr-only">
              Your business and consultation preferences
            </legend>
            <div className="lf-consult-row">
              <label className="lf-field">
                <span>Your name *</span>
                <input
                  name="full_name"
                  autoComplete="name"
                  required
                  maxLength={200}
                  {...fieldProps("full_name")}
                />
                {fieldIssue("full_name")}
              </label>
              <label className="lf-field">
                <span>Business name *</span>
                <input
                  name="business_name"
                  autoComplete="organization"
                  required
                  maxLength={200}
                  {...fieldProps("business_name")}
                />
                {fieldIssue("business_name")}
              </label>
            </div>
            <div className="lf-consult-row">
              <label className="lf-field">
                <span>Mobile (optional)</span>
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  maxLength={50}
                  {...fieldProps("phone")}
                />
                {fieldIssue("phone")}
              </label>
              <label className="lf-field">
                <span>Email *</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  maxLength={200}
                  {...fieldProps("email")}
                />
                {fieldIssue("email")}
              </label>
            </div>
            <label className="lf-field">
              <span>Website or Facebook page (if you have one)</span>
              <input
                name="website_url"
                type="text"
                inputMode="url"
                autoComplete="url"
                maxLength={300}
                placeholder="yourbusiness.com or facebook.com/yourbusiness"
              />
            </label>
            <label className="lf-field">
              <span>What is getting in the way? *</span>
              <textarea
                name="goals"
                {...fieldProps("goals")}
                rows={3}
                required
                maxLength={1800}
                placeholder="Not enough calls. Leads nobody follows up on. A website that does nothing. Say it plain."
              />
              {fieldIssue("goals")}
            </label>

            <fieldset className="lf-consult-fieldset">
              <legend>Where do you want the thirty minutes?</legend>
              <div className="lf-consult-options">
                {CONSULTATION.meetings.map((option, index) => (
                  <label className="lf-consult-option" key={option.id}>
                    <input
                      type="radio"
                      name="meeting"
                      value={option.id}
                      defaultChecked={index === 0}
                    />
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
                    <span>{method.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <p className={styles.permissionNote}>
              For a call or text, add your mobile number and choose permission
              below. Otherwise, Ryan will reply by email.
            </p>
            <label className="lf-consult-consent">
              <input type="checkbox" name="sms_consent" />
              <span>
                <SmsConsentText topic="this consultation" />
              </span>
            </label>

            <button
              className="lf-consult-submit"
              type="submit"
              disabled={!ready || busy}
              data-cta="consultation_request"
              data-cta-placement={placement}
            >
              {busy ? "Sending..." : "Book my free consultation"}{" "}
              <ArrowRight size={21} aria-hidden="true" />
            </button>
          </fieldset>
          <noscript>
            Enable JavaScript to request a consultation, or{" "}
            <a href={BUSINESS.phone.tel}>{CALL_LABEL}</a> or{" "}
            <a href={smsHref("home_final")}>{TEXT_LABEL}</a>.
          </noscript>
          <p className="lf-consult-note">
            No spam. No list-selling. Ryan reads every one of these himself.
          </p>
        </form>
      )}
    </>
  );
}
