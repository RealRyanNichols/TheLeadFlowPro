"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Mail,
  RefreshCw,
  Search,
  Sparkles,
  XCircle,
} from "lucide-react";

type Intake = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  businessName: string | null;
  businessUrl: string | null;
  industry: string | null;
  monthlyRevenueRange: string | null;
  biggestGoal: string | null;
  biggestBlocker: string | null;
  budgetTier: string;
  bestContactMethod: string | null;
  notes: string | null;
  routedTo: string | null;
  handled: boolean;
  createdAt: string;
  updatedAt: string;
};

const SECRET_STORAGE_KEY = "leadflow.adminSecret";

export default function AdminRequestsPage() {
  const [secret, setSecret] = useState("");
  const [savedSecret, setSavedSecret] = useState<string | null>(null);
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "all" | "handled">("open");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const s = localStorage.getItem(SECRET_STORAGE_KEY);
    if (s) {
      setSavedSecret(s);
      setSecret(s);
    }
  }, []);

  useEffect(() => {
    if (savedSecret) refresh(savedSecret);
  }, [savedSecret]);

  async function refresh(s = savedSecret) {
    if (!s) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/intakes?goal=tool-challenge&take=100", {
        headers: { "x-admin-secret": s },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `HTTP ${res.status}`);
        if (res.status === 401) {
          localStorage.removeItem(SECRET_STORAGE_KEY);
          setSavedSecret(null);
        }
        return;
      }
      const data = await res.json();
      setIntakes(data.intakes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      setLoading(false);
    }
  }

  async function setHandled(id: string, handled: boolean) {
    if (!savedSecret) return;
    const previous = intakes;
    setIntakes((rows) => rows.map((row) => (row.id === id ? { ...row, handled } : row)));
    try {
      const res = await fetch("/api/admin/intakes", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": savedSecret,
        },
        body: JSON.stringify({ id, handled }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      setIntakes(previous);
      setError(err instanceof Error ? err.message : "update failed");
    }
  }

  function saveSecret(e: FormEvent) {
    e.preventDefault();
    if (!secret) return;
    localStorage.setItem(SECRET_STORAGE_KEY, secret);
    setSavedSecret(secret);
  }

  function logout() {
    localStorage.removeItem(SECRET_STORAGE_KEY);
    setSavedSecret(null);
    setSecret("");
    setIntakes([]);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return intakes.filter((intake) => {
      if (filter === "open" && intake.handled) return false;
      if (filter === "handled" && !intake.handled) return false;
      if (!q) return true;
      return [
        intake.fullName,
        intake.email,
        intake.phone,
        intake.businessName,
        intake.businessUrl,
        intake.industry,
        intake.biggestBlocker,
        intake.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [filter, intakes, query]);

  const openCount = intakes.filter((intake) => !intake.handled).length;
  const handledCount = intakes.length - openCount;

  if (!savedSecret) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <form
          onSubmit={saveSecret}
          className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
            <ClipboardList className="h-3.5 w-3.5" /> Ryan admin
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">Build request queue</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Paste the admin secret to see Stump Me tool submissions.
          </p>
          <input
            type="password"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            placeholder="ADMIN_INIT_SECRET"
            className="mt-5 w-full rounded-xl border border-white/10 bg-white px-3 py-3 text-slate-950 outline-none focus:ring-2 focus:ring-cyan-300/40"
          />
          <button className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-3 font-semibold text-white hover:bg-accent-600">
            Open queue <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" /> Stump Me admin queue
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Build requests Ryan can act on.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
              Free submissions land here. Paid $250 deposits create work orders and hit the
              capacity ledger separately.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => refresh()}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold hover:bg-white/[0.1]"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <Link
              href="/admin/capacity"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-50"
            >
              Capacity <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold hover:bg-white/[0.1]"
            >
              <XCircle className="h-4 w-4" /> Lock
            </button>
          </div>
        </div>

        <div className="grid gap-3 py-5 sm:grid-cols-3">
          <Stat label="Open" value={String(openCount)} />
          <Stat label="Handled" value={String(handledCount)} />
          <Stat label="Total requests" value={String(intakes.length)} />
        </div>

        <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto]">
          <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, business, problem, email..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
          </label>
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-white/[0.06] p-1">
            {(["open", "all", "handled"] as const).map((item) => (
              <button
                key={item}
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

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-8 text-center text-slate-300">
            Loading requests...
          </div>
        ) : filtered.length ? (
          <div className="grid gap-4">
            {filtered.map((intake) => (
              <IntakeCard key={intake.id} intake={intake} onHandled={setHandled} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-8 text-center text-slate-300">
            No requests match this view.
          </div>
        )}
      </div>
    </div>
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

function IntakeCard({
  intake,
  onHandled,
}: {
  intake: Intake;
  onHandled: (id: string, handled: boolean) => void;
}) {
  const created = new Date(intake.createdAt);
  const mailto = `mailto:${intake.email}?subject=${encodeURIComponent(`Re: ${intake.businessName || intake.fullName} tool challenge`)}`;

  return (
    <article className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] shadow-2xl shadow-black/20">
      <div className="grid gap-0 lg:grid-cols-[0.72fr_1.28fr]">
        <div className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-100">
                {intake.handled ? "Handled" : "Open request"}
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">{intake.businessName || intake.fullName}</h2>
              <p className="mt-1 text-sm text-slate-300">{intake.fullName}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${intake.handled ? "bg-white/10 text-slate-300" : "bg-accent-500 text-white"}`}>
              {intake.handled ? "done" : "new"}
            </span>
          </div>
          <div className="mt-4 grid gap-2 text-sm text-slate-300">
            <a className="inline-flex items-center gap-2 hover:text-white" href={mailto}>
              <Mail className="h-4 w-4" /> {intake.email}
            </a>
            {intake.phone ? <div>{intake.phone}</div> : null}
            {intake.businessUrl ? (
              <a href={intake.businessUrl} target="_blank" rel="noreferrer" className="text-cyan-100 hover:text-cyan-50">
                {intake.businessUrl}
              </a>
            ) : null}
            <div>{created.toLocaleString()}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <Mini label="Budget" value={intake.budgetTier} />
            <Mini label="Industry" value={intake.industry || "Not set"} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={mailto}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-50"
            >
              Reply <ArrowRight className="h-4 w-4" />
            </a>
            <button
              onClick={() => onHandled(intake.id, !intake.handled)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-semibold hover:bg-white/[0.1]"
            >
              <CheckCircle2 className="h-4 w-4" />
              {intake.handled ? "Reopen" : "Mark handled"}
            </button>
          </div>
        </div>

        <div className="p-5">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Problem to solve
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-100">
              {intake.biggestBlocker || "No problem text captured."}
            </p>
          </div>
          {intake.notes ? (
            <div className="mt-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Full request notes
              </div>
              <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-slate-200">
                {intake.notes}
              </pre>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</div>
      <div className="mt-1 font-semibold text-white">{value}</div>
    </div>
  );
}
