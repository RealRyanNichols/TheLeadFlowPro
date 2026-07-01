"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  DatabaseZap,
  GitBranch,
  Loader2,
  PackagePlus,
  Play,
  Plus,
  Save,
  ShieldCheck,
} from "lucide-react";
import { trackLeadFlowEvent } from "@/lib/leadflow-events-client";
import type { SegmentDashboardData, SegmentRecord } from "@/lib/segments/segment-builder";
import {
  SEGMENT_FIELD_LABELS,
  SEGMENT_OPERATOR_LABELS,
  SEGMENT_OPERATORS,
  SEGMENT_RULE_FIELDS,
  SEGMENT_STATUSES,
  SEGMENT_TYPES,
  SEGMENT_VISIBILITIES,
  runSegmentPreview,
  sanitizeSegmentRules,
  type SegmentInput,
  type SegmentPreview,
  type SegmentRule,
  type SegmentRuleField,
} from "@/lib/segments/rules";
import { cn } from "@/lib/utils";

const starterRule: SegmentRule = {
  id: "builder-rule-1",
  field: "vertical",
  operator: "equals",
  value: "Ecommerce",
  rule_group: "and",
};

function statusTone(status: string) {
  if (/active|ready|approved/.test(status)) return "border-lead-300/35 bg-lead-300/12 text-lead-100";
  if (/blocked|prohibited|suppressed|rejected/.test(status)) return "border-red-300/35 bg-red-300/12 text-red-100";
  if (/review|draft|needs/.test(status)) return "border-accent-300/35 bg-accent-300/12 text-accent-100";
  return "border-white/10 bg-white/[0.045] text-ink-200";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric" }).format(date);
}

function readable(value: string) {
  return value.replace(/_/g, " ");
}

function labelForSegmentType(value: string) {
  return readable(value).replace(/\b\w/g, (char) => char.toUpperCase());
}

function valueAsInput(value: SegmentRule["value"]) {
  return Array.isArray(value) ? value.join(", ") : String(value ?? "");
}

function defaultSegment(): SegmentInput {
  return {
    name: "High-score ecommerce vendor signals",
    description: "Reviewed, source-backed ecommerce signals ready for packaging once proof and suppression checks clear.",
    segmentType: "lead_profiles",
    vertical: "Ecommerce",
    category: "Vendor signals",
    status: "review",
    visibility: "internal",
  };
}

