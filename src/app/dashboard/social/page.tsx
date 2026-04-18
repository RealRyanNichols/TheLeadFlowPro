/**
 * Social Accounts dashboard.
 *
 * Pulls real connections from the database (no MOCK_SOCIAL anymore — once a
 * user is logged in, every metric is real or zero, per the no-fake-stats rule).
 *
 * Layout:
 *   - 3 stat cards across the top, sourced from actual SocialAccount rows
 *   - One card per supported platform from the PLATFORMS registry
 *   - Free-tier cap warning at the top when the user is one connection from
 *     hitting the wall, plus per-card "Upgrade to add" badges
 */

import Link from "next/link";
import { CheckCircle2, Plus, Lock, Clock, Sparkles, Users, Building2 } from "lucide-react";
import { redirect } from "next/navigation";

import { StatCard } from "@/components/dashboard/StatCard";
import { SocialIcon, socialBg } from "@/components/flowcard/SocialIcon";
import { formatNumber } from "@/lib/utils";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { planById, type PlanId } from "@/lib/pricing";
import {
  PLATFORMS,
  FREE_TOTAL_SOCIAL_CAP,
  kindLabel,
  type PlatformKind,
} from "@/lib/social-platforms";

export const dynamic = "force-dynamic";

interface ConnectedRow {
  id: string;
  platform: string;
  kind: string;
  handle: string;
  displayName: string | null;
  followers: number;
  engagement: number;       // already a percentage (e.g. 1.75 = 1.75%)
  lastSyncedAt: Date | null;
  connectedAt: Date;
}

async function loadAccounts(userId: string): Promise<ConnectedRow[]> {
  // Wrapped in try/catch so a missing migration in preview never blanks the page.
  try {
    const rows = await prisma.socialAccount.findMany({
      where: { userId },
      orderBy: { connectedAt: "desc" },
      select: {
        id: true, platform: true, kind: true, handle: true, displayName: true,
        followers: true, engagement: true, lastSyncedAt: true, connectedAt: true,
      },
    });
    return rows as unknown as ConnectedRow[];
  } catch {
    return [];
  }
}

