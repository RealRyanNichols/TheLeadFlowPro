"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Pause,
  Play,
  PlugZap,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { trackLeadFlowEvent } from "@/lib/leadflow-events-client";
import type { AdminIntegrationsPageData, SafeIntegration } from "@/lib/leadflow-integrations";
import { cn } from "@/lib/utils";

type AdminIntegration = AdminIntegrationsPageData["integrations"][number];

function statusTone(status: string) {
  if (status === "active" || status === "completed") return "border-lead-300/35 bg-lead-300/12 text-lead-100";
  if (status === "draft" || status === "queued" || status === "running") return "border-cyan-300/35 bg-cyan-300/12 text-cyan-100";
  if (status === "paused" || status === "blocked") return "border-accent-300/35 bg-accent-300/12 text-accent-100";
  if (status === "failed" || status === "revoked") return "border-red-300/35 bg-red-300/12 text-red-100";
  return "border-white/10 bg-white/[0.04] text-ink-200";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

export function AdminIntegrationsClient({ data }: { data: AdminIntegrationsPageData }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [pending, setPending] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    trackLeadFlowEvent("integration_page_viewed", { route: "/dashboard/integrations", user_role: "admin" });
  }, []);

  const providers = useMemo(
    () => Array.from(new Set(data.integrations.map((item) => item.provider))).sort(),
    [data.integrations],
  );
  const filtered = useMemo(
    () => data.integrations.filter((item) => {
      const statusMatch = statusFilter === "all" || item.status === statusFilter;
      const providerMatch = providerFilter === "all" || item.provider === providerFilter;
      return statusMatch && providerMatch;
    }),
    [data.integrations, providerFilter, statusFilter],
  );
  const failedRuns = data.runs.filter((run) => run.status === "failed" || run.status === "blocked").slice(0, 12);

  async function submit(integration: SafeIntegration, action: "pause" | "resume" | "revoke") {
    if (!window.confirm("This changes buyer delivery access and will be audited. Continue?")) return;
    setPending(`${action}:${integration.id}`);
    setResult(null);
    trackLeadFlowEvent(action === "pause" ? "integration_paused" : action === "revoke" ? "integration_revoked" : "integration_created", {
      route: "/dashboard/integrations",
      provider: integration.provider,
      status: integration.status,
      user_role: "admin",
    });
    try {
      const response = await fetch("/api/leadflow/integrations/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          integrationId: integration.id,
          action,
          confirmedImpact: true,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Integration admin action failed.");
      setResult(payload.message || `${action} saved.`);
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Integration admin action failed.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1540px] space-y-6">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_12%_10%,rgba(35,184,255,0.18),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(255,186,61,0.12),transparent_28%),linear-gradient(135deg,#07101b,#050711)] p-5 shadow-2xl shadow-black/30 md:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-cyan-200">
              <PlugZap className="h-4 w-4" />
              Integration delivery
            </p>
            <h1 className="mt-4 max-w-5xl text-4xl font-black leading-tight text-white md:text-6xl">
              Control where approved signals go.
            </h1>
            <p className="mt-4 max-w-4xl text-sm leading-6 text-ink-200 md:text-base md:leading-7">
              Buyer integrations are delivery routes, not raw data dumps. Pause unsafe destinations, revoke bad access, and review redacted payload logs without exposing secrets.
            </p>
          </div>
          <Badge label={data.mode === "live" ? "Live data" : "Safe placeholders"} tone={data.mode === "live" ? statusTone("active") : statusTone("paused")} />
        </div>
        {data.loadErrors.length ? (
          <div className="mt-5 rounded-lg border border-accent-300/30 bg-accent-300/10 p-3 text-sm leading-6 text-accent-100">
            {data.loadErrors[0]}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <Stat label="Integrations" value={String(data.stats.total)} />
        <Stat label="Active" value={String(data.stats.active)} />
        <Stat label="Paused" value={String(data.stats.paused)} />
        <Stat label="Failed" value={String(data.stats.failed)} />
        <Stat label="Revoked" value={String(data.stats.revoked)} />
      </section>

      <section className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">Integration registry</h2>
            <p className="mt-2 text-sm leading-6 text-ink-300">Secrets are not shown. Config previews are destination summaries only.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="text-sm font-bold text-ink-200">
              Status
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  trackLeadFlowEvent("admin_table_filtered", { route: "/dashboard/integrations", status: event.target.value, user_role: "admin" });
                }}
                className="mt-2 min-h-10 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-300/50"
              >
                {["all", "draft", "active", "paused", "failed", "revoked"].map((status) => (
                  <option key={status} value={status}>{status.replace(/_/g, " ")}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-bold text-ink-200">
              Provider
              <select
                value={providerFilter}
                onChange={(event) => setProviderFilter(event.target.value)}
                className="mt-2 min-h-10 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-300/50"
              >
                <option value="all">all</option>
                {providers.map((provider) => <option key={provider} value={provider}>{provider.replace(/_/g, " ")}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm">
            <thead>
              <tr>
                {["Buyer", "Integration", "Provider", "Destination", "Status", "Updated", "Actions"].map((header) => (
                  <th key={header} className="whitespace-nowrap bg-white/[0.035] px-3 py-3 text-xs font-extrabold uppercase tracking-wider text-ink-400">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length ? filtered.map((integration) => (
                <IntegrationRow key={integration.id} integration={integration} pending={pending} onAction={submit} />
              )) : (
                <tr>
                  <td colSpan={7} className="border-t border-white/10 px-3 py-8 text-center text-sm text-ink-300">No integrations match this filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {result ? <p className="mt-4 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-ink-200">{result}</p> : null}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
          <h2 className="text-2xl font-black text-white">Failed or blocked runs</h2>
          <div className="mt-4 overflow-x-auto rounded-lg border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm">
              <thead>
                <tr>
                  {["Run", "Integration", "Type", "Status", "Profiles", "Error"].map((header) => (
                    <th key={header} className="whitespace-nowrap bg-white/[0.035] px-3 py-3 text-xs font-extrabold uppercase tracking-wider text-ink-400">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {failedRuns.length ? failedRuns.map((run) => (
                  <tr key={run.id}>
                    <td className="border-t border-white/10 px-3 py-3 font-mono text-xs text-ink-400">{run.id.slice(0, 8)}</td>
                    <td className="border-t border-white/10 px-3 py-3 font-mono text-xs text-ink-400">{run.integration_id.slice(0, 8)}</td>
                    <td className="border-t border-white/10 px-3 py-3 text-ink-200">{run.run_type.replace(/_/g, " ")}</td>
                    <td className="border-t border-white/10 px-3 py-3"><Badge label={run.status} tone={statusTone(run.status)} /></td>
                    <td className="border-t border-white/10 px-3 py-3 text-ink-200">{run.profile_count}</td>
                    <td className="border-t border-white/10 px-3 py-3 text-ink-300">{run.error_message || "blocked by guardrail"}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="border-t border-white/10 px-3 py-8 text-center text-sm text-ink-300">No failed or blocked runs loaded.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
          <h2 className="text-2xl font-black text-white">Redacted payload log</h2>
          <div className="mt-4 grid gap-3">
            {data.logs.slice(0, 10).map((log) => (
              <article key={log.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge label={log.log_level} tone={log.log_level === "error" || log.log_level === "security" ? statusTone("failed") : statusTone("active")} />
                  <span className="font-mono text-xs text-ink-500">{formatDate(log.created_at)}</span>
                </div>
                <p className="mt-2 text-sm font-bold text-white">{log.event_type.replace(/_/g, " ")}</p>
                <p className="mt-1 text-sm leading-6 text-ink-300">{log.message}</p>
                <p className="mt-2 font-mono text-[11px] leading-5 text-ink-500">
                  {Object.keys(log.payload_summary || {}).slice(0, 8).join(", ") || "summary only"}
                </p>
              </article>
            ))}
            {!data.logs.length ? (
              <div className="rounded-lg border border-white/10 bg-white/[0.035] p-6 text-center text-sm text-ink-300">
                Integration logs appear after delivery tests, runs, pauses, and revokes.
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function IntegrationRow({
  integration,
  pending,
  onAction,
}: {
  integration: AdminIntegration;
  pending: string | null;
  onAction: (integration: SafeIntegration, action: "pause" | "resume" | "revoke") => void;
}) {
  const busy = (action: string) => pending === `${action}:${integration.id}`;
  return (
    <tr>
      <td className="border-t border-white/10 px-3 py-3">
        <p className="font-bold text-white">{integration.buyerName}</p>
        <p className="mt-1 text-xs text-ink-400">{integration.buyerCompany}</p>
        <p className="mt-1 text-[11px] text-ink-500">{integration.buyerStatus.replace(/_/g, " ")}</p>
      </td>
      <td className="border-t border-white/10 px-3 py-3">
        <p className="max-w-[240px] truncate font-bold text-white">{integration.name}</p>
        <p className="mt-1 font-mono text-[11px] text-ink-500">{integration.id.slice(0, 8)}</p>
      </td>
      <td className="border-t border-white/10 px-3 py-3 text-ink-200">{integration.provider_label}</td>
      <td className="border-t border-white/10 px-3 py-3 text-ink-300">{String(integration.config_preview.webhook_url_preview || "native workflow")}</td>
      <td className="border-t border-white/10 px-3 py-3"><Badge label={integration.status} tone={statusTone(integration.status)} /></td>
      <td className="border-t border-white/10 px-3 py-3 text-ink-300">{formatDate(integration.updated_at)}</td>
      <td className="border-t border-white/10 px-3 py-3">
        <div className="flex min-w-[240px] flex-wrap gap-2">
          {integration.status === "paused" ? (
            <ActionButton icon={Play} label="Resume" busy={busy("resume")} onClick={() => onAction(integration, "resume")} />
          ) : (
            <ActionButton icon={Pause} label="Pause" busy={busy("pause")} onClick={() => onAction(integration, "pause")} />
          )}
          <ActionButton icon={Trash2} label="Revoke" busy={busy("revoke")} onClick={() => onAction(integration, "revoke")} danger />
        </div>
      </td>
    </tr>
  );
}

function ActionButton({
  icon: Icon,
  label,
  busy,
  onClick,
  danger,
}: {
  icon: typeof Play;
  label: string;
  busy?: boolean;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        "inline-flex min-h-9 items-center justify-center gap-1 rounded-md border px-2.5 text-xs font-bold disabled:opacity-50",
        danger ? "border-red-300/30 text-red-100 hover:bg-red-300/10" : "border-cyan-300/30 text-cyan-100 hover:bg-cyan-300/10",
      )}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function Badge({ label, tone }: { label: string; tone: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-extrabold capitalize", tone)}>
      {label === "failed" || label === "revoked" || label === "security" ? <ShieldAlert className="h-3.5 w-3.5" /> : label === "active" || label === "completed" ? <ShieldCheck className="h-3.5 w-3.5" /> : label === "blocked" ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
      {label.replace(/_/g, " ")}
    </span>
  );
}
