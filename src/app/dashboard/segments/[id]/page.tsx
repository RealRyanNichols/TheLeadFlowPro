import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  BarChart3,
  Download,
  FileCheck2,
  GitBranch,
  PackagePlus,
  Play,
  RotateCw,
} from "lucide-react";
import { getSegmentDetailData } from "@/lib/segments/segment-builder";
import { SEGMENT_FIELD_LABELS, SEGMENT_OPERATOR_LABELS, type SegmentPreview } from "@/lib/segments/rules";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Segment Detail | The LeadFlow Pro",
  description: "Admin-only segment detail page for rule review, member preview, compliance warnings, and marketplace product creation.",
  robots: {
    index: false,
    follow: false,
  },
};

function statusTone(status: string) {
  if (/active|ready|approved|eligible|low/.test(status)) return "border-lead-300/35 bg-lead-300/12 text-lead-100";
  if (/blocked|prohibited|suppressed|rejected|high/.test(status)) return "border-red-300/35 bg-red-300/12 text-red-100";
  if (/review|draft|needs|medium/.test(status)) return "border-accent-300/35 bg-accent-300/12 text-accent-100";
  return "border-white/10 bg-white/[0.045] text-ink-200";
}

function readable(value: string) {
  return value.replace(/_/g, " ");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

export default async function SegmentDetailPage({ params }: { params: { id: string } }) {
  const data = await getSegmentDetailData(params.id);
  if (!data) notFound();

  const warnings = [
    ...data.preview.riskWarnings,
    ...data.preview.complianceWarnings,
    ...data.preview.sourceProofWarnings,
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_12%_10%,rgba(35,184,255,0.18),transparent_30%),linear-gradient(135deg,#07101b,#050711)] p-5 shadow-2xl shadow-black/30 md:p-7">
        <Link href="/dashboard/segments" className="inline-flex items-center gap-2 text-sm font-bold text-cyan-200 hover:text-white">
          <GitBranch className="h-4 w-4" />
          Back to Segment Builder
        </Link>
        <div className="mt-5 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">{readable(data.segment.segmentType)}</p>
            <h1 className="mt-3 max-w-5xl text-4xl font-black leading-tight text-white md:text-6xl">{data.segment.name}</h1>
            <p className="mt-4 max-w-4xl text-sm leading-6 text-ink-200 md:text-base md:leading-7">{data.segment.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge label={readable(data.segment.status)} tone={statusTone(data.segment.status)} />
            <Badge label={readable(data.segment.riskLevel)} tone={statusTone(data.segment.riskLevel)} />
            <Badge label={readable(data.segment.complianceStatus)} tone={statusTone(data.segment.complianceStatus)} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Members" value={data.preview.estimatedCount} />
        <StatCard label="Suppressed" value={data.preview.suppressionCount} />
        <StatCard label="High risk" value={data.preview.highRiskCount} />
        <StatCard label="Missing proof" value={data.preview.missingSourceProofCount} />
        <StatCard label="Categories" value={Object.keys(data.preview.categoryDistribution).length} />
        <StatCard label="Source types" value={Object.keys(data.preview.sourceTypeDistribution).length} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <Panel title="Rules" icon={FileCheck2}>
            <div className="grid gap-3">
              {data.rules.map((rule) => (
                <div key={rule.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">{rule.rule_group.toUpperCase()}</p>
                  <p className="mt-2 text-sm font-bold text-white">
                    {SEGMENT_FIELD_LABELS[rule.field]} {SEGMENT_OPERATOR_LABELS[rule.operator].toLowerCase()}{" "}
                    <span className="text-accent-100">{Array.isArray(rule.value) ? rule.value.join(", ") : String(rule.value || "value exists")}</span>
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Current members" icon={GitBranch}>
            <div className="grid gap-3 md:grid-cols-2">
              {data.preview.members.length ? data.preview.members.slice(0, 12).map((member) => (
                <article key={member.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black text-white">{member.title}</h3>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wider text-ink-400">{member.vertical} · {member.category}</p>
                    </div>
                    <div className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 text-sm font-black text-cyan-100">{member.score}</div>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink-300">{member.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge label={member.confidence} tone={statusTone(member.confidence)} />
                    <Badge label={readable(member.sourceProofStatus)} tone={statusTone(member.sourceProofStatus)} />
                    <Badge label={readable(member.suppressionStatus)} tone={statusTone(member.suppressionStatus)} />
                  </div>
                </article>
              )) : (
                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5 text-sm text-ink-300">No current members match this rule set.</div>
              )}
            </div>
          </Panel>
        </div>

        <aside className="space-y-5">
          <Panel title="Segment summary" icon={BarChart3}>
            <div className="grid gap-3 text-sm">
              <SummaryRow label="Vertical" value={data.segment.vertical} />
              <SummaryRow label="Category" value={data.segment.category} />
              <SummaryRow label="Visibility" value={readable(data.segment.visibility)} />
              <SummaryRow label="Last run" value={formatDate(data.segment.lastRunAt)} />
              <SummaryRow label="Export eligibility" value={data.preview.exportEligible ? "Eligible after admin confirmation" : "Review required"} />
            </div>
          </Panel>

          <Panel title="Distribution" icon={BarChart3}>
            <Distribution title="Score" rows={data.preview.scoreDistribution} />
            <Distribution title="Category" rows={data.preview.categoryDistribution} />
            <Distribution title="Source type" rows={data.preview.sourceTypeDistribution} />
          </Panel>

          <Panel title="Warnings" icon={AlertTriangle}>
            {warnings.length ? (
              <div className="grid gap-2">
                {warnings.map((warning) => (
                  <div key={warning} className="rounded-lg border border-accent-300/25 bg-accent-300/10 p-3 text-xs leading-5 text-accent-100">
                    {warning}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-lead-300/25 bg-lead-300/10 p-3 text-sm leading-6 text-lead-100">
                No guardrail warnings in the current preview.
              </div>
            )}
          </Panel>

          <Panel title="Admin actions" icon={Play}>
            <div className="grid gap-2">
              <ActionLink icon={Play} label="Run segment" href="/dashboard/segments" />
              <ActionLink icon={PackagePlus} label="Create marketplace listing" href="/dashboard#marketplace-listings" disabled={!data.preview.exportEligible} />
              <ActionLink icon={Download} label="Export if eligible" href="/dashboard/exports" disabled={!data.preview.exportEligible} />
              <ActionLink icon={RotateCw} label="Attach to buyer request" href="/dashboard#buyer-requests" />
              <ActionLink icon={Archive} label="Archive segment" href="/dashboard/segments" danger />
            </div>
          </Panel>
        </aside>
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

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof GitBranch; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-2xl font-black text-white">{title}</h2>
        <Icon className="h-5 w-5 text-cyan-300" />
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-2 last:border-0 last:pb-0">
      <span className="text-ink-400">{label}</span>
      <span className="text-right font-bold text-white">{value}</span>
    </div>
  );
}

function Distribution({ title, rows }: { title: string; rows: SegmentPreview["scoreDistribution"] }) {
  const entries = Object.entries(rows);
  return (
    <div className="mb-5 last:mb-0">
      <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{title}</p>
      <div className="mt-2 grid gap-2">
        {entries.length ? entries.map(([label, count]) => (
          <div key={`${title}-${label}`} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-sm">
            <span className="capitalize text-ink-200">{readable(label)}</span>
            <span className="font-mono font-black text-white">{count}</span>
          </div>
        )) : <p className="text-sm text-ink-400">No rows.</p>}
      </div>
    </div>
  );
}

function ActionLink({
  icon: Icon,
  label,
  href,
  disabled,
  danger,
}: {
  icon: typeof Play;
  label: string;
  href: string;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Link
      href={disabled ? "#" : href}
      aria-disabled={disabled}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-bold transition",
        danger
          ? "border-red-300/30 text-red-100 hover:bg-red-300/10"
          : "border-cyan-300/25 text-cyan-100 hover:bg-cyan-300/10",
        disabled && "pointer-events-none opacity-45"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
