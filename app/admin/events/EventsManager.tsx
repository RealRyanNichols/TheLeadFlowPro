"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Registration = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  business_name: string | null;
  notes: string | null;
  status: string;
  created_at: string;
};

type EventRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  venue: string | null;
  city: string | null;
  starts_at: string | null;
  duration_minutes: number | null;
  price_usd: number;
  capacity: number | null;
  is_published: boolean;
  event_registrations: Registration[];
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export default function EventsManager({ initialEvents }: { initialEvents: EventRow[] }) {
  const [events, setEvents] = useState(initialEvents);
  const [showNew, setShowNew] = useState(false);
  const [openRegs, setOpenRegs] = useState<string | null>(null);
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
        duration_minutes: fd.get("duration_minutes") ? Number(fd.get("duration_minutes")) : 120,
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

  async function togglePublish(ev: EventRow) {
    const supabase = createClient();
    setEvents((es) =>
      es.map((e) => (e.id === ev.id ? { ...e, is_published: !e.is_published } : e))
    );
    await supabase.from("events").update({ is_published: !ev.is_published }).eq("id", ev.id);
  }

  async function setRegStatus(eventId: string, regId: string, status: string) {
    setEvents((es) =>
      es.map((e) =>
        e.id === eventId
          ? {
              ...e,
              event_registrations: e.event_registrations.map((r) =>
                r.id === regId ? { ...r, status } : r
              ),
            }
          : e
      )
    );
    const supabase = createClient();
    await supabase.from("event_registrations").update({ status }).eq("id", regId);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-slate-400">
          Create a workshop or seminar, set YOUR price (0 = free), publish when
          ready. Registrations land here.
        </p>
        <button className="btn-primary !py-2 text-sm" onClick={() => setShowNew(!showNew)}>
          {showNew ? "Cancel" : "+ New Event"}
        </button>
      </div>

      {showNew && (
        <form onSubmit={createEvent} className="card mb-6 space-y-4">
          <div>
            <label className="label">Event title *</label>
            <input
              className="input"
              name="title"
              required
              placeholder="Own Your Platform: Hands-On Workshop"
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input"
              name="description"
              rows={3}
              placeholder="What they'll learn, what to bring, who it's for..."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Venue</label>
              <input className="input" name="venue" placeholder="The Coop" />
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
              <input className="input" name="duration_minutes" type="number" defaultValue={120} />
            </div>
            <div>
              <label className="label">Price ($, 0 = free)</label>
              <input className="input" name="price_usd" type="number" step="1" min="0" defaultValue={0} />
            </div>
            <div>
              <label className="label">Capacity</label>
              <input className="input" name="capacity" type="number" min="1" placeholder="30" />
            </div>
          </div>
          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">
            {busy ? "Creating..." : "Create Event (draft)"}
          </button>
        </form>
      )}

      <div className="space-y-4">
        {events.map((ev) => (
          <div key={ev.id} className="card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">{ev.title}</h2>
                <p className="text-xs text-slate-400">
                  {ev.starts_at
                    ? new Date(ev.starts_at).toLocaleString("en-US", { timeZone: "America/Chicago" })
                    : "Date TBA"}
                  {ev.venue && ` · ${ev.venue}`}
                  {ev.city && `, ${ev.city}`}
                  {" · "}
                  {Number(ev.price_usd) > 0 ? `$${Number(ev.price_usd)}/seat` : "Free"}
                  {ev.capacity && ` · cap ${ev.capacity}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setOpenRegs(openRegs === ev.id ? null : ev.id)}
                  className="btn-ghost !px-3 !py-1.5 !text-xs"
                >
                  {ev.event_registrations.length} registered
                </button>
                <button
                  onClick={() => togglePublish(ev)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                    ev.is_published ? "bg-mint/20 text-mint" : "bg-line text-slate-400"
                  }`}
                >
                  {ev.is_published ? "PUBLISHED" : "DRAFT — click to publish"}
                </button>
              </div>
            </div>

            {openRegs === ev.id && (
              <div className="mt-4 space-y-2 border-t border-line pt-4">
                {ev.event_registrations.length === 0 && (
                  <p className="text-sm text-slate-400">No registrations yet.</p>
                )}
                {ev.event_registrations.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-ink p-3 text-sm"
                  >
                    <div>
                      <span className="font-semibold text-white">{r.full_name}</span>
                      <span className="ml-2 text-slate-400">
                        {r.email}
                        {r.phone && ` · ${r.phone}`}
                        {r.business_name && ` · ${r.business_name}`}
                      </span>
                      {r.notes && <p className="mt-1 text-xs text-slate-400">{r.notes}</p>}
                    </div>
                    <select
                      className="input !w-auto !py-1 text-xs"
                      value={r.status}
                      onChange={(e) => setRegStatus(ev.id, r.id, e.target.value)}
                    >
                      {["registered", "confirmed", "attended", "no_show", "cancelled"].map((s) => (
                        <option key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {events.length === 0 && (
          <div className="card text-center text-slate-400">
            No events yet. Create your first workshop above.
          </div>
        )}
      </div>
    </div>
  );
}
