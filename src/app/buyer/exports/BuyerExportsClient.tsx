"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, FileCheck2, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import { trackLeadFlowEvent } from "@/lib/leadflow-events-client";
import type { BuyerExportPageData, ExportFieldGroup, ExportableProduct } from "@/lib/leadflow-export";
import { cn } from "@/lib/utils";

type AuthenticatedExportData = Extract<BuyerExportPageData, { authenticated: true }>;

const buyerFieldGroups: Array<{ key: ExportFieldGroup; label: string; body: string }> = [
  { key: "public_profile", label: "Public profile", body: "Title, category, score, confidence, use case, freshness." },
  { key: "source_proof", label: "Source proof", body: "Source URL, title, snippet, verified date, source type." },
  { key: "compliance", label: "Compliance", body: "Consent, suppression, allowed use, restricted use, last reviewed date." },
  { key: "contact", label: "Contact fields", body: "Only available when entitlement explicitly allows full contact fields." },
];

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function statusTone(status: string) {
  if (/generated|ready|completed|fulfilled/.test(status)) return "border-lead-300/35 bg-lead-300/12 text-lead-100";
  if (/blocked|failed|expired|revoked/.test(status)) return "border-red-300/35 bg-red-300/12 text-red-100";
  return "border-accent-300/35 bg-accent-300/12 text-accent-100";
}

