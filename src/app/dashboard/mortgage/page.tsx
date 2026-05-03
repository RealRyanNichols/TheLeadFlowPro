// src/app/dashboard/mortgage/page.tsx
// LO's Flo Inbox + pipeline view. Server component that fetches real data for
// the signed-in LO. No fake stats — empty buckets render empty-state CTAs.
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  Inbox, FileWarning, ShieldCheck, TrendingUp, Users, Sparkles,
  AlertTriangle, CheckCircle2, Phone, Mail, ArrowRight,
} from "lucide-react";
import { VERTICALS, MortgagePlanSlug } from "@/lib/mortgage";

export const dynamic = "force-dynamic";

const STAGES = [
  { key: "new",            label: "New",             tone: "cyan" },
  { key: "contacted",      label: "Contacted",       tone: "sky" },
  { key: "qualified",      label: "Qualified",       tone: "emerald" },
  { key: "application",    label: "Application",     tone: "violet" },
  { key: "processing",     label: "Processing",      tone: "amber" },
  { key: "underwriting",   label: "Underwriting",    tone: "orange" },
  { key: "approved",       label: "Approved",        tone: "teal" },
  { key: "clear_to_close", label: "Clear to Close",  tone: "lime" },
  { key: "closed",         label: "Closed",          tone: "emerald" },
] as const;

function toneClasses(t: string): string {
  const map: Record<string, string> = {
    cyan: "border-cyan-400/30 bg-cyan-500/10 text-cyan-200",
    sky: "border-sky-400/30 bg-sky-500/10 text-sky-200",
    emerald: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
    violet: "border-violet-400/30 bg-violet-500/10 text-violet-200",
    amber: "border-amber-400/30 bg-amber-500/10 text-amber-200",
    orange: "border-orange-400/30 bg-orange-500/10 text-orange-200",
    teal: "border-teal-400/30 bg-teal-500/10 text-teal-200",
    lime: "border-lime-400/30 bg-lime-500/10 text-lime-200",
  };
  return map[t] ?? "border-white/10 bg-white/[0.03] text-ink-200";
}

function gradePill(g: string | null) {
  if (!g) return "border-white/10 bg-white/[0.03] text-ink-300";
  return {
    A: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
    B: "border-cyan-400/40 bg-cyan-500/10 text-cyan-200",
    C: "border-amber-400/40 bg-amber-500/10 text-amber-200",
    D: "border-rose-400/40 bg-rose-500/10 text-rose-200",
  }[g] ?? "border-white/10 bg-white/[0.03] text-ink-300";
}

