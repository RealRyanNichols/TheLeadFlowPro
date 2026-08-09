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

  async function setStatus(id: string, status: string) {
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status } : l)));
    const supabase = createClient();
    await supabase.from("leads").update({ status }).eq("id", id);
  }

  if (leads.length === 0) {
    return (
      <div className="card text-center text-slate-400">
        No leads yet. Share the site and they will land here.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {leads.map((l) => (
        <div key={l.id} className="card !p-4">
          <div
            className="flex cursor-pointer flex-wrap items-center gap-3"
            onClick={() => setOpen(open === l.id ? null : l.id)}
          >
            <div className="min-w-0 flex-1">
              <span className="font-bold text-white">{l.full_name}</span>
              {l.business_name && (
                <span className="ml-2 text-sm text-slate-400">{l.business_name}</span>
              )}
              <div className="text-xs text-slate-400">
                {new Date(l.created_at).toLocaleDateString()} ·{" "}
                {INTEREST_LABELS[l.interest] ?? l.interest}
                {l.monthly_platform_spend && ` · spends ${l.monthly_platform_spend.replace(/_/g, " ")}`}
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
              className="rounded-lg border border-white/15 px-3 py-1.5 text-sm font-semibold text-slate-200 hover:border-sky-400/60 hover:text-white"
            >
              Workspace
            </Link>
          </div>

          {open === l.id && (
            <div className="mt-4 space-y-2 border-t border-line pt-4 text-sm text-slate-300">
              <p>
                <span className="text-slate-400">Email:</span>{" "}
                <a href={`mailto:${l.email}`} className="text-flow-400">{l.email}</a>
                {l.phone && (
                  <>
                    {" · "}
                    <span className="text-slate-400">Phone:</span>{" "}
                    <a href={`tel:${l.phone}`} className="text-flow-400">{l.phone}</a>
                  </>
                )}
              </p>
              {l.current_platform && (
                <p>
                  <span className="text-slate-400">Current platform:</span>{" "}
                  {l.current_platform.replace(/_/g, " ")}
                </p>
              )}
              {l.timeline && (
                <p>
                  <span className="text-slate-400">Timeline:</span> {l.timeline.replace(/_/g, " ")}
                </p>
              )}
              {l.best_contact_method && (
                <p>
                  <span className="text-slate-400">Prefers:</span> {l.best_contact_method}
                </p>
              )}
              {l.goals && (
                <p className="rounded-lg bg-ink p-3">
                  <span className="text-slate-400">What they want:</span> {l.goals}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
