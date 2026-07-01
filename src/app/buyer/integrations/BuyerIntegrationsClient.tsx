"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  DatabaseZap,
  Loader2,
  Pause,
  Play,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Webhook,
} from "lucide-react";
import { trackLeadFlowEvent } from "@/lib/leadflow-events-client";
import type {
  BuyerIntegrationsPageData,
  IntegrationProvider,
  IntegrationStatus,
  SafeIntegration,
} from "@/lib/leadflow-integrations";
import { cn } from "@/lib/utils";

type AuthenticatedData = Extract<BuyerIntegrationsPageData, { authenticated: true }>;

const defaultFieldMapping = {
  profile_id: "LeadFlow Profile ID",
  listing_id: "Listing ID",
  title: "Lead Title",
  category: "Category",
  vertical: "Vertical",
  score: "Score",
  confidence: "Confidence",
  summary: "Summary",
  buyer_use_case: "Buyer Use Case",
  recommended_next_action: "Next Action",
  source_proof_summary: "Source Proof",
  allowed_use: "Allowed Use",
  suppression_status: "Suppression Status",
};

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
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

export function BuyerIntegrationsClient({ data }: { data: AuthenticatedData }) {
  const [provider, setProvider] = useState<IntegrationProvider>("webhook");
  const [name, setName] = useState("LeadFlow signal webhook");
  const [status, setStatus] = useState<IntegrationStatus>("draft");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [webhookSecretHeaderName, setWebhookSecretHeaderName] = useState("x-leadflow-secret");
  const [eventType, setEventType] = useState("lead_signal.approved");
  const [allowedListingIds, setAllowedListingIds] = useState<string[]>([]);
  const [allowedVerticals, setAllowedVerticals] = useState("");
  const [includeContactFields, setIncludeContactFields] = useState(false);
  const [autoRunEnabled, setAutoRunEnabled] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const selectedProvider = data.providerCatalog.find((item) => item.provider === provider) || data.providerCatalog[0];
  const recentRuns = useMemo(() => data.runs.slice(0, 12), [data.runs]);
  const recentLogs = useMemo(() => data.logs.slice(0, 12), [data.logs]);

  useEffect(() => {
    trackLeadFlowEvent("integration_page_viewed", { route: "/buyer/integrations", user_role: "buyer" });
  }, []);

  async function submitIntegration() {
    setPending("save");
    setResult(null);
    trackLeadFlowEvent("integration_created", { route: "/buyer/integrations", provider, status, user_role: "buyer" });
    try {
      const response = await fetch("/api/leadflow/integrations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create",
          provider,
          name,
          status,
          webhookUrl,
          webhookSecret,
          webhookSecretHeaderName,
          eventType,
          fieldMapping: defaultFieldMapping,
          allowedListingIds,
          allowedVerticals: allowedVerticals.split(",").map((item) => item.trim()).filter(Boolean),
          deliverySettings: {
            include_contact_fields: includeContactFields,
            auto_run_enabled: autoRunEnabled,
            run_frequency: autoRunEnabled ? "manual_plus_future_schedule" : "manual",
            allowed_use_confirmed: true,
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Integration save failed.");
      setWebhookSecret("");
      setResult(payload.message || "Integration saved. Refresh to see the latest row.");
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Integration save failed.");
    } finally {
      setPending(null);
    }
  }

  async function integrationAction(integration: SafeIntegration, action: "test" | "run" | "pause" | "resume" | "delete") {
    const destructive = action === "delete" || action === "pause";
    if (destructive && !window.confirm("This changes buyer delivery access. Continue?")) return;
    setPending(`${action}:${integration.id}`);
    setResult(null);
    trackLeadFlowEvent(
      action === "test" ? "integration_tested" : action === "run" ? "integration_run_started" : action === "pause" ? "integration_paused" : action === "delete" ? "integration_revoked" : "integration_created",
      { route: "/buyer/integrations", provider: integration.provider, status: integration.status, user_role: "buyer" },
    );
    try {
      const response = await fetch("/api/leadflow/integrations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          integrationId: integration.id,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Integration action failed.");
      setResult(payload.message || `${action} saved.`);
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Integration action failed.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-5">
      {data.restricted ? (
        <div className="rounded-xl border border-red-300/30 bg-red-300/10 p-4 text-sm leading-6 text-red-100">
          This buyer account is restricted. Integrations are disabled until account status changes.
        </div>
      ) : null}
      {data.loadErrors.length ? (
        <div className="rounded-xl border border-accent-300/30 bg-accent-300/10 p-4 text-sm leading-6 text-accent-100">
          {data.loadErrors[0]}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <Stat label="Connected integrations" value={String(data.integrations.length)} />
        <Stat label="Active" value={String(data.integrations.filter((item) => item.status === "active").length)} />
        <Stat label="Runs logged" value={String(data.runs.length)} />
        <Stat label="Approved listings" value={String(data.allowedListings.length)} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-cyan-200">
                <PlugZap className="h-4 w-4" />
                Connected integrations
              </p>
              <h2 className="mt-3 text-2xl font-black text-white">Delivery stays entitlement-gated.</h2>
              <p className="mt-2 text-sm leading-6 text-ink-300">
                Runs check buyer access before sending anything. Suppressed, raw, hidden, and admin-only fields are not delivered.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {data.integrations.length ? data.integrations.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                pending={pending}
                onAction={integrationAction}
              />
            )) : (
              <div className="rounded-xl border border-white/10 bg-white/[0.035] p-6 text-center">
                <Webhook className="mx-auto h-8 w-8 text-cyan-300" />
                <h3 className="mt-3 text-xl font-black text-white">No integrations yet.</h3>
                <p className="mt-2 text-sm leading-6 text-ink-300">
                  Start with webhook, Zapier, Make, or the native CSV delivery path.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
          <h2 className="text-2xl font-black text-white">Add integration</h2>
          <p className="mt-2 text-sm leading-6 text-ink-300">
            Use safe field mapping now. OAuth providers stay placeholders until credentials are configured.
          </p>

          <div className="mt-5 grid gap-4">
            <label className="text-sm font-bold text-ink-200">
              Provider
              <select
                value={provider}
                onChange={(event) => {
                  const value = event.target.value as IntegrationProvider;
                  setProvider(value);
                  setName(`${data.providerCatalog.find((item) => item.provider === value)?.label || "LeadFlow"} integration`);
                }}
                className="mt-2 min-h-11 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-300/50"
              >
                {data.providerCatalog.map((item) => (
                  <option key={item.provider} value={item.provider}>{item.label}</option>
                ))}
              </select>
            </label>

            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-white">{selectedProvider.label}</p>
                <Badge label={selectedProvider.status} tone={selectedProvider.status === "ready" || selectedProvider.status === "native" ? statusTone("active") : statusTone("paused")} />
              </div>
              <p className="mt-2 text-xs leading-5 text-ink-300">{selectedProvider.description}</p>
            </div>

            <label className="text-sm font-bold text-ink-200">
              Integration name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-300/50"
              />
            </label>

            <label className="text-sm font-bold text-ink-200">
              Status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as IntegrationStatus)}
                className="mt-2 min-h-11 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-300/50"
              >
                {["draft", "active", "paused"].map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>

            {selectedProvider.requiresWebhookUrl ? (
              <>
                <label className="text-sm font-bold text-ink-200">
                  Webhook URL
                  <input
                    value={webhookUrl}
                    onChange={(event) => setWebhookUrl(event.target.value)}
                    placeholder="https://hooks.example.com/leadflow"
                    className="mt-2 min-h-11 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-300/50"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr]">
                  <label className="text-sm font-bold text-ink-200">
                    Secret header name
                    <input
                      value={webhookSecretHeaderName}
                      onChange={(event) => setWebhookSecretHeaderName(event.target.value)}
                      className="mt-2 min-h-11 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-300/50"
                    />
                  </label>
                  <label className="text-sm font-bold text-ink-200">
                    Secret header value
                    <input
                      type="password"
                      value={webhookSecret}
                      onChange={(event) => setWebhookSecret(event.target.value)}
                      placeholder="Optional. Not shown after save."
                      className="mt-2 min-h-11 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-300/50"
                    />
                  </label>
                </div>
              </>
            ) : null}

            <label className="text-sm font-bold text-ink-200">
              Event type
              <input
                value={eventType}
                onChange={(event) => setEventType(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-300/50"
              />
            </label>

            <div>
              <p className="text-sm font-bold text-ink-200">Allowed listings</p>
              <div className="mt-2 grid gap-2 rounded-lg border border-white/10 bg-ink-950 p-3">
                {data.allowedListings.length ? data.allowedListings.map((listing) => (
                  <label key={listing.slug || listing.title} className={cn("flex items-start gap-2 rounded-md border p-2 text-xs leading-5", listing.id ? "border-white/10 bg-white/[0.025] text-ink-200" : "border-accent-300/20 bg-accent-300/5 text-accent-100")}>
                    <input
                      type="checkbox"
                      disabled={!listing.id}
                      checked={Boolean(listing.id && allowedListingIds.includes(listing.id))}
                      onChange={(event) => {
                        if (!listing.id) return;
                        setAllowedListingIds((current) => event.target.checked ? [...current, listing.id as string] : current.filter((id) => id !== listing.id));
                      }}
                      className="mt-1"
                    />
                    <span>
                      <strong className="text-white">{listing.title}</strong>
                      <span className="block text-ink-400">{listing.vertical} · {listing.accessLevel}{listing.id ? "" : " · slug-only entitlement"}</span>
                    </span>
                  </label>
                )) : (
                  <p className="text-xs leading-5 text-ink-400">No approved listings yet. Integrations can be saved, but delivery runs need entitlement.</p>
                )}
              </div>
            </div>

            <label className="text-sm font-bold text-ink-200">
              Allowed verticals
              <input
                value={allowedVerticals}
                onChange={(event) => setAllowedVerticals(event.target.value)}
                placeholder="ecommerce, local business, mortgage"
                className="mt-2 min-h-11 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-300/50"
              />
            </label>

            <div className="grid gap-2">
              <label className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm text-ink-200">
                <input type="checkbox" checked={includeContactFields} onChange={(event) => setIncludeContactFields(event.target.checked)} className="mt-1" />
                <span>
                  <strong className="text-white">Include contact fields only when entitlement permits.</strong>
                  <span className="block text-xs leading-5 text-ink-400">Admin notes, raw answers, hidden source notes, and suppressed records are never included.</span>
                </span>
              </label>
              <label className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm text-ink-200">
                <input type="checkbox" checked={autoRunEnabled} onChange={(event) => setAutoRunEnabled(event.target.checked)} className="mt-1" />
                <span>
                  <strong className="text-white">Mark for future auto-run.</strong>
                  <span className="block text-xs leading-5 text-ink-400">Scheduling is staged. Manual run stays the live control for now.</span>
                </span>
              </label>
            </div>

            <button
              type="button"
              onClick={submitIntegration}
              disabled={Boolean(pending) || data.restricted}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent-300 px-4 text-sm font-black text-ink-950 shadow-[0_0_28px_rgba(255,186,61,0.22)] transition hover:bg-accent-200 disabled:opacity-50"
            >
              {pending === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Save integration
            </button>
            {result ? <p className="rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-ink-200">{result}</p> : null}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <RunHistory runs={recentRuns} />
        <LogPanel logs={recentLogs} />
      </section>

      <section className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
        <h2 className="text-2xl font-black text-white">Field mapping</h2>
        <p className="mt-2 text-sm leading-6 text-ink-300">
          The first version maps approved LeadFlow payload fields into destination labels. Raw form answers, protected traits, admin notes, hidden source notes, tokens, and suppressed records are not in this map.
        </p>
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(defaultFieldMapping).map(([field, label]) => (
            <div key={field} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
              <p className="font-mono text-xs text-cyan-200">{field}</p>
              <p className="mt-1 text-sm font-bold text-white">{label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function IntegrationCard({
  integration,
  pending,
  onAction,
}: {
  integration: SafeIntegration;
  pending: string | null;
  onAction: (integration: SafeIntegration, action: "test" | "run" | "pause" | "resume" | "delete") => void;
}) {
  const actionPending = (action: string) => pending === `${action}:${integration.id}`;
  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge label={integration.provider_label} tone="border-cyan-300/35 bg-cyan-300/12 text-cyan-100" />
            <Badge label={integration.status} tone={statusTone(integration.status)} />
          </div>
          <h3 className="mt-3 text-xl font-black text-white">{integration.name}</h3>
          <p className="mt-2 text-sm leading-6 text-ink-300">
            Destination: {String(integration.config_preview.webhook_url_preview || "LeadFlow native workflow")}
          </p>
          <p className="mt-1 text-xs leading-5 text-ink-500">
            Updated {formatDate(integration.updated_at)} · listings {integration.allowed_listing_ids.length || "all entitled"} · verticals {integration.allowed_verticals.length || "all"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          <ActionButton icon={RefreshCw} label="Test" busy={actionPending("test")} onClick={() => onAction(integration, "test")} />
          <ActionButton icon={Play} label="Run" busy={actionPending("run")} onClick={() => onAction(integration, "run")} disabled={!integration.can_run} />
          {integration.status === "paused" ? (
            <ActionButton icon={Play} label="Resume" busy={actionPending("resume")} onClick={() => onAction(integration, "resume")} />
          ) : (
            <ActionButton icon={Pause} label="Pause" busy={actionPending("pause")} onClick={() => onAction(integration, "pause")} />
          )}
          <ActionButton icon={Trash2} label="Revoke" busy={actionPending("delete")} onClick={() => onAction(integration, "delete")} danger />
        </div>
      </div>
      {integration.config_preview.secret_storage === "encryption_key_missing" ? (
        <div className="mt-3 rounded-lg border border-accent-300/25 bg-accent-300/10 p-3 text-xs leading-5 text-accent-100">
          Webhook secret was not stored because `LEADFLOW_INTEGRATION_SECRET_KEY` is not configured.
        </div>
      ) : null}
    </article>
  );
}

function RunHistory({ runs }: { runs: AuthenticatedData["runs"] }) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
      <h2 className="text-2xl font-black text-white">Run history</h2>
      <div className="mt-4 overflow-x-auto rounded-lg border border-white/10">
        <table className="min-w-full divide-y divide-white/10 text-left text-sm">
          <thead>
            <tr>
              {["Run", "Type", "Status", "Profiles", "Started"].map((header) => (
                <th key={header} className="bg-white/[0.035] px-3 py-3 text-xs font-extrabold uppercase tracking-wider text-ink-400">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {runs.length ? runs.map((run) => (
              <tr key={run.id}>
                <td className="border-t border-white/10 px-3 py-3 font-mono text-xs text-ink-400">{run.id.slice(0, 8)}</td>
                <td className="border-t border-white/10 px-3 py-3 text-ink-200">{run.run_type.replace(/_/g, " ")}</td>
                <td className="border-t border-white/10 px-3 py-3"><Badge label={run.status} tone={statusTone(run.status)} /></td>
                <td className="border-t border-white/10 px-3 py-3 text-ink-200">{run.profile_count}</td>
                <td className="border-t border-white/10 px-3 py-3 text-ink-300">{formatDate(run.started_at)}</td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="border-t border-white/10 px-3 py-8 text-center text-sm text-ink-300">No integration runs yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LogPanel({ logs }: { logs: AuthenticatedData["logs"] }) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
      <h2 className="text-2xl font-black text-white">Redacted logs</h2>
      <div className="mt-4 grid gap-3">
        {logs.length ? logs.map((log) => (
          <article key={log.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge label={log.log_level} tone={log.log_level === "error" || log.log_level === "security" ? statusTone("failed") : statusTone("active")} />
              <span className="font-mono text-xs text-ink-500">{formatDate(log.created_at)}</span>
            </div>
            <p className="mt-2 text-sm font-bold text-white">{log.event_type.replace(/_/g, " ")}</p>
            <p className="mt-1 text-sm leading-6 text-ink-300">{log.message}</p>
          </article>
        )) : (
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-6 text-center text-sm text-ink-300">
            Logs appear after tests, runs, pauses, and revokes.
          </div>
        )}
      </div>
    </section>
  );
}

function ActionButton({
  icon: Icon,
  label,
  busy,
  onClick,
  disabled,
  danger,
}: {
  icon: typeof Play;
  label: string;
  busy?: boolean;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
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
      {label === "failed" || label === "revoked" ? <AlertTriangle className="h-3.5 w-3.5" /> : label === "active" || label === "completed" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <DatabaseZap className="h-3.5 w-3.5" />}
      {label.replace(/_/g, " ")}
    </span>
  );
}
