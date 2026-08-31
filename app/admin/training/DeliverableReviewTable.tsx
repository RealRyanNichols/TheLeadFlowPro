"use client";

import { useState } from "react";

type ReviewRow = {
  id: string;
  learner: string;
  course: string;
  lesson: string;
  title: string;
  submissionUrl: string;
  notes: string;
  status: string;
  reviewNotes: string;
  submittedAt: string;
};

export default function DeliverableReviewTable({ initialRows }: { initialRows: ReviewRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function review(id: string, status: "approved" | "revision_requested") {
    const row = rows.find((item) => item.id === id);
    if (!row) return;
    const reviewNotes = window.prompt(
      status === "approved" ? "Optional approval note" : "What needs to be revised?",
      row.reviewNotes,
    );
    if (reviewNotes === null || (status === "revision_requested" && reviewNotes.trim().length < 5)) return;
    setBusyId(id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/training/deliverables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, reviewNotes }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Review could not be saved.");
      setRows((current) => current.map((item) => item.id === id ? { ...item, status, reviewNotes } : item));
      setMessage("Review saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Review could not be saved.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <p aria-live="polite" className="text-sm text-[var(--muted)]">{message}</p>
      {rows.map((row) => (
        <article key={row.id} className="card space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-flow-400">{row.course}</p>
              <h2 className="mt-1 text-xl font-black text-[var(--heading)]">{row.title}</h2>
              <p className="text-sm text-[var(--muted)]">{row.learner} · {row.lesson} · {new Date(row.submittedAt).toLocaleDateString()}</p>
            </div>
            <span className="rounded-full border border-[var(--line-strong)] px-3 py-1 text-xs font-black uppercase tracking-wide">{row.status.replaceAll("_", " ")}</span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--text)]">{row.notes}</p>
          <a className="inline-flex rounded-lg bg-flow-500 px-4 py-2 text-sm font-black text-white" href={row.submissionUrl} target="_blank" rel="noreferrer">Open submitted work</a>
          {row.reviewNotes ? <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-4 text-sm"><strong>Current reviewer note</strong><p className="mt-1">{row.reviewNotes}</p></div> : null}
          <div className="flex flex-wrap gap-3">
            <button disabled={busyId === row.id} onClick={() => review(row.id, "approved")} className="rounded-lg bg-mint px-4 py-2 text-sm font-black text-ink disabled:opacity-60">Approve</button>
            <button disabled={busyId === row.id} onClick={() => review(row.id, "revision_requested")} className="rounded-lg border border-warn px-4 py-2 text-sm font-black text-warn disabled:opacity-60">Request revision</button>
          </div>
        </article>
      ))}
      {!rows.length ? <div className="card text-center"><h2 className="text-xl font-black">No submissions yet.</h2><p className="mt-2 text-[var(--muted)]">Reviewed course builds will appear here.</p></div> : null}
    </div>
  );
}
