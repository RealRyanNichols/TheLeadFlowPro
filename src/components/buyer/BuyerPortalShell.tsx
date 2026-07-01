import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookmarkCheck,
  CheckCircle2,
  ClipboardList,
  DatabaseZap,
  Download,
  Eye,
  FileCheck2,
  Globe2,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  MapPin,
  Settings,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { LeadScoreBadge } from "@/components/leadflow-system";
import {
  buyerCtaForPortal,
  type BuyerAccountStatus,
  type BuyerListingSummary,
  type BuyerPortalData,
  type BuyerRequest,
  type BuyerWatchlistItem,
} from "@/lib/buyer-portal";
import { cn } from "@/lib/utils";

type AuthenticatedBuyerPortal = Extract<BuyerPortalData, { authenticated: true }>;

const buyerNav = [
  { href: "/buyer", label: "Overview", icon: LayoutDashboard },
  { href: "/buyer/requests", label: "Requests", icon: ClipboardList },
  { href: "/buyer/watchlist", label: "Watchlist", icon: BookmarkCheck },
  { href: "/buyer/access", label: "Access", icon: DatabaseZap },
  { href: "/buyer/exports", label: "Exports", icon: Download },
  { href: "/buyer/settings", label: "Settings", icon: Settings },
];

const statusTone: Record<BuyerAccountStatus, string> = {
  pending_review: "border-accent-300/35 bg-accent-300/12 text-accent-100",
  approved_basic: "border-cyan-300/35 bg-cyan-300/12 text-cyan-100",
  approved_partner: "border-lead-300/35 bg-lead-300/12 text-lead-100",
  approved_premium: "border-fuchsia-300/35 bg-fuchsia-300/12 text-fuchsia-100",
  suspended: "border-red-300/35 bg-red-300/12 text-red-100",
  denied: "border-red-300/35 bg-red-300/12 text-red-100",
};

const statusLabel: Record<BuyerAccountStatus, string> = {
  pending_review: "Pending review",
  approved_basic: "Approved basic",
  approved_partner: "Approved partner",
  approved_premium: "Approved premium",
  suspended: "Suspended",
  denied: "Denied",
};

