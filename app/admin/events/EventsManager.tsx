"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { workshopSalesReadiness, type WorkshopPolicies } from "@/lib/eventCommerce";

type Registration = {
  id: string;
  full_name: string;
  email: string;
  status: string;
  payment_status: string;
};

type EventRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  venue: string | null;
  city: string | null;
  starts_at: string | null;
  duration_minutes: number;
  price_usd: number;
  capacity: number;
  is_published: boolean;
  sales_status: string;
  instructor_name: string;
  workshop_registrations: Registration[];
};

type PrivateDetails = WorkshopPolicies & {
  event_id: string;
  exact_address: string;
  arrival_notes: string | null;
};

function localInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function EventsManager({ initialEvents }: { initialEvents: EventRow[] }) {
  const [events, setEvents] = useState(initialEvents);
  const [openEvent, setOpenEvent] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, PrivateDetails | null>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadDetails(id: string) {
    setOpenEvent((current) => (current === id ? null : id));
    if (details[id] !== undefined) return;
    const response = await fetch("/api/admin/events/" + id, { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    setDetails((current) => ({ ...current, [id]: body.details ?? null }));
  }

  async function saveBase(event: EventRow, form: HTMLFormElement) {
    setBusy(event.id);
    setMessage(null);
    const fd = new FormData(form);
    const updates = {
      title: String(fd.get("title") || "").trim(),
      description: String(fd.get("description") || "").trim() || null,
      venue: String(fd.get("venue") || "").trim() || null,
      city: String(fd.get("city") || "").trim() || null,
      starts_at: fd.get("starts_at") ? new Date(String(fd.get("starts_at"))).toISOString() : null,
      duration_minutes: Number(fd.get("duration_minutes") || 90),
      price_usd: Number(fd.get("price_usd") || 0),
      capacity: Number(fd.get("capacity") || 0),
      is_published: fd.get("is_published") === "on",
      sales_status: String(fd.get("sales_status") || "draft"),
      instructor_name: "Ryan Nichols",
    };
    const supabase = createClient();
    const { data, error } = await supabase
      .from("workshop_events")
      .update(updates)
      .eq("id", event.id)
      .select("*, workshop_registrations(*)")
      .single();
    if (error || !data) {
      setMessage(
        updates.sales_status === "open"
          ? "Sales stayed closed. Confirm the future date, price, capacity, address, and buyer policies."
          : "The event could not be saved.",
      );
    } else {
      setEvents((current) => current.map((item) => (item.id === event.id ? (data as EventRow) : item)));
      setMessage("Event settings saved.");
    }
    setBusy(null);
  }

  async function savePrivate(eventId: string, form: HTMLFormElement) {
    setBusy(eventId + ":private");
    setMessage(null);
    const fd = new FormData(form);
    const payload = Object.fromEntries(
      ["exact_address", "arrival_notes", "recording_consent_text", "cancellation_policy", "seat_transfer_policy"]
        .map((key) => [key, String(fd.get(key) || "")]),
    );
    const response = await fetch("/api/admin/events/" + eventId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(body.error || "Private event details could not be saved.");
    else {
      setDetails((current) => ({ ...current, [eventId]: body.details }));
      setMessage("Private arrival details and buyer policies saved.");
    }
    setBusy(null);
  }

  async function setRegistrationStatus(eventId: string, registrationId: string, status: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("workshop_registrations")
      .update({ status })
      .eq("id", registrationId);
    if (error) {
      setMessage("Registration status could not be changed.");
      return;
    }
    setEvents((current) => current.map((event) =>
      event.id === eventId
        ? {
            ...event,
            workshop_registrations: event.workshop_registrations.map((registration) =>
              registration.id === registrationId ? { ...registration, status } : registration,
            ),
          }
        : event,
    ));
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-black text-[var(--heading)]">Workshop launch control</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Public visibility and paid sales are separate. Ryan is the instructor. Pat owns qualified implementation follow-up.
        </p>
      </div>

      {message && <p className="card mb-5 !border-flow-600/40 text-sm text-[var(--heading)]">{message}</p>}

      <div className="space-y-5">
        {events.map((event) => {
          const privateDetails = details[event.id];
          const readiness = workshopSalesReadiness(event, privateDetails ?? null);
          return (
            <article key={event.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[.18em] text-flow-400">
                    {event.sales_status} sales | {event.is_published ? "public" : "private draft"}
                  </p>
                  <h2 className="mt-1 text-xl font-black text-[var(--heading)]">{event.title}</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {event.starts_at
                      ? new Date(event.starts_at).toLocaleString("en-US", { timeZone: "America/Chicago" })
                      : "Date not set"}
                    {" | $"}{Number(event.price_usd)}{" | "}{event.capacity} seats | Ryan Nichols, instructor
                  </p>
                </div>
                <button className="btn-ghost !px-3 !py-2 text-xs" onClick={() => loadDetails(event.id)}>
                  {openEvent === event.id ? "Close Editor" : "Edit Workshop"}
                </button>
              </div>

              {openEvent === event.id && (
                <div className="mt-6 space-y-6 border-t border-line pt-6">
                  <form
                    className="space-y-4"
                    onSubmit={(formEvent) => {
                      formEvent.preventDefault();
                      void saveBase(event, formEvent.currentTarget);
                    }}
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="label">Public title<input className="input mt-1" name="title" defaultValue={event.title} required /></label>
                      <label className="label">Date and time<input className="input mt-1" name="starts_at" type="datetime-local" defaultValue={localInput(event.starts_at)} /></label>
                    </div>
                    <label className="label">Public description<textarea className="input mt-1" name="description" rows={3} defaultValue={event.description ?? ""} /></label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="label">Venue name<input className="input mt-1" name="venue" defaultValue={event.venue ?? ""} /></label>
                      <label className="label">Public city<input className="input mt-1" name="city" defaultValue={event.city ?? ""} /></label>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-4">
                      <label className="label">Minutes<input className="input mt-1" name="duration_minutes" type="number" min="15" defaultValue={event.duration_minutes} /></label>
                      <label className="label">Price<input className="input mt-1" name="price_usd" type="number" min="0" defaultValue={Number(event.price_usd)} /></label>
                      <label className="label">Capacity<input className="input mt-1" name="capacity" type="number" min="1" defaultValue={event.capacity} /></label>
                      <label className="label">Sales status
                        <select className="input mt-1" name="sales_status" defaultValue={event.sales_status}>
                          {["draft", "waitlist", "open", "sold_out", "completed", "cancelled"].map((status) => <option key={status}>{status}</option>)}
                        </select>
                      </label>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-bold text-[var(--heading)]">
                      <input name="is_published" type="checkbox" defaultChecked={event.is_published} />
                      Show this workshop publicly
                    </label>
                    <button className="btn-primary" disabled={busy === event.id}>
                      {busy === event.id ? "Saving..." : "Save Event Settings"}
                    </button>
                  </form>

                  {privateDetails === undefined ? (
                    <p className="text-sm text-[var(--muted)]">Loading private details...</p>
                  ) : (
                    <form
                      className="space-y-4 rounded-xl border border-line bg-[var(--page)] p-4"
                      onSubmit={(formEvent) => {
                        formEvent.preventDefault();
                        void savePrivate(event.id, formEvent.currentTarget);
                      }}
                    >
                      <div>
                        <h3 className="font-black text-[var(--heading)]">Private arrival details and buyer policies</h3>
                        <p className="text-sm text-[var(--muted)]">The exact address is never returned by the public event query.</p>
                      </div>
                      <label className="label">Exact address<input className="input mt-1" name="exact_address" required defaultValue={privateDetails?.exact_address ?? ""} /></label>
                      <label className="label">Arrival notes<textarea className="input mt-1" name="arrival_notes" rows={2} defaultValue={privateDetails?.arrival_notes ?? ""} /></label>
                      <label className="label">Recording consent<textarea className="input mt-1" name="recording_consent_text" rows={3} defaultValue={privateDetails?.recording_consent_text ?? ""} /></label>
                      <label className="label">Cancellation and refund policy<textarea className="input mt-1" name="cancellation_policy" rows={3} defaultValue={privateDetails?.cancellation_policy ?? ""} /></label>
                      <label className="label">Seat-transfer policy<textarea className="input mt-1" name="seat_transfer_policy" rows={3} defaultValue={privateDetails?.seat_transfer_policy ?? ""} /></label>
                      <button className="btn-primary" disabled={busy === event.id + ":private"}>
                        {busy === event.id + ":private" ? "Saving..." : "Save Private Details"}
                      </button>
                    </form>
                  )}

                  <div className="rounded-xl border border-line p-4">
                    <h3 className="font-black text-[var(--heading)]">Paid-sales gate</h3>
                    {readiness.ready ? (
                      <p className="mt-2 text-sm text-mint">Ready for Ryan to approve opening sales.</p>
                    ) : (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
                        {readiness.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
                      </ul>
                    )}
                  </div>

                  <div>
                    <h3 className="font-black text-[var(--heading)]">Registrations</h3>
                    <div className="mt-3 space-y-2">
                      {event.workshop_registrations.length === 0 && <p className="text-sm text-[var(--muted)]">No registrations yet.</p>}
                      {event.workshop_registrations.map((registration) => (
                        <div key={registration.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[var(--page)] p-3 text-sm">
                          <div>
                            <strong className="text-[var(--heading)]">{registration.full_name}</strong>
                            <span className="ml-2 text-[var(--muted)]">{registration.email} | {registration.payment_status}</span>
                          </div>
                          {registration.status === "hold" || registration.payment_status === "payment_review" ? (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">System managed</span>
                          ) : (
                            <select
                              className="input !w-auto !py-1 text-xs"
                              value={registration.status}
                              onChange={(change) => void setRegistrationStatus(event.id, registration.id, change.target.value)}
                            >
                              {["confirmed", "attended", "no_show", "cancelled", "transferred"].map((status) => (
                                <option key={status} value={status}>{status.replace(/_/g, " ")}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
