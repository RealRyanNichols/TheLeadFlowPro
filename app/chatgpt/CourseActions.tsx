"use client";

import { ArrowRight, LockKeyhole } from "lucide-react";
import { FormEvent, useState } from "react";
import styles from "./chatgpt-course.module.css";

function utm(name: string) {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(name);
}

export function FreeAccessForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const phone = String(form.get("phone") || "").trim();
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.get("full_name"),
          email: form.get("email"),
          phone: phone || null,
          interest: "learn",
          goals: "Requested the free ChatGPT Operator starter build.",
          best_contact_method: "email",
          desired_modules: ["courses_training", "ai_agent"],
          marketing_email_consent: form.get("marketing_email_consent") === "on",
          sms_consent: phone ? form.get("sms_consent") === "on" : false,
          utm_source: utm("utm_source") || "chatgpt_course",
          utm_medium: utm("utm_medium") || "free_preview",
          utm_campaign: utm("utm_campaign") || "chatgpt_operator",
          diagnostic: {
            version: 1,
            source: "chatgpt_operator_free_access",
            offer: "free_starter_build",
            requested_at: new Date().toISOString(),
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Your access could not be saved.");
      window.location.assign("/chatgpt/free");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Your access could not be saved.");
      setBusy(false);
    }
  }

  return (
    <form className={styles.freeForm} onSubmit={submit}>
      <div className={styles.fieldGrid}>
        <label>
          Your name
          <input name="full_name" type="text" autoComplete="name" required maxLength={200} />
        </label>
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required maxLength={200} />
        </label>
        <label>
          Phone <span>optional</span>
          <input name="phone" type="tel" autoComplete="tel" maxLength={50} />
        </label>
      </div>
      <label className={styles.consent}>
        <input name="marketing_email_consent" type="checkbox" />
        Email me the free build, course updates, and practical ChatGPT lessons. I can unsubscribe anytime.
      </label>
      <label className={styles.consent}>
        <input name="sms_consent" type="checkbox" />
        If I provide a phone number, The LeadFlow Pro may call or text me about this training. Consent is not required to get the free lesson.
      </label>
      <button type="submit" disabled={busy}>
        {busy ? "Opening your lesson..." : "Get the free starter build"}
        {!busy ? <ArrowRight aria-hidden="true" /> : null}
      </button>
      <p aria-live="polite">{message}</p>
    </form>
  );
}

export function PaidCheckoutForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/chatgpt-course/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "Checkout could not start.");
      window.location.assign(data.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Checkout could not start.");
      setBusy(false);
    }
  }

  return (
    <form className={styles.checkoutForm} onSubmit={submit}>
      <label htmlFor="chatgpt-course-email">Email for course access</label>
      <div>
        <input
          id="chatgpt-course-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
        <button type="submit" disabled={busy}>
          {busy ? "Opening secure checkout..." : "Get founding access for $297"}
          {!busy ? <ArrowRight aria-hidden="true" /> : null}
        </button>
      </div>
      <small><LockKeyhole aria-hidden="true" /> Secure Stripe checkout. Use this same email to log in.</small>
      <p aria-live="polite">{message}</p>
    </form>
  );
}