export function BuyerPortalShell({
  data,
  active,
  title,
  description,
  children,
}: {
  data: BuyerPortalData;
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
            "radial-gradient(circle at 12% 8%, rgba(35,184,255,0.20), transparent 32%), radial-gradient(circle at 88% 10%, rgba(255,154,31,0.15), transparent 30%), linear-gradient(135deg,#030711 0%,#070c18 54%,#101008 100%)",
        }}
      />
      <div className="relative">
        <BuyerPortalHeader />
        <section className="container py-8 md:py-10">
          {!data.authenticated ? (
            <BuyerLockedState reason={data.reason} />
          ) : (
            <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="lead-shell p-4 lg:sticky lg:top-24 lg:self-start">
                <BuyerIdentityCard data={data} />
                <nav className="mt-5 grid gap-2" aria-label="Buyer portal">
                  {buyerNav.map((item) => {
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
                <form action="/api/buyer/auth/logout" method="post" className="mt-4">
                  <button type="submit" className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm font-bold text-ink-300 hover:bg-white/[0.04] hover:text-white">
                    Log out
                  </button>
                </form>
              </aside>

              <div>
                <div className="lead-shell p-5 md:p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Buyer portal</p>
                      <h1 className="mt-2 text-3xl font-black tracking-normal text-white md:text-5xl">{title}</h1>
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-200 md:text-base md:leading-7">{description}</p>
                    </div>
                    <BuyerStatusBadge status={data.accountStatus} />
                  </div>
                </div>
                <div className="mt-5">{children}</div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function BuyerPortalHeader() {
  return (
    <header className="border-b border-white/10 bg-ink-950/78 backdrop-blur-xl">
      <div className="container flex min-h-16 items-center justify-between gap-3 py-3">
        <Link href="/" className="min-w-0 text-sm font-black tracking-tight text-white hover:text-cyan-300 sm:text-base">
          The LeadFlow Pro
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/marketplace" className="hidden rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-ink-200 hover:bg-white/[0.04] hover:text-white sm:inline-flex">
            Marketplace
          </Link>
          <Link href="/privacy-center" className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-300/15">
            Privacy controls
          </Link>
        </div>
      </div>
    </header>
  );
}

export function BuyerLockedState({ reason }: { reason: Extract<BuyerPortalData, { authenticated: false }>["reason"] }) {
  const missingConfig = reason === "missing_config";
  return (
    <section className="mx-auto max-w-4xl">
      <div className="lead-shell p-6 text-center md:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
          <LockKeyhole className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-3xl font-black text-white md:text-5xl">Buyer access is protected.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-ink-200 md:text-base md:leading-7">
          {missingConfig
            ? "Supabase Auth is not configured in this environment yet. The portal UI is ready, but login needs the Supabase URL and anon key."
            : "Log in before requesting samples, managing a watchlist, or viewing approved lead signal products. A login alone does not reveal full lead data."}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/login?mode=buyer&next=/buyer" className="btn-accent justify-center text-sm">
            Buyer login
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/marketplace" className="btn-ghost justify-center text-sm">
            Browse public previews
          </Link>
        </div>
      </div>
    </section>
  );
}

export function BuyerStatusBadge({ status }: { status: BuyerAccountStatus }) {
  return (
    <span className={cn("inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-extrabold uppercase tracking-wider", statusTone[status])}>
      {status === "suspended" || status === "denied" ? <AlertTriangle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
      {statusLabel[status]}
    </span>
  );
}

function BuyerIdentityCard({ data }: { data: AuthenticatedBuyerPortal }) {
  const account = data.account;
  return (
    <div>
      <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
        <UserRoundCheck className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-xl font-black text-white">{account?.name || data.user.email}</h2>
      <p className="mt-1 text-sm leading-6 text-ink-300">{account?.company_name || "Buyer profile not completed"}</p>
      <div className="mt-4 grid gap-2 text-xs leading-5 text-ink-300">
        <span className="inline-flex items-center gap-2">
          <Mail className="h-3.5 w-3.5 text-cyan-300" />
          {data.user.email}
        </span>
        {account?.website ? (
          <span className="inline-flex items-center gap-2">
            <Globe2 className="h-3.5 w-3.5 text-cyan-300" />
            {account.website}
          </span>
        ) : null}
        {account?.location_served ? (
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-cyan-300" />
            {account.location_served}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function BuyerDashboardView({ data }: { data: AuthenticatedBuyerPortal }) {
  const cta = buyerCtaForPortal(data);
  const account = data.account;
  return (
    <div className="grid gap-5">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="lead-shell p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-accent-300">Welcome card</p>
              <h2 className="mt-2 text-3xl font-black text-white">{account?.name || data.user.email}</h2>
              <p className="mt-2 text-sm leading-6 text-ink-200">
                {account?.company_name || "Complete the buyer profile so access requests can be reviewed without guessing your use case."}
              </p>
            </div>
            <Link href={cta.href} className="btn-accent justify-center text-sm">
              {cta.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Buyer type" value={account?.buyer_type || "Missing"} />
            <MetricCard label="Account status" value={statusLabel[data.accountStatus]} />
            <MetricCard label="Access level" value={data.accessLevel || "none"} />
            <MetricCard label="Consent status" value={account?.consent_status || "not requested"} />
          </div>
        </div>
        <div className="lead-shell p-5">
          <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Access status</p>
          <div className="mt-4">
            <BuyerStatusBadge status={data.accountStatus} />
          </div>
          <p className="mt-4 text-sm leading-6 text-ink-200">{statusDescription(data.accountStatus)}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={ClipboardList} label="Pending requests" value={String(data.pendingRequestCount)} href="/buyer/requests" />
        <MetricCard icon={BookmarkCheck} label="Watchlist count" value={String(data.watchlistCount)} href="/buyer/watchlist" />
        <MetricCard icon={DatabaseZap} label="Approved products" value={String(data.entitlements.length)} href="/buyer/access" />
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <PreviewPanel title="My Requests" href="/buyer/requests">
          <BuyerRequestList requests={data.requests.slice(0, 3)} compact />
        </PreviewPanel>
        <PreviewPanel title="My Watchlist" href="/buyer/watchlist">
          <BuyerWatchlistList items={data.watchlist.slice(0, 3)} compact />
        </PreviewPanel>
        <PreviewPanel title="Approved Access" href="/buyer/access">
          <BuyerAccessList listings={data.approvedListings.slice(0, 3)} compact />
        </PreviewPanel>
      </section>
    </div>
  );
}

export function BuyerRequestsView({ data }: { data: AuthenticatedBuyerPortal }) {
  return (
    <section className="lead-shell p-5 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">My Requests</p>
          <h2 className="mt-2 text-3xl font-black text-white">Review queue for sample and access requests.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-200">
            Requests stay gated until the buyer use case, proof status, suppression status, and release mode are checked.
          </p>
        </div>
        <Link href="/marketplace" className="btn-accent justify-center text-sm">
          Browse Marketplace
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-6">
        <BuyerRequestList requests={data.requests} />
      </div>
    </section>
  );
}

export function BuyerWatchlistView({ data }: { data: AuthenticatedBuyerPortal }) {
  return (
    <section className="lead-shell p-5 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">My Watchlist</p>
          <h2 className="mt-2 text-3xl font-black text-white">Listings saved for buyer review.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-200">
            Watchlist items are notes for your account. They do not create access until a request is reviewed and approved.
          </p>
        </div>
        <Link href="/marketplace" className="btn-ghost justify-center text-sm">
          Add more signals
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-6">
        <BuyerWatchlistList items={data.watchlist} />
      </div>
    </section>
  );
}

export function BuyerAccessView({ data }: { data: AuthenticatedBuyerPortal }) {
  const restricted = data.accountStatus === "suspended" || data.accountStatus === "denied";
  return (
    <section className="lead-shell p-5 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Approved Access</p>
          <h2 className="mt-2 text-3xl font-black text-white">Lead signal products this buyer can access.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-200">
            This view only shows entitlement-backed summaries. Full raw records require a tighter entitlement and server-side access check.
          </p>
        </div>
        <BuyerStatusBadge status={data.accountStatus} />
      </div>
      {restricted ? (
        <div className="mt-6 rounded-lg border border-red-300/35 bg-red-300/10 p-4 text-sm leading-6 text-red-100">
          This buyer account cannot view restricted lead signal products while it is {statusLabel[data.accountStatus].toLowerCase()}.
        </div>
      ) : null}
      <div className="mt-6">
        <BuyerAccessList listings={data.approvedListings} />
      </div>
    </section>
  );
}

export function BuyerSettingsSummary({ data }: { data: AuthenticatedBuyerPortal }) {
  const account = data.account;
  return (
    <section className="lead-shell p-5">
      <p className="text-xs font-extrabold uppercase tracking-wider text-accent-300">Account Settings</p>
      <h2 className="mt-2 text-2xl font-black text-white">Buyer profile fields used for review.</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <SignalField label="Name" value={account?.name} />
        <SignalField label="Email" value={account?.email || data.user.email} />
        <SignalField label="Company" value={account?.company_name} />
        <SignalField label="Buyer type" value={account?.buyer_type} />
        <SignalField label="Industry" value={account?.industry} />
        <SignalField label="Location served" value={account?.location_served} />
        <SignalField label="Budget range" value={account?.budget_range} />
        <SignalField label="Communication" value={account?.communication_preference} />
      </div>
    </section>
  );
}

function BuyerRequestList({ requests, compact = false }: { requests: BuyerRequest[]; compact?: boolean }) {
  if (requests.length === 0) return <EmptyState title="No buyer requests yet." body="Open the marketplace and request a sample or access review." href="/marketplace" cta="Browse Marketplace" />;
  return (
    <div className={compact ? "grid gap-3" : "grid gap-4"}>
      {requests.map((request) => (
        <article key={request.id} className="rounded-lg border border-white/10 bg-ink-950/55 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{request.request_type}</p>
              <h3 className="mt-1 text-lg font-black text-white">{request.listing_slug ? titleFromSlug(request.listing_slug) : "Custom buyer request"}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-300">{request.intended_use || request.message || "Reviewing intended use and buyer fit."}</p>
            </div>
            <RequestStatus status={request.status} />
          </div>
          {!compact ? (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <SignalField label="Date requested" value={formatDate(request.created_at)} />
              <SignalField label="Budget" value={request.budget_range} />
              <SignalField label="Next action" value={nextActionForRequest(request.status)} />
            </div>
          ) : null}
          {request.admin_notes_visible && request.admin_notes ? (
            <div className="mt-4 rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm leading-6 text-cyan-100">
              {request.admin_notes}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function BuyerWatchlistList({ items, compact = false }: { items: BuyerWatchlistItem[]; compact?: boolean }) {
  if (items.length === 0) return <EmptyState title="No watchlist items yet." body="Save listings that look useful, then request access when the use case is clear." href="/marketplace" cta="Find signal products" />;
  return (
    <div className={compact ? "grid gap-3" : "grid gap-4 md:grid-cols-2"}>
      {items.map((item) => (
        <article key={item.id} className="rounded-lg border border-white/10 bg-ink-950/55 p-4">
          <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">{item.category}</p>
          <h3 className="mt-2 text-lg font-black text-white">{item.title}</h3>
          <p className="mt-2 text-sm text-ink-300">Saved {formatDate(item.created_at)}</p>
          {!compact ? (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link href={`/lead-profile/${item.listing_slug}`} className="btn-ghost justify-center text-sm">
                Preview Profile
              </Link>
              <Link href="/marketplace" className="btn-accent justify-center text-sm">
                Request Access
              </Link>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function BuyerAccessList({ listings, compact = false }: { listings: BuyerListingSummary[]; compact?: boolean }) {
  if (listings.length === 0) return <EmptyState title="No approved access yet." body="Complete your buyer profile and request access from the marketplace. Approved products will show here." href="/marketplace" cta="Browse Marketplace" />;
  return (
    <div className={compact ? "grid gap-3" : "grid gap-4 xl:grid-cols-2"}>
      {listings.map((listing) => (
        <article key={listing.slug} className="rounded-lg border border-white/10 bg-ink-950/55 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">{listing.category}</p>
              <h3 className="mt-2 text-xl font-black text-white">{listing.title}</h3>
            </div>
            <LeadScoreBadge score={listing.score} className="min-w-[4.75rem]" />
          </div>
          <p className="mt-3 text-sm leading-6 text-ink-200">{listing.summary}</p>
          {!compact ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <SignalField label="Vertical" value={listing.vertical} />
              <SignalField label="Confidence" value={listing.confidence} />
              <SignalField label="Source type" value={listing.sourceType} />
              <SignalField label="Release mode" value={listing.releaseMode} />
            </div>
          ) : null}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link href={`/lead-profile/${listing.slug}`} className="btn-ghost justify-center text-sm">
              <Eye className="h-4 w-4" />
              View summary
            </Link>
            <Link href="/privacy-center" className="btn-ghost justify-center text-sm">
              Access rules
            </Link>
          </div>
        </article>
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
      <p className="mt-3 text-2xl font-black text-white">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

function SignalField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-white">{value || "Missing"}</p>
    </div>
  );
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

function RequestStatus({ status }: { status: string }) {
  const approved = status === "approved" || status === "fulfilled";
  const blocked = status === "denied" || status === "rejected" || status === "cancelled";
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-lg border px-2.5 text-xs font-extrabold uppercase tracking-wider",
        approved
          ? "border-lead-300/35 bg-lead-300/12 text-lead-100"
          : blocked
            ? "border-red-300/35 bg-red-300/12 text-red-100"
            : "border-accent-300/35 bg-accent-300/12 text-accent-100",
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function statusDescription(status: BuyerAccountStatus) {
  switch (status) {
    case "approved_basic":
      return "Basic buyer review is approved. You can request samples and approved lower-risk access.";
    case "approved_partner":
      return "Partner-level access is approved for named signal products and reviewed use cases.";
    case "approved_premium":
      return "Premium access is approved. High-sensitivity exports still require listing-specific entitlement.";
    case "suspended":
      return "This account is suspended. Restricted data, requests, and exports are blocked.";
    case "denied":
      return "This buyer account was denied. Admin reset is required before new access requests.";
    default:
      return "Profile and intended use are being reviewed before restricted data access is released.";
  }
}

function nextActionForRequest(status: string) {
  if (status === "approved") return "Wait for entitlement or checkout instructions.";
  if (status === "fulfilled") return "Open approved access.";
  if (status === "denied" || status === "rejected") return "Admin reset required before requesting again.";
  if (status === "cancelled") return "Request a new review if this listing still matters.";
  return "Wait for review or complete your buyer profile.";
}

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}
