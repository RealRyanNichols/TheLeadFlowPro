"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  Download,
  Eye,
  FileCheck2,
  FilePlus2,
  Flag,
  Gauge,
  History,
  LockKeyhole,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Tag,
  Target,
  UserCheck,
  UserPlus,
  XCircle,
} from "lucide-react";
import {
  ConfidenceLabel,
  LeadScoreBadge,
  SourceProofChip,
  SuppressionStatusBadge,
} from "@/components/leadflow-system";
import { trackEvent } from "@/lib/events";
import type {
  LeadProfileHistoryRecord,
  LeadProfileScoreBreakdown,
  LeadProfileSignalRecord,
  LeadProfileSourceProofRecord,
  ProtectedLeadProfileDetail,
} from "@/lib/lead-profile-detail";
import { cn } from "@/lib/utils";

type LeadProfileTab = "Overview" | "Source Proof" | "Signals" | "Buyer Fit" | "Compliance" | "History";
type ViewerRole = "admin" | "buyer";
type ActionState = { label: string; tone: "success" | "error" | "info" } | null;

const tabs: LeadProfileTab[] = ["Overview", "Source Proof", "Signals", "Buyer Fit", "Compliance", "History"];

const buyerControls = [
  { label: "Add to watchlist", action: "watchlist", icon: Star, event: "lead_profile_watchlisted" },
  { label: "Request clarification", action: "request_clarification", icon: MessageSquareText, event: "lead_profile_issue_reported" },
  { label: "Report issue", action: "report_issue", icon: Flag, event: "lead_profile_issue_reported" },
  { label: "Request exclusive access", action: "request_exclusive", icon: BadgeCheck, event: "buyer_request_submitted" },
  { label: "Export if allowed", action: "export", icon: Download, event: "lead_profile_exported" },
  { label: "Mark contacted", action: "mark_contacted", icon: CheckCircle2, event: "lead_profile_contact_marked" },
] as const;

const adminControls = [
  { label: "Approve profile", action: "approve", icon: CheckCircle2, tone: "success", event: "admin_profile_approved" },
  { label: "Reject profile", action: "reject", icon: XCircle, tone: "danger", event: "admin_profile_rejected" },
  { label: "Mark needs review", action: "needs_review", icon: AlertTriangle, tone: "neutral", event: "admin_profile_needs_review" },
  { label: "Add source proof", action: "add_source_proof", icon: FilePlus2, tone: "neutral", event: "admin_profile_source_proof_added" },
  { label: "Update score", action: "update_score", icon: SlidersHorizontal, tone: "neutral", event: "admin_profile_score_updated" },
  { label: "Add tag", action: "add_tag", icon: Tag, tone: "neutral", event: "admin_profile_tag_added" },
  { label: "Suppress profile", action: "suppress", icon: LockKeyhole, tone: "danger", event: "admin_profile_suppressed" },
  { label: "Resolve suppression", action: "resolve_suppression", icon: RefreshCw, tone: "success", event: "admin_profile_suppression_resolved" },
  { label: "Export profile", action: "export", icon: Download, tone: "neutral", event: "lead_profile_exported" },
  { label: "Grant buyer access", action: "grant_buyer_access", icon: UserPlus, tone: "success", event: "admin_profile_access_granted" },
  { label: "Remove buyer access", action: "remove_buyer_access", icon: XCircle, tone: "danger", event: "admin_profile_access_removed" },
] as const;

function trackProfileEvent(
  eventName: string,
  profile: ProtectedLeadProfileDetail,
  properties: Record<string, string | number | boolean | null | undefined> = {},
) {
  trackEvent(eventName, {
    route: `/lead-profile/${profile.id}`,
    profile_id: profile.id,
    category: profile.category,
    score_range: profile.leadScore >= 80 ? "high" : profile.leadScore >= 60 ? "medium" : "low",
    ...properties,
  });
}

