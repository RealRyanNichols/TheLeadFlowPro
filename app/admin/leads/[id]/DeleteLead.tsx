"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Remove a lead from the pipeline. Soft delete: the row keeps its consent
// record and attribution and can be restored from the database, but it leaves
// every admin view, the CSV export, and the follow-up automation immediately.
//
// Two-step on purpose. One stray click should not clear a real lead, and the
// second step names the person so you can see what you are about to remove.

export default function DeleteLead({
  leadId,
  leadName,
}: {
  leadId: string;
  leadName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error: err } = await supabase
      .from("leads")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", leadId);
    if (err) {
      setError(err.message);
      setBusy(false);
      return;
    }
    router.push("/admin?deleted=1");
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-[var(--danger-line)] px-3 py-2 text-xs font-bold text-[var(--danger)] transition hover:bg-[var(--danger-tint)]"
      >
        Delete lead
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--danger-line)] bg-[var(--danger-tint)] p-3">
      <p className="text-xs font-bold text-[var(--danger)]">
        Delete {leadName}? They leave the pipeline, the export, and all follow-up.
      </p>
      {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="rounded-lg bg-[var(--danger)] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
        >
          {busy ? "Deleting" : "Yes, delete"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-lg border border-[var(--line-strong)] px-3 py-1.5 text-xs font-bold text-[var(--text)]"
        >
          Keep it
        </button>
      </div>
    </div>
  );
}
