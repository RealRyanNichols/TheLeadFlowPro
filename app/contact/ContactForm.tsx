"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Phone } from "lucide-react";
import { BUSINESS } from "@/lib/site/business";
import { CALL_LABEL, TEXT_LABEL, smsHref } from "@/lib/site/textLinks";
import {
  inquiryText,
  validateConversationForm,
  type InquiryErrors,
} from "@/lib/site/inquiryValidation";
import styles from "./contact-form.module.css";
import { useFormReady } from "@/components/site/useFormReady";

// Optional answers travel in the existing message body; the API stays unchanged.
const QUESTIONS = [
  { key: "leads", label: "Are you getting enough leads?" },
  { key: "money", label: "Are you making enough money?" },
  { key: "social", label: "Is your social media doing what you wanted?" },
  { key: "website", label: "Is your website doing what you wanted?" },
] as const;
const IDS: Record<string, string> = {
  visitor_name: "contact-name",
  visitor_email: "contact-email",
  body: "contact-message",
};

export default function ContactForm() {
  const ready = useFormReady();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<InquiryErrors>({});
  const [attempts, setAttempts] = useState(0);
  const [answers, setAnswers] = useState<Record<string, "Yes" | "No">>({});
  const feedbackRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    feedbackRef.current?.focus();
  }, [error, attempts]);
  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ready || busy) return;
    const fd = new FormData(e.currentTarget);
    const problems = validateConversationForm(fd, "contact");
    setAttempts((current) => current + 1);
    setIssues(problems);
    setError(null);
    if (Object.keys(problems).length) return;
    setBusy(true);
    const phone = inquiryText(fd, "visitor_phone");
    const extras: string[] = [];
    if (phone) extras.push(`Phone: ${phone}`);
    const answered = QUESTIONS.filter((q) => answers[q.key]);
    if (answered.length)
      extras.push(
        "Qualifying answers:",
        ...answered.map((q) => `- ${q.label} ${answers[q.key]}`),
      );
    const message = inquiryText(fd, "body");
    const body = extras.length
      ? `${message}\n\n---\n${extras.join("\n")}`
      : message;
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitor_name: inquiryText(fd, "visitor_name"),
          visitor_email: inquiryText(fd, "visitor_email"),
          body,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          typeof data?.error === "string"
            ? data.error
            : "Your message could not be sent. Please try again.",
        );
        return;
      }
      setDone(true);
      try {
        window.fbq?.("track", "Contact");
      } catch {
        /* Optional analytics never change the saved result. */
      }
    } catch {
      setError(
        "Could not reach the form. Your message is still here. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  function clearIssue(name: string) {
    if (issues[name])
      setIssues((current) => {
        const next = { ...current };
        delete next[name];
        return next;
      });
  }
  function issueProps(name: string) {
    return {
      "aria-invalid": issues[name] ? true : undefined,
      "aria-describedby": issues[name] ? `${IDS[name]}-error` : undefined,
      onInput: () => clearIssue(name),
    };
  }
  function fieldIssue(name: string) {
    return issues[name] ? (
      <p className={styles.issue} id={`${IDS[name]}-error`}>
        {issues[name]}
      </p>
    ) : null;
  }

  if (done)
    return (
      <div
        ref={doneRef}
        className={styles.done}
        role="status"
        aria-live="polite"
        tabIndex={-1}
      >
        <h3>Message received.</h3>
        <p>Ryan will get back to you within one business day.</p>
        <div className={styles.actions}>
          <a href={BUSINESS.phone.tel}>
            <Phone size={18} aria-hidden="true" />
            {CALL_LABEL}
          </a>
          <a href={smsHref("contact_sent")}>
            <MessageSquare size={18} aria-hidden="true" />
            {TEXT_LABEL}
          </a>
        </div>
      </div>
    );

  return (
    <form
      onSubmit={onSubmit}
      method="post"
      action="/api/contact"
      id="message-form"
      aria-label="Send Ryan a message"
      data-analytics="contact_message"
      className={styles.form}
      aria-busy={!ready || busy}
      noValidate
    >
      {(error || Object.keys(issues).length > 0) && (
        <div
          ref={feedbackRef}
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
                    href={`#${IDS[name]}`}
                    onClick={() => document.getElementById(IDS[name])?.focus()}
                  >
                    {message}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <fieldset disabled={!ready || busy} className={styles.fields}>
        <legend className="sr-only">Your contact details and message</legend>
        <div className={styles.row}>
          <div className={styles.field}>
            <label className="label" htmlFor="contact-name">
              Your name *
            </label>
            <input
              className="input"
              id="contact-name"
              name="visitor_name"
              autoComplete="name"
              required
              maxLength={200}
              {...issueProps("visitor_name")}
            />
            {fieldIssue("visitor_name")}
          </div>
          <div className={styles.field}>
            <label className="label" htmlFor="contact-email">
              Email *
            </label>
            <input
              className="input"
              id="contact-email"
              name="visitor_email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              maxLength={200}
              {...issueProps("visitor_email")}
            />
            {fieldIssue("visitor_email")}
          </div>
        </div>
        <div className={styles.field}>
          <label className="label" htmlFor="contact-phone">
            Phone (optional)
          </label>
          <input
            className="input"
            id="contact-phone"
            name="visitor_phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            maxLength={50}
            aria-describedby="contact-phone-help"
          />
          <p className={styles.helper} id="contact-phone-help">
            Add your number if you would like a call back.
          </p>
        </div>
        <div className={styles.field}>
          <label className="label" htmlFor="contact-message">
            What do you need help with? *
          </label>
          <textarea
            className="input"
            id="contact-message"
            name="body"
            rows={5}
            required
            maxLength={2500}
            placeholder="Tell us about the business, what is getting in the way, and what you want to improve."
            {...issueProps("body")}
          />
          {fieldIssue("body")}
        </div>
        <details className={styles.optional}>
          <summary>Optional: a quick look at the business</summary>
          <fieldset className={styles.questions}>
            <legend className="sr-only">Four optional questions</legend>
            {QUESTIONS.map((q) => (
              <div key={q.key} className={styles.question}>
                <span>{q.label}</span>
                <div
                  className={styles.answers}
                  role="group"
                  aria-label={q.label}
                >
                  {(["Yes", "No"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={answers[q.key] === value}
                      onClick={() =>
                        setAnswers((current) =>
                          current[q.key] === value
                            ? Object.fromEntries(
                                Object.entries(current).filter(
                                  ([k]) => k !== q.key,
                                ),
                              )
                            : { ...current, [q.key]: value },
                        )
                      }
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </fieldset>
        </details>
        <button
          type="submit"
          disabled={!ready || busy}
          className="btn-primary w-full disabled:opacity-50"
        >
          {busy ? "Sending..." : "Send my message"}
        </button>
      </fieldset>
      <noscript>
        Enable JavaScript to send this form, or use the call and text links
        below.
      </noscript>
      <div className={styles.actions}>
        <a
          href={BUSINESS.phone.tel}
          data-cta="call"
          data-cta-placement="contact_form"
        >
          <Phone size={18} aria-hidden="true" />
          {CALL_LABEL}
        </a>
        <a
          href={smsHref("contact")}
          data-cta="text"
          data-cta-placement="contact_form"
        >
          <MessageSquare size={18} aria-hidden="true" />
          {TEXT_LABEL}
        </a>
      </div>
    </form>
  );
}
