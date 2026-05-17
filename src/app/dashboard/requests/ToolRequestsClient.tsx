"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Plus,
  RefreshCw,
  ThumbsUp,
  Wrench,
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

type ToolRequestRow = {
  id: string;
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
};

type CommunityToolRequestRow = ToolRequestRow & {
  user?: { businessName: string | null; name: string | null } | null;
};

const STATUS_STYLES: Record<ToolStatus, { label: string; cls: string; icon: typeof Lightbulb }> = {
  proposed: { label: "Proposed", cls: "bg-white/5 text-ink-300 border-white/10", icon: Lightbulb },
  reviewing: { label: "Ryan reviewing", cls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30", icon: Lightbulb },
  scoped: { label: "Scoped", cls: "bg-accent-500/15 text-accent-300 border-accent-500/30", icon: Wrench },
  building: { label: "Building", cls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30", icon: Wrench },
  shipped_one: { label: "Shipped to you", cls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30", icon: CheckCircle2 },
  shipped_all: { label: "Shipped to all", cls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30", icon: CheckCircle2 },
  gifted: { label: "Gifted", cls: "bg-accent-500/15 text-accent-300 border-accent-500/30", icon: CheckCircle2 },
  declined: { label: "Not a fit", cls: "bg-red-500/10 text-red-300 border-red-500/20", icon: Lightbulb },
};

const SCOPE_LABELS: Record<ToolScope, string> = {
  just_me: "Build just for my business",
  all_users: "Build for everyone if useful",
  unsure: "Ryan decides after review",
};

export function ToolRequestsClient({
  initialMine,
  initialCommunity,
}: {
  initialMine: ToolRequestRow[];
  initialCommunity: CommunityToolRequestRow[];
}) {
  const [mine, setMine] = useState(initialMine);
  const [community, setCommunity] = useState(initialCommunity);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState<ToolScope>("unsure");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCount = useMemo(
    () => mine.filter((request) => !["shipped_one", "shipped_all", "gifted", "declined"].includes(request.status)).length,
    [mine],
  );

  async function refresh() {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/tool-requests");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setMine((data.mine || []).map(normalizeDate));
      setCommunity((data.community || []).map(normalizeDate));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh requests");
    } finally {
      setRefreshing(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/tool-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, scope }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setMine((rows) => [normalizeDate(data.request), ...rows]);
      setTitle("");
      setDescription("");
      setScope("unsure");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tool request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-cyan-400">Request a Tool</p>
          <h1 className="mt-1 text-3xl font-extrabold text-white">
            Ask for the tool your business should already have.
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-300">
            This is the client-side build queue. Submit the leak, repeated task, dashboard,
            automation, calculator, portal, or workflow you want Ryan to scope.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Your open requests" value={String(openCount)} />
        <Stat label="Your total requests" value={String(mine.length)} />
        <Stat label="Community ideas" value={String(community.length)} />
      </div>

      <form onSubmit={submit} className="glass rounded-2xl border border-cyan-400/20 p-5 sm:p-6">
        <h2 className="text-lg font-bold text-white">Submit a new request</h2>
        <p className="mt-1 text-sm text-ink-300">
          Keep it plain: what hurts, what the tool should do, where it should live, and who owns it.
        </p>
        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
        <div className="mt-4 space-y-3">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            minLength={3}
            maxLength={140}
            placeholder="Example: Missed-call recovery dashboard for my shop"
            className="w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-3 text-sm text-white outline-none placeholder:text-ink-500 focus:border-cyan-500/50"
          />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
            minLength={10}
            maxLength={3000}
            placeholder="Describe what you want it to do, what account it should live in, what data it needs, and how often you would use it."
            rows={5}
            className="w-full resize-none rounded-lg border border-white/10 bg-ink-950 px-3 py-3 text-sm text-white outline-none placeholder:text-ink-500 focus:border-cyan-500/50"
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <select
              value={scope}
              onChange={(event) => setScope(event.target.value as ToolScope)}
              className="rounded-lg border border-white/10 bg-ink-950 px-3 py-3 text-sm text-white outline-none focus:border-cyan-500/50"
            >
              <option value="unsure">{SCOPE_LABELS.unsure}</option>
              <option value="just_me">{SCOPE_LABELS.just_me}</option>
              <option value="all_users">{SCOPE_LABELS.all_users}</option>
            </select>
            <button type="submit" disabled={loading} className="btn-primary justify-center text-sm disabled:opacity-60">
              <Plus className="h-4 w-4" />
              {loading ? "Submitting..." : "Submit request"}
            </button>
          </div>
        </div>
      </form>

      <section>
        <h2 className="text-lg font-bold text-white">Your requests</h2>
        <div className="mt-3 grid gap-3">
          {mine.length > 0 ? mine.map((request) => (
            <ToolRequestCard key={request.id} request={request} ownerLabel="Your account" />
          )) : (
            <EmptyState title="No tool requests yet" body="Submit the first one above. Ryan will scope it from the admin side." />
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-white">Community requests</h2>
        <div className="mt-3 grid gap-3">
          {community.length > 0 ? community.map((request) => (
            <ToolRequestCard
              key={request.id}
              request={request}
              ownerLabel={request.user?.businessName || request.user?.name || "Client"}
            />
          )) : (
            <EmptyState title="No community requests yet" body="As clients submit ideas, Ryan can decide what becomes a shared platform tool." />
          )}
        </div>
      </section>

      <div className="glass rounded-2xl border border-accent-400/20 p-5">
        <h2 className="text-lg font-bold text-white">Need Ryan to build it now?</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-300">
          Tool requests are for scoping. If you already need a build slot, use Stump Ryan so it lands in the paid blueprint path.
        </p>
        <Link href="/stump-ryan" className="btn-accent mt-4 inline-flex text-sm">
          Start build blueprint <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function normalizeDate<T extends { createdAt: Date | string; updatedAt: Date | string }>(row: T): T {
  return {
    ...row,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : row.createdAt.toISOString(),
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : row.updatedAt.toISOString(),
  };
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-xs font-semibold uppercase tracking-widest text-cyan-300">{label}</div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-white">{value}</div>
    </div>
  );
}

function ToolRequestCard({
  request,
  ownerLabel,
}: {
  request: ToolRequestRow;
  ownerLabel: string;
}) {
  const status = STATUS_STYLES[request.status];
  const StatusIcon = status.icon;
  return (
    <article className="glass rounded-2xl p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-white">{request.title}</h3>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${status.cls}`}>
              <StatusIcon className="h-3 w-3" /> {status.label}
            </span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-200">{request.description}</p>
          {request.reply ? (
            <div className="mt-3 rounded-xl border-l-2 border-accent-500 bg-white/[0.04] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-accent-300">Ryan reply</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink-100">{request.reply}</p>
            </div>
          ) : null}
        </div>
        <div className="shrink-0 text-sm text-ink-300 sm:text-right">
          <p>{ownerLabel}</p>
          <p className="mt-1">{SCOPE_LABELS[request.scope]}</p>
          {request.quotedPriceUsd ? <p className="mt-1 text-accent-300">${request.quotedPriceUsd} scoped</p> : null}
          {request.shippedUrl ? (
            <Link href={request.shippedUrl} className="mt-2 inline-flex items-center gap-1 text-cyan-300 hover:underline">
              Open shipped tool <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}
          <p className="mt-2 inline-flex items-center gap-1">
            <ThumbsUp className="h-3.5 w-3.5" /> {request.upvotes}
          </p>
        </div>
      </div>
    </article>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-ink-300">{body}</p>
    </div>
  );
}
