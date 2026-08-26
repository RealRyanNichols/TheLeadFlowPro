"use client";

// Post-payment writing intake. Posts to /api/lead-follow-up/intake, which
// attaches the answers to the buyer's existing lead row so Ryan writes from
// the customer's own words. No prices and no payment data move through here.

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import styles from "../lead-follow-up.module.css";

const QUESTIONS: { name: string; label: string; hint: string; rows?: number }[] = [
  {
    name: "offer",
    label: "What is the one offer this follow-up is for? *",
    hint: "The single service or product these messages should sell.",
  },
  {
    name: "customer",
    label: "Who buys it? *",
    hint: "Homeowners, other businesses, patients, a specific trade. Be as plain as you like.",
  },
  {
    name: "objection",
    label: "What do people say when they do not buy?",
    hint: "Price, timing, wanting to check with a spouse, needing to think about it.",
    rows: 3,
  },
  {
    name: "voice",
    label: "How do you actually talk to customers?",
    hint: "Paste a real text or email you have sent. It is the fastest way to sound like you.",
    rows: 4,
  },
  {
    name: "review_link",
    label: "Your Google review link, if you have it handy",
    hint: "Leave it blank and the campaign ships with instructions for finding yours.",
  },
];

export default function IntakeForm({ sessionId }: { sessionId: string | null }) {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload: Record<string, string | null> = { session_id: sessionId };
    for (const question of QUESTIONS) {
      payload[question.name] = String(form.get(question.name) ?? "").trim() || null;
    }
    payload.email = String(form.get("email") ?? "").trim();

    try {
      const response = await fetch("/api/lead-follow-up/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        setError(
          (await response.json().catch(() => ({}) as { error?: string })).error ??
            "That did not send. Try again, or reply to your receipt email.",
        );
        setState("idle");
        return;
      }
      setState("done");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className={styles.notice}>
        <h3>Got it. That is everything I need.</h3>
        <p>
          Your campaign is in the queue. Watch your email, and reply to that thread any time you
          think of something else about the business worth knowing.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={`${styles.orderPanel} ${styles.form}`}>
      <div>
        <label className="label" htmlFor="lfu-intake-email">
          The email you paid with *
        </label>
        <input
          className="input"
          id="lfu-intake-email"
          name="email"
          type="email"
          required
          maxLength={200}
        />
        <p className={styles.priceNote}>This is how your answers get matched to your order.</p>
      </div>

      {QUESTIONS.map((question) => (
        <div key={question.name}>
          <label className="label" htmlFor={`lfu-${question.name}`}>
            {question.label}
          </label>
          {question.rows ? (
            <textarea
              className="input"
              id={`lfu-${question.name}`}
              name={question.name}
              rows={question.rows}
              maxLength={2000}
              required={question.label.endsWith("*")}
            />
          ) : (
            <input
              className="input"
              id={`lfu-${question.name}`}
              name={question.name}
              maxLength={500}
              required={question.label.endsWith("*")}
            />
          )}
          <p className={styles.priceNote}>{question.hint}</p>
        </div>
      ))}

      {error && <p className={styles.formError}>{error}</p>}

      <button type="submit" disabled={state === "sending"} className="cb-btn cb-btn--primary">
        {state === "sending" ? "Sending..." : "Send My Intake"}
        <ArrowRight aria-hidden="true" />
      </button>
    </form>
  );
}
