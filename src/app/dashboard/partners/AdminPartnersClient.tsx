"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeDollarSign,
  CheckCircle2,
  Handshake,
  PauseCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { trackLeadFlowEvent } from "@/lib/leadflow-events-client";
import type { AdminPartnerDashboardData, PartnerAccount, PartnerEarning, PartnerPayout, PartnerSource } from "@/lib/partner-portal";
import { cn } from "@/lib/utils";

function statusTone(value: string) {
  if (/approved|paid|active/.test(value)) return "border-lead-300/30 bg-lead-300/10 text-lead-100";
  if (/denied|suspend|reject|prohibited|void|dispute/.test(value)) return "border-red-300/30 bg-red-300/10 text-red-100";
  if (/restrict|review|pending|submitted|estimated|needs/.test(value)) return "border-accent-300/30 bg-accent-300/10 text-accent-100";
  return "border-white/10 bg-white/[0.045] text-ink-200";
}

function StatusBadge({ value }: { value: string }) {
  return <span className={cn("inline-flex min-h-7 items-center rounded-md border px-2 text-xs font-bold capitalize", statusTone(value))}>{value.replace(/_/g, " ")}</span>;
}

function money(value: number | string | null | undefined) {
  const numeric = typeof value === "number" ? value : Number(value || 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number.isFinite(numeric) ? numeric : 0);
}

