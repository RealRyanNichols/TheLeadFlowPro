"use client";

import { useState } from "react";
import { ArrowRight, Check, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type ReviewDeliverable = {
  id: string;
  title: string;
  kind: string;
  url: string | null;
  notes: string | null;
  description: string | null;
  status: string;
  due_date: string | null;
  result_summary: string | null;
  requires_approval: boolean;
  client_decision: string;
  client_feedback: string | null;
  client_reviewed_at: string | null;
  created_at: string;
  sort_order: number;
};

function pretty(value: string) {
  return value.replace(/_/g, " ");
}

export default function DeliverableReview({ initialDeliverables }: { initialDeliverables: ReviewDeliverable[] }) {
  const [deliverables, setDeliverables] = useState(initialDeliverables);
  const [feedback, setFeedback] = useState<Record<string, string>>(() => Object.fromEntries(initialDeliverables.map((item) => [item.id, item.client_feedback || ""])));
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function decide(deliverable: ReviewDeliverable, decision: "approved" | "revision_requested") {
    const note = (feedback[deliverable.id] || "").trim();
    if (decision === "revision_requested" && !note) {
      setError("Tell us what you want changed so the team can act on it.");
      return;
    }
    setBusy(deliverable.id);
    setError("");
    const reviewedAt = new Date().toISOString();
    const { data, error: updateError } = await createClient().from("deliverables").update({
      client_decision: decision,
      client_feedback: note || null,
      client_reviewed_at: reviewedAt,
    }).eq("id", deliverable.id).select().single();
    if (updateError || !data) setError(updateError?.message || "Your review could not be saved");
    else setDeliverables((items) => items.map((item) => item.id === deliverable.id ? { ...item, ...data } as ReviewDeliverable : item));
    setBusy("");
  }

  if (!deliverables.length) {
    return <p className="mt-5 text-sm text-[var(--muted)]">The first working file will appear here when it is ready.</p>;
  }

  return (
    <div className="mt-5 space-y-4">
      {error && <p className="rounded-lg border border-[var(--danger-line)] bg-[var(--danger-tint)] p-3 text-sm text-[var(--danger)]">{error}</p>}
      {deliverables.map((item) => {
        const reviewable = item.requires_approval && ["ready_for_review", "revision_requested", "approved", "delivered"].includes(item.status);
        return (
          <article key={item.id} className="rounded-2xl border border-[var(--line)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-[var(--heading)]">{item.title}</h3><span className="rounded-full bg-[var(--fill-3)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">{pretty(item.kind)}</span><span className="rounded-full bg-[var(--accent-tint)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--blue)]">{pretty(item.status)}</span></div>
                {item.description && <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.description}</p>}
                {item.result_summary && <div className="mt-3 rounded-xl border border-[var(--accent-line)] bg-[var(--accent-tint)] p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[var(--blue)]">Result you can see now</p><p className="mt-1 text-sm leading-6 text-[var(--text)]">{item.result_summary}</p></div>}
              </div>
              {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--line-strong)] px-3 py-2 text-sm font-bold text-[var(--blue)] hover:border-[var(--accent-line)]">Open work <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>}
            </div>

            {reviewable && (
              <div className="mt-4 border-t border-[var(--line)] pt-4">
                {item.client_decision === "approved" ? (
                  <p className="flex items-center gap-2 rounded-xl bg-[var(--green-tint)] p-3 text-sm font-bold text-[var(--green)]"><Check className="h-4 w-4" aria-hidden="true" /> You approved this deliverable{item.client_reviewed_at ? ` on ${new Date(item.client_reviewed_at).toLocaleDateString()}` : ""}.</p>
                ) : (
                  <>
                    <label className="block"><span className="label">Feedback or requested changes</span><textarea className="input text-sm" rows={3} value={feedback[item.id] || ""} onChange={(event) => setFeedback((values) => ({ ...values, [item.id]: event.target.value }))} maxLength={4000} placeholder="Be specific so we can make the next version right." /></label>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row"><button type="button" disabled={busy === item.id} onClick={() => decide(item, "approved")} className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-50"><Check className="h-4 w-4" aria-hidden="true" /> Approve this work</button><button type="button" disabled={busy === item.id} onClick={() => decide(item, "revision_requested")} className="btn-ghost inline-flex items-center justify-center gap-2 disabled:opacity-50"><RotateCcw className="h-4 w-4" aria-hidden="true" /> Request changes</button></div>
                    {item.client_decision === "revision_requested" && <p className="mt-3 text-sm font-bold text-[var(--blue)]">Your change request is recorded. The team can see it in the Delivery Center.</p>}
                  </>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
