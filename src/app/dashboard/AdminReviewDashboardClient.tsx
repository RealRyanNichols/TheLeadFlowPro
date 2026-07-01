"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  BadgeCheck,
  CheckCircle2,
  Download,
  Eye,
  FileCheck2,
  LockKeyhole,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  Tag,
  XCircle,
} from "lucide-react";
import { trackLeadFlowEvent } from "@/lib/leadflow-events-client";
import type {
  AdminAuditRow,
  AdminEventRow,
  AdminExportRow,
  AdminReviewDashboardData,
  AdminSourceProofRow,
  AdminSuppressionRow,
} from "@/lib/admin-review-dashboard";
import { cn } from "@/lib/utils";

type TargetType =
  | "lead_profile"
  | "lead_profiles_bulk"
  | "marketplace_listing"
  | "submitted_source"
  | "buyer_request"
  | "suppression_request"
  | "source_proof";

const nav = [
  ["overview", "Overview"],
  ["lead-profiles", "Lead Profiles"],
  ["marketplace-listings", "Marketplace Listings"],
  ["submitted-sources", "Submitted Sources"],
  ["buyer-requests", "Buyer Requests"],
  ["source-proof", "Source Proof"],
  ["suppression", "Suppression"],
  ["exports", "Exports"],
  ["events", "Events"],
  ["settings", "Settings"],
] as const;

const sensitiveActions = new Set(["suppress", "approve_suppression", "grant_entitlement", "create_export", "archive"]);

function adminEventName(targetType: TargetType, action: string) {
  if (targetType === "lead_profile" || targetType === "lead_profiles_bulk") return "admin_profile_reviewed";
  if (targetType === "submitted_source") return "admin_source_reviewed";
  if (targetType === "buyer_request") return "admin_buyer_request_reviewed";
  if (targetType === "suppression_request") return "admin_suppression_resolved";
  if (action === "create_export") return "admin_export_created";
  return "admin_review_action";
}

