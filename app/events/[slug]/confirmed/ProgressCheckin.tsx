"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import styles from "./confirmed.module.css";

export default function ProgressCheckin({ sessionId }: { sessionId: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/workshop-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        checkin_type: "seven_day",
        progress_summary: form.get("progress_summary"),
        blocked_by: form.get("blocked_by"),
        next_action: form.get("next_action"),
        implementation_help_requested: form.get("implementation_help_requested") === "on",
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error || "Your update could not be saved.");
      setBusy(false);
      return;
    }
    setDone(true);
    setBusy(false);
  }

  if (done) {
    return <div className={styles.checkinDone}><CheckCircle2 aria-hidden="true" /><strong>Progress saved.</strong><span>Ryan and Pat can see your update. They will only follow up about implementation if you requested it.</span></div>;
  }

  return (
    <form className={styles.checkinForm} onSubmit={submit}>
      <p>Seven-day operator check-in</p>
      <h2>Keep the next move tied to real work.</h2>
      <label>What did you build or improve?<textarea name="progress_summary" rows={3} maxLength={2000} /></label>
      <label>Where are you stuck?<textarea name="blocked_by" rows={3} maxLength={2000} /></label>
      <label>What is the next controlled move?<input name="next_action" maxLength={1000} /></label>
      <label className={styles.helpCheck}><input type="checkbox" name="implementation_help_requested" /><span>I want Pat to contact me about a progress review or implementation help.</span></label>
      <button type="submit" disabled={busy}>{busy ? "Saving..." : "Save My Progress"}<ArrowRight aria-hidden="true" /></button>
      {error && <span className={styles.checkinError} role="status">{error}</span>}
    </form>
  );
}