export default async function MortgageDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?next=/dashboard/mortgage");

  const userId = (session.user as any).id as string;

  // Parallel reads
  const [
    pipelineCounts,
    leads,
    docWarnings,
    complianceLog,
    rateWatchCount,
    rateWatchHits,
    realtorCount,
    user,
  ] = await Promise.all([
    prisma.mortgageLead.groupBy({
      by: ["stage"],
      where: { ownerId: userId },
      _count: { _all: true },
    }),
    prisma.mortgageLead.findMany({
      where: { ownerId: userId, stage: { in: ["new", "contacted", "qualified"] } },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true, fullName: true, state: true, loanType: true, grade: true,
        createdAt: true, stage: true, email: true, phone: true,
      },
    }),
    prisma.docItem.findMany({
      where: { lead: { ownerId: userId }, status: "pending", nudgesSent: { gte: 2 } },
      orderBy: { lastNudgeAt: "asc" },
      take: 8,
      include: { lead: { select: { id: true, fullName: true } } },
    }),
    prisma.complianceScan.findMany({
      where: { lead: { ownerId: userId }, verdict: { in: ["yellow", "red"] } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { lead: { select: { id: true, fullName: true } } },
    }),
    prisma.rateWatchTarget.count({ where: { lead: { ownerId: userId }, active: true } }),
    prisma.rateWatchTarget.count({
      where: {
        lead: { ownerId: userId },
        active: true,
        lastFiredAt: { gte: new Date(Date.now() - 7 * 86_400_000) },
      },
    }),
    prisma.realtorPartner.count({ where: { loId: userId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, loNmlsId: true, loStateLicenses: true, mortgageOriginator: true },
    }),
  ]);

  const countsByStage = Object.fromEntries(pipelineCounts.map((c) => [c.stage, c._count._all]));
  // "dead" never appears in STAGES (the dashboard only models the live funnel),
  // so the only stage to exclude here is "closed".
  const totalActive = STAGES.filter((s) => s.key !== "closed")
    .reduce((t, s) => t + (countsByStage[s.key] ?? 0), 0);

  // Setup warnings
  const setupGaps: string[] = [];
  if (!user?.mortgageOriginator) setupGaps.push("Your account isn't marked as a Mortgage Originator yet.");
  if (!user?.loNmlsId) setupGaps.push("Add your NMLS ID so Compliance Guard can stamp outbound messages.");
  if (!user?.loStateLicenses?.length) setupGaps.push("Add at least one state license so leads can be routed to you.");

  return (
    <main className="relative">
      <div className="absolute inset-0 -z-10 bg-promo-glow" />
      <div className="absolute inset-0 -z-10 bg-grid-fade" />

      {/* Header */}
      <section className="container max-w-7xl mx-auto pt-8 pb-4">
        <div className="flex items-baseline justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-cyan-300">Mortgage OS</div>
            <h1 className="mt-1 text-3xl md:text-4xl font-extrabold text-white">Flo Inbox</h1>
            <p className="mt-1 text-ink-300 text-sm">
              {user?.name ? `Welcome back, ${user.name.split(" ")[0]}.` : "Welcome back."} Here's what needs you today.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-500/10 text-cyan-200 px-3 py-1">
              <Inbox className="h-3.5 w-3.5" /> {totalActive} active lead{totalActive === 1 ? "" : "s"}
            </span>
            {user?.loNmlsId && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 text-emerald-200 px-3 py-1">
                <ShieldCheck className="h-3.5 w-3.5" /> NMLS #{user.loNmlsId}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Setup warnings */}
      {setupGaps.length > 0 && (
        <section className="container max-w-7xl mx-auto pb-4">
          <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4">
            <div className="flex items-center gap-2 text-amber-200 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4" /> Finish your Mortgage OS setup
            </div>
            <ul className="mt-2 text-sm text-amber-100 space-y-1 list-disc pl-5">
              {setupGaps.map((g) => <li key={g}>{g}</li>)}
            </ul>
            <Link href="/settings/mortgage" className="mt-3 inline-flex items-center gap-1 text-amber-200 hover:text-white text-sm font-semibold">
              Go to settings <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {/* Pipeline board */}
      <section className="container max-w-7xl mx-auto pb-6">
        <div className="text-xs uppercase tracking-widest text-cyan-300 font-bold mb-3">Pipeline</div>
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
          {STAGES.map((s) => (
            <Link
              key={s.key}
              href={`/dashboard/mortgage/pipeline?stage=${s.key}`}
              className={`rounded-xl border px-3 py-3 ${toneClasses(s.tone)} hover:brightness-125 transition`}
            >
              <div className="text-[10px] uppercase tracking-widest opacity-80">{s.label}</div>
              <div className="mt-1 text-2xl font-extrabold text-white">{countsByStage[s.key] ?? 0}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* New + Contacted + Qualified leads */}
      <section className="container max-w-7xl mx-auto pb-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-white">Most recent</h2>
          <Link href="/dashboard/mortgage/pipeline" className="text-xs text-cyan-300 hover:text-white">View all</Link>
        </div>
        {leads.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-5 w-5" />}
            title="No leads yet."
            body="Embed your widget on your site or run a Direct Lead Engine campaign to get the first Flo Inbox ping."
            cta={{ href: "/solutions/mortgage#pricing", label: "Start Mortgage Pro" }}
          />
        ) : (
          <div className="mt-3 grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {leads.map((l) => (
              <Link
                key={l.id}
                href={`/dashboard/mortgage/leads/${l.id}`}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:border-cyan-300/40 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-widest text-cyan-300">{VERTICALS[l.loanType].label}</div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${gradePill(l.grade)}`}>
                    {l.grade ?? "—"}
                  </span>
                </div>
                <div className="mt-1 font-bold text-white">{l.fullName}</div>
                <div className="text-xs text-ink-300">{l.state} · {new Date(l.createdAt).toLocaleDateString()}</div>
                <div className="mt-3 flex gap-2 text-[11px] text-ink-200">
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5">
                    <Phone className="h-3 w-3" /> {l.phone}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 truncate">
                    <Mail className="h-3 w-3" /> {l.email}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Doc warnings + Compliance log side-by-side */}
      <section className="container max-w-7xl mx-auto pb-8 grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center gap-2 text-amber-300 font-semibold">
            <FileWarning className="h-4 w-4" /> Docs needing a nudge
          </div>
          {docWarnings.length === 0 ? (
            <p className="mt-3 text-xs text-ink-300">All docs are moving. Keep going.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {docWarnings.map((d) => (
                <li key={d.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                  <div>
                    <div className="font-semibold text-white">{d.label}</div>
                    <div className="text-[11px] text-ink-300">{d.lead.fullName} · nudges sent: {d.nudgesSent}</div>
                  </div>
                  <Link href={`/dashboard/mortgage/leads/${d.lead.id}?tab=docs`} className="text-xs text-cyan-300 hover:text-white">
                    Review
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center gap-2 text-cyan-300 font-semibold">
            <ShieldCheck className="h-4 w-4" /> Compliance log
          </div>
          {complianceLog.length === 0 ? (
            <p className="mt-3 text-xs text-ink-300">No yellow or red scans in the last 30 days. Clean.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {complianceLog.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                  <div>
                    <div className="font-semibold text-white truncate">{c.summary}</div>
                    <div className="text-[11px] text-ink-300">
                      {c.lead?.fullName ?? "Unlinked"} · {c.channel} · {new Date(c.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    c.verdict === "red" ? "border-rose-400/40 bg-rose-500/10 text-rose-200"
                    : c.verdict === "yellow" ? "border-amber-400/40 bg-amber-500/10 text-amber-200"
                    : "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                  }`}>
                    {c.verdict.toUpperCase()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Rate-Watch + Partner Portal */}
      <section className="container max-w-7xl mx-auto pb-16 grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center gap-2 text-emerald-300 font-semibold">
            <TrendingUp className="h-4 w-4" /> Rate-Watch
          </div>
          {rateWatchCount === 0 ? (
            <EmptyState
              small
              icon={<TrendingUp className="h-4 w-4" />}
              title="Nobody on your rate-watch list yet."
              body="Upload your past-client book and Flo will alert them the moment rates drop 25 bps."
              cta={{ href: "/dashboard/mortgage/rate-watch/import", label: "Import past clients" }}
            />
          ) : (
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-white">{rateWatchCount}</div>
              <div className="text-xs text-ink-300">active watches</div>
              <div className="mt-2 text-sm text-ink-100">
                {rateWatchHits} alert{rateWatchHits === 1 ? "" : "s"} fired in the last 7 days.
              </div>
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center gap-2 text-violet-300 font-semibold">
            <Users className="h-4 w-4" /> Partner Portal
          </div>
          {realtorCount === 0 ? (
            <EmptyState
              small
              icon={<Users className="h-4 w-4" />}
              title="No realtor partners linked yet."
              body="Partner Portal generates co-branded net sheets, affordability calculators, and monthly market updates on autopilot."
              cta={{ href: "/dashboard/mortgage/partners/new", label: "Add your first partner" }}
            />
          ) : (
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-white">{realtorCount}</div>
              <div className="text-xs text-ink-300">active partners</div>
              <Link href="/dashboard/mortgage/partners" className="mt-2 inline-flex text-sm text-cyan-300 hover:text-white">Manage partners →</Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

// ──────────────────────────────────────────────────────────────────────────
function EmptyState({
  icon, title, body, cta, small,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  cta: { href: string; label: string };
  small?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-dashed border-white/15 bg-white/[0.02] ${small ? "p-3 mt-3" : "p-6 mt-3"}`}>
      <div className="flex items-center gap-2 text-ink-200 text-sm font-semibold">
        {icon} {title}
      </div>
      <p className="mt-1 text-xs text-ink-300 max-w-md">{body}</p>
      <Link
        href={cta.href}
        className="mt-3 inline-flex items-center gap-1 rounded-full border border-cyan-400/40 hover:border-cyan-300 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:text-white transition"
      >
        {cta.label} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
