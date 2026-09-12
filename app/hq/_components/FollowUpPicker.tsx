"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { hqPost } from "./api";

// When to come back to this person. Three taps for the usual answers, a date
// box for anything else, and a way to take the reminder off entirely.

const PICKS: { label: string; days: number }[] = [
  { label: "Tomorrow", days: 1 },
  { label: "In 3 days", days: 3 },
  { label: "In a week", days: 7 },
];

function atNineAm(days: number): string {
  const at = new Date();
  at.setDate(at.getDate() + days);
  at.setHours(9, 0, 0, 0);
  return at.toISOString();
}

export default function FollowUpPicker({ leadId, current }: { leadId: string; current: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [custom, setCustom] = useState("");

  async function set(value: string | null, said: string) {
    setBusy(true);
    setError("");
    setSaved("");
    const result = await hqPost("update_lead", { lead_id: leadId, next_follow_up_at: value });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(said);
    router.refresh();
  }

  return (
    <section className="hq-card">
      <div className="flex items-center gap-2">
        <CalendarClock aria-hidden="true" className="h-5 w-5 text-[var(--blue)]" />
        <h2 className="text-lg font-black text-[var(--heading)]">Next follow-up</h2>
      </div>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {current ? "This lead is already on the list for a follow-up. Pick a different day to move it." : "Nothing scheduled. Pick a day and it lands on your brief that morning."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {PICKS.map((p) => (
          <button key={p.days} type="button" className="hq-btn hq-btn-sm" disabled={busy} onClick={() => set(atNineAm(p.days), `Set for ${p.label.toLowerCase()} at 9am.`)}>
            {p.label}
          </button>
        ))}
        {current && (
          <button type="button" className="hq-btn hq-btn-sm" disabled={busy} onClick={() => set(null, "Follow-up cleared.")}>
            Clear it
          </button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label className="hq-label" htmlFor={`follow-${leadId}`}>
            Or pick a date
          </label>
          <input id={`follow-${leadId}`} type="date" className="hq-input" value={custom} onChange={(e) => setCustom(e.target.value)} />
        </div>
        <button
          type="button"
          className="hq-btn"
          disabled={busy || !custom}
          onClick={() => {
            const at = new Date(`${custom}T09:00:00`);
            if (Number.isNaN(at.getTime())) {
              setError("That is not a date I can read.");
              return;
            }
            void set(at.toISOString(), "Follow-up date saved.");
          }}
        >
          Save the date
        </button>
      </div>
      {error && <p className="hq-error mt-3">{error}</p>}
      {saved && !error && <p className="hq-ok mt-3">{saved}</p>}
    </section>
  );
}
