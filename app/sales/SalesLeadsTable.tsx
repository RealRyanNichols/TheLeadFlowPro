"use client";

import { useState } from "react";
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
};

const STATUSES = ["new", "contacted", "call_booked", "proposal", "won", "lost"];

function pretty(value: string | null | undefined) {
  return value ? value.replace(/_/g, " ") : "Not answered";
}

export default function SalesLeadsTable({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function setStatus(id: string, status: string) {
    const previous = leads.find((lead) => lead.id === id)?.status;
    setLeads((items) => items.map((lead) => (lead.id === id ? { ...lead, status } : lead)));
    const { error: updateError } = await createClient().from("leads").update({ status }).eq("id", id);
    if (updateError) {
      setError(updateError.message);
      setLeads((items) => items.map((lead) => (lead.id === id ? { ...lead, status: previous ?? "new" } : lead)));
    }
  }

  if (leads.length === 0) {
    return <div className="card text-center text-[var(--muted)]">No live leads yet.</div>;
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg border border-[var(--danger-line)] bg-[var(--danger-tint)] p-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
      {leads.map((lead) => (
        <div key={lead.id} className="card !p-4">
          <div
            className="flex cursor-pointer flex-wrap items-center gap-3"
            onClick={() => setOpen(open === lead.id ? null : lead.id)}
          >
            <div className="min-w-0 flex-1">
              <span className="font-bold text-[var(--heading)]">{lead.full_name}</span>
              {lead.business_name && (
                <span className="ml-2 text-sm text-[var(--muted)]">{lead.business_name}</span>
              )}
              <div className="text-xs text-[var(--muted)]">
                {new Date(lead.created_at).toLocaleDateString()} · {pretty(lead.industry)} · prefers {pretty(lead.best_contact_method)}
              </div>
            </div>
            <select
              className="input !w-auto !py-1.5 text-sm"
              value={lead.status}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => setStatus(lead.id, event.target.value)}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>{pretty(status)}</option>
              ))}
            </select>
            <Link
              href={`/sales/leads/${lead.id}`}
              onClick={(event) => event.stopPropagation()}
              className="rounded-lg border border-[var(--line-strong)] px-3 py-1.5 text-sm font-semibold text-[var(--text)] hover:border-[var(--accent-line)] hover:text-[var(--heading)]"
            >
              Call sheet
            </Link>
          </div>

          {open === lead.id && (
            <div className="mt-4 grid gap-2 border-t border-line pt-4 text-sm text-[var(--text)] sm:grid-cols-2">
              <p><span className="text-[var(--muted)]">Email:</span> <a href={`mailto:${lead.email}`} className="text-flow-400">{lead.email}</a></p>
              <p><span className="text-[var(--muted)]">Phone:</span> {lead.phone ? <a href={`tel:${lead.phone}`} className="text-flow-400">{lead.phone}</a> : "Not provided"}</p>
              <p><span className="text-[var(--muted)]">Current presence:</span> {pretty(lead.current_platform)}</p>
              <p><span className="text-[var(--muted)]">Timeline:</span> {pretty(lead.timeline)}</p>
              <p className="sm:col-span-2 rounded-lg bg-[var(--page)] p-3">
                <span className="text-[var(--muted)]">What they want:</span> {lead.goals || "No open-text answer captured. Use the call notes in their call sheet."}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
