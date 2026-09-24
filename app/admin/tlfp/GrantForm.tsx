"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GrantForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [credits, setCredits] = useState("");
  const [memo, setMemo] = useState("");
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    try {
      const r = await fetch("/api/admin/tlfp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, credits: Number(credits), memo, request_id: requestId }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setNote({ tone: "bad", text: typeof j.error === "string" ? j.error : "Not posted." });
        return;
      }
      setNote({
        tone: "ok",
        text: j.duplicate
          ? "Already posted (same request). Nothing changed."
          : `Posted ${j.applied} credits. Balance is now ${j.balance}.`,
      });
      setCredits("");
      setMemo("");
      setRequestId(crypto.randomUUID());
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1.4fr_0.6fr_1.6fr_auto] sm:items-end">
      <label className="grid gap-1 text-sm font-bold text-[var(--heading)]">
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-h-11 rounded-xl border border-[var(--line-strong)] bg-[var(--panel)] px-3 text-base font-normal text-[var(--heading)] outline-none focus:border-[var(--blue)]"
          placeholder="client@business.com"
        />
      </label>
      <label className="grid gap-1 text-sm font-bold text-[var(--heading)]">
        Credits (+/-)
        <input
          type="number"
          required
          step={1}
          min={-1999}
          max={1999}
          value={credits}
          onChange={(e) => setCredits(e.target.value)}
          className="min-h-11 rounded-xl border border-[var(--line-strong)] bg-[var(--panel)] px-3 text-base font-normal text-[var(--heading)] outline-none focus:border-[var(--blue)]"
          placeholder="50"
        />
      </label>
      <label className="grid gap-1 text-sm font-bold text-[var(--heading)]">
        Why (shows on their ledger)
        <input
          type="text"
          required
          minLength={3}
          maxLength={300}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          className="min-h-11 rounded-xl border border-[var(--line-strong)] bg-[var(--panel)] px-3 text-base font-normal text-[var(--heading)] outline-none focus:border-[var(--blue)]"
          placeholder="Referral booked a call"
        />
      </label>
      <button type="submit" disabled={busy} className="btn-primary min-h-11 disabled:opacity-60">
        {busy ? "Posting..." : "Post"}
      </button>
      {note ? (
        <p
          role="status"
          className={`sm:col-span-4 rounded-xl px-4 py-3 text-sm font-semibold ${
            note.tone === "ok"
              ? "border border-[var(--green-line)] bg-[var(--green-tint)] text-[var(--green)]"
              : "border border-[var(--danger-line)] bg-[var(--danger-tint)] text-[var(--danger)]"
          }`}
        >
          {note.text}
        </p>
      ) : null}
    </form>
  );
}