export function SegmentsClient({ data }: { data: SegmentDashboardData }) {
  const [segment, setSegment] = useState<SegmentInput>(defaultSegment);
  const [rules, setRules] = useState<SegmentRule[]>([starterRule]);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [result, setResult] = useState<{ error?: string; message?: string; segmentId?: string } | null>(null);

  const preview = useMemo(() => runSegmentPreview({
    segment,
    rules: sanitizeSegmentRules(rules),
    candidates: data.candidates,
  }), [data.candidates, rules, segment]);

  function updateSegment<K extends keyof SegmentInput>(key: K, value: SegmentInput[K]) {
    setSegment((current) => ({ ...current, [key]: value }));
  }

  function updateRule(index: number, patch: Partial<SegmentRule>) {
    setRules((current) => current.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, ...patch } : rule));
  }

  function addRule(group: "and" | "or" = "and") {
    setRules((current) => [
      ...current,
      {
        id: `builder-rule-${Date.now()}`,
        field: "category",
        operator: "contains",
        value: "",
        rule_group: group,
      },
    ]);
  }

  function removeRule(index: number) {
    setRules((current) => current.length <= 1 ? current : current.filter((_, ruleIndex) => ruleIndex !== index));
  }

  function loadSegment(row: SegmentRecord) {
    setSegment({
      name: row.name,
      description: row.description,
      segmentType: row.segmentType,
      vertical: row.vertical,
      category: row.category,
      status: row.status,
      visibility: row.visibility,
    });
    setRules(data.rulesBySegment[row.id] || [starterRule]);
    trackLeadFlowEvent("segment_builder_viewed", {
      route: "/dashboard/segments",
      segment_id: row.id,
      segment_type: row.segmentType,
      vertical: row.vertical,
      status: row.status,
    });
  }

  async function submit(action: "preview" | "create" | "run" | "create_listing") {
    setPendingAction(action);
    setResult(null);
    trackLeadFlowEvent(action === "run" ? "segment_run" : action === "create_listing" ? "segment_listing_created" : "segment_created", {
      route: "/dashboard/segments",
      segment_type: segment.segmentType,
      vertical: segment.vertical,
      category: segment.category,
      status: segment.status,
    });
    try {
      const response = await fetch("/api/leadflow/segments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          segment,
          rules: sanitizeSegmentRules(rules),
          confirmed: action === "create_listing",
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Segment action failed.");
      setResult({
        message: payload.persisted
          ? action === "run" ? "Segment run was persisted and audited." : "Segment was saved and audited."
          : "Segment action previewed. Supabase service env is not configured, so nothing was persisted.",
        segmentId: payload.segmentId,
      });
    } catch (error) {
      trackLeadFlowEvent("segment_blocked", {
        route: "/dashboard/segments",
        segment_type: segment.segmentType,
        vertical: segment.vertical,
        status: "blocked",
      });
      setResult({ error: error instanceof Error ? error.message : "Segment action failed." });
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1540px] space-y-6">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_12%_10%,rgba(35,184,255,0.18),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(166,227,107,0.12),transparent_28%),linear-gradient(135deg,#07101b,#050711)] p-5 shadow-2xl shadow-black/30 md:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-cyan-200">
              <GitBranch className="h-4 w-4" />
              Segment Builder
            </p>
            <h1 className="mt-4 max-w-5xl text-4xl font-black leading-tight text-white md:text-6xl">
              Turn reviewed signals into sellable lead products.
            </h1>
            <p className="mt-4 max-w-4xl text-sm leading-6 text-ink-200 md:text-base md:leading-7">
              Build saved groups from source-backed, consent-aware records. The builder blocks prohibited sensitive rules, warns on suppressed records, and keeps every run auditable.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-extrabold uppercase tracking-wider text-ink-200">
            {data.mode === "live" ? "Live data" : "Safe test data"}
          </div>
        </div>
        {data.loadErrors.length ? (
          <div className="mt-5 rounded-lg border border-accent-300/30 bg-accent-300/10 p-3 text-sm leading-6 text-accent-100">
            {data.loadErrors[0]}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Segments" value={data.stats.totalSegments} />
        <StatCard label="Active" value={data.stats.activeSegments} />
        <StatCard label="Review" value={data.stats.reviewSegments} />
        <StatCard label="Blocked" value={data.stats.blockedSegments} />
        <StatCard label="Export ready" value={data.stats.exportReadySegments} />
        <StatCard label="Members" value={data.stats.totalMembers} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_480px]">
        <div className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Saved segments</p>
              <h2 className="mt-2 text-2xl font-black text-white">Segment list</h2>
            </div>
            <button type="button" onClick={() => { setSegment(defaultSegment()); setRules([starterRule]); }} className="btn-ghost justify-center text-sm">
              <Plus className="h-4 w-4" />
              New segment
            </button>
          </div>
          <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm">
              <thead>
                <tr>
                  {["Name", "Type", "Vertical", "Status", "Members", "Risk", "Compliance", "Last run", "Actions"].map((header) => (
                    <th key={header} className="whitespace-nowrap bg-white/[0.035] px-3 py-3 text-xs font-extrabold uppercase tracking-wider text-ink-400">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.segments.map((row) => {
                  const rowPreview = data.previewsBySegment[row.id];
                  return (
                    <tr key={row.id}>
                      <td className="border-t border-white/10 px-3 py-3">
                        <p className="font-black text-white">{row.name}</p>
                        <p className="mt-1 line-clamp-2 max-w-sm text-xs leading-5 text-ink-400">{row.description}</p>
                      </td>
                      <td className="whitespace-nowrap border-t border-white/10 px-3 py-3 text-ink-200">{labelForSegmentType(row.segmentType)}</td>
                      <td className="whitespace-nowrap border-t border-white/10 px-3 py-3 text-ink-200">{row.vertical}</td>
                      <td className="border-t border-white/10 px-3 py-3"><Badge label={readable(row.status)} tone={statusTone(row.status)} /></td>
                      <td className="border-t border-white/10 px-3 py-3 font-mono text-ink-200">{rowPreview?.estimatedCount ?? row.memberCount}</td>
                      <td className="border-t border-white/10 px-3 py-3"><Badge label={readable(row.riskLevel)} tone={statusTone(row.riskLevel)} /></td>
                      <td className="border-t border-white/10 px-3 py-3"><Badge label={readable(row.complianceStatus)} tone={statusTone(row.complianceStatus)} /></td>
                      <td className="whitespace-nowrap border-t border-white/10 px-3 py-3 text-ink-300">{formatDate(row.lastRunAt)}</td>
                      <td className="border-t border-white/10 px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => loadSegment(row)} className="inline-flex min-h-9 items-center justify-center rounded-md border border-cyan-300/30 px-2.5 text-xs font-bold text-cyan-100 hover:bg-cyan-300/10">
                            Edit
                          </button>
                          <Link href={`/dashboard/segments/${row.id}`} className="inline-flex min-h-9 items-center justify-center rounded-md border border-white/10 px-2.5 text-xs font-bold text-ink-100 hover:bg-white/5">
                            Detail
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
          <div className="flex items-start gap-3">
            <DatabaseZap className="mt-1 h-5 w-5 text-accent-300" />
            <div>
              <h2 className="text-2xl font-black text-white">Build a segment</h2>
              <p className="mt-2 text-sm leading-6 text-ink-300">Use dropdown rules only. No raw SQL, no protected-trait fields, no unclear permission sources.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Segment name</span>
              <input value={segment.name} onChange={(event) => updateSegment("name", event.target.value)} className="h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/50" />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Description</span>
              <textarea value={segment.description} onChange={(event) => updateSegment("description", event.target.value)} rows={3} className="rounded-lg border border-white/10 bg-ink-950 px-3 py-3 text-sm text-white outline-none focus:border-cyan-300/50" />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Segment type" value={segment.segmentType} onChange={(value) => updateSegment("segmentType", value as SegmentInput["segmentType"])} options={SEGMENT_TYPES.map((value) => ({ value, label: labelForSegmentType(value) }))} />
              <Select label="Visibility" value={segment.visibility} onChange={(value) => updateSegment("visibility", value as SegmentInput["visibility"])} options={SEGMENT_VISIBILITIES.map((value) => ({ value, label: readable(value) }))} />
              <Select label="Status" value={segment.status} onChange={(value) => updateSegment("status", value as SegmentInput["status"])} options={SEGMENT_STATUSES.map((value) => ({ value, label: readable(value) }))} />
              <label className="grid gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Vertical</span>
                <input value={segment.vertical} onChange={(event) => updateSegment("vertical", event.target.value)} className="h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/50" />
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Category</span>
              <input value={segment.category} onChange={(event) => updateSegment("category", event.target.value)} className="h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/50" />
            </label>

            <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Rules</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => addRule("and")} className="rounded-md border border-white/10 px-2 py-1 text-xs font-bold text-ink-100 hover:bg-white/5">Add AND</button>
                  <button type="button" onClick={() => addRule("or")} className="rounded-md border border-cyan-300/25 px-2 py-1 text-xs font-bold text-cyan-100 hover:bg-cyan-300/10">Add OR</button>
                </div>
              </div>
              <div className="mt-3 grid gap-3">
                {rules.map((rule, index) => (
                  <div key={rule.id} className="grid gap-2 rounded-lg border border-white/10 bg-ink-950/65 p-3">
                    <div className="grid gap-2 sm:grid-cols-[82px_1fr]">
                      <select value={rule.rule_group} onChange={(event) => updateRule(index, { rule_group: event.target.value as "and" | "or" })} className="h-10 rounded-lg border border-white/10 bg-ink-950 px-2 text-xs font-black uppercase text-white outline-none focus:border-cyan-300/50">
                        <option value="and">AND</option>
                        <option value="or">OR</option>
                      </select>
                      <select value={rule.field} onChange={(event) => updateRule(index, { field: event.target.value as SegmentRuleField })} className="h-10 rounded-lg border border-white/10 bg-ink-950 px-2 text-sm font-bold text-white outline-none focus:border-cyan-300/50">
                        {SEGMENT_RULE_FIELDS.map((field) => <option key={field} value={field}>{SEGMENT_FIELD_LABELS[field]}</option>)}
                      </select>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <select value={rule.operator} onChange={(event) => updateRule(index, { operator: event.target.value as SegmentRule["operator"] })} className="h-10 rounded-lg border border-white/10 bg-ink-950 px-2 text-sm font-bold text-white outline-none focus:border-cyan-300/50">
                        {SEGMENT_OPERATORS.map((operator) => <option key={operator} value={operator}>{SEGMENT_OPERATOR_LABELS[operator]}</option>)}
                      </select>
                      <input value={valueAsInput(rule.value)} onChange={(event) => updateRule(index, { value: event.target.value })} disabled={rule.operator === "exists" || rule.operator === "not_exists"} placeholder={rule.operator === "between" ? "75 to 100" : "Value"} className="h-10 rounded-lg border border-white/10 bg-ink-950 px-2 text-sm text-white outline-none focus:border-cyan-300/50 disabled:opacity-50" />
                      <button type="button" onClick={() => removeRule(index)} className="h-10 rounded-lg border border-red-300/25 px-3 text-xs font-bold text-red-100 hover:bg-red-300/10">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <PreviewPanel preview={preview} />

            <div className="grid gap-2 sm:grid-cols-3">
              <ActionButton pending={pendingAction === "create"} disabled={Boolean(pendingAction)} onClick={() => submit("create")} icon={Save} label="Save" />
              <ActionButton pending={pendingAction === "run"} disabled={Boolean(pendingAction)} onClick={() => submit("run")} icon={Play} label="Run" />
              <ActionButton pending={pendingAction === "create_listing"} disabled={Boolean(pendingAction) || !preview.exportEligible} onClick={() => submit("create_listing")} icon={PackagePlus} label="Create listing" />
            </div>

            {result?.error ? <div className="rounded-lg border border-red-300/35 bg-red-300/10 p-3 text-sm leading-6 text-red-100">{result.error}</div> : null}
            {result?.message ? (
              <div className="rounded-lg border border-lead-300/35 bg-lead-300/10 p-3 text-sm leading-6 text-lead-100">
                {result.message} {result.segmentId ? <span className="font-mono text-xs">ID {result.segmentId.slice(0, 12)}</span> : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="lead-shell p-4">
      <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </article>
  );
}

function Badge({ label, tone }: { label: string; tone: string }) {
  return (
    <span className={cn("inline-flex min-h-8 items-center rounded-lg border px-2.5 text-xs font-extrabold capitalize", tone)}>
      {label}
    </span>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold capitalize text-white outline-none focus:border-cyan-300/50">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function PreviewPanel({ preview }: { preview: SegmentPreview }) {
  const warnings = [
    ...preview.riskWarnings,
    ...preview.complianceWarnings,
    ...preview.sourceProofWarnings,
  ];
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Preview results</p>
          <h3 className="mt-1 text-2xl font-black text-white">{preview.estimatedCount} estimated match{preview.estimatedCount === 1 ? "" : "es"}</h3>
        </div>
        <Badge label={preview.exportEligible ? "export eligible" : "review first"} tone={preview.exportEligible ? statusTone("ready") : statusTone("review")} />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <MiniStat label="Suppressed" value={preview.suppressionCount} />
        <MiniStat label="High risk" value={preview.highRiskCount} />
        <MiniStat label="Missing proof" value={preview.missingSourceProofCount} />
      </div>
      {warnings.length ? (
        <div className="mt-4 grid gap-2">
          {warnings.slice(0, 4).map((warning) => (
            <div key={warning} className="flex gap-2 rounded-lg border border-accent-300/25 bg-accent-300/10 p-3 text-xs leading-5 text-accent-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 flex gap-2 rounded-lg border border-lead-300/25 bg-lead-300/10 p-3 text-xs leading-5 text-lead-100">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span>No guardrail warnings in this preview.</span>
        </div>
      )}
      <div className="mt-4 grid gap-2">
        {preview.sampleMembers.length ? preview.sampleMembers.map((member) => (
          <article key={member.id} className="rounded-lg border border-white/10 bg-ink-950/55 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-white">{member.title}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-ink-400">{member.vertical} · {member.category}</p>
              </div>
              <div className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 text-sm font-black text-cyan-100">{member.score}</div>
            </div>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink-300">{member.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge label={member.confidence} tone={statusTone(member.confidence)} />
              <Badge label={readable(member.sourceProofStatus)} tone={statusTone(member.sourceProofStatus)} />
              <Badge label={readable(member.suppressionStatus)} tone={statusTone(member.suppressionStatus)} />
            </div>
          </article>
        )) : (
          <div className="rounded-lg border border-white/10 bg-ink-950/55 p-4 text-sm text-ink-300">No members match this rule set yet.</div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-ink-950/55 p-3">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  );
}

function ActionButton({
  pending,
  disabled,
  onClick,
  icon: Icon,
  label,
}: {
  pending: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: typeof Save;
  label: string;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="btn-accent justify-center text-sm disabled:cursor-not-allowed disabled:opacity-50">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {label}
    </button>
  );
}
