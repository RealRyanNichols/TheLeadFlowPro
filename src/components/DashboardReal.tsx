// src/components/DashboardReal.tsx
//
// The authed /dashboard home for a logged-in user with a completed Brain
// profile. Every number here is REAL or ZERO. Empty states show clear
// "Connect"/"Import"/"Create" CTAs — no fake filler, per the project's
// no-fake-stats rule.
//
// This is NOT the mortgage pipeline dashboard (that's /dashboard/mortgage).
// This is the account-wide home tile — counts across all verticals, a welcome
// block, and shortcuts into whichever modules the user has unlocked.

import Link from "next/link";

type UserSummary = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  mortgageOriginator: boolean;
  loNmlsId: string | null;
  loStateLicenses: string[];
  brainCompleteness: number;
  brainNiche: string | null;
  brainOffer: string | null;
  brainAudience: string | null;
  createdAt: string;
};

type Counts = {
  leads: number;
  mortgageLeads: number;
  adCopies: number;
  socialAccounts: number;
  unreadInsights: number;
  activeAutomations: number;
};

export default function DashboardReal({
  user,
  counts,
}: {
  user: UserSummary;
  counts: Counts;
}) {
  const firstName = user.name?.split(" ")[0] || user.email.split("@")[0];
  const isMortgageLO = user.mortgageOriginator && !!user.loNmlsId;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-slate-500">
              Dashboard
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Welcome back, {firstName}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Every number below is pulled from your real account — if it says 0, it is 0.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/profile"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 text-sm font-medium hover:bg-slate-50"
            >
              Profile
            </Link>
          </div>
        </div>
      </header>

      {/* ── Brain profile summary ────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              Your Brain profile
            </h2>
            <span className="text-xs text-slate-500">
              {user.brainCompleteness}% complete
            </span>
          </div>
          <dl className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-500">Niche</dt>
              <dd className="mt-0.5 text-slate-900">{user.brainNiche || <EmptyInline />}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-500">Offer</dt>
              <dd className="mt-0.5 text-slate-900">{user.brainOffer || <EmptyInline />}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-500">Audience</dt>
              <dd className="mt-0.5 text-slate-900">{user.brainAudience || <EmptyInline />}</dd>
            </div>
          </dl>
          <div className="mt-4 flex items-center gap-3">
            <Link
              href="/onboarding"
              className="text-sm text-blue-700 hover:underline"
            >
              Refine Brain profile →
            </Link>
            <Link
              href="/dashboard/impact"
              className="text-sm text-blue-700 hover:underline"
            >
              See your impact →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Tiles (real counts, empty states) ─────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricTile
          label="Leads"
          value={counts.leads}
          ctaLabel={counts.leads === 0 ? "Add your first lead" : "View leads"}
          ctaHref={counts.leads === 0 ? "/dashboard/leads/new" : "/dashboard/leads"}
        />
        <MetricTile
          label="Mortgage leads"
          value={counts.mortgageLeads}
          ctaLabel={
            counts.mortgageLeads === 0
              ? isMortgageLO
                ? "Open Flo Inbox"
                : "Unlock Mortgage OS"
              : "Open Mortgage OS"
          }
          ctaHref={
            counts.mortgageLeads === 0
              ? isMortgageLO
                ? "/dashboard/mortgage"
                : "/solutions/mortgage"
              : "/dashboard/mortgage"
          }
          hidden={!isMortgageLO && counts.mortgageLeads === 0 ? false : false}
        />
        <MetricTile
          label="Ad copies drafted"
          value={counts.adCopies}
          ctaLabel={counts.adCopies === 0 ? "Draft your first ad" : "Open Ad Studio"}
          ctaHref="/dashboard/brain/adcopy"
        />
        <MetricTile
          label="Social accounts connected"
          value={counts.socialAccounts}
          ctaLabel={counts.socialAccounts === 0 ? "Connect an account" : "Manage accounts"}
          ctaHref="/dashboard/brain/social"
        />
        <MetricTile
          label="Unread insights"
          value={counts.unreadInsights}
          ctaLabel={counts.unreadInsights === 0 ? "Open Brain" : "Read insights"}
          ctaHref="/dashboard/brain"
        />
        <MetricTile
          label="Active automations"
          value={counts.activeAutomations}
          ctaLabel={counts.activeAutomations === 0 ? "Browse automations" : "Manage automations"}
          ctaHref="/dashboard/brain/automations"
        />
      </section>

      {/* ── Mortgage LO shortcut (only shows when they've opted in) ─── */}
      {isMortgageLO ? (
        <section className="mx-auto max-w-6xl px-4 py-8">
          <div className="rounded-2xl bg-slate-900 text-white p-6 ring-1 ring-slate-800 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-emerald-300">
                  Mortgage OS is enabled for you
                </div>
                <h3 className="mt-1 text-xl font-semibold">
                  NMLS #{user.loNmlsId}
                  {user.loStateLicenses.length > 0 ? (
                    <span className="ml-2 text-slate-300 text-sm">
                      · licensed {user.loStateLicenses.join(", ")}
                    </span>
                  ) : null}
                </h3>
                <p className="mt-1 text-sm text-slate-300">
                  Jump into Flo Inbox, pipeline, doc chaser, compliance log, or the rate-watch queue.
                </p>
              </div>
              <Link
                href="/dashboard/mortgage"
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold hover:bg-emerald-400"
              >
                Open Flo Inbox →
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-6xl px-4 py-8">
          <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-blue-700">
                  New: Mortgage OS
                </div>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">
                  Are you a mortgage originator?
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Unlock the Flo Inbox, compliant first-touch auto-reply, and the Mortgage pipeline for independent LOs doing 3–40 loans/mo.
                </p>
              </div>
              <Link
                href="/solutions/mortgage"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                See Mortgage OS →
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function MetricTile({
  label,
  value,
  ctaLabel,
  ctaHref,
  hidden,
}: {
  label: string;
  value: number;
  ctaLabel: string;
  ctaHref: string;
  hidden?: boolean;
}) {
  if (hidden) return null;
  const isZero = value === 0;
  return (
    <div
      className={`rounded-2xl p-5 ring-1 shadow-sm ${
        isZero ? "bg-slate-50 ring-slate-200" : "bg-white ring-slate-200"
      }`}
    >
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold text-slate-900">{value}</div>
      <div className="mt-3">
        <Link
          href={ctaHref}
          className={`inline-flex items-center gap-1 text-sm font-medium ${
            isZero ? "text-blue-700 hover:underline" : "text-slate-700 hover:underline"
          }`}
        >
          {ctaLabel} →
        </Link>
      </div>
    </div>
  );
}

function EmptyInline() {
  return (
    <span className="text-slate-400 italic">— not set yet</span>
  );
}
