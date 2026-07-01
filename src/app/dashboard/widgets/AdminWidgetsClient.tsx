"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Code2, Copy, Loader2, Pause, Play, Plus, Trash2 } from "lucide-react";
import { trackLeadFlowEvent } from "@/lib/leadflow-events-client";
import type { LeadFlowWidgetType, WidgetStatus } from "@/lib/leadflow-widget-definitions";
import type { LeadFlowWidgetRow, WidgetAdminDashboardData, WidgetAdminSummary } from "@/lib/leadflow-widgets";
import { cn } from "@/lib/utils";

function statusTone(status: string) {
  if (status === "active") return "border-lead-300/35 bg-lead-300/12 text-lead-100";
  if (status === "paused" || status === "draft") return "border-accent-300/35 bg-accent-300/12 text-accent-100";
  if (status === "archived" || status === "deleted") return "border-red-300/35 bg-red-300/12 text-red-100";
  return "border-white/10 bg-white/[0.045] text-ink-200";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function Badge({ label, tone }: { label: string; tone?: string }) {
  return (
    <span className={cn("inline-flex min-h-7 items-center rounded-lg border px-2.5 text-xs font-black capitalize", tone || statusTone(label))}>
      {label.replace(/_/g, " ")}
    </span>
  );
}

export function AdminWidgetsClient({ data }: { data: WidgetAdminDashboardData }) {
  const [selected, setSelected] = useState<WidgetAdminSummary | null>(data.widgets[0] || null);
  const [result, setResult] = useState("");
  const [pendingAction, setPendingAction] = useState("");

  useEffect(() => {
    trackLeadFlowEvent("admin_dashboard_viewed", { route: "/dashboard/widgets", user_role: "admin" });
  }, []);

  const visibleWidgets = useMemo(() => data.widgets, [data.widgets]);

  async function action(widget: LeadFlowWidgetRow, actionName: "pause" | "activate" | "archive" | "delete") {
    if (["archive", "delete"].includes(actionName) && !window.confirm("This changes widget availability and will be audited. Continue?")) return;
    setPendingAction(`${actionName}:${widget.id}`);
    setResult("");
    try {
      const response = await fetch("/api/leadflow/widgets/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: actionName, widgetId: widget.id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Widget action failed.");
      setResult(`Widget ${actionName} saved. Refresh to see updated stats.`);
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Widget action failed.");
    } finally {
      setPendingAction("");
    }
  }

  return (
    <div className="mx-auto max-w-[1540px] space-y-6">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_12%_10%,rgba(35,184,255,0.18),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(255,186,61,0.12),transparent_28%),linear-gradient(135deg,#07101b,#050711)] p-5 shadow-2xl shadow-black/30 md:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-cyan-200">
              <Code2 className="h-4 w-4" />
              Widget builder
            </p>
            <h1 className="mt-4 max-w-5xl text-4xl font-black leading-tight text-white md:text-6xl">
              Put LeadFlow tools on client sites.
            </h1>
            <p className="mt-4 max-w-4xl text-sm leading-6 text-ink-200 md:text-base md:leading-7">
              Create embeddable questionnaires, set domain allowlists, track starts and completions, and save consented first-party signals into the review machine.
            </p>
          </div>
          <Badge label={data.mode === "live" ? "Live data" : "Safe templates"} tone={data.mode === "live" ? statusTone("active") : statusTone("paused")} />
        </div>
        {data.loadErrors.length ? (
          <div className="mt-5 rounded-lg border border-accent-300/30 bg-accent-300/10 p-3 text-sm leading-6 text-accent-100">
            {data.loadErrors[0]}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-4 xl:grid-cols-7">
        <Stat label="Widgets" value={String(data.totals.widgets)} />
        <Stat label="Active" value={String(data.totals.active)} />
        <Stat label="Loads" value={String(data.totals.loads)} />
        <Stat label="Starts" value={String(data.totals.starts)} />
        <Stat label="Completions" value={String(data.totals.completions)} />
        <Stat label="Contacts" value={String(data.totals.contacts)} />
        <Stat label="Avg score" value={String(data.totals.averageScore)} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[430px_minmax(0,1fr)]">
        <WidgetEditor data={data} selected={selected?.widget || null} onSaved={(message) => setResult(message)} />
        <div className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black text-white">Widget registry</h2>
              <p className="mt-2 text-sm leading-6 text-ink-300">Each widget writes events, submissions, answers, consent, and review profiles through server routes.</p>
            </div>
            <Link href="/widgets" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 text-sm font-black text-cyan-50">
              Public page <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm">
              <thead>
                <tr>
                  {["Widget", "Status", "Domain", "Loads", "Starts", "Completions", "Score", "Actions"].map((header) => (
                    <th key={header} className="whitespace-nowrap bg-white/[0.035] px-3 py-3 text-xs font-black uppercase tracking-wider text-ink-400">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleWidgets.length ? visibleWidgets.map((summary) => (
                  <tr key={summary.widget.id} className="border-t border-white/10 align-top">
                    <td className="px-3 py-3">
                      <button type="button" onClick={() => setSelected(summary)} className="text-left">
                        <span className="font-black text-white">{summary.widget.name}</span>
                        <span className="mt-1 block font-mono text-xs text-ink-500">{summary.widget.slug}</span>
                      </button>
                    </td>
                    <td className="px-3 py-3"><Badge label={summary.widget.status} /></td>
                    <td className="px-3 py-3 text-ink-300">{summary.widget.allowed_domains?.slice(0, 2).join(", ") || "*"}</td>
                    <td className="px-3 py-3 font-black text-white">{summary.loads}</td>
                    <td className="px-3 py-3 font-black text-white">{summary.starts}</td>
                    <td className="px-3 py-3 font-black text-white">{summary.completions}</td>
                    <td className="px-3 py-3 font-black text-white">{summary.averageScore || "0"}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/dashboard/widgets/${summary.widget.slug || summary.widget.id}`} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-ink-100">Open</Link>
                        {summary.widget.status === "active" ? (
                          <ActionButton pending={pendingAction === `pause:${summary.widget.id}`} icon={Pause} label="Pause" onClick={() => action(summary.widget, "pause")} />
                        ) : (
                          <ActionButton pending={pendingAction === `activate:${summary.widget.id}`} icon={Play} label="Activate" onClick={() => action(summary.widget, "activate")} />
                        )}
                        <ActionButton pending={pendingAction === `archive:${summary.widget.id}`} icon={Trash2} label="Archive" onClick={() => action(summary.widget, "archive")} danger />
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={8} className="px-3 py-10 text-center text-sm text-ink-300">No widgets loaded yet. Create the first widget from the builder.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {result ? <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm font-bold text-ink-100">{result}</div> : null}
        </div>
      </section>
    </div>
  );
}

function WidgetEditor({
  data,
  selected,
  onSaved,
}: {
  data: WidgetAdminDashboardData;
  selected: LeadFlowWidgetRow | null;
  onSaved: (message: string) => void;
}) {
  const firstCatalog = data.catalog[0];
  const [widgetId, setWidgetId] = useState(selected?.id || "");
  const [widgetType, setWidgetType] = useState<LeadFlowWidgetType>(selected?.widget_type || firstCatalog.type);
  const [name, setName] = useState(selected?.name || firstCatalog.name);
  const [slug, setSlug] = useState(selected?.slug || firstCatalog.slug);
  const [status, setStatus] = useState<WidgetStatus>(selected?.status || "active");
  const [allowedDomains, setAllowedDomains] = useState(selected?.allowed_domains?.join(", ") || "*");
  const [completionMessage, setCompletionMessage] = useState(selected?.completion_message || "Your signal score is ready. Use the result to decide the next move.");
  const [consentRequired, setConsentRequired] = useState(selected?.consent_required ?? true);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!selected) return;
    setWidgetId(selected.id);
    setWidgetType(selected.widget_type);
    setName(selected.name);
    setSlug(selected.slug);
    setStatus(selected.status);
    setAllowedDomains(selected.allowed_domains?.join(", ") || "*");
    setCompletionMessage(selected.completion_message || "Your signal score is ready.");
    setConsentRequired(selected.consent_required);
  }, [selected]);

  const embedCode = `<script src="https://www.theleadflowpro.com/api/widget-script/${slug}.js"></script>\n<div id="leadflow-widget-${slug}"></div>`;

  async function save() {
    setPending(true);
    onSaved("");
    try {
      const response = await fetch("/api/leadflow/widgets/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: widgetId ? "update" : "create",
          widgetId,
          widgetType,
          name,
          slug,
          status,
          allowedDomains: allowedDomains.split(",").map((item) => item.trim()).filter(Boolean),
          completionMessage,
          consentRequired,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Widget save failed.");
      setWidgetId(payload.widget?.id || widgetId);
      onSaved("Widget saved and audited. Refresh the page after schema changes or deployment.");
      trackLeadFlowEvent("admin_table_filtered", { route: "/dashboard/widgets", status, user_role: "admin" });
    } catch (error) {
      onSaved(error instanceof Error ? error.message : "Widget save failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
      <div className="flex items-start gap-3">
        <Plus className="mt-1 h-5 w-5 text-cyan-300" />
        <div>
          <h2 className="text-2xl font-black text-white">Create or edit widget</h2>
          <p className="mt-2 text-sm leading-6 text-ink-300">Pick a tool, allow domains, copy the embed code, then watch completions.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <label className="grid gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-ink-400">Widget type</span>
          <select value={widgetType} onChange={(event) => {
            const nextType = event.target.value as LeadFlowWidgetType;
            const catalog = data.catalog.find((item) => item.type === nextType);
            setWidgetType(nextType);
            if (catalog && !widgetId) {
              setName(catalog.name);
              setSlug(catalog.slug);
            }
          }} className="h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/50">
            {data.catalog.map((item) => <option key={item.type} value={item.type}>{item.name}</option>)}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-ink-400">Name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/50" />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-ink-400">Slug</span>
          <input value={slug} onChange={(event) => setSlug(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/50" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-ink-400">Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as WidgetStatus)} className="h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/50">
              {["draft", "active", "paused", "archived"].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-ink-400">Consent</span>
            <button type="button" onClick={() => setConsentRequired((value) => !value)} className={cn("h-11 rounded-lg border px-3 text-sm font-black", consentRequired ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-50" : "border-white/10 bg-white/[0.035] text-ink-200")}>
              {consentRequired ? "Required" : "Not required"}
            </button>
          </label>
        </div>
        <label className="grid gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-ink-400">Allowed domains</span>
          <input value={allowedDomains} onChange={(event) => setAllowedDomains(event.target.value)} placeholder="*, client.com, .client.com" className="h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/50" />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-ink-400">Completion message</span>
          <textarea value={completionMessage} onChange={(event) => setCompletionMessage(event.target.value)} rows={3} className="rounded-lg border border-white/10 bg-ink-950 px-3 py-3 text-sm font-bold text-white outline-none focus:border-cyan-300/50" />
        </label>
      </div>

      <div className="mt-5 rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-3">
        <p className="text-xs font-black uppercase tracking-wider text-cyan-100">Embed code</p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-black/40 p-3 text-xs leading-6 text-cyan-50">{embedCode}</pre>
        <button type="button" onClick={async () => {
          await navigator.clipboard?.writeText(embedCode).catch(() => null);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }} className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 text-xs font-black text-cyan-50">
          {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy code"}
        </button>
      </div>

      <button type="button" onClick={save} disabled={pending} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-300 px-5 text-sm font-black text-black transition hover:-translate-y-0.5 disabled:opacity-60">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Save widget
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#060a11]/92 p-4 shadow-2xl shadow-black/20">
      <p className="text-xs font-black uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function ActionButton({
  pending,
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  pending: boolean;
  icon: typeof Pause;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={cn(
        "inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-black disabled:opacity-60",
        danger ? "border-red-300/35 bg-red-300/10 text-red-100" : "border-white/10 bg-white/[0.04] text-ink-100",
      )}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}
