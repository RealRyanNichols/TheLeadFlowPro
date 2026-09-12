"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { hqPost } from "./api";

// Your own notes on this lead, plus the one flag that decides whether a text
// is allowed to go out. Both save through update_lead.

export default function LeadNotes({
  leadId,
  notes,
  consentSms,
  hasPhone,
}: {
  leadId: string;
  notes: string;
  consentSms: boolean;
  hasPhone: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState(notes);
  const [consent, setConsent] = useState(consentSms);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    const result = await hqPost("update_lead", { lead_id: leadId, notes: text, consent_sms: consent });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={save} className="hq-card">
      <h2 className="text-lg font-black text-[var(--heading)]">Your notes</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">What you know about this job. The drafts read this, so anything you put here shapes what gets written.</p>
      <label className="sr-only" htmlFor={`notes-${leadId}`}>
        Notes on this lead
      </label>
      <textarea
        id={`notes-${leadId}`}
        className="hq-textarea mt-3"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSaved(false);
        }}
        placeholder="Gate code 4412. Wants it done before the 15th."
      />

      <label className="mt-3 flex min-h-[44px] items-start gap-3 rounded-xl border border-[var(--line-strong)] bg-[var(--panel)] p-3 text-sm text-[var(--text)]">
        <input
          type="checkbox"
          className="mt-0.5 h-5 w-5 flex-none"
          checked={consent}
          disabled={!hasPhone}
          onChange={(e) => {
            setConsent(e.target.checked);
            setSaved(false);
          }}
        />
        <span>
          They said it is fine to text them.
          {hasPhone ? " Only tick this if they actually said so." : " Add a phone number first."}
        </span>
      </label>

      {error && <p className="hq-error mt-3">{error}</p>}
      {saved && !error && <p className="hq-ok mt-3">Saved.</p>}

      <div className="mt-3">
        <button type="submit" className="hq-btn" disabled={busy}>
          {busy ? "Saving..." : "Save notes"}
        </button>
      </div>
    </form>
  );
}