async function postProfileAction(profileId: string, role: ViewerRole, action: string) {
  const endpoint =
    role === "admin"
      ? `/api/lead-profile/${encodeURIComponent(profileId)}/admin-action`
      : `/api/lead-profile/${encodeURIComponent(profileId)}/buyer-action`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(typeof data?.error === "string" ? data.error : "Action failed.");
  }

  return data as { ok?: boolean; message?: string; persisted?: boolean; skipped?: boolean };
}

export function LeadProfileDetailClient({
  profile,
  viewerRole,
  entitlementAccessLevel,
  exportAllowed,
}: {
  profile: ProtectedLeadProfileDetail;
  viewerRole: ViewerRole;
  entitlementAccessLevel: string | null;
  exportAllowed: boolean;
}) {
  const [activeTab, setActiveTab] = useState<LeadProfileTab>("Overview");
  const [actionState, setActionState] = useState<ActionState>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  function selectTab(tab: LeadProfileTab) {
    setActiveTab(tab);
    trackProfileEvent("lead_profile_tab_clicked", profile, { tab });
  }

  async function runAction(action: string, eventName: string, label: string) {
    setPendingAction(action);
    setActionState(null);
    trackProfileEvent(eventName, profile, { action, role: viewerRole });

    try {
      const result = await postProfileAction(profile.id, viewerRole, action);
      setActionState({
        label: result.message || `${label} recorded.`,
        tone: result.persisted === false || result.skipped ? "info" : "success",
      });
    } catch (error) {
      setActionState({
        label: error instanceof Error ? error.message : `${label} failed.`,
        tone: "error",
      });
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <main className="pb-24">
      <section className="relative isolate overflow-hidden border-b border-white/10 py-10 md:py-14">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_16%_18%,rgba(35,184,255,0.18),transparent_32%),radial-gradient(circle_at_78%_0%,rgba(255,186,61,0.16),transparent_30%),linear-gradient(135deg,#030711_0%,#070b16_52%,#101007_100%)]" />
        <div className="container">
          <div className="mb-6 flex flex-wrap items-center gap-2 text-sm font-bold text-ink-300">
            <Link href="/marketplace" className="hover:text-cyan-200">
              Marketplace
            </Link>
            <span>/</span>
            <span className="text-white">Protected profile</span>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(340px,0.58fr)] lg:items-start">
            <div>
              <div className="flex flex-wrap gap-2">
                <SourceProofChip label={profile.category} />
                <SourceProofChip label={profile.vertical} verified={false} />
                <ConfidenceLabel level={profile.confidence} label={`${profile.confidence} confidence`} />
                <SourceProofChip label={profile.freshnessLabel} verified={false} />
                <SourceProofChip label={profile.sourceProofStatus} />
                <SuppressionStatusBadge status={profile.suppressionStatus} />
                <SourceProofChip label={profile.reviewStatus} verified={profile.reviewStatus.toLowerCase().includes("approved")} />
              </div>
              <h1 className="mt-6 max-w-5xl text-4xl font-black leading-[0.96] tracking-normal text-white md:text-6xl">
                {profile.title}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-ink-100 md:text-xl md:leading-8">
                {profile.summary}
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <HeroFact label="Source type" value={profile.sourceType} icon={<DatabaseZap className="h-4 w-4" />} />
                <HeroFact label="Best buyer" value={profile.bestBuyerType} icon={<Target className="h-4 w-4" />} />
                <HeroFact label="Last verified" value={profile.lastVerifiedDate} icon={<CalendarCheck2 className="h-4 w-4" />} />
                <HeroFact label="Access level" value={viewerRole === "admin" ? "Admin full view" : entitlementAccessLevel || "Buyer entitlement"} icon={<ShieldCheck className="h-4 w-4" />} />
              </div>
            </div>

            <aside className="lead-shell overflow-hidden p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Signal cockpit</p>
                  <h2 className="mt-2 text-2xl font-black text-white">Proof, fit, action.</h2>
                </div>
                <LeadScoreBadge score={profile.leadScore} />
              </div>

              <SignalCockpit profile={profile} />

              <div className="mt-5 grid gap-3">
                <SignalFact label="Consent status" value={profile.consentStatus} />
                <SignalFact label="Recommended next action" value={profile.recommendedNextAction} />
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-ink-900/45 py-4">
        <div className="container">
          <div
            className="lead-shell flex min-w-0 gap-2 overflow-x-auto p-2"
            role="tablist"
            aria-label="Lead profile sections"
          >
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => selectTab(tab)}
                className={cn(
                  "min-h-11 shrink-0 rounded-lg border px-4 text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950",
                  activeTab === tab
                    ? "border-cyan-300/55 bg-cyan-300/14 text-white shadow-lg shadow-cyan-950/30"
                    : "border-white/10 bg-white/[0.035] text-ink-200 hover:border-cyan-300/35 hover:text-white",
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className="container">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(310px,0.38fr)]">
            <div className="space-y-6">
              <PrimarySummaryCard profile={profile} />
              <ScoreBreakdownCard scores={profile.scoreBreakdown} />

              {activeTab === "Overview" ? <OverviewTab profile={profile} /> : null}
              {activeTab === "Source Proof" ? <SourceProofTab profile={profile} isAdmin={viewerRole === "admin"} /> : null}
              {activeTab === "Signals" ? <SignalsTab signals={profile.signalRecords} /> : null}
              {activeTab === "Buyer Fit" ? <BuyerFitTab profile={profile} /> : null}
              {activeTab === "Compliance" ? <ComplianceTab profile={profile} /> : null}
              {activeTab === "History" ? <HistoryTab history={profile.historyRecords} /> : null}
            </div>

            <aside className="space-y-5">
              <SidePanel eyebrow="Profile facts" title="What buyers see first" icon={<Eye className="h-5 w-5" />}>
                <div className="grid gap-3">
                  <SignalFact label="Category" value={profile.category} />
                  <SignalFact label="Vertical" value={profile.vertical} />
                  <SignalFact label="Sample count" value={profile.sampleCount} />
                  <SignalFact label="Price band" value={profile.priceBand} />
                  <SignalFact label="Release mode" value={profile.releaseMode} />
                  <SignalFact label="Source type" value={profile.sourceType} />
                </div>
              </SidePanel>

              <SidePanel eyebrow="Missing information" title="What still needs review" icon={<AlertTriangle className="h-5 w-5" />}>
                <BulletList items={profile.missingInformation.length ? profile.missingInformation : ["No major missing field flagged in the current model."]} />
              </SidePanel>

              <ActionPanel
                profile={profile}
                viewerRole={viewerRole}
                pendingAction={pendingAction}
                actionState={actionState}
                exportAllowed={exportAllowed}
                onRunAction={runAction}
              />
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

function PrimarySummaryCard({ profile }: { profile: ProtectedLeadProfileDetail }) {
  return (
    <section className="lead-shell p-5 md:p-6">
      <div className="mb-6 flex items-start gap-4 border-b border-white/10 pb-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
          <FileCheck2 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Primary summary</p>
          <h2 className="mt-2 text-2xl font-black leading-tight text-white md:text-3xl">
            Why this profile exists and what to do next
          </h2>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <InfoBlock title="Summary">{profile.summary}</InfoBlock>
        <InfoBlock title="Why this profile exists">{profile.whyThisProfileExists}</InfoBlock>
        <InfoBlock title="Buyer use case">{profile.buyerUseCase}</InfoBlock>
        <InfoBlock title="Best buyer type">{profile.bestBuyerType}</InfoBlock>
        <InfoBlock title="Recommended next action">{profile.recommendedNextAction}</InfoBlock>
        <InfoBlock title="Last verified date">{profile.lastVerifiedDate}</InfoBlock>
        <InfoBlock title="Missing information">
          <BulletList items={profile.missingInformation.length ? profile.missingInformation : ["No major missing field flagged in the current model."]} />
        </InfoBlock>
        <InfoBlock title="Risk or caution note">{profile.riskCautionNote}</InfoBlock>
      </div>
    </section>
  );
}

function ScoreBreakdownCard({ scores }: { scores: LeadProfileScoreBreakdown[] }) {
  return (
    <section className="lead-shell p-5 md:p-6">
      <div className="mb-6 flex items-start gap-4 border-b border-white/10 pb-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-accent-300/20 bg-accent-300/10 text-accent-200">
          <Gauge className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-accent-300">Score breakdown</p>
          <h2 className="mt-2 text-2xl font-black leading-tight text-white md:text-3xl">
            Explainable scores from 0 to 100
          </h2>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {scores.map((score) => (
          <article key={score.key} className="lead-panel p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{score.label}</p>
                <h3 className="mt-2 text-xl font-black text-white">{score.scoreLabel}</h3>
              </div>
              <LeadScoreBadge score={score.score} label="Score" className="min-h-12 min-w-16" />
            </div>
            <p className="mt-3 text-sm leading-6 text-ink-200">{score.explanation}</p>
            <div className="mt-4 grid gap-3">
              <ConfidenceLabel level={score.confidence} />
              <SignalFact label="Fields used" value={score.fieldsUsed.join(", ")} />
              <SignalFact label="Fields missing" value={score.fieldsMissing.length ? score.fieldsMissing.join(", ") : "No major scoring field missing"} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function OverviewTab({ profile }: { profile: ProtectedLeadProfileDetail }) {
  return (
    <TabShell eyebrow="Overview" title="The business case in plain English" icon={<FileCheck2 className="h-5 w-5" />}>
      <div className="grid gap-4 lg:grid-cols-2">
        <InfoBlock title="Key facts">
          <BulletList items={profile.keyFacts} />
        </InfoBlock>
        <InfoBlock title="Buyer use case">{profile.buyerUseCase}</InfoBlock>
        <InfoBlock title="Suggested offer angle">{profile.suggestedOfferAngle}</InfoBlock>
        <InfoBlock title="Recommended outreach path">{profile.recommendedOutreachPath}</InfoBlock>
        <InfoBlock title="Contact route hints">
          <BulletList items={profile.contactRouteHints} />
        </InfoBlock>
        <InfoBlock title="Notes">
          <BulletList items={profile.notes} />
        </InfoBlock>
      </div>
    </TabShell>
  );
}

function SourceProofTab({
  profile,
  isAdmin,
}: {
  profile: ProtectedLeadProfileDetail;
  isAdmin: boolean;
}) {
  return (
    <TabShell eyebrow="Source proof" title="Where this signal came from" icon={<DatabaseZap className="h-5 w-5" />}>
      <div className="grid gap-4">
        {profile.sourceProofRecords.map((item) => (
          <SourceProofRecordCard key={item.id} item={item} isAdmin={isAdmin} />
        ))}
      </div>
    </TabShell>
  );
}

function SourceProofRecordCard({ item, isAdmin }: { item: LeadProfileSourceProofRecord; isAdmin: boolean }) {
  return (
    <article className="lead-panel p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <SourceProofChip label={item.sourceType} verified={item.status === "verified" || item.status === "approved"} />
            <ConfidenceLabel level={item.confidence} />
          </div>
          <h3 className="mt-3 text-2xl font-black leading-tight text-white">{item.sourceTitle}</h3>
          <p className="mt-2 text-sm leading-6 text-ink-200">{item.proofSnippet}</p>
        </div>
        <Link
          href={item.sourceUrl}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.045] px-3 text-sm font-extrabold text-cyan-200 hover:border-cyan-300/35"
        >
          Open source
        </Link>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <SignalFact label="Found date" value={item.foundDate} />
        <SignalFact label="Verified date" value={item.verifiedDate} />
        <SignalFact label="Status" value={item.status} />
        <SignalFact label="Screenshot" value={item.screenshotUrl || "No screenshot attached"} />
        <SignalFact label="Buyer visible" value={item.buyerVisible ? "Yes" : "No"} />
        {isAdmin ? <SignalFact label="Admin notes" value={item.adminNotes || "No admin note attached"} /> : null}
      </div>
    </article>
  );
}

function SignalsTab({ signals }: { signals: LeadProfileSignalRecord[] }) {
  return (
    <TabShell eyebrow="Signals" title="Tagged evidence behind the profile" icon={<BarChart3 className="h-5 w-5" />}>
      <div className="grid gap-4">
        {signals.map((signal) => (
          <SignalRecordCard key={signal.id} signal={signal} />
        ))}
      </div>
    </TabShell>
  );
}

function SignalRecordCard({ signal }: { signal: LeadProfileSignalRecord }) {
  return (
    <article className="lead-panel p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">{signal.signalType}</p>
          <h3 className="mt-2 text-2xl font-black text-white">{signal.value}</h3>
          <p className="mt-2 text-sm leading-6 text-ink-200">{signal.explanation}</p>
        </div>
        <ConfidenceLabel level={signal.confidence} />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <SignalFact label="Tag" value={signal.tag} />
        <SignalFact label="Timestamp" value={signal.timestamp} />
        <SignalFact label="Source" value={signal.source} />
      </div>
    </article>
  );
}

function BuyerFitTab({ profile }: { profile: ProtectedLeadProfileDetail }) {
  const buyerFit = profile.buyerFitRecord;
  return (
    <TabShell eyebrow="Buyer fit" title="Who should buy this and why" icon={<UserCheck className="h-5 w-5" />}>
      <div className="grid gap-4 lg:grid-cols-2">
        <InfoBlock title="Best buyer types">
          <BulletList items={buyerFit.bestBuyerTypes} />
        </InfoBlock>
        <InfoBlock title="Matching industries">
          <BulletList items={buyerFit.matchingIndustries} />
        </InfoBlock>
        <InfoBlock title="Estimated value category">{buyerFit.estimatedValueCategory}</InfoBlock>
        <InfoBlock title="Urgency category">{buyerFit.urgencyCategory}</InfoBlock>
        <InfoBlock title="Suggested service or product fit">
          <BulletList items={buyerFit.suggestedServiceOrProductFit} />
        </InfoBlock>
        <InfoBlock title="Disqualifiers">
          <BulletList items={buyerFit.disqualifiers.length ? buyerFit.disqualifiers : ["No hard disqualifier flagged in the current review."]} />
        </InfoBlock>
        <InfoBlock title="Open questions">
          <BulletList items={buyerFit.openQuestions} />
        </InfoBlock>
      </div>
    </TabShell>
  );
}

function ComplianceTab({ profile }: { profile: ProtectedLeadProfileDetail }) {
  const compliance = profile.complianceRecord;
  return (
    <TabShell eyebrow="Compliance" title="Consent, suppression, and release controls" icon={<ShieldCheck className="h-5 w-5" />}>
      <div className="grid gap-4 lg:grid-cols-2">
        <SignalFact label="Consent status" value={compliance.consentStatus} />
        <SignalFact label="Suppression status" value={compliance.suppressionStatus} />
        <SignalFact label="Do-not-contact status" value={compliance.doNotContactStatus} />
        <SignalFact label="Source type" value={compliance.sourceType} />
        <SignalFact label="Review status" value={compliance.reviewStatus} />
        <SignalFact label="Export eligibility" value={compliance.exportEligibility} />
        <InfoBlock title="Allowed use">
          <BulletList items={compliance.allowedUse} />
        </InfoBlock>
        <InfoBlock title="Restricted use">
          <BulletList items={compliance.restrictedUse} />
        </InfoBlock>
        <InfoBlock title="Notes">
          <BulletList items={compliance.notes} />
        </InfoBlock>
      </div>
    </TabShell>
  );
}

function HistoryTab({ history }: { history: LeadProfileHistoryRecord[] }) {
  return (
    <TabShell eyebrow="History" title="Audit trail and review changes" icon={<History className="h-5 w-5" />}>
      <div className="grid gap-4">
        {history.map((entry) => (
          <HistoryRow key={entry.id} entry={entry} />
        ))}
      </div>
    </TabShell>
  );
}

function HistoryRow({ entry }: { entry: LeadProfileHistoryRecord }) {
  return (
    <article className="lead-panel p-5">
      <div className="grid gap-4 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-start">
        <p className="text-sm font-extrabold text-cyan-200">{entry.timestamp}</p>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{entry.eventType}</p>
          <h3 className="mt-2 text-xl font-black text-white">{entry.label}</h3>
          <p className="mt-2 text-sm leading-6 text-ink-200">{entry.detail}</p>
          <p className="mt-2 text-xs font-bold text-ink-400">Actor: {entry.actor}</p>
        </div>
        <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-extrabold text-ink-100">
          {entry.status}
        </span>
      </div>
    </article>
  );
}

function ActionPanel({
  profile,
  viewerRole,
  pendingAction,
  actionState,
  exportAllowed,
  onRunAction,
}: {
  profile: ProtectedLeadProfileDetail;
  viewerRole: ViewerRole;
  pendingAction: string | null;
  actionState: ActionState;
  exportAllowed: boolean;
  onRunAction: (action: string, eventName: string, label: string) => Promise<void>;
}) {
  const controls = viewerRole === "admin" ? adminControls : buyerControls;

  return (
    <SidePanel
      eyebrow={viewerRole === "admin" ? "Admin controls" : "Buyer controls"}
      title={viewerRole === "admin" ? "Review actions" : "Next moves"}
      icon={<Gauge className="h-5 w-5" />}
    >
      <div className="grid gap-2">
        {controls.map(({ label, action, icon: Icon, event }) => {
          const disabled = action === "export" && !exportAllowed;
          return (
            <button
              key={action}
              type="button"
              disabled={disabled || pendingAction === action}
              onClick={() => onRunAction(action, event, label)}
              className={cn(
                "inline-flex min-h-11 items-center justify-between gap-3 rounded-lg border px-3 text-left text-sm font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 disabled:cursor-not-allowed disabled:opacity-45",
                viewerRole === "admin" && "tone" in controls[0]
                  ? adminButtonClass((controls as typeof adminControls).find((item) => item.action === action)?.tone || "neutral")
                  : "border-white/10 bg-white/[0.035] text-ink-100 hover:border-cyan-300/35 hover:text-white",
              )}
            >
              <span className="inline-flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {pendingAction === action ? "Working..." : label}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          );
        })}
      </div>

      {actionState ? (
        <div
          className={cn(
            "mt-4 rounded-lg border p-3 text-sm font-bold leading-6",
            actionState.tone === "success" && "border-lead-300/30 bg-lead-300/10 text-lead-100",
            actionState.tone === "error" && "border-red-300/35 bg-red-400/10 text-red-100",
            actionState.tone === "info" && "border-cyan-300/30 bg-cyan-300/10 text-cyan-100",
          )}
        >
          {actionState.label}
        </div>
      ) : null}

      <p className="mt-4 text-xs leading-5 text-ink-400">
        {viewerRole === "admin"
          ? "Admin actions are audit logged. Profile updates persist when Supabase service credentials are connected."
          : `Full contact fields stay hidden unless the entitlement permits them. Current export state: ${exportAllowed ? "eligible for review" : "not export eligible"}.`}
      </p>
    </SidePanel>
  );
}

function adminButtonClass(tone: "success" | "danger" | "neutral") {
  if (tone === "success") return "border-lead-300/25 bg-lead-300/10 text-lead-100 hover:border-lead-300/45";
  if (tone === "danger") return "border-red-300/25 bg-red-400/10 text-red-100 hover:border-red-300/45";
  return "border-white/10 bg-white/[0.035] text-ink-100 hover:border-cyan-300/35 hover:text-white";
}

function SignalCockpit({ profile }: { profile: ProtectedLeadProfileDetail }) {
  const topSignals = profile.scoreBreakdown.slice(0, 3);

  return (
    <div className="mt-6 rounded-lg border border-white/10 bg-[#04070d]/90 p-4">
      <div className="relative min-h-52 overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(35,184,255,0.08),rgba(255,186,61,0.08),rgba(255,255,255,0.02))] p-4">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:28px_28px] opacity-50" />
        <div className="relative grid min-h-44 grid-cols-[1fr_auto_1fr] items-center gap-3">
          <SignalNode label="Source" value={profile.sourceType} tone="cyan" />
          <div className="grid gap-2">
            <span className="h-1 w-14 rounded-full bg-cyan-300/80 shadow-[0_0_24px_rgba(103,232,249,0.45)]" />
            <span className="h-1 w-14 rounded-full bg-accent-300/80 shadow-[0_0_24px_rgba(255,186,61,0.45)]" />
            <span className="h-1 w-14 rounded-full bg-lead-300/80 shadow-[0_0_24px_rgba(166,227,107,0.45)]" />
          </div>
          <SignalNode label="Buyer" value={profile.bestBuyerType} tone="accent" />
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {topSignals.map((signal) => (
          <div key={signal.key} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{signal.label}</p>
              <span className="text-sm font-black text-white">{signal.score}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-accent-300 to-lead-300"
                style={{ width: `${signal.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SignalNode({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "cyan" | "accent";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3 shadow-2xl backdrop-blur-xl",
        tone === "cyan"
          ? "border-cyan-300/25 bg-cyan-300/10 shadow-cyan-950/25"
          : "border-accent-300/25 bg-accent-300/10 shadow-accent-950/25",
      )}
    >
      <p className="text-[0.65rem] font-extrabold uppercase tracking-wider text-ink-300">{label}</p>
      <p className="mt-2 line-clamp-3 text-sm font-black leading-5 text-white">{value}</p>
    </div>
  );
}

function HeroFact({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-ink-400">
        <span className="text-cyan-300">{icon}</span>
        {label}
      </p>
      <p className="mt-2 text-sm font-bold leading-5 text-white">{value}</p>
    </div>
  );
}

function SignalFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-1 text-sm leading-6 text-ink-100">{value}</p>
    </div>
  );
}

function TabShell({
  eyebrow,
  title,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="lead-shell p-5 md:p-6">
      <div className="mb-6 flex items-start gap-4 border-b border-white/10 pb-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
          {icon}
        </div>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-black leading-tight text-white md:text-3xl">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function SidePanel({
  eyebrow,
  title,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="lead-shell p-5">
      <div className="mb-4 flex items-start gap-3 border-b border-white/10 pb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-accent-300/20 bg-accent-300/10 text-accent-200">
          {icon}
        </div>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-accent-300">{eyebrow}</p>
          <h2 className="mt-1 text-xl font-black text-white">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function InfoBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="lead-panel min-h-36 p-5">
      <h3 className="text-xl font-black text-white">{title}</h3>
      {typeof children === "string" ? (
        <p className="mt-3 text-sm leading-6 text-ink-200">{children}</p>
      ) : (
        <div className="mt-3">{children}</div>
      )}
    </article>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <div key={item} className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-ink-100">
          <Clock3 className="mt-1 h-4 w-4 shrink-0 text-cyan-300" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}
