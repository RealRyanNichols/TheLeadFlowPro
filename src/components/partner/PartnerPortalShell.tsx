import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  ClipboardList,
  DatabaseZap,
  FileCheck2,
  Handshake,
  LayoutDashboard,
  LockKeyhole,
  Settings,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import {
  partnerAccountIsRestricted,
  partnerCtaForPortal,
  partnerStatusLabel,
  partnerTypeLabel,
  type PartnerAccount,
  type PartnerPortalData,
  type PartnerSource,
} from "@/lib/partner-portal";
import { cn } from "@/lib/utils";

type AuthenticatedPartnerPortal = Extract<PartnerPortalData, { authenticated: true }>;

const partnerNav = [
  { href: "/partner", label: "Overview", icon: LayoutDashboard },
  { href: "/partner/sources", label: "Sources", icon: DatabaseZap },
  { href: "/partner/submissions", label: "Submissions", icon: UploadCloud },
  { href: "/partner/earnings", label: "Earnings", icon: BadgeDollarSign },
  { href: "/partner/settings", label: "Settings", icon: Settings },
];

const statusTone: Record<string, string> = {
  pending_review: "border-accent-300/35 bg-accent-300/12 text-accent-100",
  approved: "border-lead-300/35 bg-lead-300/12 text-lead-100",
  restricted: "border-amber-300/35 bg-amber-300/12 text-amber-100",
  suspended: "border-red-300/35 bg-red-300/12 text-red-100",
  denied: "border-red-300/35 bg-red-300/12 text-red-100",
};