export default async function SocialPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login?next=/dashboard/social");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  const plan = planById((user?.plan ?? "free") as PlanId);
  const isFree = plan.id === "free";
  const accounts = await loadAccounts(userId);

  const totalFollowers = accounts.reduce((s, a) => s + (a.followers ?? 0), 0);
  const engagementValues = accounts
    .map((a) => a.engagement)
    .filter((v): v is number => typeof v === "number" && v > 0);
  const avgEngagementPct =
    engagementValues.length > 0
      ? engagementValues.reduce((s, v) => s + v, 0) / engagementValues.length
      : 0;

  const connectedCount = accounts.length;
  const usedFreeSlots = isFree ? Math.min(connectedCount, FREE_TOTAL_SOCIAL_CAP) : connectedCount;
  const freeSlotsRemaining = isFree ? Math.max(0, FREE_TOTAL_SOCIAL_CAP - connectedCount) : null;

  // Index by platform → array of connected kinds (used to compute "this slot is taken")
  const connectedByPlatform = new Map<string, ConnectedRow[]>();
  for (const a of accounts) {
    const list = connectedByPlatform.get(a.platform) ?? [];
    list.push(a);
    connectedByPlatform.set(a.platform, list);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <p className="text-cyan-400 text-sm font-semibold">Social Accounts</p>
        <h1 className="mt-1 text-3xl font-extrabold text-white">
          All your platforms, <span className="funnel-text">one view</span>
        </h1>
        <p className="mt-2 text-ink-300 max-w-2xl">
          Hook up every social profile and Page you run. Flo pulls followers,
          engagement, and top-post data so the AI can find your real audience —
          and we never invent numbers we can&apos;t see.
        </p>
      </div>

      {/* Free-tier banner */}
      {isFree && (
        <div className="glass rounded-2xl p-5 border border-cyan-500/20 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-cyan-500/15 text-cyan-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-white">
                Free plan — {usedFreeSlots} of {FREE_TOTAL_SOCIAL_CAP} accounts connected
              </p>
              <p className="text-sm text-ink-300">
                {freeSlotsRemaining === 0
                  ? "You've hit the Free cap. Upgrade to connect every platform you run."
                  : `You can connect ${freeSlotsRemaining} more. Facebook is capped at 1 personal + 1 page on Free.`}
              </p>
            </div>
          </div>
          <Link href="/pricing" className="btn-primary text-sm whitespace-nowrap">
            Upgrade for unlimited
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total followers"
          value={formatNumber(totalFollowers)}
          sub={connectedCount === 0 ? "Connect an account to start tracking" : "Across all connected platforms"}
          highlight
        />
        <StatCard
          label="Avg engagement"
          value={`${avgEngagementPct.toFixed(1)}%`}
          sub={engagementValues.length > 0 ? "Weighted across platforms" : "Real numbers fill in once data syncs"}
        />
        <StatCard
          label="Connected"
          value={isFree ? `${connectedCount} of ${FREE_TOTAL_SOCIAL_CAP}` : `${connectedCount}`}
          sub={isFree ? "Free plan limit applies" : "Unlimited on your plan"}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLATFORMS.map((p) => {
          const here = connectedByPlatform.get(p.id) ?? [];
          const isPending = p.connectMode === "pending_approval";
          const isManual  = p.connectMode === "manual_only";

          return (
            <div
              key={p.id}
              className="glass rounded-2xl p-5 hover:border-cyan-500/30 transition flex flex-col"
            >
              <div className="flex items-start justify-between gap-3">
                <div className={`h-11 w-11 rounded-xl flex items-center justify-center text-white bg-gradient-to-br ${socialBg(p.id)}`}>
                  <SocialIcon platform={p.id} />
                </div>
                <ConnectControl
                  platform={p}
                  isFree={isFree}
                  totalConnected={connectedCount}
                  hereConnected={here}
                />
              </div>

              <h3 className="mt-3 text-base font-bold text-white">{p.label}</h3>
              <p className="text-xs text-ink-400">{p.pulls}</p>

              {/* Pending API badge */}
              {isPending && (
                <div className="mt-3 flex items-start gap-2 text-[11px] text-amber-300/90">
                  <Clock className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>OAuth pending review — we&apos;ll switch you over the moment {p.label} approves us. Use manual import below in the meantime.</span>
                </div>
              )}
              {isManual && (
                <div className="mt-3 flex items-start gap-2 text-[11px] text-cyan-300/90">
                  <Clock className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>{p.pendingReason}</span>
                </div>
              )}

              {/* Connected accounts list */}
              {here.length > 0 && (
                <div className="mt-4 space-y-3 border-t border-white/5 pt-3">
                  {here.map((a) => (
                    <ConnectedRowCard key={a.id} row={a} />
                  ))}
                </div>
              )}

              {/* Kind hints when nothing is connected */}
              {here.length === 0 && p.kinds.length > 1 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {p.kinds.map((k) => (
                    <span
                      key={k}
                      className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-md bg-ink-800/60 text-ink-300 border border-white/5 inline-flex items-center gap-1"
                    >
                      {k === "business_page" ? <Building2 className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                      {kindLabel(k)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components kept in-file because they're only used here.        */
/* ------------------------------------------------------------------ */

function ConnectControl({
  platform,
  isFree,
  totalConnected,
  hereConnected,
}: {
  platform: typeof PLATFORMS[number];
  isFree: boolean;
  totalConnected: number;
  hereConnected: ConnectedRow[];
}) {
  // Already at the global free cap → render Lock + Upgrade
  if (isFree && totalConnected >= FREE_TOTAL_SOCIAL_CAP) {
    return (
      <Link href="/pricing" className="btn-ghost text-xs py-1.5 px-3" title="Upgrade to add more">
        <Lock className="h-3.5 w-3.5" /> Upgrade
      </Link>
    );
  }

  // Per-platform-kind cap on Free (e.g. Facebook 1 personal + 1 page)
  if (isFree && platform.freeKindCaps) {
    const allKindsAtCap = platform.kinds.every((k) => {
      const cap = platform.freeKindCaps?.[k];
      if (typeof cap !== "number") return false;
      const have = hereConnected.filter((r) => r.kind === k).length;
      return have >= cap;
    });
    if (allKindsAtCap) {
      return (
        <Link href="/pricing" className="btn-ghost text-xs py-1.5 px-3" title="Free plan limit reached">
          <Lock className="h-3.5 w-3.5" /> Upgrade
        </Link>
      );
    }
  }

  // OK — route to the connect flow for this platform
  return (
    <Link
      href={`/dashboard/social/connect/${platform.id}`}
      className="btn-ghost text-xs py-1.5 px-3"
    >
      <Plus className="h-3.5 w-3.5" /> Connect
    </Link>
  );
}

function ConnectedRowCard({ row }: { row: ConnectedRow }) {
  const followers = row.followers ?? 0;
  const engagementPct = row.engagement > 0 ? row.engagement : null;
  const synced = row.lastSyncedAt
    ? new Date(row.lastSyncedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-ink-200 truncate">{row.displayName || row.handle}</p>
          <p className="text-[10px] uppercase tracking-wider text-ink-500 inline-flex items-center gap-1">
            {row.kind === "business_page" ? <Building2 className="h-3 w-3" /> : <Users className="h-3 w-3" />}
            {kindLabel(row.kind as PlatformKind)}
          </p>
        </div>
        <span className="stat-pill bg-lead-500/15 text-lead-400 border border-lead-500/30 text-[10px]">
          <CheckCircle2 className="h-3 w-3" /> Live
        </span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-sm font-bold text-white">{formatNumber(followers)}</p>
          <p className="text-[10px] uppercase tracking-wider text-ink-400">Followers</p>
        </div>
        <div>
          <p className="text-sm font-bold text-white">
            {engagementPct !== null ? `${engagementPct.toFixed(1)}%` : "—"}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-ink-400">Engage</p>
        </div>
        <div>
          <p className="text-sm font-bold text-ink-300">
            {synced ?? "—"}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-ink-400">Synced</p>
        </div>
      </div>
    </div>
  );
}