export function BuyerExportsClient({ data }: { data: AuthenticatedExportData }) {
  const completedExports = useMemo(() => data.exports.filter((item) => item.export_status !== "blocked"), [data.exports]);

  return (
    <div className="grid gap-5">
      <section className="lead-shell p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Buyer exports</p>
            <h2 className="mt-2 text-3xl font-black text-white">Export only what this account is approved to use.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-200">
              This export is limited to your approved access. Do not use suppressed, outdated, or restricted data. Review allowed-use notes before outreach.
            </p>
          </div>
          <div className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 p-3 text-xs font-bold leading-5 text-cyan-100">
            {completedExports.length} export{completedExports.length === 1 ? "" : "s"} recorded
          </div>
        </div>
        {data.loadErrors.length ? (
          <div className="mt-5 rounded-lg border border-accent-300/30 bg-accent-300/10 p-3 text-sm leading-6 text-accent-100">
            {data.loadErrors[0]}
          </div>
        ) : null}
        {data.restricted ? (
          <div className="mt-5 rounded-lg border border-red-300/35 bg-red-300/10 p-4 text-sm leading-6 text-red-100">
            Export access is blocked while this buyer account is suspended or denied.
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {data.products.length ? data.products.map((product) => (
          <ExportProductCard key={product.entitlementId} product={product} disabled={data.restricted} />
        )) : (
          <div className="lead-shell p-6 text-center xl:col-span-2">
            <LockKeyhole className="mx-auto h-8 w-8 text-cyan-300" />
            <h3 className="mt-4 text-2xl font-black text-white">No exportable products yet.</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink-300">
              Request access from the marketplace first. Exports appear here only after an active entitlement exists.
            </p>
            <Link href="/marketplace" className="btn-accent mx-auto mt-5 justify-center text-sm">
              Browse marketplace
            </Link>
          </div>
        )}
      </section>

      <section className="lead-shell p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Export history</p>
            <h2 className="mt-2 text-2xl font-black text-white">Audited delivery records.</h2>
          </div>
          <ShieldCheck className="h-5 w-5 text-cyan-300" />
        </div>
        <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm">
            <thead>
              <tr>
                {["Export", "Type", "Rows", "Fields", "Status", "Expires", "Download"].map((header) => (
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
                    <td className="border-t border-white/10 px-3 py-3 text-ink-200">{formatDate(record.expires_at)}</td>
                    <td className="border-t border-white/10 px-3 py-3">
                      {record.storage_path && !expired ? (
                        <a href={record.storage_path} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-cyan-300/30 px-2.5 text-xs font-bold text-cyan-100 hover:bg-cyan-300/10">
                          <Download className="h-3.5 w-3.5" /> Download
                        </a>
                      ) : (
                        <span className="text-xs text-ink-500">Unavailable</span>
                      )}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={7} className="border-t border-white/10 px-3 py-8 text-center text-sm text-ink-300">
                    No exports have been generated for this buyer account.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ExportProductCard({ product, disabled }: { product: ExportableProduct; disabled?: boolean }) {
  const defaultGroups = product.allowedFieldGroups.filter((group) => group !== "contact");
  const [groups, setGroups] = useState<ExportFieldGroup[]>(defaultGroups.length ? defaultGroups : ["public_profile", "source_proof", "compliance"]);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ error?: string; downloadUrl?: string } | null>(null);

  function toggleGroup(group: ExportFieldGroup) {
    setGroups((current) => current.includes(group) ? current.filter((item) => item !== group) : [...current, group]);
  }

  async function requestExport() {
    setResult(null);
    setPending(true);
    trackLeadFlowEvent("buyer_export_started", {
      route: "/buyer/exports",
      cta: "create_export",
      entitlement_id: product.entitlementId,
      access_level: product.accessLevel,
    });
    try {
      const response = await fetch("/api/leadflow/exports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          exportType: "buyer_approved",
          entitlementId: product.entitlementId,
          listingId: product.listingId,
          listingSlug: product.listingSlug,
          leadProfileId: product.leadProfileId,
          format: "csv",
          fieldGroups: groups,
          reason: `Buyer export for ${product.title}`,
          confirmedAllowedUse: confirmed,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Export blocked.");
      trackLeadFlowEvent("buyer_export_completed", {
        route: "/buyer/exports",
        export_id: payload.exportId,
        field_groups: groups.join(","),
        format: "csv",
      });
      setResult({ downloadUrl: payload.downloadUrl });
    } catch (error) {
      trackLeadFlowEvent("buyer_export_blocked", {
        route: "/buyer/exports",
        entitlement_id: product.entitlementId,
        reason: error instanceof Error ? error.message : "blocked",
      });
      setResult({ error: error instanceof Error ? error.message : "Export blocked." });
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="lead-shell p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">{product.category}</p>
          <h3 className="mt-2 text-2xl font-black text-white">{product.title}</h3>
          <p className="mt-2 text-sm leading-6 text-ink-300">{product.vertical}</p>
        </div>
        <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-extrabold uppercase tracking-wider text-ink-200">
          {product.accessLevel.replace(/_/g, " ")}
        </span>
      </div>

      <div className="mt-5 grid gap-3">
        <div className="grid gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Format</span>
          <div className="flex min-h-11 items-center rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white">
            CSV only for buyer exports
          </div>
          <p className="text-xs leading-5 text-ink-400">JSON is admin-only so restricted delivery cannot become a raw data dump.</p>
        </div>

        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Allowed field groups</p>
          <div className="mt-3 grid gap-2">
            {buyerFieldGroups.map((group) => {
              const allowed = product.allowedFieldGroups.includes(group.key);
              return (
                <label key={group.key} className={cn("rounded-lg border p-3", allowed ? "border-white/10 bg-white/[0.035]" : "border-white/5 bg-white/[0.015] opacity-55")}>
                  <span className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={groups.includes(group.key)}
                      disabled={!allowed || disabled}
                      onChange={() => toggleGroup(group.key)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-black text-white">{group.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-ink-300">{allowed ? group.body : "Not approved for this entitlement."}</span>
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <label className="rounded-lg border border-accent-300/30 bg-accent-300/10 p-3 text-sm leading-6 text-accent-100">
          <span className="flex gap-3">
            <input type="checkbox" checked={confirmed} disabled={disabled} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1" />
            <span>I confirm this export will only be used for the approved buyer use case and will not be used with suppressed, outdated, or restricted data.</span>
          </span>
        </label>

        <button
          type="button"
          onClick={requestExport}
          disabled={disabled || pending || !confirmed || groups.length === 0}
          className="btn-accent justify-center text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
          Create audited export
        </button>

        {result?.error ? (
          <div className="rounded-lg border border-red-300/35 bg-red-300/10 p-3 text-sm leading-6 text-red-100">{result.error}</div>
        ) : null}
        {result?.downloadUrl ? (
          <div className="rounded-lg border border-lead-300/35 bg-lead-300/10 p-3 text-sm leading-6 text-lead-100">
            Export generated. <a href={result.downloadUrl} className="font-black underline">Download file</a>
          </div>
        ) : null}
      </div>
    </article>
  );
}
