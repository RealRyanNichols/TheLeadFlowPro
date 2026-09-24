"use client";

import { useState } from "react";

// Two buttons: count who would get the credits launch email, then send it.
// The route refuses a second send, so the Send button is safe to press twice.

type Answer = {
  ok?: boolean;
  error?: string;
  dry_run?: boolean;
  leads?: number;
  customers?: number;
  removed_unsubscribed?: number;
  recipients?: number;
  broadcast_id?: string;
  contacts_added?: number;
};

export default function AnnounceForm() {
  const [busy, setBusy] = useState<"count" | "send" | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [armed, setArmed] = useState(false);

  async function run(dryRun: boolean) {
    setBusy(dryRun ? "count" : "send");
    try {
      const r = await fetch("/api/admin/tlfp/announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dry_run: dryRun }),
      });
      const j = (await r.json().catch(() => ({}))) as Answer;
      setAnswer(j);
      if (!dryRun) setArmed(false);
    } catch {
      setAnswer({ error: "The request did not come back. Reload and look before trying again." });
    } finally {
      setBusy(null);
    }
  }

  const counts =
    answer && typeof answer.recipients === "number"
      ? `${answer.recipients} people: ${answer.leads} consented leads, ${answer.customers} customers, ${answer.removed_unsubscribed} removed as unsubscribed.`
      : null;

  return (
    <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h3 className="text-base font-black text-[var(--heading)]">Announce credits to the list</h3>
      <p className="mt-1 text-sm text-[var(--muted)]">
        One email, through Resend as a broadcast, with a real unsubscribe link. Leads with marketing consent plus paying customers. Sends once.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => run(true)}
          disabled={busy !== null}
          className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-bold text-[var(--heading)] disabled:opacity-60"
        >
          {busy === "count" ? "Counting…" : "Count recipients"}
        </button>
        {armed ? (
          <button
            type="button"
            onClick={() => run(false)}
            disabled={busy !== null}
            className="rounded-xl bg-[var(--blue)] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {busy === "send" ? "Sending…" : "Yes, send it now"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setArmed(true)}
            disabled={busy !== null || !counts}
            className="rounded-xl border border-[var(--blue)] px-4 py-2 text-sm font-bold text-[var(--blue)] disabled:opacity-60"
          >
            Send the launch email
          </button>
        )}
      </div>
      {answer ? (
        <p className={`mt-3 text-sm font-semibold ${answer.error ? "text-[var(--danger)]" : "text-[var(--heading)]"}`}>
          {answer.error ? answer.error : answer.dry_run ? counts : `Sent. Broadcast ${answer.broadcast_id}. ${counts ?? ""}`}
        </p>
      ) : null}
    </div>
  );
}
