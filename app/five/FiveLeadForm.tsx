"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { track } from "@/lib/analytics/client";
import { FIVE_OFFER } from "@/lib/fiveOffer";
import styles from "./five.module.css";

// The two question form for the owner who is not ready to pay today. Saves a
// lead through /api/leads with diagnostic.source "five_offer", which puts
// them in the thirty day email sequence (with the box ticked) and on Ryan's
// call sheet. Nothing here promises a text: Ryan calls.

const PAIN_OPTIONS = [
  ["missed_calls", "Missed calls and texts nobody returns"],
  ["no_website", "No website, or one that does nothing"],
  ["no_follow_up", "Leads that never get followed up"],
  ["paying_monthly", "Paying monthly for tools I do not use"],
  ["not_enough_customers", "Not enough new customers, period"],
  ["other", "Something else"],
] as const;

const TIMING_OPTIONS = [
  ["this_week", "This week"],
  ["this_month", "This month"],
  ["next_90_days", "In the next 90 days"],
  ["looking", "Just looking right now"],
] as const;

function utmFromLocation(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const out: Record<string, string> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign"]) {
    const v = p.get(k);
    if (v) out[k] = v.slice(0, 100);
  }
  return out;
}

export default function FiveLeadForm({ phoneDisplay }: { phoneDisplay: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  function onStart() {
    if (started) return;
    setStarted(true);
    track("form_start", { label: "five_offer", path: FIVE_OFFER.path });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const form = e.currentTarget;
    const data = new FormData(form);
    const fullName = String(data.get("full_name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const business = String(data.get("business_name") ?? "").trim();
    const pain = String(data.get("pain") ?? "");
    const timing = String(data.get("timing") ?? "");
    const consent = data.get("marketing_email_consent") === "on";

    if (!fullName || !email || !phone) {
      setError("Name, phone, and email, so I can actually call you.");
      return;
    }

    const painLabel = PAIN_OPTIONS.find(([k]) => k === pain)?.[1] ?? "";
    const timingLabel = TIMING_OPTIONS.find(([k]) => k === timing)?.[1] ?? "";

    setBusy(true);
    try {
      const r = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone,
          business_name: business || undefined,
          interest: "done_for_you",
          timeline: timingLabel || undefined,
          goals: `THE FIVE (${FIVE_OFFER.priceLabel} thirty day spot), not bought yet. Costing them the most: ${painLabel || "not answered"}. Wants it fixed: ${timingLabel || "not answered"}.`,
          marketing_email_consent: consent,
          diagnostic: {
            source: "five_offer",
            offer: FIVE_OFFER.kind,
            pain,
            timing,
            page: FIVE_OFFER.path,
          },
          ...utmFromLocation(),
        }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setError(j.error || "Could not save that. Try again, or text the number below.");
        setBusy(false);
        return;
      }
      track("form_submit", { label: "five_offer", path: FIVE_OFFER.path });
      setDone(true);
    } catch {
      setError("Could not save that. Try again, or text the number below.");
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className={styles.formDone} role="status">
        <h3>Got it. I call you myself.</h3>
        <p>
          From {phoneDisplay}, usually the same day. Save the number so you know it is me. If a
          spot is still open when we talk, it is yours if you want it.
        </p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={onSubmit} onFocus={onStart} noValidate>
      <h3>Not ready to pay today? Two questions and I call you.</h3>
      <p className={styles.formLead}>
        No pitch on the call. I tell you straight what I would do for your business and what it
        costs. You decide.
      </p>

      <label className={styles.field}>
        <span>What is costing you the most right now?</span>
        <select name="pain" defaultValue="" required>
          <option value="" disabled>
            Pick one
          </option>
          {PAIN_OPTIONS.map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span>How soon do you want it fixed?</span>
        <select name="timing" defaultValue="" required>
          <option value="" disabled>
            Pick one
          </option>
          {TIMING_OPTIONS.map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.two}>
        <label className={styles.field}>
          <span>Your name</span>
          <input name="full_name" autoComplete="name" required maxLength={200} />
        </label>
        <label className={styles.field}>
          <span>Business name</span>
          <input name="business_name" autoComplete="organization" maxLength={200} />
        </label>
      </div>
      <div className={styles.two}>
        <label className={styles.field}>
          <span>Cell phone</span>
          <input name="phone" type="tel" autoComplete="tel" inputMode="tel" required maxLength={50} />
        </label>
        <label className={styles.field}>
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" inputMode="email" required maxLength={200} />
        </label>
      </div>

      <label className={styles.consent}>
        <input type="checkbox" name="marketing_email_consent" defaultChecked />
        <span>
          Email me the thirty day series about running a business that answers its own phone.
          One a day, unsubscribe in one click. No texts unless you text first.
        </span>
      </label>

      {error ? (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" className="cb-btn cb-btn--primary" disabled={busy} aria-busy={busy}>
        {busy ? <Loader2 aria-hidden="true" /> : null}
        {busy ? "Saving" : "Have Ryan call me"}
        {!busy ? <ArrowRight aria-hidden="true" /> : null}
      </button>
    </form>
  );
}
