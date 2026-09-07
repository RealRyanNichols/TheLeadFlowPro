"use client";

import { useState } from "react";
import {
  Clock3,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  UserRound,
} from "lucide-react";
import type { LeadTimelineItem } from "@/lib/leadTimeline";

const FILTERS = [
  { id: "all", label: "Everything" },
  { id: "message", label: "Messages" },
  { id: "note", label: "Team notes" },
  { id: "call", label: "Calls" },
  { id: "email", label: "Email delivery" },
] as const;
const ICONS = {
  intake: UserRound,
  note: FileText,
  message: MessageSquare,
  email: Mail,
  activity: Clock3,
  call: Phone,
};

export default function LeadHistory({ items }: { items: LeadTimelineItem[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [limit, setLimit] = useState(12);
  const filtered = items.filter(
    (item) => filter === "all" || item.kind === filter,
  );
  return (
    <section
      id="lead-history"
      className="card scroll-mt-24 !p-4"
      aria-labelledby="lead-history-heading"
    >
      <h2
        id="lead-history-heading"
        className="text-xl font-black text-[var(--heading)]"
      >
        One lead. The full recorded history.
      </h2>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Newest first. Messages, team notes, business calls, and follow-up
        delivery stay together.
      </p>
      <div
        className="mt-4 flex flex-wrap gap-2"
        aria-label="Filter lead history"
      >
        {FILTERS.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={filter === option.id}
            onClick={() => {
              setFilter(option.id);
              setLimit(12);
            }}
            className={`min-h-11 rounded-lg border px-3 py-2 text-xs font-bold ${filter === option.id ? "border-[var(--blue)] bg-[var(--accent-tint)] text-[var(--blue)]" : "border-[var(--line)] text-[var(--muted)]"}`}
          >
            {option.label}{" "}
            <span className="ml-1">
              {option.id === "all"
                ? items.length
                : items.filter((item) => item.kind === option.id).length}
            </span>
          </button>
        ))}
      </div>
      <ol className="mt-5 space-y-4">
        {filtered.slice(0, limit).map((item) => {
          const Icon = ICONS[item.kind];
          return (
            <li
              key={item.id}
              className="flex min-w-0 gap-3 rounded-xl border border-[var(--line)] bg-[var(--page)] p-3"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-tint)] text-[var(--blue)]">
                <Icon size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-[var(--heading)]">
                  {item.title}
                </h3>
                <p className="mt-1 break-words text-xs text-[var(--muted)]">
                  {item.author} ·{" "}
                  {item.at && Number.isFinite(Date.parse(item.at))
                    ? new Date(item.at).toLocaleString()
                    : "Date not recorded"}
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-[var(--text)]">
                  {item.body}
                </p>
                {item.status && (
                  <p className="mt-2 text-xs font-semibold text-[var(--muted)]">
                    {item.status}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {!filtered.length && (
        <p className="mt-4 text-sm text-[var(--muted)]">
          No records in this category for this lead.
        </p>
      )}
      {filtered.length > limit && (
        <button
          type="button"
          className="mt-4 min-h-11 rounded-lg border border-[var(--line)] px-4 py-2 text-sm font-bold"
          onClick={() => setLimit(limit + 12)}
        >
          Show more history ({filtered.length - limit} remaining)
        </button>
      )}
      <p className="mt-4 rounded-lg bg-[var(--fill-3)] p-3 text-xs leading-relaxed text-[var(--muted)]">
        This is the history saved in this CRM. Sending an email here does not
        connect an Outlook inbox. Replies received elsewhere appear only after
        they are imported or manually logged. “Provider accepted” is not proof
        that a person received or read an email.
      </p>
    </section>
  );
}
