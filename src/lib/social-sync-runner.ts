import { prisma } from "@/lib/prisma";
import { recordSitePulseEvent } from "@/lib/site-pulse";
import { syncSocialAccount } from "@/lib/social-sync";

export type SocialSyncRunResult = {
  checked: number;
  updated: number;
  failed: number;
  needsConfig: number;
  failures: Array<{ id: string; platform: string; handle: string; reason: string; needsConfig: boolean }>;
};

export async function syncConnectedSocialAccounts(limit = 25): Promise<SocialSyncRunResult> {
  const accounts = await prisma.socialAccount.findMany({
    orderBy: [{ lastSyncedAt: "asc" }, { connectedAt: "asc" }],
    take: Math.max(1, Math.min(limit, 100)),
  });

  const result: SocialSyncRunResult = {
    checked: accounts.length,
    updated: 0,
    failed: 0,
    needsConfig: 0,
    failures: [],
  };

  for (const account of accounts) {
    const sync = await syncSocialAccount(account.platform.toString(), account.handle);

    if (!sync.ok) {
      result.failed += 1;
      if (sync.needsConfig) result.needsConfig += 1;
      result.failures.push({
        id: account.id,
        platform: account.platform.toString(),
        handle: account.handle,
        reason: sync.reason,
        needsConfig: Boolean(sync.needsConfig),
      });

      await prisma.socialAccount.update({
        where: { id: account.id },
        data: { lastSyncedAt: new Date() },
      });
      continue;
    }

    await prisma.socialAccount.update({
      where: { id: account.id },
      data: {
        followers: sync.followers,
        following: sync.following ?? account.following,
        posts: sync.posts ?? account.posts,
        engagement: sync.engagement ?? account.engagement,
        lastSyncedAt: new Date(),
      },
    });

    await prisma.socialMetricDaily.upsert({
      where: {
        socialAccountId_date: {
          socialAccountId: account.id,
          date: new Date(new Date().toISOString().slice(0, 10)),
        },
      },
      create: {
        socialAccountId: account.id,
        date: new Date(new Date().toISOString().slice(0, 10)),
        followers: sync.followers,
        engagement: sync.engagement ?? 0,
        reach: sync.reach ?? 0,
        impressions: sync.views ?? 0,
      },
      update: {
        followers: sync.followers,
        engagement: sync.engagement ?? 0,
        reach: sync.reach ?? 0,
        impressions: sync.views ?? 0,
      },
    });

    result.updated += 1;
  }

  try {
    await recordSitePulseEvent({
      visitorId: "system-cron",
      path: "/pulse",
      eventType: "api_sync",
      source: "social-sync-cron",
      target: "connected-social-accounts",
      value: result.updated,
    });
  } catch {
    // Cron should still report its sync result if pulse logging is unavailable.
  }

  return result;
}
