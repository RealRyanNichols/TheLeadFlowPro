"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Lightbulb,
  RefreshCw,
  Search,
  ShieldCheck,
  Wrench,
  XCircle,
} from "lucide-react";

type ToolStatus =
  | "proposed"
  | "reviewing"
  | "scoped"
  | "building"
  | "shipped_one"
  | "shipped_all"
  | "gifted"
  | "declined";

type ToolScope = "just_me" | "all_users" | "unsure";

type RequestUser = {
  id: string;
  email: string;
  name: string | null;
  businessName: string | null;
  phone: string | null;
  website: string | null;
  plan: string;
};

type ToolRequestRow = {
  id: string;
  userId: string;
  title: string;
  description: string;
  scope: ToolScope;
  status: ToolStatus;
  reply: string | null;
  quotedPriceUsd: number | null;
  estPlatformCostUsd: number | null;
  upvotes: number;
  shippedUrl: string | null;
  createdAt: string;
  updatedAt: string;
  user: RequestUser;
};

const STATUS_OPTIONS: { value: ToolStatus; label: string }[] = [
  { value: "proposed", label: "Proposed" },
  { value: "reviewing", label: "Reviewing" },
  { value: "scoped", label: "Scoped" },
  { value: "building", label: "Building" },
  { value: "shipped_one", label: "Shipped to client" },
  { value: "shipped_all", label: "Shipped to all" },
  { value: "gifted", label: "Gifted" },
  { value: "declined", label: "Declined" },
];

const STATUS_STYLES: Record<ToolStatus, { label: string; cls: string; icon: typeof Lightbulb }> = {
  proposed: { label: "Proposed", cls: "bg-white/5 text-slate-300 border-white/10", icon: Lightbulb },
  reviewing: { label: "Reviewing", cls: "bg-cyan-400/10 text-cyan-100 border-cyan-300/30", icon: Lightbulb },
  scoped: { label: "Scoped", cls: "bg-accent-500/15 text-accent-100 border-accent-300/30", icon: Wrench },
  building: { label: "Building", cls: "bg-cyan-400/10 text-cyan-100 border-cyan-300/30", icon: Wrench },
  shipped_one: { label: "Shipped to client", cls: "bg-cyan-400/10 text-cyan-100 border-cyan-300/30", icon: CheckCircle2 },
  shipped_all: { label: "Shipped to all", cls: "bg-cyan-400/10 text-cyan-100 border-cyan-300/30", icon: CheckCircle2 },
  gifted: { label: "Gifted", cls: "bg-accent-500/15 text-accent-100 border-accent-300/30", icon: CheckCircle2 },
  declined: { label: "Declined", cls: "bg-red-500/10 text-red-100 border-red-400/30", icon: XCircle },
};

const SCOPE_LABELS: Record<ToolScope, string> = {
  just_me: "Client-only build",
  all_users: "Platform tool",
  unsure: "Scope after review",
};

const CLOSED_STATUSES: ToolStatus[] = ["shipped_one", "shipped_all", "gifted", "declined"];