function dateLabel(value: string | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function money(cents: number | null | undefined) {
  if (!cents) return "Review";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function scoreValue(value: number | string | null | undefined) {
  if (typeof value === "number") return Math.round(value);
  if (typeof value === "string" && value) return Math.round(Number(value) || 0);
  return 0;
}

function confidenceLabel(value: number | string | null | undefined) {
  const numeric = scoreValue(value);
  const scaled = numeric <= 1 ? Math.round(numeric * 100) : numeric;
  if (scaled >= 75) return "High";
  if (scaled >= 45) return "Medium";
  if (scaled > 0) return "Low";
  return "Needs review";
}

function StatusBadge({ value }: { value: string }) {
  const normalized = value.replace(/_/g, " ");
  const tone =
    /approved|available|active|fulfilled/.test(value)
      ? "border-lead-300/30 bg-lead-300/10 text-lead-100"
      : /reject|denied|suppress|prohibited|cancelled/.test(value)
        ? "border-red-300/30 bg-red-300/10 text-red-100"
        : /review|pending|submitted|queued|draft/.test(value)
          ? "border-accent-300/30 bg-accent-300/10 text-accent-100"
          : "border-white/10 bg-white/[0.045] text-ink-200";

  return <span className={cn("inline-flex min-h-7 items-center rounded-md border px-2 text-xs font-bold capitalize", tone)}>{normalized}</span>;
}

function RiskBadge({ value }: { value: string }) {
  const tone =
    value === "prohibited"
      ? "border-red-300/40 bg-red-400/15 text-red-100"
      : value === "high"
        ? "border-orange-300/40 bg-orange-400/15 text-orange-100"
        : value === "medium"
          ? "border-accent-300/35 bg-accent-300/12 text-accent-100"
          : "border-lead-300/35 bg-lead-300/12 text-lead-100";

  return <span className={cn("inline-flex min-h-7 items-center rounded-md border px-2 text-xs font-extrabold capitalize", tone)}>{value}</span>;
}

function ScoreBadge({ value }: { value: number | string | null | undefined }) {
  const score = scoreValue(value);
  const tone =
    score >= 80
      ? "border-lead-300/35 bg-lead-300/12 text-lead-100"
      : score >= 60
        ? "border-accent-300/35 bg-accent-300/12 text-accent-100"
        : "border-white/10 bg-white/[0.045] text-ink-200";

  return <span className={cn("inline-flex min-h-8 min-w-12 items-center justify-center rounded-md border px-2 text-sm font-black", tone)}>{score || "NA"}</span>;
}

function rowMatches(row: Record<string, unknown>, search: string, vertical: string, status: string) {
  const haystack = JSON.stringify(row).toLowerCase();
  if (search && !haystack.includes(search.toLowerCase())) return false;
  if (vertical !== "all" && String(row.vertical || "").toLowerCase() !== vertical.toLowerCase()) return false;
  if (status !== "all") {
    const rowStatus = String(row.review_status || row.status || row.listing_status || row.export_status || "");
    if (rowStatus !== status) return false;
  }
  return true;
}

function AdminActionButton({
  targetType,
  targetId,
  action,
  label,
  icon: Icon = CheckCircle2,
  tone = "neutral",
  refreshLabel,
  disabled,
  extra,
}: {
  targetType: TargetType;
  targetId: string;
  action: string;
  label: string;
  icon?: typeof CheckCircle2;
  tone?: "success" | "danger" | "neutral";
  refreshLabel?: string;
  disabled?: boolean;
  extra?: Record<string, unknown>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const className =
    tone === "success"
      ? "border-lead-300/30 text-lead-100 hover:bg-lead-300/10"
      : tone === "danger"
        ? "border-red-300/30 text-red-100 hover:bg-red-400/10"
        : "border-white/15 text-ink-100 hover:bg-white/10";

  async function run() {
    if (disabled) return;
    const needsConfirmation = sensitiveActions.has(action);
    if (needsConfirmation && !window.confirm(`Confirm admin action: ${label}`)) return;

    setPending(true);
    try {
      const response = await fetch("/api/leadflow/admin-review", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId,
          action,
          confirmed: needsConfirmation,
          ...(extra || {}),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Admin action failed.");
      trackLeadFlowEvent(adminEventName(targetType, action), { target_type: targetType, action, status: "completed", route: "/dashboard" });
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Admin action failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={disabled || pending}
      className={cn("inline-flex min-h-9 items-center justify-center gap-2 rounded-md border px-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-45", className)}
      title={refreshLabel}
    >
      {pending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-xl border border-white/10 bg-[#060a11]/92 p-4 shadow-2xl shadow-black/25 md:p-5">
      <h2 className="text-xl font-black text-white md:text-2xl">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Toolbar({
  search,
  setSearch,
  vertical,
  setVertical,
  status,
  setStatus,
  verticals,
  statuses,
}: {
  search: string;
  setSearch: (value: string) => void;
  vertical: string;
  setVertical: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  verticals: string[];
  statuses: string[];
}) {
  return (
    <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
      <label className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-11 w-full rounded-lg border border-white/10 bg-ink-950 pl-9 pr-3 text-sm text-white outline-none placeholder:text-ink-500 focus:border-cyan-300/60"
          placeholder="Search review rows"
        />
      </label>
      <select value={vertical} onChange={(event) => setVertical(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-300/60">
        <option value="all">All verticals</option>
        {verticals.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-300/60">
        <option value="all">All statuses</option>
        {statuses.map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}
      </select>
    </div>
  );
}

function EmptyRows() {
  return <div className="rounded-lg border border-white/10 bg-white/[0.03] p-6 text-sm text-ink-300">No rows match the current filters.</div>;
}

export function AdminReviewDashboardClient({ data }: { data: AdminReviewDashboardData }) {
  const [search, setSearch] = useState("");
  const [vertical, setVertical] = useState("all");
  const [status, setStatus] = useState("all");
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);

  const buyerById = useMemo(() => new Map(data.buyerAccounts.map((buyer) => [buyer.id, buyer])), [data.buyerAccounts]);
  const contributorById = useMemo(() => new Map(data.contributorAccounts.map((contributor) => [contributor.id, contributor])), [data.contributorAccounts]);
  const listingById = useMemo(() => new Map(data.listings.map((listing) => [listing.id, listing])), [data.listings]);

  const verticals = useMemo(
    () => Array.from(new Set([...data.profiles.map((row) => row.vertical), ...data.listings.map((row) => row.vertical), ...data.sources.map((row) => row.vertical)].filter(Boolean))).sort(),
    [data],
  );
  const statuses = useMemo(
    () => Array.from(new Set([
      ...data.profiles.map((row) => row.review_status),
      ...data.listings.map((row) => row.listing_status),
      ...data.sources.map((row) => row.review_status),
      ...data.buyerRequests.map((row) => row.status),
      ...data.suppressions.map((row) => row.status),
      ...data.exports.map((row) => row.export_status),
    ].filter(Boolean))).sort(),
    [data],
  );

  const profiles = data.profiles.filter((row) => rowMatches(row as unknown as Record<string, unknown>, search, vertical, status));
  const listings = data.listings.filter((row) => rowMatches(row as unknown as Record<string, unknown>, search, vertical, status));
  const sources = data.sources.filter((row) => rowMatches(row as unknown as Record<string, unknown>, search, vertical, status));
  const buyerRequests = data.buyerRequests.filter((row) => rowMatches(row as unknown as Record<string, unknown>, search, "all", status));
  const sourceProofs = data.sourceProofs.filter((row) => rowMatches(row as unknown as Record<string, unknown>, search, "all", status));
  const suppressions = data.suppressions.filter((row) => rowMatches(row as unknown as Record<string, unknown>, search, "all", status));
  const exports = data.exports.filter((row) => rowMatches(row as unknown as Record<string, unknown>, search, "all", status));
  const auditLog = data.auditLog.filter((row) => rowMatches(row as unknown as Record<string, unknown>, search, "all", "all"));
  const events = data.events.filter((row) => rowMatches(row as unknown as Record<string, unknown>, search, vertical, "all"));

  function updateFilter(filterKey: "search" | "vertical" | "status", value: string) {
    if (filterKey === "search") setSearch(value);
    if (filterKey === "vertical") setVertical(value);
    if (filterKey === "status") setStatus(value);
    trackLeadFlowEvent("admin_table_filtered", {
      route: "/dashboard",
      filter_key: filterKey,
      status: filterKey === "status" ? value : status,
      vertical: filterKey === "vertical" ? value : vertical,
    });
  }

  async function bulkProfiles(action: "needs_review" | "archive") {
    if (!selectedProfiles.length) return;
    const confirmed = action === "archive" ? window.confirm(`Archive ${selectedProfiles.length} selected profiles?`) : true;
    if (!confirmed) return;
    const response = await fetch("/api/leadflow/admin-review", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        targetType: "lead_profiles_bulk",
        targetIds: selectedProfiles,
        action,
        confirmed: action === "archive",
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      window.alert(result.error || "Bulk action failed.");
      return;
    }
    setSelectedProfiles([]);
    trackLeadFlowEvent("admin_profile_reviewed", { target_type: "lead_profiles_bulk", action, count: selectedProfiles.length, route: "/dashboard" });
    window.location.reload();
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <section className="rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_16%_12%,rgba(35,184,255,0.16),transparent_28%),linear-gradient(135deg,#07101b,#050711)] p-5 shadow-2xl shadow-black/30 md:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Internal review dashboard</p>
            <h1 className="mt-3 max-w-5xl text-4xl font-black leading-tight text-white md:text-6xl">
              Control the lead signal machine before anything gets released.
            </h1>
            <p className="mt-4 max-w-4xl text-sm leading-6 text-ink-200 md:text-base md:leading-7">
              Review submitted sources, lead profiles, buyer requests, listings, source proof, suppression, exports, audit history, and event flow from one admin surface.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link href="/submit-source" className="btn-ghost justify-center text-sm">Open submit source</Link>
            <Link href="/marketplace" className="btn-accent justify-center text-sm">Open marketplace</Link>
          </div>
        </div>
        {data.mode === "offline" || data.loadErrors.length ? (
          <div className="mt-5 rounded-lg border border-accent-300/30 bg-accent-300/10 p-3 text-sm leading-6 text-accent-100">
            {data.loadErrors[0] || "Some dashboard tables could not be loaded. Review Supabase grants, RLS, and service role configuration."}
          </div>
        ) : null}
      </section>

      <nav className="sticky top-0 z-20 -mx-4 overflow-x-auto border-y border-white/10 bg-ink-950/90 px-4 py-2 backdrop-blur md:mx-0 md:rounded-xl md:border">
        <div className="flex min-w-max gap-2">
          {nav.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-bold text-ink-200 hover:border-cyan-300/30 hover:text-white">
              {label}
            </a>
          ))}
        </div>
      </nav>

      <Section id="overview" title="Overview">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="New source submissions" value={data.stats.newSourceSubmissions} />
          <Metric label="Profiles needing review" value={data.stats.profilesNeedingReview} />
          <Metric label="Buyer access requests" value={data.stats.buyerAccessRequests} />
          <Metric label="Suppression requests" value={data.stats.suppressionRequests} danger={data.stats.suppressionRequests > 0} />
          <Metric label="Approved listings" value={data.stats.approvedMarketplaceListings} />
          <Metric label="Recent exports" value={data.stats.recentExports} />
          <Metric label="High-score profiles" value={data.stats.highScoreProfiles} />
          <Metric label="Flagged risk items" value={data.stats.flaggedRiskItems} danger={data.stats.flaggedRiskItems > 0} />
        </div>
        <div className="mt-4 grid gap-3 xl:grid-cols-3">
          <Distribution title="Profiles by status" data={data.stats.profilesByStatus} />
          <Distribution title="Requests by status" data={data.stats.requestsByStatus} />
          <Distribution title="Listings by vertical" data={data.stats.listingsByVertical} />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Metric label="Average confidence score" value={`${data.stats.averageConfidenceScore}%`} />
          <Metric label="Profiles created this week" value={data.stats.profilesCreatedThisWeek} />
          <Metric label="Sources submitted this week" value={data.stats.sourcesSubmittedThisWeek} />
        </div>
      </Section>

      <Toolbar
        search={search}
        setSearch={(value) => updateFilter("search", value)}
        vertical={vertical}
        setVertical={(value) => updateFilter("vertical", value)}
        status={status}
        setStatus={(value) => updateFilter("status", value)}
        verticals={verticals}
        statuses={statuses}
      />

      <Section id="lead-profiles" title="Lead Profiles">
        <BulkProfileBar selectedCount={selectedProfiles.length} onNeedsReview={() => bulkProfiles("needs_review")} onArchive={() => bulkProfiles("archive")} />
        {profiles.length ? (
          <Table>
            <thead><tr>{["", "Profile title", "Vertical", "Category", "Score", "Confidence", "Source proof", "Suppression", "Review", "Created", "Updated", "Actions"].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>
              {profiles.map((row) => (
                <tr key={row.id}>
                  <Td><input aria-label={`Select ${row.title}`} type="checkbox" checked={selectedProfiles.includes(row.id)} onChange={(event) => setSelectedProfiles((current) => event.target.checked ? [...current, row.id] : current.filter((id) => id !== row.id))} /></Td>
                  <Td><Link href={`/lead-profile/${row.id}`} className="font-bold text-white hover:text-cyan-200">{row.title}</Link></Td>
                  <Td>{row.vertical}</Td>
                  <Td>{row.category || "Unassigned"}</Td>
                  <Td><ScoreBadge value={row.score} /></Td>
                  <Td>{confidenceLabel(row.confidence)}</Td>
                  <Td><StatusBadge value={row.source_proof_status} /></Td>
                  <Td><StatusBadge value={row.suppression_status} /></Td>
                  <Td><StatusBadge value={row.review_status} /></Td>
                  <Td>{dateLabel(row.created_at)}</Td>
                  <Td>{dateLabel(row.updated_at)}</Td>
                  <Td><ActionGrid>
                    <Link href={`/lead-profile/${row.id}`} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-white/15 px-2.5 text-xs font-bold text-ink-100 hover:bg-white/10"><Eye className="h-3.5 w-3.5" /> View</Link>
                    <AdminActionButton targetType="lead_profile" targetId={row.id} action="approve" label="Approve" icon={CheckCircle2} tone="success" />
                    <AdminActionButton targetType="lead_profile" targetId={row.id} action="reject" label="Reject" icon={XCircle} tone="danger" />
                    <AdminActionButton targetType="lead_profile" targetId={row.id} action="needs_review" label="Needs review" icon={ShieldAlert} />
                    <AdminActionButton targetType="lead_profile" targetId={row.id} action="suppress" label="Suppress" icon={LockKeyhole} tone="danger" />
                    <AdminActionButton targetType="lead_profile" targetId={row.id} action="create_export" label="Queue export" icon={Download} />
                    <AdminActionButton targetType="lead_profile" targetId={row.id} action="add_tag" label="Add tag" icon={Tag} extra={{ tag: "admin_reviewed" }} />
                  </ActionGrid></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : <EmptyRows />}
      </Section>

      <Section id="marketplace-listings" title="Marketplace Listings">
        {listings.length ? <Table>
          <thead><tr>{["Listing title", "Vertical", "Status", "Records", "Price", "Shared/exclusive", "Buyer requests", "Sample", "Updated", "Actions"].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
          <tbody>{listings.map((row) => {
            const requestCount = data.buyerRequests.filter((request) => request.listing_id === row.id || request.listing_slug === row.id).length;
            return (
              <tr key={row.id}>
                <Td><span className="font-bold text-white">{row.title}</span></Td>
                <Td>{row.vertical}</Td>
                <Td><StatusBadge value={row.listing_status} /></Td>
                <Td>{row.sample_count || 0}</Td>
                <Td>{money(row.price_cents)}</Td>
                <Td>{row.release_mode}</Td>
                <Td>{requestCount}</Td>
                <Td>{row.sample_count ? "Enabled" : "No sample"}</Td>
                <Td>{dateLabel(row.updated_at)}</Td>
                <Td><ActionGrid>
                  <AdminActionButton targetType="marketplace_listing" targetId={row.id} action="publish" label="Publish" icon={BadgeCheck} tone="success" />
                  <AdminActionButton targetType="marketplace_listing" targetId={row.id} action="unpublish" label="Unpublish" icon={XCircle} />
                  <AdminActionButton targetType="marketplace_listing" targetId={row.id} action="archive" label="Archive" icon={Archive} tone="danger" />
                  <Link href="#buyer-requests" className="inline-flex min-h-9 items-center justify-center rounded-md border border-white/15 px-2.5 text-xs font-bold text-ink-100 hover:bg-white/10">Requests</Link>
                </ActionGrid></Td>
              </tr>
            );
          })}</tbody>
        </Table> : <EmptyRows />}
      </Section>

      <Section id="submitted-sources" title="Submitted Sources">
        {sources.length ? <Table>
          <thead><tr>{["Source name", "Source type", "Contributor", "Origin", "Risk", "Review", "Vertical", "Created", "Actions"].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
          <tbody>{sources.map((row) => {
            const contributor = row.contributor_id ? contributorById.get(row.contributor_id) : null;
            return (
              <tr key={row.id}>
                <Td><span className="font-bold text-white">{row.source_name}</span></Td>
                <Td>{row.source_type.replace(/_/g, " ")}</Td>
                <Td>{contributor ? `${contributor.name}${contributor.company_name ? `, ${contributor.company_name}` : ""}` : "Unknown contributor"}</Td>
                <Td>{row.origin_type.replace(/_/g, " ")}</Td>
                <Td><RiskBadge value={row.risk_level} /></Td>
                <Td><StatusBadge value={row.review_status} /></Td>
                <Td>{row.vertical}</Td>
                <Td>{dateLabel(row.created_at)}</Td>
                <Td><ActionGrid>
                  <Link href="/dashboard/source-submissions" className="inline-flex min-h-9 items-center justify-center rounded-md border border-white/15 px-2.5 text-xs font-bold text-ink-100 hover:bg-white/10">Review</Link>
                  <AdminActionButton targetType="submitted_source" targetId={row.id} action="approve_research" label="Research" icon={CheckCircle2} tone="success" />
                  <AdminActionButton targetType="submitted_source" targetId={row.id} action="approve_marketplace" label="Marketplace" icon={BadgeCheck} tone="success" disabled={row.risk_level === "high" || row.risk_level === "prohibited"} refreshLabel="High-risk sources cannot be approved for marketplace from bulk dashboard." />
                  <AdminActionButton targetType="submitted_source" targetId={row.id} action="request_more_info" label="More info" icon={FileCheck2} />
                  <AdminActionButton targetType="submitted_source" targetId={row.id} action="reject" label="Reject" icon={XCircle} tone="danger" />
                  <AdminActionButton targetType="submitted_source" targetId={row.id} action="prohibited" label="Prohibited" icon={ShieldAlert} tone="danger" />
                  <AdminActionButton targetType="submitted_source" targetId={row.id} action="convert_lead_profile_batch" label="To profiles" icon={PlusCircle} disabled={row.risk_level === "prohibited"} />
                  <AdminActionButton targetType="submitted_source" targetId={row.id} action="convert_source_proof" label="To proof" icon={FileCheck2} disabled={row.risk_level === "prohibited"} />
                </ActionGrid></Td>
              </tr>
            );
          })}</tbody>
        </Table> : <EmptyRows />}
      </Section>

      <Section id="buyer-requests" title="Buyer Requests">
        {buyerRequests.length ? <Table>
          <thead><tr>{["Buyer", "Company", "Request type", "Listing", "Budget", "Intended use", "Status", "Created", "Actions"].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
          <tbody>{buyerRequests.map((row) => {
            const buyer = row.buyer_account_id ? buyerById.get(row.buyer_account_id) : null;
            const listing = row.listing_id ? listingById.get(row.listing_id) : null;
            return (
              <tr key={row.id}>
                <Td>{buyer?.name || "Unknown buyer"}</Td>
                <Td>{buyer?.company_name || "Unlisted"}</Td>
                <Td>{row.request_type.replace(/_/g, " ")}</Td>
                <Td>{listing?.title || row.listing_slug || row.listing_id || "Custom request"}</Td>
                <Td>{row.budget_range || "Not stated"}</Td>
                <Td>{row.intended_use || "Needs review"}</Td>
                <Td><StatusBadge value={row.status} /></Td>
                <Td>{dateLabel(row.created_at)}</Td>
                <Td><ActionGrid>
                  <AdminActionButton targetType="buyer_request" targetId={row.id} action="approve" label="Approve" icon={CheckCircle2} tone="success" />
                  <AdminActionButton targetType="buyer_request" targetId={row.id} action="deny" label="Deny" icon={XCircle} tone="danger" />
                  <AdminActionButton targetType="buyer_request" targetId={row.id} action="request_more_info" label="More info" icon={FileCheck2} />
                  <AdminActionButton targetType="buyer_request" targetId={row.id} action="grant_entitlement" label="Grant access" icon={BadgeCheck} tone="success" extra={{ accessLevel: "summary" }} />
                </ActionGrid></Td>
              </tr>
            );
          })}</tbody>
        </Table> : <EmptyRows />}
      </Section>

      <Section id="source-proof" title="Source Proof">
        {sourceProofs.length ? <SimpleRows rows={sourceProofs} render={(row: AdminSourceProofRow) => (
          <tr key={row.id}>
            <Td>{row.source_label || row.proof_type}</Td><Td>{row.proof_type}</Td><Td>{confidenceLabel(row.confidence)}</Td><Td><StatusBadge value={row.status} /></Td><Td><StatusBadge value={row.review_status} /></Td><Td>{dateLabel(row.created_at)}</Td>
            <Td><ActionGrid><AdminActionButton targetType="source_proof" targetId={row.id} action="approve" label="Approve" icon={CheckCircle2} tone="success" /><AdminActionButton targetType="source_proof" targetId={row.id} action="reject" label="Reject" icon={XCircle} tone="danger" /></ActionGrid></Td>
          </tr>
        )} headers={["Proof", "Type", "Confidence", "Status", "Review", "Created", "Actions"]} /> : <EmptyRows />}
      </Section>

      <Section id="suppression" title="Suppression Requests">
        {suppressions.length ? <SimpleRows rows={suppressions} render={(row: AdminSuppressionRow) => (
          <tr key={row.id}><Td>{row.suppression_type}</Td><Td>{row.identity_id || row.lead_profile_id || "Unknown target"}</Td><Td>{row.reason || "No reason supplied"}</Td><Td><StatusBadge value={row.status} /></Td><Td>{dateLabel(row.created_at)}</Td><Td><ActionGrid><AdminActionButton targetType="suppression_request" targetId={row.id} action="approve_suppression" label="Approve suppression" icon={LockKeyhole} tone="danger" /><AdminActionButton targetType="suppression_request" targetId={row.id} action="deny" label="Deny" icon={XCircle} /><AdminActionButton targetType="suppression_request" targetId={row.id} action="duplicate" label="Duplicate" icon={Archive} /><AdminActionButton targetType="suppression_request" targetId={row.id} action="resolve" label="Resolve" icon={CheckCircle2} tone="success" /></ActionGrid></Td></tr>
        )} headers={["Request type", "Identity/profile/listing", "Reason", "Status", "Created", "Actions"]} /> : <EmptyRows />}
      </Section>

      <Section id="exports" title="Exports">
        {exports.length ? <SimpleRows rows={exports} render={(row: AdminExportRow) => {
          const buyer = row.buyer_account_id ? buyerById.get(row.buyer_account_id) : null;
          const listing = row.marketplace_listing_id ? listingById.get(row.marketplace_listing_id) : null;
          return <tr key={row.id}><Td>{row.id.slice(0, 8)}</Td><Td>{buyer?.company_name || buyer?.name || "Internal"}</Td><Td>{listing?.title || row.marketplace_listing_id || row.lead_profile_id || "Batch"}</Td><Td>{row.row_count}</Td><Td>{row.raw_answers_included ? "Raw included" : "Approved fields only"}</Td><Td><StatusBadge value={row.export_status} /></Td><Td>{row.created_by_user_id || "System"}</Td><Td>{dateLabel(row.created_at)}</Td><Td>{row.storage_path ? "Private signed link required" : "No file generated"}</Td></tr>;
        }} headers={["Export id", "Buyer", "Listing", "Profile count", "Fields included", "Status", "Created by", "Created", "Download"]} /> : <EmptyRows />}
      </Section>

      <Section id="events" title="Events">
        <div className="grid gap-4 xl:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-ink-400">Recent audit log</h3>
            {auditLog.length ? <SimpleRows rows={auditLog} render={(row: AdminAuditRow) => <tr key={row.id}><Td>{row.action}</Td><Td>{row.object_table}</Td><Td>{row.object_id?.slice(0, 8) || "None"}</Td><Td>{row.actor_type}</Td><Td>{dateLabel(row.created_at)}</Td></tr>} headers={["Action", "Object", "Object id", "Actor", "Created"]} /> : <EmptyRows />}
          </div>
          <div>
            <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-ink-400">Recent events</h3>
            {events.length ? <SimpleRows rows={events} render={(row: AdminEventRow) => <tr key={row.id}><Td>{row.event_name}</Td><Td>{row.event_type}</Td><Td>{row.vertical || "None"}</Td><Td>{row.source_path || "None"}</Td><Td>{dateLabel(row.created_at)}</Td></tr>} headers={["Event", "Type", "Vertical", "Route", "Created"]} /> : <EmptyRows />}
          </div>
        </div>
      </Section>

      <Section id="settings" title="Settings">
        <div className="grid gap-3 md:grid-cols-3">
          <SettingCard title="Admin-only access" body="Dashboard layout and middleware redirect non-admin users before internal review data is shown." />
          <SettingCard title="Sensitive actions" body="Suppression, entitlement grants, export queueing, and archive actions require confirmation and audit logging." />
          <SettingCard title="Blocked bulk actions" body="Suppression removal, full-data export, high-risk source approval, and unreviewed listing publish are not bulk-enabled." />
        </div>
      </Section>
    </div>
  );
}

function Metric({ label, value, danger }: { label: string; value: string | number; danger?: boolean }) {
  return (
    <div className={cn("rounded-lg border p-4", danger ? "border-red-300/30 bg-red-400/10" : "border-white/10 bg-white/[0.035]")}>
      <p className="text-xs font-bold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function Distribution({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-ink-400">{title}</p>
      <div className="mt-3 grid gap-2">
        {entries.length ? entries.map(([key, value]) => (
          <div key={key} className="flex items-center justify-between gap-3 text-sm">
            <span className="capitalize text-ink-200">{key.replace(/_/g, " ")}</span>
            <strong className="text-white">{value}</strong>
          </div>
        )) : <p className="text-sm text-ink-400">No rows yet.</p>}
      </div>
    </div>
  );
}

function BulkProfileBar({ selectedCount, onNeedsReview, onArchive }: { selectedCount: number; onNeedsReview: () => void; onArchive: () => void }) {
  return (
    <div className="mb-3 flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-ink-300">{selectedCount} profile{selectedCount === 1 ? "" : "s"} selected. Bulk suppression removal, full-data export, high-risk approval, and unreviewed publishing are blocked.</p>
      <div className="flex gap-2">
        <button type="button" disabled={!selectedCount} onClick={onNeedsReview} className="rounded-md border border-white/15 px-3 py-2 text-xs font-bold text-ink-100 disabled:opacity-40">Mark needs review</button>
        <button type="button" disabled={!selectedCount} onClick={onArchive} className="rounded-md border border-red-300/30 px-3 py-2 text-xs font-bold text-red-100 disabled:opacity-40">Archive</button>
      </div>
    </div>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-lg border border-white/10"><table className="min-w-full divide-y divide-white/10 text-left text-sm">{children}</table></div>;
}

function SimpleRows<T>({ rows, headers, render }: { rows: T[]; headers: string[]; render: (row: T) => React.ReactNode }) {
  return <Table><thead><tr>{headers.map((header) => <Th key={header}>{header}</Th>)}</tr></thead><tbody>{rows.map(render)}</tbody></Table>;
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap bg-white/[0.035] px-3 py-3 text-xs font-extrabold uppercase tracking-wider text-ink-400">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="max-w-[22rem] border-t border-white/10 px-3 py-3 align-top text-sm leading-5 text-ink-200">{children}</td>;
}

function ActionGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid min-w-[19rem] grid-cols-2 gap-2">{children}</div>;
}

function SettingCard({ title, body }: { title: string; body: string }) {
  return <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4"><h3 className="font-black text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-ink-300">{body}</p></div>;
}
