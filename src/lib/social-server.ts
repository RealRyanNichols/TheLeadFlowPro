/**
 * Server-side helpers for the Social Accounts module.
 * Handles plan-cap enforcement when users try to connect / link a new account.
 */

import { prisma } from "@/lib/prisma";
import { planById, type PlanId } from "@/lib/pricing";
import { platformById, FREE_TOTAL_SOCIAL_CAP, type PlatformKind, type PlatformId } from "@/lib/social-platforms";

export interface ConnectGuardResult {
  ok: boolean;
  reason?: string;
  /** What the user can do to fix it. */
  upgradeTo?: PlanId;
}

/**
 * Decide whether `userId` is allowed to add one more SocialAccount of the
 * given (platform, kind). Enforces:
 *   - global plan cap (Free = 2; paid = unlimited)
 *   - platform-specific kind caps on Free (Facebook 1 personal + 1 page)
 */
export async function canConnectSocial(args: {
  userId: string;
  platform: PlatformId;
  kind: PlatformKind;
}): Promise<ConnectGuardResult> {
  const user = await prisma.user.findUnique({
    where: { id: args.userId },
    select: { plan: true }
  });
  if (!user) return { ok: false, reason: "User not found." };

  const plan = planById(user.plan as PlanId);
  const isFree = plan.id === "free";

  const existing = await prisma.socialAccount.findMany({
    where: { userId: args.userId },
    select: { platform: true, kind: true }
  });

  if (isFree) {
    if (existing.length >= FREE_TOTAL_SOCIAL_CAP) {
      return {
        ok: false,
        reason: `Free plan tops out at ${FREE_TOTAL_SOCIAL_CAP} connected accounts. Upgrade to add more.`,
        upgradeTo: "starter"
      };
    }

    const spec = platformById(args.platform);
    const kindCap = spec?.freeKindCaps?.[args.kind];
    if (typeof kindCap === "number") {
      const sameKindCount = existing.filter(
        (a) => a.platform === args.platform && a.kind === args.kind
      ).length;
      if (sameKindCount >= kindCap) {
        const kindWord = args.kind === "personal" ? "personal profile" : "business page";
        return {
          ok: false,
          reason: `Free plan allows only ${kindCap} ${spec?.label} ${kindWord}. Upgrade to add more.`,
          upgradeTo: "starter"
        };
      }
    }
  }

  // Paid plans get unlimited social connections.
  return { ok: true };
}

/** Has this user any social account at all? Used in dashboard empty states. */
export async function hasAnyConnectedSocial(userId: string): Promise<boolean> {
  const c = await prisma.socialAccount.count({ where: { userId } });
  return c > 0;
}

export async function listConnectedSocials(userId: string) {
  return prisma.socialAccount.findMany({
    where: { userId },
    orderBy: { connectedAt: "desc" }
  });
}