export function AdminToolsClient({ initialRequests }: { initialRequests: ToolRequestRow[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [filter, setFilter] = useState<"open" | "all" | "closed">("open");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tool-requests");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setRequests((data.requests || []).map(normalizeDate));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh tool requests.");
    } finally {
      setLoading(false);
    }
  }

  async function updateRequest(id: string, patch: Partial<ToolRequestRow>) {
    const previous = requests;
    setRequests((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    setError(null);
    try {
      const res = await fetch("/api/admin/tool-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setRequests((rows) => rows.map((row) => (row.id === id ? normalizeDate(data.request) : row)));
    } catch (err) {
      setRequests(previous);
      setError(err instanceof Error ? err.message : "Update failed.");
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter((request) => {
      const closed = CLOSED_STATUSES.includes(request.status);
      if (filter === "open" && closed) return false;
      if (filter === "closed" && !closed) return false;
      if (!q) return true;
      return [
        request.title,
        request.description,
        request.reply,
        request.shippedUrl,
        request.user.email,
        request.user.name,
        request.user.businessName,
        request.user.phone,
        request.user.website,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [filter, query, requests]);

  const openCount = requests.filter((request) => !CLOSED_STATUSES.includes(request.status)).length;
  const scopedCount = requests.filter((request) => request.status === "scoped").length;
  const buildingCount = requests.filter((request) => request.status === "building").length;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
              <ShieldCheck className="h-3.5 w-3.5" /> Ryan tool admin
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Client tool requests, quotes, and shipped links.
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
              Clients can ask for calculators, dashboards, automations, portals, and workflow tools.
              Ryan replies here, scopes price, tracks build status, and gives the client the shipped link.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={refresh}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold hover:bg-white/[0.1]"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-50"
            >
              Admin home <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="grid gap-3 py-5 sm:grid-cols-3">
          <Stat label="Open requests" value={String(openCount)} />
          <Stat label="Scoped quotes" value={String(scopedCount)} />
          <Stat label="Building now" value={String(buildingCount)} />
        </div>

        <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto]">
          <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search client, business, tool, reply, link..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
          </label>
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/[0.06] p-1">
            {(["open", "all", "closed"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold capitalize ${
                  filter === item ? "bg-cyan-300 text-slate-950" : "text-slate-300 hover:bg-white/[0.08]"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="mb-5 rounded-2xl border border-rose-300/30 bg-rose-300/10 p-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4">
          {filtered.length > 0 ? filtered.map((request) => (
            <ToolRequestCard key={request.id} request={request} onUpdate={updateRequest} />
          )) : (
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-8 text-center text-sm text-slate-300">
              No tool requests match this view.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToolRequestCard({
  request,
  onUpdate,
}: {
  request: ToolRequestRow;
  onUpdate: (id: string, patch: Partial<ToolRequestRow>) => Promise<void>;
}) {
  const status = STATUS_STYLES[request.status];
  const StatusIcon = status.icon;
  const [reply, setReply] = useState(request.reply || "");
  const [quotedPriceUsd, setQuotedPriceUsd] = useState(request.quotedPriceUsd?.toString() || "");
  const [estPlatformCostUsd, setEstPlatformCostUsd] = useState(request.estPlatformCostUsd?.toString() || "");
  const [shippedUrl, setShippedUrl] = useState(request.shippedUrl || "");
  const clientLabel = request.user.businessName || request.user.name || request.user.email;

  async function saveDetails() {
    await onUpdate(request.id, {
      reply: reply.trim() || null,
      quotedPriceUsd: quotedPriceUsd.trim() ? Number(quotedPriceUsd) : null,
      estPlatformCostUsd: estPlatformCostUsd.trim() ? Number(estPlatformCostUsd) : null,
      shippedUrl: shippedUrl.trim() || null,
    });
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] shadow-2xl shadow-black/20">
      <div className="grid gap-0 lg:grid-cols-[0.72fr_1.28fr]">
        <div className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-100">
                {SCOPE_LABELS[request.scope]}
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">{request.title}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                {request.description}
              </p>
            </div>
            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${status.cls}`}>
              <StatusIcon className="h-3.5 w-3.5" /> {status.label}
            </span>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Client</p>
            <Link href={`/admin/clients/${request.user.id}`} className="mt-1 inline-flex items-center gap-2 font-semibold text-white hover:text-cyan-100">
              {clientLabel} <ArrowRight className="h-4 w-4" />
            </Link>
            <div className="mt-3 grid gap-1 text-sm text-slate-300">
              <a href={`mailto:${request.user.email}`} className="hover:text-white">{request.user.email}</a>
              {request.user.phone ? <a href={`tel:${request.user.phone}`} className="hover:text-white">{request.user.phone}</a> : null}
              {request.user.website ? (
                <a href={request.user.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-white">
                  {request.user.website} <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
              <p className="text-xs uppercase tracking-widest text-slate-500">Plan: {request.user.plan}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Status</span>
              <select
                value={request.status}
                onChange={(event) => onUpdate(request.id, { status: event.target.value as ToolStatus })}
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/60"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Quote</span>
              <input
                value={quotedPriceUsd}
                onChange={(event) => setQuotedPriceUsd(event.target.value)}
                inputMode="decimal"
                placeholder="0"
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Cost</span>
              <input
                value={estPlatformCostUsd}
                onChange={(event) => setEstPlatformCostUsd(event.target.value)}
                inputMode="decimal"
                placeholder="0"
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Ryan reply visible to client</span>
            <textarea
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              rows={4}
              placeholder="Plain-English reply, next step, scope, or why it is not a fit."
              className="w-full resize-none rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Shipped tool URL</span>
            <input
              value={shippedUrl}
              onChange={(event) => setShippedUrl(event.target.value)}
              placeholder="/dashboard/tools/example or https://clientdomain.com/tool"
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60"
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              {request.upvotes} upvotes - submitted {new Date(request.createdAt).toLocaleString()}
            </div>
            <button
              type="button"
              onClick={saveDetails}
              className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-600"
            >
              Save details <CheckCircle2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <div className="text-xs font-semibold uppercase tracking-widest text-cyan-100">{label}</div>
      <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

function normalizeDate(row: ToolRequestRow): ToolRequestRow {
  return {
    ...row,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : new Date(row.createdAt).toISOString(),
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : new Date(row.updatedAt).toISOString(),
  };
}
