// src/app/admin/capacity/page.tsx — Ryan's bandwidth admin UI.
//
// Gated client-side by an admin-secret prompt that's stored in localStorage.
// All server interactions hit /api/admin/engagements/* with the x-admin-secret
// header, so the secret is the actual gate (the page itself is public route).

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, Check, Clock, Pause, Play, Plus, Trash2, X as XIcon,
} from "lucide-react";
import { OFFER_WORKLOADS, WORK_ORDER_PRESETS, formatHours } from "@/lib/workload";

type Engagement = {
  id: string;
  clientName: string;
  publicLabel: string | null;
  offerSlug: string | null;
  hoursPerWeek: number;
  status: string;
  startedAt: string;
  completedAt: string | null;
  notes: string | null;
};

type WorkOrder = {
  id: string;
  engagementId: string | null;
  clientName: string;
  publicLabel: string | null;
  offerSlug: string | null;
  title: string;
  status: string;
  estimatedHours: number;
  completedHours: number;
  deliveryGuaranteeDays: number | null;
  dueAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

const SECRET_STORAGE_KEY = "leadflow.adminSecret";
const CLOSED_WORK_ORDER_STATUSES = new Set(["delivered", "completed", "canceled"]);

export default function AdminCapacityPage() {
  const [secret, setSecret] = useState<string>("");
  const [savedSecret, setSavedSecret] = useState<string | null>(null);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workOrderError, setWorkOrderError] = useState<string | null>(null);

  // Load secret from localStorage on mount
  useEffect(() => {
    const s = localStorage.getItem(SECRET_STORAGE_KEY);
    if (s) {
      setSavedSecret(s);
      setSecret(s);
    }
  }, []);

  // Auto-fetch when secret is set
  useEffect(() => {
    if (savedSecret) refresh(savedSecret);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedSecret]);

  async function refresh(s: string) {
    setLoading(true);
    setError(null);
    setWorkOrderError(null);
    try {
      const [engagementRes, workOrderRes] = await Promise.all([
        fetch("/api/admin/engagements", {
          headers: { "x-admin-secret": s },
        }),
        fetch("/api/admin/work-orders", {
          headers: { "x-admin-secret": s },
        }),
      ]);

      if (!engagementRes.ok) {
        const body = await engagementRes.json().catch(() => ({}));
        setError(body.error || `HTTP ${engagementRes.status}`);
        setEngagements([]);
        // Bad secret? wipe storage so it asks again
        if (engagementRes.status === 401) {
          localStorage.removeItem(SECRET_STORAGE_KEY);
          setSavedSecret(null);
        }
        return;
      }

      const engagementData = await engagementRes.json();
      setEngagements(engagementData.engagements || []);

      if (workOrderRes.ok) {
        const workOrderData = await workOrderRes.json();
        setWorkOrders(workOrderData.workOrders || []);
      } else {
        const body = await workOrderRes.json().catch(() => ({}));
        setWorkOrderError(body.error || `Work-order ledger unavailable: HTTP ${workOrderRes.status}`);
        setWorkOrders([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      setLoading(false);
    }
  }

  function saveSecret(e: React.FormEvent) {
    e.preventDefault();
    if (!secret) return;
    localStorage.setItem(SECRET_STORAGE_KEY, secret);
    setSavedSecret(secret);
  }

  function logout() {
    localStorage.removeItem(SECRET_STORAGE_KEY);
    setSavedSecret(null);
    setSecret("");
    setEngagements([]);
    setWorkOrders([]);
  }

  /* ──────── unauthenticated ──────── */
  if (!savedSecret) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <form
          onSubmit={saveSecret}
          className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
        >
          <h1 className="text-2xl font-bold text-slate-950">Capacity admin</h1>
          <p className="mt-2 text-sm text-slate-600">
            Paste the <code className="bg-slate-100 px-1 rounded">ADMIN_INIT_SECRET</code> from your
            Vercel env vars to manage Ryan's bandwidth tracker.
          </p>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="admin secret"
            className="mt-5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
            required
          />
          <button
            type="submit"
            disabled={!secret}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            Sign in <ArrowRight className="h-4 w-4" />
          </button>
          <p className="mt-3 text-xs text-slate-500 text-center">
            Stored only in your browser&rsquo;s localStorage.
          </p>
          <Link
            href="/"
            className="mt-4 block text-center text-xs text-slate-500 hover:text-slate-700"
          >
            ← Back to site
          </Link>
        </form>
      </div>
    );
  }

  /* ──────── authenticated ──────── */
  const totalActiveHours = engagements
    .filter((e) => e.status === "active")
    .reduce((sum, e) => sum + e.hoursPerWeek, 0);
  const oneWeekFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const openWorkOrders = workOrders.filter((order) => !CLOSED_WORK_ORDER_STATUSES.has(order.status));
  const dueThisWeekWorkHours = openWorkOrders
    .filter((order) => !order.dueAt || new Date(order.dueAt).getTime() <= oneWeekFromNow)
    .reduce((sum, order) => sum + remainingOrderHours(order), 0);
  const openWorkHours = openWorkOrders.reduce((sum, order) => sum + remainingOrderHours(order), 0);
  const remaining = Math.max(0, roundHours(60 - totalActiveHours - dueThisWeekWorkHours));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div>
            <Link href="/" className="text-sm font-bold text-slate-950 hover:text-brand-700">
              The LeadFlow Pro
            </Link>
            <span className="text-sm text-slate-500"> · capacity admin</span>
          </div>
          <button
            onClick={logout}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900"
          >
            Sign out →
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Snapshot bar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Active hours / week" value={`${totalActiveHours} / 60`} accent="cyan" />
            <Stat label="Remaining capacity" value={`${remaining} hrs`} accent="accent" />
            <Stat
              label="Active engagements"
              value={String(engagements.filter((e) => e.status === "active").length)}
              accent="brand"
            />
            <Stat label="Open order work" value={`${openWorkHours} hrs`} accent="slate" />
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            {error}
          </div>
        )}
        {workOrderError && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Work-order ledger is waiting on the database table: {workOrderError}
          </div>
        )}

        {/* Add new engagement */}
        <NewEngagementForm
          secret={savedSecret}
          onCreated={() => refresh(savedSecret)}
        />

        <NewWorkOrderForm
          secret={savedSecret}
          engagements={engagements}
          onCreated={() => refresh(savedSecret)}
        />

        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Work-order ledger</h2>
              <p className="mt-1 text-xs text-slate-500">
                These are specific deliverables. Marking hours complete clears capacity on the public
                availability page.
              </p>
            </div>
            <button
              onClick={() => refresh(savedSecret)}
              className="text-xs font-semibold text-cyan-700 hover:text-cyan-800"
              disabled={loading}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
          {workOrders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              No work orders yet. Add one when a paid deliverable needs tracked against the meter.
            </div>
          ) : (
            <div className="space-y-3">
              {workOrders.map((order) => (
                <WorkOrderRow
                  key={order.id}
                  order={order}
                  secret={savedSecret}
                  onChanged={() => refresh(savedSecret)}
                />
              ))}
            </div>
          )}
        </div>

        {/* List */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-950">All engagements</h2>
            <button
              onClick={() => refresh(savedSecret)}
              className="text-xs font-semibold text-cyan-700 hover:text-cyan-800"
              disabled={loading}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
          {engagements.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              No engagements yet. Add your first one above.
            </div>
          ) : (
            <div className="space-y-3">
              {engagements.map((e) => (
                <EngagementRow
                  key={e.id}
                  e={e}
                  secret={savedSecret}
                  onChanged={() => refresh(savedSecret)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/* ──────────── components ──────────── */

function roundHours(hours: number): number {
  return Math.round(hours * 10) / 10;
}

function remainingOrderHours(order: Pick<WorkOrder, "estimatedHours" | "completedHours">): number {
  return Math.max(0, roundHours(Number(order.estimatedHours || 0) - Number(order.completedHours || 0)));
}

function dateInputValue(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function statusTone(status: string): string {
  return {
    intake_needed: "border-brand-200 bg-brand-50 text-brand-800",
    in_progress: "border-cyan-300 bg-cyan-50 text-cyan-800",
    waiting_on_client: "border-amber-300 bg-amber-50 text-amber-800",
    pending_review: "border-accent-300 bg-accent-300/20 text-amber-900",
    delivered: "border-slate-300 bg-slate-100 text-slate-700",
    completed: "border-slate-300 bg-slate-100 text-slate-700",
    canceled: "border-rose-300 bg-rose-50 text-rose-700",
  }[status] || "border-slate-300 bg-slate-50 text-slate-700";
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "cyan" | "accent" | "brand" | "slate";
}) {
  const tone = {
    cyan:  "border-cyan-200 bg-cyan-50",
    accent:  "border-accent-300 bg-accent-300/20",
    brand: "border-brand-200 bg-brand-50",
    slate: "border-slate-200 bg-slate-50",
  }[accent];
  return (
    <div className={`rounded-xl border ${tone} p-3`}>
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-950 tabular-nums">{value}</div>
    </div>
  );
}

function NewWorkOrderForm({
  secret,
  engagements,
  onCreated,
}: {
  secret: string;
  engagements: Engagement[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [engagementId, setEngagementId] = useState("");
  const [clientName, setClientName] = useState("");
  const [publicLabel, setPublicLabel] = useState("");
  const [offerSlug, setOfferSlug] = useState("");
  const [presetSlug, setPresetSlug] = useState("");
  const [title, setTitle] = useState("");
  const [estimatedHours, setEstimatedHours] = useState(1);
  const [completedHours, setCompletedHours] = useState(0);
  const [dueAt, setDueAt] = useState("");
  const [status, setStatus] = useState("intake_needed");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const selectedWorkload = offerSlug ? OFFER_WORKLOADS[offerSlug as keyof typeof OFFER_WORKLOADS] : null;

  function selectEngagement(nextId: string) {
    setEngagementId(nextId);
    const engagement = engagements.find((item) => item.id === nextId);
    if (!engagement) return;
    setClientName(engagement.clientName);
    setPublicLabel(engagement.publicLabel || "");
    if (engagement.offerSlug) updateOfferSlug(engagement.offerSlug);
  }

  function updateOfferSlug(next: string) {
    setOfferSlug(next);
    setPresetSlug("");
    const workload = OFFER_WORKLOADS[next as keyof typeof OFFER_WORKLOADS];
    if (!workload) return;
    setTitle(workload.label);
    setEstimatedHours(workload.reserveHours);
    const due = new Date();
    due.setDate(due.getDate() + workload.deliveryMaxDays);
    setDueAt(workload.deliveryKind === "ongoing" ? "" : dateInputValue(due));
  }

  function updatePresetSlug(next: string) {
    setPresetSlug(next);
    setOfferSlug("");
    const preset = WORK_ORDER_PRESETS[next];
    if (!preset) return;
    setTitle(preset.label);
    setEstimatedHours(preset.reserveHours);
    setNotes(
      `${preset.workloadNote}\n\n${preset.breakdown
        .map((line) => `- ${line.label}: ${line.minutes}m${line.note ? ` (${line.note})` : ""}`)
        .join("\n")}`,
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    const res = await fetch("/api/admin/work-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({
        engagementId: engagementId || null,
        clientName,
        publicLabel: publicLabel || null,
        offerSlug: offerSlug || null,
        title,
        estimatedHours,
        completedHours,
        dueAt: dueAt || null,
        status,
        notes: notes || null,
      }),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setErr(b.error || `HTTP ${res.status}`);
      setSubmitting(false);
      return;
    }
    setEngagementId("");
    setClientName("");
    setPublicLabel("");
    setOfferSlug("");
    setPresetSlug("");
    setTitle("");
    setEstimatedHours(1);
    setCompletedHours(0);
    setDueAt("");
    setStatus("intake_needed");
    setNotes("");
    setOpen(false);
    setSubmitting(false);
    onCreated();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-accent-300 bg-accent-300/20 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-sm hover:bg-accent-300/30"
      >
        <Plus className="h-4 w-4" /> Add work order
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mt-6 rounded-2xl border border-accent-300 bg-white p-5 shadow-sm space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-950">New work order</h3>
          <p className="mt-1 text-xs text-slate-500">
            Track a deliverable by hours, progress, and due date.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-slate-400 hover:text-slate-700"
          aria-label="Close"
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Attach to engagement (optional)">
          <select
            value={engagementId}
            onChange={(e) => selectEngagement(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
          >
            <option value="">Standalone work order</option>
            {engagements.map((engagement) => (
              <option key={engagement.id} value={engagement.id}>
                {engagement.clientName} · {engagement.status}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Offer default">
          <select
            value={offerSlug}
            onChange={(e) => updateOfferSlug(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
          >
            <option value="">Custom / not tied to an offer</option>
            {Object.values(OFFER_WORKLOADS).map((workload) => (
              <option key={workload.slug} value={workload.slug}>
                {workload.label} · {formatHours(workload.reserveHours)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Operational preset">
          <select
            value={presetSlug}
            onChange={(e) => updatePresetSlug(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
          >
            <option value="">No preset</option>
            {Object.values(WORK_ORDER_PRESETS).map((preset) => (
              <option key={preset.slug} value={preset.slug}>
                {preset.label} · {formatHours(preset.reserveHours)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Client name (private)">
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Smith Roofing"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
          />
        </Field>
        <Field label="Public label">
          <input
            type="text"
            value={publicLabel}
            onChange={(e) => setPublicLabel(e.target.value)}
            placeholder="Local roofer · anonymized"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
          />
        </Field>
        <Field label="Work title">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Decision Sprint worksheet"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
          />
        </Field>
        <Field label="Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
          >
            <option value="intake_needed">Intake needed</option>
            <option value="in_progress">In progress</option>
            <option value="waiting_on_client">Waiting on client</option>
            <option value="pending_review">Pending Ryan review</option>
            <option value="delivered">Delivered</option>
            <option value="completed">Completed</option>
            <option value="canceled">Canceled</option>
          </select>
        </Field>
        <Field label="Estimated hours">
          <input
            type="number"
            min={0.25}
            step={0.25}
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(Math.max(0.25, +e.target.value || 0.25))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
            required
          />
        </Field>
        <Field label="Completed hours">
          <input
            type="number"
            min={0}
            step={0.25}
            value={completedHours}
            onChange={(e) => setCompletedHours(Math.max(0, +e.target.value || 0))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
          />
        </Field>
        <Field label="Due date">
          <input
            type="date"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
          />
        </Field>
      </div>
      {selectedWorkload && (
        <div className="rounded-xl border border-accent-300 bg-accent-300/15 p-3 text-xs leading-relaxed text-slate-800">
          <strong>{selectedWorkload.label}</strong> reserves {formatHours(selectedWorkload.reserveHours)}.{" "}
          {selectedWorkload.deliveryPromise}
        </div>
      )}
      <Field label="Internal notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
        />
      </Field>
      {err && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-900">
          {err}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save work order"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function NewEngagementForm({ secret, onCreated }: { secret: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [publicLabel, setPublicLabel] = useState("");
  const [offerSlug, setOfferSlug] = useState("");
  const [hoursPerWeek, setHoursPerWeek] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const selectedWorkload = offerSlug ? OFFER_WORKLOADS[offerSlug as keyof typeof OFFER_WORKLOADS] : null;

  function updateOfferSlug(next: string) {
    setOfferSlug(next);
    const workload = OFFER_WORKLOADS[next as keyof typeof OFFER_WORKLOADS];
    if (workload) setHoursPerWeek(Math.ceil(workload.reserveHours));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    const res = await fetch("/api/admin/engagements", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({
        clientName,
        publicLabel: publicLabel || null,
        offerSlug: offerSlug || null,
        hoursPerWeek,
        status: "active",
      }),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setErr(b.error || `HTTP ${res.status}`);
      setSubmitting(false);
      return;
    }
    setClientName("");
    setPublicLabel("");
    setOfferSlug("");
    setHoursPerWeek(5);
    setOpen(false);
    setSubmitting(false);
    onCreated();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-cyan-700"
      >
        <Plus className="h-4 w-4" /> Add engagement
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-950">New engagement</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-slate-400 hover:text-slate-700"
          aria-label="Close"
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Client name (private)">
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Smith Roofing"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
          />
        </Field>
        <Field label="Public label (shown on /availability)">
          <input
            type="text"
            value={publicLabel}
            onChange={(e) => setPublicLabel(e.target.value)}
            placeholder="Roofer · East TX (optional anonymized label)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
          />
        </Field>
        <Field label="Hours / week">
          <input
            type="number"
            min={1}
            max={60}
            value={hoursPerWeek}
            onChange={(e) => setHoursPerWeek(Math.max(1, +e.target.value || 1))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
            required
          />
        </Field>
        <Field label="Offer slug (optional)">
          <select
            value={offerSlug}
            onChange={(e) => updateOfferSlug(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"
          >
            <option value="">Custom / not tied to an offer</option>
            {Object.values(OFFER_WORKLOADS).map((workload) => (
              <option key={workload.slug} value={workload.slug}>
                {workload.label} · reserves {formatHours(workload.reserveHours)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {selectedWorkload && (
        <div className="rounded-xl border border-cyan-200 bg-cyan-50/70 p-3 text-xs leading-relaxed text-cyan-950">
          <strong>{selectedWorkload.label}</strong> default: visible time is{" "}
          {selectedWorkload.visibleTime}; reserves {formatHours(selectedWorkload.reserveHours)} in
          the public meter. {selectedWorkload.deliveryPromise}
        </div>
      )}
      {err && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-900">
          {err}
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save engagement"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-700">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function WorkOrderRow({
  order,
  secret,
  onChanged,
}: {
  order: WorkOrder;
  secret: string;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const remaining = remainingOrderHours(order);
  const progressPct =
    order.estimatedHours > 0
      ? Math.min(100, Math.round((order.completedHours / order.estimatedHours) * 100))
      : 0;

  async function patch(body: any) {
    setBusy(true);
    await fetch(`/api/admin/work-orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify(body),
    });
    setBusy(false);
    onChanged();
  }

  async function del() {
    if (!confirm(`Delete work order "${order.title}"? This cannot be undone.`)) return;
    setBusy(true);
    await fetch(`/api/admin/work-orders/${order.id}`, {
      method: "DELETE",
      headers: { "x-admin-secret": secret },
    });
    setBusy(false);
    onChanged();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-950">{order.title}</span>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${statusTone(order.status)}`}
            >
              {order.status.replaceAll("_", " ")}
            </span>
            {order.offerSlug && (
              <span className="text-[10px] uppercase tracking-widest text-slate-400">
                · {order.offerSlug}
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-slate-600">
            {order.publicLabel || order.clientName}
            {order.dueAt && (
              <span className="text-slate-400">
                {" "}· due {new Date(order.dueAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[11px] text-slate-500">
              <span>
                {roundHours(order.completedHours)}h done / {roundHours(order.estimatedHours)}h estimated
              </span>
              <span className="font-semibold text-cyan-700">{remaining}h left</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-brand-500 to-accent-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Btn onClick={() => patch({ incrementCompletedHours: 0.5 })} disabled={busy || remaining <= 0} icon={Clock}>
            +0.5h
          </Btn>
          <Btn onClick={() => patch({ incrementCompletedHours: 1 })} disabled={busy || remaining <= 0} icon={Clock}>
            +1h
          </Btn>
          <Btn onClick={() => patch({ incrementCompletedHours: 2 })} disabled={busy || remaining <= 0} icon={Clock}>
            +2h
          </Btn>
          {order.status !== "in_progress" && (
            <Btn onClick={() => patch({ status: "in_progress" })} disabled={busy} icon={Play}>
              Start
            </Btn>
          )}
          {order.status !== "waiting_on_client" && (
            <Btn onClick={() => patch({ status: "waiting_on_client" })} disabled={busy} icon={Pause}>
              Waiting
            </Btn>
          )}
          {order.status !== "pending_review" && (
            <Btn onClick={() => patch({ status: "pending_review" })} disabled={busy} icon={Check}>
              Review
            </Btn>
          )}
          {order.status !== "delivered" && order.status !== "completed" && (
            <Btn
              onClick={() => patch({ status: "delivered" })}
              disabled={busy}
              icon={Check}
              tone="primary"
            >
              Delivered
            </Btn>
          )}
          <Btn onClick={del} disabled={busy} icon={Trash2} tone="danger">
            Delete
          </Btn>
        </div>
      </div>
    </div>
  );
}

function EngagementRow({
  e,
  secret,
  onChanged,
}: {
  e: Engagement;
  secret: string;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function patch(body: any) {
    setBusy(true);
    await fetch(`/api/admin/engagements/${e.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify(body),
    });
    setBusy(false);
    onChanged();
  }

  async function del() {
    if (!confirm(`Delete engagement "${e.clientName}"? This cannot be undone.`)) return;
    setBusy(true);
    await fetch(`/api/admin/engagements/${e.id}`, {
      method: "DELETE",
      headers: { "x-admin-secret": secret },
    });
    setBusy(false);
    onChanged();
  }

  const statusTone = {
    active:    "border-cyan-300 bg-cyan-50 text-cyan-800",
    paused:    "border-amber-300 bg-amber-50 text-amber-800",
    completed: "border-slate-300 bg-slate-100 text-slate-700",
  }[e.status as "active" | "paused" | "completed"] || "border-slate-300 bg-slate-50 text-slate-700";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-950">{e.clientName}</span>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${statusTone}`}
            >
              {e.status}
            </span>
            <span className="text-xs text-slate-600 tabular-nums">{e.hoursPerWeek} hrs/wk</span>
            {e.offerSlug && (
              <span className="text-[10px] uppercase tracking-widest text-slate-400">
                · {e.offerSlug}
              </span>
            )}
          </div>
          {e.publicLabel && (
            <div className="mt-1 text-xs text-slate-500">
              Public label: <span className="text-slate-700">{e.publicLabel}</span>
            </div>
          )}
          <div className="mt-1 text-[11px] text-slate-500">
            Started {new Date(e.startedAt).toLocaleDateString()}
            {e.completedAt && ` · Completed ${new Date(e.completedAt).toLocaleDateString()}`}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {e.status !== "active" && (
            <Btn onClick={() => patch({ status: "active" })} disabled={busy} icon={Play}>
              Activate
            </Btn>
          )}
          {e.status === "active" && (
            <Btn onClick={() => patch({ status: "paused" })} disabled={busy} icon={Pause}>
              Pause
            </Btn>
          )}
          {e.status !== "completed" && (
            <Btn
              onClick={() => patch({ status: "completed" })}
              disabled={busy}
              icon={Check}
              tone="primary"
            >
              Complete
            </Btn>
          )}
          <Btn onClick={del} disabled={busy} icon={Trash2} tone="danger">
            Delete
          </Btn>
        </div>
      </div>
    </div>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  icon: Icon,
  tone = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  icon: any;
  tone?: "default" | "primary" | "danger";
}) {
  const cls = {
    default: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    primary: "bg-cyan-600 text-white hover:bg-cyan-700",
    danger:  "border border-rose-300 bg-white text-rose-700 hover:bg-rose-50",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${cls} disabled:opacity-50`}
    >
      <Icon className="h-3.5 w-3.5" /> {children}
    </button>
  );
}
