"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, LoaderCircle } from "lucide-react";

export default function VoidCashButton({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function voidEntry() {
    const reason = window.prompt("Why should this cash entry be voided? The audit record will remain.");
    if (!reason?.trim()) return;
    if (!window.confirm("Void this cash entry and remove it from verified cash totals?")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/operator/cash/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation: "void", reason: reason.trim() }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "The cash entry could not be voided");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The cash entry could not be voided");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" disabled={busy} onClick={voidEntry} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-black text-red-800 disabled:opacity-50">
        {busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />} Void
      </button>
      {error && <p className="mt-1 max-w-[180px] text-[11px] font-bold text-red-700">{error}</p>}
    </div>
  );
}
