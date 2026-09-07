"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Lead = {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone: string | null;
  business_name: string | null;
  current_platform: string | null;
  industry: string | null;
  interest: string;
  goals: string | null;
  timeline: string | null;
  best_contact_method: string | null;
  status: string;
  priority: string;
  next_follow_up_at: string | null;
  expected_value_cents: number | null;
  close_probability: number | null;
  owner: string | null;
};

const STATUSES = ["new", "contacted", "call_booked", "proposal", "won", "lost"];

function pretty(value: string | null | undefined) {
  return value ? value.replace(/_/g, " ") : "Not answered";
}

export default function SalesLeadsTable({
  initialLeads,
}: {
  initialLeads: Lead[];
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Set<string>>(new Set());
  const pendingStatuses = useRef(new Map<string, string>());
  const router = useRouter();

  useEffect(() => {
    setLeads(
      initialLeads.map((lead) => ({
        ...lead,
        status: pendingStatuses.current.get(lead.id) ?? lead.status,
      })),
    );
  }, [initialLeads]);

  async function setStatus(id: string, status: string) {
    if (pendingStatuses.current.has(id)) return;
    setError("");
    pendingStatuses.current.set(id, status);
    setPending(new Set(pendingStatuses.current.keys()));
    const previous = leads.find((lead) => lead.id === id)?.status;
    setLeads((items) =>
      items.map((lead) => (lead.id === id ? { ...lead, status } : lead)),
    );
    try {
      const { data, error: updateError } = await createClient()
        .from("leads")
        .update({ status })
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (updateError || !data)
        throw new Error(
          updateError?.message ||
            "The lead was not updated. Refresh and check your access.",
        );
      router.refresh();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "The update could not be saved. Try again.",
      );
      setLeads((items) =>
        items.map((lead) =>
          lead.id === id ? { ...lead, status: previous ?? "new" } : lead,
        ),
      );
    } finally {
      pendingStatuses.current.delete(id);
      setPending(new Set(pendingStatuses.current.keys()));
    }
  }

  if (leads.length === 0) {
    return (
      <div className="card text-center text-[var(--muted)]">
        No live leads yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-[var(--danger-line)] bg-[var(--danger-tint)] p-3 text-sm text-[var(--danger)]"
        >
          {error}
        </p>
      )}
      {leads.map((lead) => (
        <div key={lead.id} className="card !p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <button
                type="button"
                className="min-h-[44px] text-left font-bold text-[var(--heading)]"
                aria-expanded={open === lead.id}
                aria-controls={`lead-preview-${lead.id}`}
                onClick={() => setOpen(open === lead.id ? null : lead.id)}
              >
                {lead.full_name}{" "}
                <span className="text-xs text-flow-400">
                  {open === lead.id ? "Hide details" : "Quick details"}
                </span>
              </button>
              {lead.business_name && (
                <span className="ml-2 text-sm text-[var(--muted)]">
                  {lead.business_name}
                </span>
              )}
              <div className="text-xs text-[var(--muted)]">
                {new Date(lead.created_at).toLocaleDateString()} ·{" "}
                {pretty(lead.industry)} · prefers{" "}
                {pretty(lead.best_contact_method)}
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-semibold">
                <span
                  className={`rounded-full px-2 py-0.5 uppercase ${lead.priority === "hot" ? "bg-[var(--danger-tint)] text-[var(--danger)]" : lead.priority === "high" ? "bg-[var(--warn-tint)] text-warn" : "bg-[var(--fill-3)] text-[var(--muted)]"}`}
                >
                  {lead.priority || "normal"}
                </span>
                {lead.next_follow_up_at && (
                  <span className="text-flow-400">
                    Follow up{" "}
                    {new Date(lead.next_follow_up_at).toLocaleDateString()}
                  </span>
                )}
                {lead.expected_value_cents !== null && (
                  <span className="text-[var(--text)]">
                    ${(lead.expected_value_cents / 100).toLocaleString()}{" "}
                    opportunity
                  </span>
                )}
                {lead.close_probability !== null && (
                  <span className="text-[var(--text)]">
                    {lead.close_probability}% confidence
                  </span>
                )}
              </div>
            </div>
            <select
              className="input !w-auto !py-1.5 text-sm"
              aria-label={`Status for ${lead.full_name}`}
              disabled={pending.has(lead.id)}
              value={lead.status}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => setStatus(lead.id, event.target.value)}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {pretty(status)}
                </option>
              ))}
            </select>
            <Link
              href={`/admin/sales/leads/${lead.id}`}
              onClick={(event) => event.stopPropagation()}
              className="rounded-lg border border-[var(--line-strong)] px-3 py-1.5 text-sm font-semibold text-[var(--text)] hover:border-[var(--accent-line)] hover:text-[var(--heading)]"
            >
              Call sheet
            </Link>
          </div>

          {open === lead.id && (
            <div
              id={`lead-preview-${lead.id}`}
              className="mt-4 grid gap-2 border-t border-line pt-4 text-sm text-[var(--text)] sm:grid-cols-2"
            >
              <p>
                <span className="text-[var(--muted)]">Email:</span>{" "}
                <a href={`mailto:${lead.email}`} className="text-flow-400">
                  {lead.email}
                </a>
              </p>
              <p>
                <span className="text-[var(--muted)]">Phone:</span>{" "}
                {lead.phone ? (
                  <a href={`tel:${lead.phone}`} className="text-flow-400">
                    {lead.phone}
                  </a>
                ) : (
                  "Not provided"
                )}
              </p>
              <p>
                <span className="text-[var(--muted)]">Current presence:</span>{" "}
                {pretty(lead.current_platform)}
              </p>
              <p>
                <span className="text-[var(--muted)]">Timeline:</span>{" "}
                {pretty(lead.timeline)}
              </p>
              <p>
                <span className="text-[var(--muted)]">Owner:</span>{" "}
                {lead.owner || "Unassigned"}
              </p>
              <p className="sm:col-span-2 rounded-lg bg-[var(--page)] p-3">
                <span className="text-[var(--muted)]">What they want:</span>{" "}
                {lead.goals ||
                  "No open-text answer captured. Use the call notes in their call sheet."}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
