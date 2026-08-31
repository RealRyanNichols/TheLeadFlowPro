"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquareText, Sparkles } from "lucide-react";

export default function ProspectResponsePlanner({ prospectId }: { prospectId: string }) {
  const router = useRouter();
  const [response, setResponse] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ reply?: string; timing?: string; classification?: string } | null>(null);
  const [error, setError] = useState("");

  async function plan() {
    if (!response.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const request = await fetch(`/api/admin/operator/prospects/${prospectId}/response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: response.trim() }),
      });
      const payload = (await request.json()) as { error?: string; reply?: string; timing?: string; classification?: string };
      if (!request.ok) throw new Error(payload.error || "Could not plan the response");
      setResult(payload);
      setResponse("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not plan the response");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 border-t border-[var(--line)] pt-4">
      <div className="flex items-center gap-2">
        <MessageSquareText className="h-4 w-4 text-[var(--blue)]" />
        <p className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">They replied?</p>
      </div>
      <textarea
        value={response}
        onChange={(event) => setResponse(event.target.value)}
        rows={3}
        maxLength={4000}
        placeholder="Paste the prospect's reply here. OperatorOS will plan what to say next and when to follow up."
        className="mt-2 w-full rounded-xl border border-[var(--line-strong)] bg-white px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--blue)]"
      />
      <button
        type="button"
        disabled={busy || !response.trim()}
        onClick={plan}
        className="mt-2 inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[var(--blue)] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Sparkles className="h-4 w-4" /> {busy ? "Planning…" : "Plan the next response"}
      </button>
      {error && <p className="mt-2 text-xs font-bold text-[var(--danger)]">{error}</p>}
      {result?.reply && (
        <div className="mt-3 rounded-xl border border-[var(--accent-line)] bg-[var(--accent-tint)] p-3">
          <p className="text-[11px] font-black uppercase tracking-wide text-[var(--blue)]">Queued for human review · {result.classification}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text)]">{result.reply}</p>
          {result.timing && <p className="mt-2 text-xs font-bold text-[var(--muted)]">Next timing: {result.timing}</p>}
        </div>
      )}
    </div>
  );
}
