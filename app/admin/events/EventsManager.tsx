"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  REGISTRATION_STATUSES,
  SEAT_HOLDING_STATUSES,
  STATUS_LABELS,
  type RegistrationStatus,
} from "@/lib/events";

// Admin event management. Seat statuses follow the paid-seat model: pending
// registrations are leads, only paid/attended/no_show hold seats, and
// overbooked rows are refund decisions. Publishing is deliberate — a checklist
// confirms the event is actually ready before the switch flips.

type Registration = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  business_name: string | null;
  notes: string | null;
  bottleneck: string | null;
  status: string;
  seat_number: number | null;
  amount_paid_cents: number | null;
  paid_at: string | null;
  hot_seat: boolean;
  recording_consent: boolean;
  next_move_use_case: string | null;
  next_move_tool: string | null;
  next_move_action: string | null;
  review_requested_at: string | null;
  review_completed_at: string | null;
  created_at: string;
};

type EventRow = {
  id: string;
  slug: string;
  title: string;
  internal_title: string | null;
  subtitle: string | null;
  description: string | null;
  venue: string | null;
  city: string | null;
  starts_at: string | null;
  duration_minutes: number | null;
  price_usd: number;
  price_note: string | null;
  capacity: number | null;
  is_published: boolean;
  registration_closed: boolean;
  date_confirmed: boolean;
  clinic_enabled: boolean;
  event_registrations: Registration[];
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const STATUS_TIMESTAMPS: Partial<Record<RegistrationStatus, string>> = {
  attended: "attended_at",
  cancelled: "cancelled_at",
  transferred: "transferred_at",
};

/**
 * "2026-09-10T18:30" typed as Central wall-clock time → the UTC instant whose
 * Central rendering matches. One correction step handles CST/CDT either way.
 */
function centralWallClockToIso(value: string): string {
  const naive = new Date(`${value}:00Z`);
  const rendered = new Date(naive.toLocaleString("en-US", { timeZone: "America/Chicago" }));
  return new Date(naive.getTime() + (naive.getTime() - rendered.getTime())).toISOString();
}

function seatsTaken(ev: EventRow) {
  return ev.event_registrations.filter((r) =>
    SEAT_HOLDING_STATUSES.includes(r.status as RegistrationStatus),
  ).length;
}

export default function EventsManager({ initialEvents }: { initialEvents: EventRow[] }) {
  const [events, setEvents] = useState(initialEvents);
  const [showNew, setShowNew] = useState(false);
  const [openRegs, setOpenRegs] = useState<string | null>(null);
  const [editCard, setEditCard] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title"));
    const supabase = createClient();
    const { data, error } = await supabase
      .from("events")
      .insert({
        title,
        slug: slugify(title) + "-" + Math.random().toString(36).slice(2, 6),
        description: String(fd.get("description") || "") || null,
        venue: String(fd.get("venue") || "") || null,
        city: String(fd.get("city") || "") || null,
        starts_at: fd.get("starts_at") ? new Date(String(fd.get("starts_at"))).toISOString() : null,
        duration_minutes: fd.get("duration_minutes") ? Number(fd.get("duration_minutes")) : 90,
        price_usd: fd.get("price_usd") ? Number(fd.get("price_usd")) : 0,
        capacity: fd.get("capacity") ? Number(fd.get("capacity")) : null,
        is_published: false,
      })
      .select("*, event_registrations(*)")
      .single();
    if (!error && data) {
      setEvents((ev) => [data as EventRow, ...ev]);
      setShowNew(false);
    }
    setBusy(false);
  }

  async function updateEvent(id: string, patch: Partial<EventRow>) {
    setEvents((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    const supabase = createClient();
    const { error } = await supabase
      .from("events")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) alert(`Save failed: ${error.message}`);
  }

  function publishBlockers(ev: EventRow): string[] {
    const blockers: string[] = [];
    if (!ev.starts_at) blockers.push("No date set");
    if (!ev.date_confirmed) blockers.push("Date is not marked confirmed");
    if (Number(ev.price_usd) <= 0) blockers.push("Price is not set");
    if (!ev.capacity) blockers.push("Capacity is not set");
    if (!ev.venue) blockers.push("Venue is not set");
    return blockers;
  }

  async function togglePublish(ev: EventRow) {
    if (!ev.is_published) {
      const blockers = publishBlockers(ev);
      const warning = blockers.length
        ? `NOT READY:\n• ${blockers.join("\n• ")}\n\nPublish anyway?`
        : "Publish this event? It goes live on /events and starts accepting paid registrations immediately.";
      if (!window.confirm(warning)) return;
    }
    await updateEvent(ev.id, { is_published: !ev.is_published });
  }

  async function setRegStatus(eventId: string, regId: string, status: RegistrationStatus) {
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    const stampColumn = STATUS_TIMESTAMPS[status];
    if (stampColumn) patch[stampColumn] = new Date().toISOString();
    setEvents((es) =>
      es.map((e) =>
        e.id === eventId
          ? {
              ...e,
              event_registrations: e.event_registrations.map((r) =>
                r.id === regId ? { ...r, status } : r,
              ),
            }
          : e,
      ),
    );
    const supabase = createClient();
    const { error } = await supabase.from("event_registrations").update(patch).eq("id", regId);
    if (error) alert(`Save failed: ${error.message}`);
  }

  async function updateReg(eventId: string, regId: string, patch: Partial<Registration>) {
    setEvents((es) =>
      es.map((e) =>
        e.id === eventId
          ? {
              ...e,
              event_registrations: e.event_registrations.map((r) =>
                r.id === regId ? { ...r, ...patch } : r,
              ),
            }
          : e,
      ),
    );
    const supabase = createClient();
    const { error } = await supabase
      .from("event_registrations")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", regId);
    if (error) alert(`Save failed: ${error.message}`);
  }

  const totals = useMemo(() => {
    let paidSeats = 0;
    let cash = 0;
    for (const ev of events) {
      for (const r of ev.event_registrations) {
        if (SEAT_HOLDING_STATUSES.includes(r.status as RegistrationStatus)) {
          paidSeats += 1;
          cash += (r.amount_paid_cents ?? 0) / 100;
        }
      }
    }
    return { paidSeats, cash };
  }, [events]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[var(--muted)]">
          {totals.paidSeats} paid seats · ${totals.cash.toFixed(0)} collected across all events.
          A seat counts only when it is paid.
        </p>
        <button className="btn-primary !py-2 text-sm" onClick={() => setShowNew(!showNew)}>
          {showNew ? "Cancel" : "+ New Event"}
        </button>
      </div>

      {showNew && (
        <form onSubmit={createEvent} className="card mb-6 space-y-4">
          <div>
            <label className="label">Event title *</label>
            <input className="input" name="title" required placeholder="ChatGPT for Business Owners: Live in Longview" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" name="description" rows={3} placeholder="What they'll learn, what to bring, who it's for..." />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Venue</label>
              <input className="input" name="venue" placeholder="Longview Training Center" />
            </div>
            <div>
              <label className="label">City</label>
              <input className="input" name="city" placeholder="Longview, TX" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="label">Date & time</label>
              <input className="input" name="starts_at" type="datetime-local" />
            </div>
            <div>
              <label className="label">Length (min)</label>
              <input className="input" name="duration_minutes" type="number" defaultValue={90} />
            </div>
            <div>
              <label className="label">Price ($, 0 = free)</label>
              <input className="input" name="price_usd" type="number" step="1" min="0" defaultValue={97} />
            </div>
            <div>
              <label className="label">Capacity</label>
              <input className="input" name="capacity" type="number" min="1" placeholder="10" />
            </div>
          </div>
          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">
            {busy ? "Creating..." : "Create Event (draft)"}
          </button>
        </form>
      )}

      <div className="space-y-4">
        {events.map((ev) => {
          const taken = seatsTaken(ev);
          const blockers = publishBlockers(ev);
          return (
            <div key={ev.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[var(--heading)]">{ev.title}</h2>
                  <p className="text-xs text-[var(--muted)]">
                    {ev.starts_at
                      ? new Date(ev.starts_at).toLocaleString("en-US", { timeZone: "America/Chicago" }) +
                        (ev.date_confirmed ? "" : " (NOT CONFIRMED)")
                      : "Date TBA"}
                    {ev.venue && ` · ${ev.venue}`}
                    {ev.city && `, ${ev.city}`}
                    {" · "}
                    {Number(ev.price_usd) > 0 ? `$${Number(ev.price_usd)}/seat` : "Free"}
                    {ev.capacity && ` · ${taken}/${ev.capacity} seats paid`}
                    {" · "}
                    <a
                      href={`/events/${ev.slug}`}
                      className="underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      /events/{ev.slug}
                    </a>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => setEditCard(editCard === ev.id ? null : ev.id)} className="btn-ghost !px-3 !py-1.5 !text-xs">
                    {editCard === ev.id ? "Close" : "Edit"}
                  </button>
                  <button onClick={() => setOpenRegs(openRegs === ev.id ? null : ev.id)} className="btn-ghost !px-3 !py-1.5 !text-xs">
                    {ev.event_registrations.length} registered
                  </button>
                  <button
                    onClick={() => togglePublish(ev)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                      ev.is_published ? "bg-mint/20 text-mint" : "bg-line text-[var(--muted)]"
                    }`}
                  >
                    {ev.is_published ? "PUBLISHED" : "DRAFT — click to publish"}
                  </button>
                </div>
              </div>

              {!ev.is_published && blockers.length > 0 && (
                <p className="mt-2 text-xs font-semibold text-[var(--warn)]">
                  Not ready to publish: {blockers.join(" · ")}
                </p>
              )}

              {editCard === ev.id && (
                <div className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-3">
                  <div>
                    <label className="label">Date &amp; time (Central)</label>
                    <input
                      className="input"
                      type="datetime-local"
                      defaultValue={
                        ev.starts_at
                          ? new Date(ev.starts_at)
                              .toLocaleString("sv-SE", { timeZone: "America/Chicago" })
                              .slice(0, 16)
                          : ""
                      }
                      onBlur={(e) => {
                        if (!e.target.value) return;
                        updateEvent(ev.id, { starts_at: centralWallClockToIso(e.target.value) });
                      }}
                    />
                    <p className="mt-1 text-[11px] text-[var(--muted)]">Entered and saved as Central time.</p>
                  </div>
                  <div>
                    <label className="label">Price ($)</label>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      defaultValue={Number(ev.price_usd)}
                      onBlur={(e) => updateEvent(ev.id, { price_usd: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="label">Capacity</label>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      defaultValue={ev.capacity ?? ""}
                      onBlur={(e) =>
                        updateEvent(ev.id, { capacity: e.target.value ? Number(e.target.value) : null })
                      }
                    />
                  </div>
                  <div className="sm:col-span-3 flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={ev.date_confirmed}
                        onChange={(e) => updateEvent(ev.id, { date_confirmed: e.target.checked })}
                      />
                      Date is confirmed
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={ev.registration_closed}
                        onChange={(e) => updateEvent(ev.id, { registration_closed: e.target.checked })}
                      />
                      Registration closed
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={ev.clinic_enabled}
                        onChange={(e) => updateEvent(ev.id, { clinic_enabled: e.target.checked })}
                      />
                      AI Business Clinic after class
                    </label>
                  </div>
                </div>
              )}

              {openRegs === ev.id && (
                <div className="mt-4 space-y-2 border-t border-line pt-4">
                  {ev.event_registrations.length === 0 && (
                    <p className="text-sm text-[var(--muted)]">No registrations yet.</p>
                  )}
                  {ev.event_registrations.map((r) => (
                    <div key={r.id} className="rounded-lg bg-[var(--page)] p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-semibold text-[var(--heading)]">
                            {r.seat_number ? `#${r.seat_number} ` : ""}
                            {r.full_name}
                          </span>
                          <span className="ml-2 text-[var(--muted)]">
                            {r.email}
                            {r.phone && ` · ${r.phone}`}
                            {r.business_name && ` · ${r.business_name}`}
                            {r.amount_paid_cents != null && ` · $${(r.amount_paid_cents / 100).toFixed(0)} paid`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 text-xs font-bold">
                            <input
                              type="checkbox"
                              checked={r.hot_seat}
                              onChange={(e) => updateReg(ev.id, r.id, { hot_seat: e.target.checked })}
                            />
                            Hot seat
                          </label>
                          <select
                            className="input !w-auto !py-1 text-xs"
                            value={r.status}
                            onChange={(e) =>
                              setRegStatus(ev.id, r.id, e.target.value as RegistrationStatus)
                            }
                          >
                            {REGISTRATION_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {STATUS_LABELS[s]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {r.bottleneck && (
                        <p className="mt-2 text-xs">
                          <span className="font-bold uppercase tracking-wide text-[var(--muted)]">Bottleneck:</span>{" "}
                          {r.bottleneck}
                        </p>
                      )}
                      {r.notes && <p className="mt-1 text-xs text-[var(--muted)]">{r.notes}</p>}
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-bold text-[var(--blue)]">
                          Next Move card
                          {r.next_move_use_case ? " ✓" : ""}
                        </summary>
                        <div className="mt-2 grid gap-2 sm:grid-cols-3">
                          <input
                            className="input !py-1.5 text-xs"
                            placeholder="Use case"
                            defaultValue={r.next_move_use_case ?? ""}
                            onBlur={(e) =>
                              updateReg(ev.id, r.id, { next_move_use_case: e.target.value || null })
                            }
                          />
                          <input
                            className="input !py-1.5 text-xs"
                            placeholder="Recommended tool"
                            defaultValue={r.next_move_tool ?? ""}
                            onBlur={(e) =>
                              updateReg(ev.id, r.id, { next_move_tool: e.target.value || null })
                            }
                          />
                          <input
                            className="input !py-1.5 text-xs"
                            placeholder="Next action"
                            defaultValue={r.next_move_action ?? ""}
                            onBlur={(e) =>
                              updateReg(ev.id, r.id, { next_move_action: e.target.value || null })
                            }
                          />
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {events.length === 0 && (
          <div className="card text-center text-[var(--muted)]">
            No events yet. Create your first workshop above.
          </div>
        )}
      </div>
    </div>
  );
}
