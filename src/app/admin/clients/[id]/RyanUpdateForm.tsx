"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Send } from "lucide-react";

const STATUSES = [
  "intake_needed",
  "in_progress",
  "waiting_on_client",
  "pending_review",
  "delivered",
  "completed",
  "canceled",
];

export function RyanUpdateForm({
  orderId,
  currentStatus,
  completedHours,
}: {
  orderId: string;
  currentStatus: string;
  completedHours: number;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(currentStatus);
  const [hours, setHours] = useState(String(completedHours || 0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/admin/work-orders/${orderId}/ryan-update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        status,
        completedHours: Number(hours),
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || `HTTP ${res.status}`);
      setSaving(false);
      return;
    }

    setMessage("");
    setSaving(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
      <div className="text-sm font-semibold text-white">Send Ryan update to this client office</div>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">
        This writes into the same work-order stream the client sees after login.
      </p>
      {error ? (
        <div className="mt-3 rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
          {error}
        </div>
      ) : null}
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={4}
        placeholder="Tell the client what you need, what changed, what was delivered, or what happens next."
        className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/50"
      />
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Status
          </span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/50"
          >
            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {item.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Completed hours
          </span>
          <input
            value={hours}
            onChange={(event) => setHours(event.target.value)}
            type="number"
            min="0"
            step="0.25"
            className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/50"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-3 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-60"
      >
        {saving ? "Sending..." : "Send update"} <Send className="h-4 w-4" />
      </button>
    </form>
  );
}
