"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileSearch, Loader2, PackageCheck, ShieldAlert, XCircle } from "lucide-react";
import { trackEvent } from "@/lib/events";

type ReviewAction =
  | "approve_research"
  | "approve_marketplace"
  | "reject"
  | "request_more_info"
  | "duplicate"
  | "prohibited"
  | "suppress"
  | "archive"
  | "convert_source_proof"
  | "convert_marketplace_listing"
  | "convert_lead_profile_batch";

const actions: Array<{ id: ReviewAction; label: string; tone: string; icon: typeof CheckCircle2 }> = [
  { id: "approve_research", label: "Approve research", tone: "border-lead-300/30 text-lead-100 hover:bg-lead-300/10", icon: CheckCircle2 },
  { id: "approve_marketplace", label: "Approve marketplace", tone: "border-cyan-300/30 text-cyan-100 hover:bg-cyan-300/10", icon: PackageCheck },
  { id: "request_more_info", label: "Needs permission", tone: "border-accent-300/30 text-accent-100 hover:bg-accent-300/10", icon: FileSearch },
  { id: "convert_source_proof", label: "Convert proof", tone: "border-white/15 text-white hover:bg-white/10", icon: FileSearch },
  { id: "convert_marketplace_listing", label: "Create listing", tone: "border-white/15 text-white hover:bg-white/10", icon: PackageCheck },
  { id: "convert_lead_profile_batch", label: "Create profile batch", tone: "border-white/15 text-white hover:bg-white/10", icon: PackageCheck },
  { id: "duplicate", label: "Duplicate", tone: "border-white/15 text-ink-200 hover:bg-white/10", icon: XCircle },
  { id: "reject", label: "Reject", tone: "border-red-300/25 text-red-100 hover:bg-red-400/10", icon: XCircle },
  { id: "prohibited", label: "Prohibited", tone: "border-red-300/35 text-red-100 hover:bg-red-400/10", icon: ShieldAlert },
  { id: "suppress", label: "Suppress", tone: "border-red-300/25 text-red-100 hover:bg-red-400/10", icon: ShieldAlert },
];

export function SourceSubmissionReviewActions({
  submissionId,
  sourceType,
  riskLevel,
}: {
  submissionId: string;
  sourceType: string;
  riskLevel: string;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState<ReviewAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(action: ReviewAction) {
    setPending(action);
    setError(null);
    try {
      const response = await fetch(`/api/leadflow/source-submissions/${submissionId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Review action failed.");
      trackEvent("admin_source_reviewed", {
        route: "/dashboard/source-submissions",
        action,
        source_type: sourceType,
        risk_level: riskLevel,
      });
      setNotes("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review action failed.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mt-5 rounded-lg border border-white/10 bg-black/20 p-4">
      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wider text-ink-500">Admin notes</span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          className="mt-2 w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-ink-600 focus:border-cyan-300/60"
          placeholder="Why this source is approved, blocked, needs proof, or ready to convert."
        />
      </label>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {actions.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => runAction(item.id)}
              disabled={Boolean(pending)}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-50 ${item.tone}`}
            >
              {pending === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
              {item.label}
            </button>
          );
        })}
      </div>
      {error ? <p className="mt-3 text-sm leading-6 text-red-100">{error}</p> : null}
    </div>
  );
}
