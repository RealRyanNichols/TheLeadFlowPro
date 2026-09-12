"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { hqPost } from "./api";

// What happened on the call. One button per outcome, because the owner is
// usually doing this with a phone in the other hand. The full version on the
// lead page adds a note and a job value; the version on Today is three
// buttons and nothing else.

export type Outcome = "contacted" | "no_answer" | "quoted" | "booked" | "won" | "lost" | "spam";

const LABELS: Record<Outcome, string> = {
  contacted: "Talked to them",
  no_answer: "No answer",
  quoted: "Sent a quote",
  booked: "Booked the job",
  won: "Won the job",
  lost: "Lost it",
  spam: "Spam",
};

export default function LogTouch({
  leadId,
  outcomes,
  withDetails = false,
  heading,
}: {
  leadId: string;
  outcomes: Outcome[];
  withDetails?: boolean;
  heading?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<Outcome | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [note, setNote] = useState("");
  const [valueUsd, setValueUsd] = useState("");

  async function log(outcome: Outcome) {
    setBusy(outcome);
    setError("");
    setDone("");
    const fields: Record<string, unknown> = { lead_id: leadId, outcome };
    if (withDetails) {
      if (note.trim()) fields.note = note.trim();
      const amount = Number(valueUsd);
      if (valueUsd.trim() && Number.isFinite(amount) && amount > 0) fields.value_usd = amount;
    }
    const result = await hqPost("log_touch", fields);
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNote("");
    setValueUsd("");
    setDone(`Logged: ${LABELS[outcome].toLowerCase()}.`);
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      {heading && <p className="hq-eyebrow">{heading}</p>}
      {withDetails && (
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
          <div>
            <label className="hq-label" htmlFor={`note-${leadId}`}>
              What happened (optional)
            </label>
            <input
              id={`note-${leadId}`}
              className="hq-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Wants a quote on the back fence"
            />
          </div>
          <div>
            <label className="hq-label" htmlFor={`value-${leadId}`}>
              Job value (optional)
            </label>
            <input
              id={`value-${leadId}`}
              className="hq-input"
              inputMode="decimal"
              value={valueUsd}
              onChange={(e) => setValueUsd(e.target.value)}
              placeholder="1850"
            />
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {outcomes.map((outcome) => (
          <button key={outcome} type="button" className="hq-btn hq-btn-sm" disabled={busy !== null} onClick={() => log(outcome)}>
            {busy === outcome ? "Saving..." : LABELS[outcome]}
          </button>
        ))}
      </div>
      {error && <p className="hq-error">{error}</p>}
      {done && !error && <p className="hq-ok">{done}</p>}
    </div>
  );
}
