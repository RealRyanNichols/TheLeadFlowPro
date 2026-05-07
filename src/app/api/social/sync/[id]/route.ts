// src/app/api/social/sync/[id]/route.ts
//
// POST /api/social/sync/{accountId}
// Refreshes the public stats for a single connected SocialAccount.
// Auth: caller must own the account.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordSitePulseEvent } from "@/lib/site-pulse";
import { syncSocialAccount } from "@/lib/social-sync";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, reason: "Not signed in" }, { status: 401 });
  }

  const account = await prisma.socialAccount.findUnique({
    where: { id: params.id },
  });
  if (!account || account.userId !== userId) {
    return NextResponse.json({ ok: false, reason: "Not found" }, { status: 404 });
  }

  const result = await syncSocialAccount(account.platform.toString(), account.handle);

  if (!result.ok) {
    // Update the lastSyncedAt timestamp anyway so the UI shows we tried.
    await prisma.socialAccount.update({
      where: { id: account.id },
      data: { lastSyncedAt: new Date() },
    });
    return NextResponse.json(
      {
        ok: false,
        reason: result.reason,
        needsConfig: "needsConfig" in result ? result.needsConfig : false,
      },
      { status: result.reason.includes("not set") ? 503 : 400 },
    );
  }

  // Persist the new numbers
  const today = new Date(new Date().toISOString().slice(0, 10));
  const updated = await prisma.socialAccount.update({
    where: { id: account.id },
    data: {
      followers: result.followers,
      following: result.following ?? account.following,
      posts: result.posts ?? account.posts,
      engagement: result.engagement ?? account.engagement,
      lastSyncedAt: new Date(),
    },
    select: {
      id: true,
      followers: true,
      following: true,
      posts: true,
      engagement: true,
      lastSyncedAt: true,
    },
  });

  await prisma.socialMetricDaily.upsert({
    where: {
      socialAccountId_date: {
        socialAccountId: account.id,
        date: today,
      },
    },
    create: {
      socialAccountId: account.id,
      date: today,
      followers: result.followers,
      engagement: result.engagement ?? 0,
      reach: result.reach ?? 0,
      impressions: result.views ?? 0,
    },
    update: {
      followers: result.followers,
      engagement: result.engagement ?? 0,
      reach: result.reach ?? 0,
      impressions: result.views ?? 0,
    },
  });

  try {
    await recordSitePulseEvent({
      visitorId: userId,
      path: "/dashboard/social",
      eventType: "api_sync",
      source: "manual-social-sync",
      target: account.platform.toString(),
      value: 1,
    });
  } catch {
    // Do not block manual sync because pulse logging failed.
  }

  return NextResponse.json({ ok: true, account: updated });
}