export function PartnerPortalShell({
  data,
  active,
  title,
  description,
  children,
}: {
  data: PartnerPortalData;
  active: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen overflow-hidden bg-ink-950 text-white">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(circle at 12% 10%, rgba(45,212,191,0.18), transparent 32%), radial-gradient(circle at 86% 12%, rgba(255,154,31,0.15), transparent 30%), linear-gradient(135deg,#020617 0%,#07111f 52%,#101008 100%)",
        }}
      />
      <div className="relative">
        <PartnerPortalHeader />
        <section className="container py-8 md:py-10">
          {!data.authenticated ? (
            <PartnerLockedState reason={data.reason} />
          ) : (
            <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="lead-shell p-4 lg:sticky lg:top-24 lg:self-start">
                <PartnerIdentityCard data={data} />
                <nav className="mt-5 grid gap-2" aria-label="Partner portal">
                  {partnerNav.map((item) => {
                    const Icon = item.icon;
                    const selected = active === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex min-h-11 items-center gap-3 rounded-lg border px-3 text-sm font-bold transition",
                          selected
                            ? "border-cyan-300/40 bg-cyan-300/12 text-white"
                            : "border-white/10 bg-white/[0.035] text-ink-200 hover:border-cyan-300/30 hover:text-white",
                        )}
                      >
                        <Icon className="h-4 w-4 text-cyan-300" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
                <form action="/api/partner/auth/logout" method="post" className="mt-4">
                  <button type="submit" className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm font-bold text-ink-300 hover:bg-white/[0.04] hover:text-white">
                    Log out
                  </button>
                </form>
              </aside>

              <div>
                <div className="lead-shell p-5 md:p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Partner portal</p>
                      <h1 className="mt-2 text-3xl font-black tracking-normal text-white md:text-5xl">{title}</h1>
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-200 md:text-base md:leading-7">{description}</p>
                    </div>
                    <PartnerStatusBadge status={data.status} />
                  </div>
                </div>
                {data.loadErrors.length ? (
                  <div className="mt-5 rounded-lg border border-amber-300/25 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
                    {data.loadErrors[0]}
                  </div>
                ) : null}
                <div className="mt-5">{children}</div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function PartnerPortalHeader() {
  return (
    <header className="border-b border-white/10 bg-ink-950/78 backdrop-blur-xl">
      <div className="container flex min-h-16 items-center justify-between gap-3 py-3">
        <Link href="/" className="min-w-0 text-sm font-black tracking-tight text-white hover:text-cyan-300 sm:text-base">
          The LeadFlow Pro
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/submit-source" className="hidden rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-ink-200 hover:bg-white/[0.04] hover:text-white sm:inline-flex">
            Submit source
          </Link>
          <Link href="/privacy-center" className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-300/15">
            Partner rules
          </Link>
        </div>
      </div>
    </header>
  );
}

export function PartnerLockedState({ reason }: { reason: Extract<PartnerPortalData, { authenticated: false }>["reason"] }) {
  const missingConfig = reason === "missing_config";
  return (
    <section className="mx-auto max-w-4xl">
      <div className="lead-shell p-6 text-center md:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
          <LockKeyhole className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-3xl font-black text-white md:text-5xl">Partner access is protected.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-ink-200 md:text-base md:leading-7">
          {missingConfig
            ? "Supabase Auth is not configured in this environment yet. The partner portal UI is ready, but login needs Supabase URL and anon key."
            : "Log in before tracking sources, review status, marketplace interest, or earnings. A source does not become sellable just because it is submitted."}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/partner/login?next=/partner" className="btn-accent justify-center text-sm">
            Partner login
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/submit-source" className="btn-ghost justify-center text-sm">
            Public source intake
          </Link>
        </div>
      </div>
    </section>
  );
}

export function PartnerStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-extrabold uppercase tracking-wider", statusTone[status] || statusTone.pending_review)}>
      {status === "suspended" || status === "denied" ? <AlertTriangle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
      {partnerStatusLabel(status as never)}
    </span>
  );
}

function PartnerIdentityCard({ data }: { data: AuthenticatedPartnerPortal }) {
  const account = data.account;
  return (
    <div>
      <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
        <Handshake className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-xl font-black text-white">{account?.name || data.user.email}</h2>
      <p className="mt-1 text-sm leading-6 text-ink-300">{account?.company || "Partner profile not completed"}</p>
      <div className="mt-4 grid gap-2 text-xs leading-5 text-ink-300">
        <span>{account?.email || data.user.email}</span>
        <span className="capitalize">{account ? partnerTypeLabel(account.partner_type) : "source contributor"}</span>
        <span>{account?.payout_preference || "Payout not set"}</span>
      </div>
    </div>
  );
}

export function PartnerDashboardView({ data }: { data: AuthenticatedPartnerPortal }) {
  const account = data.account;
  const cta = partnerCtaForPortal(data);
  const restricted = partnerAccountIsRestricted(account);
  return (
    <div className="grid gap-5">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="lead-shell p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-accent-300">Partner status</p>
              <h2 className="mt-2 text-3xl font-black text-white">{account?.name || data.user.email}</h2>
              <p className="mt-2 text-sm leading-6 text-ink-200">
                Your source does not become sellable just because you submit it. Every source is reviewed for proof, permission, risk, suppression, and buyer use case.
              </p>
            </div>
            <Link href={cta.href} className="btn-accent justify-center text-sm">
              {cta.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Partner type" value={account ? partnerTypeLabel(account.partner_type) : "Missing"} />
            <MetricCard label="Account status" value={partnerStatusLabel(data.status)} />
            <MetricCard label="Sources" value={String(data.sourceCount)} />
            <MetricCard label="Buyer interest" value={String(data.buyerInterestCount)} />
          </div>
        </div>
        <CompliancePanel />
      </section>

      {restricted ? (
        <div className="rounded-lg border border-red-300/35 bg-red-300/10 p-4 text-sm leading-6 text-red-100">
          This partner account is {partnerStatusLabel(data.status)}. Restricted source status, earnings, and marketplace visibility are blocked until admin review changes the status.
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={UploadCloud} label="Submitted sources" value={String(data.sourceCount)} href="/partner/sources" />
        <MetricCard icon={FileCheck2} label="Marketplace links" value={String(data.marketplaceCount)} href="/partner/submissions" />
        <MetricCard icon={ClipboardList} label="Buyer interest" value={String(data.buyerInterestCount)} href="/partner/sources" />
        <MetricCard icon={BadgeDollarSign} label="Estimated earnings" value={money(data.earningsSummary.totalEstimated)} href="/partner/earnings" />
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <PreviewPanel title="Submitted Sources" href="/partner/sources">
          <PartnerSourceList sources={data.sources.slice(0, 3)} compact />
        </PreviewPanel>
        <PreviewPanel title="Required Next Steps" href="/partner/settings">
          <NextSteps account={account} sourceCount={data.sourceCount} />
        </PreviewPanel>
        <PreviewPanel title="Earnings Estimate" href="/partner/earnings">
          <div className="grid gap-3">
            <SignalField label="Estimated" value={money(data.earningsSummary.totalEstimated)} />
            <SignalField label="Approved" value={money(data.earningsSummary.approved)} />
            <SignalField label="Paid" value={money(data.earningsSummary.paid)} />
          </div>
        </PreviewPanel>
      </section>
    </div>
  );
}

export function PartnerSourcesView({ data }: { data: AuthenticatedPartnerPortal }) {
  return (
    <section className="lead-shell p-5 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Partner sources</p>
          <h2 className="mt-2 text-3xl font-black text-white">Source records under review.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-200">
            Track source name, type, review result, risk level, marketplace status, buyer interest, and visible admin notes.
          </p>
        </div>
        <Link href="/submit-source" className="btn-accent justify-center text-sm">
          Submit another source
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-6">
        <PartnerSourceList sources={data.sources} />
      </div>
    </section>
  );
}

export function PartnerSubmissionsView({ data }: { data: AuthenticatedPartnerPortal }) {
  return (
    <section className="lead-shell p-5 md:p-6">
      <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Source review status</p>
      <h2 className="mt-2 text-3xl font-black text-white">What happened after submission.</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {data.submissions.length ? data.submissions.map((source) => <SubmissionCard key={source.id} source={source} />) : <EmptyState title="No source submissions linked yet." body="Submit a source with the same partner email or ask admin to connect existing source records." href="/submit-source" cta="Start Source Submission" />}
      </div>
    </section>
  );
}

export function PartnerEarningsView({ data }: { data: AuthenticatedPartnerPortal }) {
  return (
    <div className="grid gap-5">
      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Estimated" value={money(data.earningsSummary.totalEstimated)} />
        <MetricCard label="Approved" value={money(data.earningsSummary.approved)} />
        <MetricCard label="Pending" value={money(data.earningsSummary.pending)} />
        <MetricCard label="Paid" value={money(data.earningsSummary.paid)} />
        <MetricCard label="Source based" value={money(data.earningsSummary.sourceBased)} />
        <MetricCard label="Referral" value={money(data.earningsSummary.referral)} />
      </section>

      <section className="lead-shell p-5 md:p-6">
        <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Partner earnings</p>
        <h2 className="mt-2 text-3xl font-black text-white">Review-gated earnings, not a guaranteed payout.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-200">
          Earnings are estimates until admin approves them. Not every source becomes a paid product, sale, referral commission, or listing share.
        </p>
        <div className="mt-6 grid gap-4">
          {data.earnings.length ? data.earnings.map((earning) => (
            <article key={earning.id} className="rounded-lg border border-white/10 bg-ink-950/55 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{earning.earning_type.replace(/_/g, " ")}</p>
                  <h3 className="mt-1 text-xl font-black text-white">{money(earning.amount)}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-300">{earning.calculation_note || "Awaiting calculation note."}</p>
                </div>
                <StatusBadge value={earning.status} />
              </div>
            </article>
          )) : <EmptyState title="No earnings yet." body="Approved source products and buyer activity can create review-gated earnings later." href="/partner/sources" cta="Review Sources" />}
        </div>
      </section>
    </div>
  );
}

export function PartnerSettingsSummary({ account }: { account: PartnerAccount | null }) {
  return (
    <section className="lead-shell p-5">
      <p className="text-xs font-extrabold uppercase tracking-wider text-accent-300">Partner settings</p>
      <h2 className="mt-2 text-2xl font-black text-white">Review fields.</h2>
      <div className="mt-5 grid gap-3">
        <SignalField label="Partner type" value={account ? partnerTypeLabel(account.partner_type) : "Missing"} />
        <SignalField label="Company" value={account?.company || "Missing"} />
        <SignalField label="Website" value={account?.website || "Missing"} />
        <SignalField label="Payout" value={account?.payout_preference || "Missing"} />
      </div>
    </section>
  );
}

function CompliancePanel() {
  return (
    <div className="lead-shell p-5">
      <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Compliance notes</p>
      <div className="mt-4 grid gap-3 text-sm leading-6 text-ink-200">
        <CheckLine>Partners cannot upload hacked, leaked, login-only, minors, private medical, private financial, protected-trait, sensitive individual political, or unclear-permission data.</CheckLine>
        <CheckLine>Every source is review-gated before marketplace use.</CheckLine>
        <CheckLine>No revenue share is guaranteed.</CheckLine>
      </div>
    </div>
  );
}

function CheckLine({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-cyan-300" />
      <span>{children}</span>
    </div>
  );
}

function PartnerSourceList({ sources, compact = false }: { sources: PartnerSource[]; compact?: boolean }) {
  if (sources.length === 0) return <EmptyState title="No partner sources yet." body="Submit a source, list, route, audience, directory, or niche signal so it can enter review." href="/submit-source" cta="Submit Source" />;
  return (
    <div className={compact ? "grid gap-3" : "grid gap-4"}>
      {sources.map((source) => (
        <article key={source.id} className="rounded-lg border border-white/10 bg-ink-950/55 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge value={source.source_status} />
                <RiskBadge value={source.risk_level} />
                <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-bold text-ink-200">{source.source_type.replace(/_/g, " ")}</span>
              </div>
              <h3 className="mt-3 text-xl font-black text-white">{source.source_name}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-300">{source.review_result || "Awaiting source review result."}</p>
            </div>
            <div className="grid min-w-44 gap-2">
              <MiniStat label="Buyer interest" value={String(source.buyer_requests_generated)} />
              <MiniStat label="Estimate" value={money(source.estimated_earnings)} />
            </div>
          </div>
          {!compact ? (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <SignalField label="Marketplace status" value={source.marketplace_status.replace(/_/g, " ")} />
              <SignalField label="Review result" value={source.review_result || "Pending"} />
              <SignalField label="Visible admin note" value={source.partner_visible_admin_notes || "None"} />
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function SubmissionCard({ source }: { source: PartnerSource }) {
  return (
    <article className="rounded-lg border border-white/10 bg-ink-950/55 p-4">
      <StatusBadge value={source.source_status} />
      <h3 className="mt-3 text-xl font-black text-white">{source.source_name}</h3>
      <div className="mt-4 grid gap-3">
        <SignalField label="Review result" value={source.review_result || "Pending"} />
        <SignalField label="Risk level" value={source.risk_level} />
        <SignalField label="Marketplace status" value={source.marketplace_status.replace(/_/g, " ")} />
        <SignalField label="Admin note" value={source.partner_visible_admin_notes || "No partner-visible note yet"} />
      </div>
    </article>
  );
}

function NextSteps({ account, sourceCount }: { account: PartnerAccount | null; sourceCount: number }) {
  const steps = [
    { label: "Complete partner profile", done: Boolean(account?.name && account.email && account.company) },
    { label: "Confirm data rights and prohibited-data rules", done: Boolean(account?.compliance_confirmations?.rights_to_submit && account.compliance_confirmations?.no_prohibited_data) },
    { label: "Submit or connect first source", done: sourceCount > 0 },
    { label: "Wait for admin review before marketplace release", done: account?.status === "approved" },
  ];
  return (
    <div className="grid gap-2">
      {steps.map((step) => (
        <div key={step.label} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm text-ink-100">
          <CheckCircle2 className={cn("h-4 w-4", step.done ? "text-lead-300" : "text-ink-500")} />
          {step.label}
        </div>
      ))}
    </div>
  );
}

function PreviewPanel({ title, href, children }: { title: string; href: string; children: ReactNode }) {
  return (
    <section className="lead-shell p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-black text-white">{title}</h2>
        <Link href={href} className="text-xs font-extrabold uppercase tracking-wider text-cyan-300 hover:text-cyan-100">
          Open
        </Link>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  href,
  icon: Icon = FileCheck2,
}: {
  label: string;
  value: string;
  href?: string;
  icon?: typeof FileCheck2;
}) {
  const card = (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
        <Icon className="h-4 w-4 text-cyan-300" />
      </div>
      <p className="mt-3 text-2xl font-black capitalize text-white">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function SignalField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-1 text-sm font-bold capitalize text-white">{value || "Missing"}</p>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const tone =
    /approved|available|active|paid/.test(value)
      ? "border-lead-300/35 bg-lead-300/12 text-lead-100"
      : /reject|denied|suppress|prohibited|void|dispute/.test(value)
        ? "border-red-300/35 bg-red-300/12 text-red-100"
        : "border-accent-300/35 bg-accent-300/12 text-accent-100";
  return <span className={cn("inline-flex min-h-8 items-center rounded-md border px-2.5 text-xs font-extrabold capitalize", tone)}>{value.replace(/_/g, " ")}</span>;
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
  return <span className={cn("inline-flex min-h-8 items-center rounded-md border px-2.5 text-xs font-extrabold capitalize", tone)}>{value}</span>;
}

function EmptyState({ title, body, href, cta }: { title: string; body: string; href: string; cta: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5 text-center">
      <CheckCircle2 className="mx-auto h-6 w-6 text-cyan-300" />
      <h3 className="mt-3 text-lg font-black text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-300">{body}</p>
      <Link href={href} className="btn-ghost mx-auto mt-4 justify-center text-sm">
        {cta}
      </Link>
    </div>
  );
}

function money(value: number | string | null | undefined) {
  const numeric = typeof value === "number" ? value : Number(value || 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number.isFinite(numeric) ? numeric : 0);
}