function dateLabel(value: string | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function rowMatches(row: Record<string, unknown>, search: string, status: string) {
  const haystack = JSON.stringify(row).toLowerCase();
  if (search && !haystack.includes(search.toLowerCase())) return false;
  if (status !== "all") {
    const rowStatus = String(row.status || row.source_status || "");
    if (rowStatus !== status) return false;
  }
  return true;
}

function AdminPartnerAction({
  targetType,
  targetId,
  action,
  label,
  icon: Icon = CheckCircle2,
  tone = "neutral",
}: {
  targetType: "partner_account" | "partner_source" | "partner_earning" | "partner_payout";
  targetId: string;
  action: string;
  label: string;
  icon?: typeof CheckCircle2;
  tone?: "success" | "danger" | "neutral";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const className =
    tone === "success"
      ? "border-lead-300/30 text-lead-100 hover:bg-lead-300/10"
      : tone === "danger"
        ? "border-red-300/30 text-red-100 hover:bg-red-400/10"
        : "border-white/15 text-ink-100 hover:bg-white/10";
  const sensitive = new Set(["suspend", "deny", "mark_paid", "void", "restrict"]).has(action);

  async function run() {
    if (sensitive && !window.confirm(`Confirm partner action: ${label}`)) return;
    setPending(true);
    try {
      const response = await fetch("/api/leadflow/partners", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetType, targetId, action, confirmed: sensitive }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Partner action failed.");
      trackLeadFlowEvent(action === "mark_paid" ? "partner_payout_marked_paid" : "admin_partner_reviewed", {
        route: "/dashboard/partners",
        target_type: targetType,
        action,
        status: "completed",
      });
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Partner action failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending}
      className={cn("inline-flex min-h-9 items-center justify-center gap-2 rounded-md border px-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50", className)}
    >
      {pending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

export function AdminPartnersClient({ data }: { data: AdminPartnerDashboardData }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const partnerById = useMemo(() => new Map(data.partners.map((partner) => [partner.id, partner])), [data.partners]);
  const statuses = useMemo(
    () => Array.from(new Set([...data.partners.map((row) => row.status), ...data.sources.map((row) => row.source_status), ...data.earnings.map((row) => row.status), ...data.payouts.map((row) => row.status)].filter(Boolean))).sort(),
    [data],
  );

  const partners = data.partners.filter((row) => rowMatches(row as unknown as Record<string, unknown>, search, status));
  const sources = data.sources.filter((row) => rowMatches(row as unknown as Record<string, unknown>, search, status));
  const earnings = data.earnings.filter((row) => rowMatches(row as unknown as Record<string, unknown>, search, status));
  const payouts = data.payouts.filter((row) => rowMatches(row as unknown as Record<string, unknown>, search, status));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-cyan-400">Partner control desk</p>
          <h1 className="mt-1 text-3xl font-extrabold text-white">Partners</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-300">
            Review partner applications, connect partner sources, approve earnings, mark payouts paid, and audit partner activity before anything becomes a marketplace product.
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-bold uppercase tracking-wider text-ink-300">
          {data.mode === "live" ? "Live Supabase" : "Safe preview"}
        </div>
      </div>

      {data.loadErrors.length ? (
        <div className="rounded-lg border border-amber-300/25 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
          {data.loadErrors[0]}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Handshake} label="Pending applications" value={String(data.stats.pendingApplications)} />
        <StatCard icon={CheckCircle2} label="Approved partners" value={String(data.stats.approvedPartners)} />
        <StatCard icon={UploadCloud} label="Sources needing review" value={String(data.stats.sourcesNeedingReview)} />
        <StatCard icon={BadgeDollarSign} label="Approved earnings" value={money(data.stats.approvedEarnings)} />
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px]">
        <label className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-11 w-full rounded-lg border border-white/10 bg-ink-950 pl-9 pr-3 text-sm text-white outline-none placeholder:text-ink-500 focus:border-cyan-300/60"
            placeholder="Search partners, sources, earnings"
          />
        </label>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-300/60">
          <option value="all">All statuses</option>
          {statuses.map((item) => (
            <option key={item} value={item}>{item.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      <Section title="Partner Applications">
        <div className="grid gap-4">
          {partners.length ? partners.map((partner) => <PartnerRow key={partner.id} partner={partner} />) : <EmptyRows />}
        </div>
      </Section>

      <Section title="Partner Sources">
        <div className="grid gap-4">
          {sources.length ? sources.map((source) => <SourceRow key={source.id} source={source} partner={partnerById.get(source.partner_account_id)} />) : <EmptyRows />}
        </div>
      </Section>

      <Section title="Partner Earnings">
        <div className="grid gap-4">
          {earnings.length ? earnings.map((earning) => <EarningRow key={earning.id} earning={earning} partner={partnerById.get(earning.partner_account_id)} />) : <EmptyRows />}
        </div>
      </Section>

      <Section title="Partner Payouts">
        <div className="grid gap-4">
          {payouts.length ? payouts.map((payout) => <PayoutRow key={payout.id} payout={payout} partner={partnerById.get(payout.partner_account_id)} />) : <EmptyRows />}
        </div>
      </Section>
    </div>
  );
}

function PartnerRow({ partner }: { partner: PartnerAccount }) {
  return (
    <article className="rounded-xl border border-white/10 bg-[#060a11]/92 p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={partner.status} />
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-bold capitalize text-ink-200">{partner.partner_type.replace(/_/g, " ")}</span>
            <span className="text-xs text-ink-500">{dateLabel(partner.created_at)}</span>
          </div>
          <h2 className="mt-3 text-xl font-black text-white">{partner.name}</h2>
          <p className="mt-1 text-sm leading-6 text-ink-300">{partner.company || "Company missing"} | {partner.website || "Website missing"}</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-400">
            Payout: {partner.payout_preference || "Missing"} {partner.admin_notes_visible && partner.admin_notes ? `| Visible note: ${partner.admin_notes}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminPartnerAction targetType="partner_account" targetId={partner.id} action="approve" label="Approve" tone="success" />
          <AdminPartnerAction targetType="partner_account" targetId={partner.id} action="restrict" label="Restrict" icon={PauseCircle} />
          <AdminPartnerAction targetType="partner_account" targetId={partner.id} action="suspend" label="Suspend" icon={ShieldAlert} tone="danger" />
          <AdminPartnerAction targetType="partner_account" targetId={partner.id} action="deny" label="Deny" icon={XCircle} tone="danger" />
        </div>
      </div>
    </article>
  );
}

function SourceRow({ source, partner }: { source: PartnerSource; partner?: PartnerAccount }) {
  return (
    <article className="rounded-xl border border-white/10 bg-[#060a11]/92 p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={source.source_status} />
            <StatusBadge value={source.risk_level} />
            <span className="text-xs text-ink-500">{partner?.name || "Unknown partner"}</span>
          </div>
          <h2 className="mt-3 text-xl font-black text-white">{source.source_name}</h2>
          <p className="mt-1 text-sm leading-6 text-ink-300">{source.review_result || "No review note yet."}</p>
          <p className="mt-2 text-sm text-ink-400">Buyer interest: {source.buyer_requests_generated} | Estimated earnings: {money(source.estimated_earnings)} | Marketplace: {source.marketplace_status.replace(/_/g, " ")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminPartnerAction targetType="partner_source" targetId={source.id} action="approve_research" label="Approve research" tone="success" />
          <AdminPartnerAction targetType="partner_source" targetId={source.id} action="approve_marketplace" label="Approve marketplace" tone="success" />
          <AdminPartnerAction targetType="partner_source" targetId={source.id} action="request_more_info" label="More info" />
          <AdminPartnerAction targetType="partner_source" targetId={source.id} action="mark_prohibited" label="Prohibited" tone="danger" />
        </div>
      </div>
    </article>
  );
}

function EarningRow({ earning, partner }: { earning: PartnerEarning; partner?: PartnerAccount }) {
  return (
    <article className="rounded-xl border border-white/10 bg-[#060a11]/92 p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={earning.status} />
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-bold capitalize text-ink-200">{earning.earning_type.replace(/_/g, " ")}</span>
          </div>
          <h2 className="mt-3 text-xl font-black text-white">{money(earning.amount)}</h2>
          <p className="mt-1 text-sm leading-6 text-ink-300">{partner?.name || "Unknown partner"} | {earning.calculation_note || "No calculation note."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminPartnerAction targetType="partner_earning" targetId={earning.id} action="approve" label="Approve" tone="success" />
          <AdminPartnerAction targetType="partner_earning" targetId={earning.id} action="mark_paid" label="Mark paid" tone="success" />
          <AdminPartnerAction targetType="partner_earning" targetId={earning.id} action="dispute" label="Dispute" />
          <AdminPartnerAction targetType="partner_earning" targetId={earning.id} action="void" label="Void" tone="danger" />
        </div>
      </div>
    </article>
  );
}

function PayoutRow({ payout, partner }: { payout: PartnerPayout; partner?: PartnerAccount }) {
  return (
    <article className="rounded-xl border border-white/10 bg-[#060a11]/92 p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <StatusBadge value={payout.status} />
          <h2 className="mt-3 text-xl font-black text-white">{money(payout.amount)}</h2>
          <p className="mt-1 text-sm leading-6 text-ink-300">{partner?.name || "Unknown partner"} | {payout.payout_preference || "Manual payout"}</p>
          <p className="mt-2 text-xs text-ink-500">Created {dateLabel(payout.created_at)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminPartnerAction targetType="partner_payout" targetId={payout.id} action="approve" label="Approve" tone="success" />
          <AdminPartnerAction targetType="partner_payout" targetId={payout.id} action="mark_paid" label="Mark paid" tone="success" />
          <AdminPartnerAction targetType="partner_payout" targetId={payout.id} action="dispute" label="Dispute" />
          <AdminPartnerAction targetType="partner_payout" targetId={payout.id} action="void" label="Void" tone="danger" />
        </div>
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#060a11]/92 p-4 shadow-2xl shadow-black/25 md:p-5">
      <h2 className="text-xl font-black text-white md:text-2xl">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Handshake; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#060a11]/92 p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs uppercase tracking-wider text-ink-500">{label}</p>
          <p className="mt-1 text-2xl font-extrabold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyRows() {
  return <div className="rounded-lg border border-white/10 bg-white/[0.03] p-6 text-sm text-ink-300">No partner rows match the current filters.</div>;
}
