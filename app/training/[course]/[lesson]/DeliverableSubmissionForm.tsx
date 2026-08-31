"use client";

import { FormEvent, useState } from "react";
import styles from "../../training.module.css";

type Submission = {
  submission_url: string | null;
  notes: string | null;
  status: string;
  review_notes: string | null;
} | null;

export default function DeliverableSubmissionForm({
  courseSlug,
  lessonSlug,
  title,
  initialSubmission,
}: {
  courseSlug: string;
  lessonSlug: string;
  title: string;
  initialSubmission: Submission;
}) {
  const [url, setUrl] = useState(initialSubmission?.submission_url ?? "");
  const [notes, setNotes] = useState(initialSubmission?.notes ?? "");
  const [status, setStatus] = useState(initialSubmission?.status ?? "not_submitted");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/training/deliverables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseSlug, lessonSlug, submissionUrl: url, notes }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Submission could not be saved.");
      setStatus("pending");
      setMessage("Submitted for review. You can update it until it is approved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Submission could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.deliverablePanel} aria-labelledby="deliverable-title">
      <p className="cb-eyebrow">Reviewed deliverable</p>
      <h2 id="deliverable-title">{title}</h2>
      <p>Share a viewable link and explain what you built. Major course builds stay pending until Ryan or an approved reviewer marks them approved or requests a revision.</p>
      <div className={styles.submissionStatus} data-status={status.replace("_", "-")}>
        Status: {status.replaceAll("_", " ")}
      </div>
      {initialSubmission?.review_notes ? (
        <aside className={styles.reviewNotes}><strong>Reviewer note</strong><p>{initialSubmission.review_notes}</p></aside>
      ) : null}
      <form className={styles.deliverableForm} onSubmit={submit}>
        <label>
          Viewable deliverable link
          <input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." required />
        </label>
        <label>
          What you built and what feedback you want
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={4000} rows={6} required />
        </label>
        <button type="submit" disabled={busy || status === "approved"}>
          {status === "approved" ? "Deliverable approved" : busy ? "Submitting..." : status === "not_submitted" ? "Submit for review" : "Update submission"}
        </button>
        <p aria-live="polite">{message}</p>
      </form>
    </section>
  );
}
