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
  monthly_platform_spend: string | null;
  interest: string;
  goals: string | null;
  timeline: string | null;
  best_contact_method: string | null;
  status: string;
  notes: string | null;
  is_test?: boolean;
};

const STATUSES = ["new", "contacted", "call_booked", "proposal", "won", "lost"];
const INTEREST_LABELS: Record<string, string> = {
  learn: "Learn It",
  build_with_you: "Build With You",
  done_for_you: "Done For You",
  unsure: "Unsure",
  blueprint: "System Map",
  launch_system: "LeadFlow Launch",
  industry_os: "Industry OS",
  custom_platform: "Custom Platform",
  operations: "Operations Partner",
};

export default function LeadsTable({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [open, setOpen] = useState<string | null>(null);
  // Bulk delete: the fastest way to clear out the test leads that pile up
  // while a form is being built. Soft delete, so a mistake is recoverable.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    setBusy(true);
    const ids = [...selected];
    const supabase = createClient();
    const { error } = await supabase
      .from("leads")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", ids);
    if (!error) {
      setLeads((ls) => ls.filter((l) => !selected.has(l.id)));
      setSelected(new Set());
      setConfirming(false);
    }
    setBusy(false);
  }

  async function setStatus(id: string, status: string) {
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status } : l)));
    const supabase = createClient();
    await supabase.from("leads").update({ status }).eq("id", id);
  }

  if (leads.length === 0) {
    return (
      <div className="card text-center text-[var(--muted)]">
        No leads yet. Share the site and they will land here.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--danger-line)] bg-[var(--danger-tint)] px-4 py-3">
          <span className="text-sm font-bold text-[var(--danger)]">
            {selected.size} selected
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-lg border border-[var(--line-strong)] px-3 py-1.5 text-xs font-bold text-[var(--text)]"
            >
              Clear
            </button>
            {confirming ? (
              <button
                type="button"
                onClick={deleteSelected}
                disabled={busy}
                className="rounded-lg bg-[var(--danger)] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
              >
                {busy ? "Deleting" : `Yes, delete ${selected.size}`}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="rounded-lg border border-[var(--danger-line)] px-3 py-1.5 text-xs font-bold text-[var(--danger)]"
              >
                Delete selected
              </button>
            )}
          </div>
        </div>
      )}
      {leads.map((l) => (
        <div key={l.id} className="card !p-4">
          <div
            className="flex cursor-pointer flex-wrap items-center gap-3"
            onClick={() => setOpen(open === l.id ? null : l.id)}
          >
            <input
              type="checkbox"
              checked={selected.has(l.id)}
              onClick={(e) => e.stopPropagation()}
              onChange={() => toggle(l.id)}
              aria-label={`Select ${l.full_name}`}
              className="h-4 w-4 flex-none"
            />
            <div className="min-w-0 flex-1">
              <span className="font-bold text-[var(--heading)]">{l.full_name}</span>
              {l.business_name && (
                <span className="ml-2 text-sm text-[var(--muted)]">{l.business_name}</span>
              )}
              <div className="text-xs text-[var(--muted)]">
                {new Date(l.created_at).toLocaleDateString()} ·{" "}
                {INTEREST_LABELS[l.interest] ?? l.interest}
                {l.monthly_platform_spend && ` · spends ${l.monthly_platform_spend.replace(/_/g, " ")}`}
                {l.is_test && (
                  <span className="ml-2 rounded-full bg-[var(--warn-tint)] px-2 py-0.5 text-[10px] font-black uppercase text-warn">
                    test
                  </span>
                )}
              </div>
            </div>
            <select
              className="input !w-auto !py-1.5 text-sm"
              value={l.status}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setStatus(l.id, e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <Link
              href={`/admin/leads/${l.id}`}
              onClick={(e) => e.stopPropagation()}
              className="rounded-lg border border-[var(--line-strong)] px-3 py-1.5 text-sm font-semibold text-[var(--text)] hover:border-[var(--accent-line)] hover:text-[var(--heading)]"
            >
              Workspace
            </Link>
          </div>

          {open === l.id && (
            <div className="mt-4 space-y-2 border-t border-line pt-4 text-sm text-[var(--text)]">
              <p>
                <span className="text-[var(--muted)]">Email:</span>{" "}
                <a href={`mailto:${l.email}`} className="text-flow-400">{l.email}</a>
                {l.phone && (
                  <>
                    {" · "}
                    <span className="text-[var(--muted)]">Phone:</span>{" "}
                    <a href={`tel:${l.phone}`} className="text-flow-400">{l.phone}</a>
                  </>
                )}
              </p>
              {l.current_platform && (
                <p>
                  <span className="text-[var(--muted)]">Current platform:</span>{" "}
                  {l.current_platform.replace(/_/g, " ")}
                </p>
              )}
              {l.timeline && (
                <p>
                  <span className="text-[var(--muted)]">Timeline:</span> {l.timeline.replace(/_/g, " ")}
                </p>
              )}
              {l.best_contact_method && (
                <p>
                  <span className="text-[var(--muted)]">Prefers:</span> {l.best_contact_method}
                </p>
              )}
              {l.goals && (
                <p className="rounded-lg bg-[var(--page)] p-3">
                  <span className="text-[var(--muted)]">What they want:</span> {l.goals}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
