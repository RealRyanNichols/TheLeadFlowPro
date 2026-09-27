"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Ends an agency retainer at the close of the paid period (decision 66).
// Two-step on purpose, like DeleteLead: the second step says exactly what
// stops and what does not. The route is the only writer; this only asks.

export default function CancelRetainer({
  leadId,
  prompt,
  label,
}: {
  leadId: string;
  prompt: string;
  label: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function end() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/admin/leads/${leadId}/retainer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const j = (await r.json().catch(() => null)) as { ok?: boolean; error?: string; summary?: string; warnings?: string[] } | null;
      if (!r.ok || !j?.ok) {
        setError(j?.error || "Something went wrong and the result is unknown. Check the subscription in Stripe before trying again.");
        setBusy(false);
        return;
      }
      setDone([j.summary, ...(j.warnings ?? [])].filter(Boolean).join(" "));
      router.refresh();
    } catch {
      // The browser lost the site's answer; Stripe may or may not have it.
      // A refresh shows the stamp if it landed, and a repeat is safe.
      setError("The request did not complete, so the result is unknown. Refresh the page; if the button is still there, try again (a repeat is safe).");
      setBusy(false);
      router.refresh();
    }
  }

  if (done) {
    return <p className="rounded-lg border border-[var(--line)] bg-[var(--panel-soft)] p-3 text-xs font-semibold text-[var(--text)]">{done}</p>;
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-[var(--danger-line)] px-3 py-2 text-xs font-bold text-[var(--danger)] transition hover:bg-[var(--danger-tint)]"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--danger-line)] bg-[var(--danger-tint)] p-3">
      <p className="text-xs font-bold text-[var(--danger)]">{prompt}</p>
      {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={end}
          disabled={busy}
          className="rounded-lg bg-[var(--danger)] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
        >
          {busy ? "Ending" : "Yes, end it at period end"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="rounded-lg border border-[var(--line-strong)] px-3 py-1.5 text-xs font-bold text-[var(--text)]"
        >
          Keep it
        </button>
      </div>
    </div>
  );
}
