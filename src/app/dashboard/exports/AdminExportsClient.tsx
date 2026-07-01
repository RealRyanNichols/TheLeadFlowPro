"use client";

import { useMemo, useState } from "react";
import { Download, FileWarning, RefreshCw, ShieldCheck } from "lucide-react";
import { trackLeadFlowEvent } from "@/lib/leadflow-events-client";
import type { AdminExportPageData, ExportFieldGroup, ExportFormat } from "@/lib/leadflow-export";
import { cn } from "@/lib/utils";

const adminFieldGroups: Array<{ key: ExportFieldGroup; label: string }> = [
  { key: "public_profile", label: "Public profile fields" },
  { key: "contact", label: "Approved contact fields" },
  { key: "source_proof", label: "Source proof fields" },
  { key: "compliance", label: "Compliance fields" },
  { key: "admin", label: "Admin-only fields" },
];

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function statusTone(status: string) {
  if (/generated|ready|completed|fulfilled/.test(status)) return "border-lead-300/35 bg-lead-300/12 text-lead-100";
  if (/blocked|failed|expired|revoked/.test(status)) return "border-red-300/35 bg-red-300/12 text-red-100";
  return "border-accent-300/35 bg-accent-300/12 text-accent-100";
}

export function AdminExportsClient({ data }: { data: AdminExportPageData }) {
  const targetOptions = useMemo(() => [
    ...data.profiles.map((profile) => ({
      value: `profile:${profile.slug || profile.id}`,
      label: `Profile: ${profile.title}`,
    })),
    ...data.listings.map((listing) => ({
      value: `listing:${listing.slug || listing.id}`,
      label: `Listing: ${listing.title}`,
    })),
  ], [data.listings, data.profiles]);

  const [target, setTarget] = useState(targetOptions[0]?.value || "");
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [exportType, setExportType] = useState("admin_internal");
  const [reason, setReason] = useState("Admin review export for approved operational use.");
  const [groups, setGroups] = useState<ExportFieldGroup[]>(["public_profile", "source_proof", "compliance"]);
  const [overrideHighRisk, setOverrideHighRisk] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ error?: string; downloadUrl?: string } | null>(null);

  function toggleGroup(group: ExportFieldGroup) {
    setGroups((current) => current.includes(group) ? current.filter((item) => item !== group) : [...current, group]);
  }

  async function createExport() {
    setResult(null);
    setPending(true);
    const [targetType, targetId] = target.split(":");
    trackLeadFlowEvent("admin_export_started", {
      route: "/dashboard/exports",
      target_type: targetType,
      export_type: exportType,
      format,
    });
    try {
      const response = await fetch("/api/leadflow/exports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          exportType,
          format,
          fieldGroups: groups,
          reason,
          confirmedAllowedUse: confirmed,
          adminOverrideHighRisk: overrideHighRisk,
          leadProfileId: targetType === "profile" ? targetId : undefined,
          listingSlug: targetType === "listing" ? targetId : undefined,
          listingId: targetType === "listing" ? targetId : undefined,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Admin export blocked.");
      trackLeadFlowEvent("admin_export_completed", {
        route: "/dashboard/exports",
        export_id: payload.exportId,
        target_type: targetType,
        export_type: exportType,
        format,
      });
      setResult({ downloadUrl: payload.downloadUrl });
    } catch (error) {
      trackLeadFlowEvent("admin_export_blocked", {
        route: "/dashboard/exports",
        target_type: targetType,
        reason: error instanceof Error ? error.message : "blocked",
      });
      setResult({ error: error instanceof Error ? error.message : "Admin export blocked." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <section className="rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_12%_10%,rgba(35,184,255,0.16),transparent_28%),linear-gradient(135deg,#07101b,#050711)] p-5 shadow-2xl shadow-black/30 md:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Controlled exports</p>
            <h1 className="mt-3 max-w-5xl text-4xl font-black leading-tight text-white md:text-6xl">
              Deliver files only after proof, permission, and use case checks.
            </h1>
            <p className="mt-4 max-w-4xl text-sm leading-6 text-ink-200 md:text-base md:leading-7">
              Exports are audited. Only export fields needed for the approved use. Buyer files stay scoped to entitlement, suppression status, and field-group approval.
            </p>
          </div>
          <div className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 p-3 text-sm font-bold text-cyan-100">
            {data.exports.length} tracked export{data.exports.length === 1 ? "" : "s"}
          </div>
        </div>
        {data.loadErrors.length ? (
          <div className="mt-5 rounded-lg border border-accent-300/30 bg-accent-300/10 p-3 text-sm leading-6 text-accent-100">
            {data.loadErrors[0]}
          </div>
        ) : null}
      </section>

      <section className="grid gap-5 xl:grid-cols-[460px_minmax(0,1fr)]">
        <div className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
          <div className="flex items-start gap-3">
            <FileWarning className="mt-1 h-5 w-5 text-accent-300" />
            <div>
              <h2 className="text-2xl font-black text-white">Create export</h2>
              <p className="mt-2 text-sm leading-6 text-ink-300">
                Admin-only fields should only be used for internal review. Buyer delivery must use public, source proof, compliance, and approved contact fields only.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Target</span>
              <select value={target} onChange={(event) => setTarget(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/50">
                {targetOptions.length ? targetOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>) : <option value="">No profiles or listings loaded</option>}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Export type</span>
                <select value={exportType} onChange={(event) => setExportType(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/50">
                  <option value="admin_internal">Admin internal</option>
                  <option value="report_only">Report only</option>
                  <option value="sample">Sample export</option>
                  <option value="crm_push">CRM push</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Format</span>
                <select value={format} onChange={(event) => setFormat(event.target.value as ExportFormat)} className="h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/50">
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Reason</span>
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className="rounded-lg border border-white/10 bg-ink-950 px-3 py-3 text-sm text-white outline-none focus:border-cyan-300/50" />
            </label>

            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Field groups</p>
              <div className="mt-3 grid gap-2">
                {adminFieldGroups.map((group) => (
                  <label key={group.key} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm font-bold text-white">
                    <input type="checkbox" checked={groups.includes(group.key)} onChange={() => toggleGroup(group.key)} />
                    {group.label}
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-red-300/25 bg-red-300/10 p-3 text-sm leading-6 text-red-100">
              <input type="checkbox" checked={overrideHighRisk} onChange={(event) => setOverrideHighRisk(event.target.checked)} className="mt-1" />
              <span>Allow high-risk export override for admin review. Prohibited and suppressed profiles still require careful review before any buyer delivery.</span>
            </label>

            <label className="flex items-start gap-3 rounded-lg border border-accent-300/30 bg-accent-300/10 p-3 text-sm leading-6 text-accent-100">
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1" />
              <span>I confirm this export is for the approved internal or buyer delivery use and that the selected fields are the minimum needed.</span>
            </label>

            <button
              type="button"
              onClick={createExport}
              disabled={!confirmed || !target || !groups.length || pending}
              className="btn-accent justify-center text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Generate audited export
            </button>

            {result?.error ? <div className="rounded-lg border border-red-300/35 bg-red-300/10 p-3 text-sm leading-6 text-red-100">{result.error}</div> : null}
            {result?.downloadUrl ? (
              <div className="rounded-lg border border-lead-300/35 bg-lead-300/10 p-3 text-sm leading-6 text-lead-100">
                Export generated. <a href={result.downloadUrl} className="font-black underline">Download file</a>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
          <h2 className="text-2xl font-black text-white">Export records</h2>
          <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm">
              <thead>
                <tr>
                  {["Export", "Type", "Rows", "Fields", "Status", "Buyer", "Expires", "Download"].map((header) => (
                    <th key={header} className="whitespace-nowrap bg-white/[0.035] px-3 py-3 text-xs font-extrabold uppercase tracking-wider text-ink-400">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.exports.length ? data.exports.map((record) => {
                  const summary = record.filter_summary || {};
                  const fields = Array.isArray(summary.field_groups) ? summary.field_groups.join(", ") : "approved fields";
                  const expired = record.expires_at ? new Date(record.expires_at).getTime() <= Date.now() : false;
                  return (
                    <tr key={record.id}>
                      <td className="border-t border-white/10 px-3 py-3 font-mono text-xs text-ink-200">{record.id.slice(0, 8)}</td>
                      <td className="border-t border-white/10 px-3 py-3 text-ink-200">{record.export_type.replace(/_/g, " ")}</td>
                      <td className="border-t border-white/10 px-3 py-3 text-ink-200">{record.row_count}</td>
                      <td className="border-t border-white/10 px-3 py-3 text-ink-200">{fields}</td>
                      <td className="border-t border-white/10 px-3 py-3">
                        <span className={cn("inline-flex rounded-md border px-2 py-1 text-xs font-extrabold capitalize", statusTone(expired ? "expired" : record.export_status))}>
                          {expired ? "expired" : record.export_status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="border-t border-white/10 px-3 py-3 text-ink-200">{record.buyer_account_id ? record.buyer_account_id.slice(0, 8) : "Internal"}</td>
                      <td className="border-t border-white/10 px-3 py-3 text-ink-200">{formatDate(record.expires_at)}</td>
                      <td className="border-t border-white/10 px-3 py-3">
                        {record.storage_path && !expired ? (
                          <a href={record.storage_path} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-cyan-300/30 px-2.5 text-xs font-bold text-cyan-100 hover:bg-cyan-300/10">
                            <Download className="h-3.5 w-3.5" /> Download
                          </a>
                        ) : <span className="text-xs text-ink-500">Unavailable</span>}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={8} className="border-t border-white/10 px-3 py-8 text-center text-sm text-ink-300">
                      No export records loaded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
