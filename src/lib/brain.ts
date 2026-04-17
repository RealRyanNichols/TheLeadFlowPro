// src/lib/brain.ts
// Helpers for the Brain profile gate + personalization layer.

import { prisma } from "@/lib/prisma";
import type { BrainProfile } from "@prisma/client";

/** Minimum completeness to unlock dashboard. Below this, middleware redirects to /onboarding. */
export const PROFILE_UNLOCK_THRESHOLD = 80;

/** The 8 core slots we ask for on first onboarding. Each answered = 12.5%. */
const CORE_SLOTS: (keyof BrainProfile)[] = [
  "industry",
  "subIndustry",
  "city",
  "state",
  "teamSize",
  "avgCustomerValue",
  "idealCustomer",
  "topFrustration",
  // topGoal90d makes 9 \u2014 but we weight slightly differently below
];

const BONUS_SLOTS: (keyof BrainProfile)[] = [
  "topGoal90d",
  "voiceSample",
];

/**
 * Compute a 0-100 completeness score for a BrainProfile.
 * Core 8 slots each worth ~11%, bonus slots worth the remaining ~12%.
 */
export function computeCompleteness(p: Partial<BrainProfile>): number {
  if (!p) return 0;
  let score = 0;
  const corePer = 88 / CORE_SLOTS.length;       // \u2248 11
  const bonusPer = 12 / BONUS_SLOTS.length;     // \u2248 6

  for (const slot of CORE_SLOTS) {
    const v = p[slot];
    if (typeof v === "string" && v.trim().length > 0) score += corePer;
  }
  for (const slot of BONUS_SLOTS) {
    const v = p[slot];
    if (typeof v === "string" && v.trim().length > 0) score += bonusPer;
  }
  return Math.min(100, Math.round(score));
}

/** Load or create a BrainProfile row for a user. */
export async function ensureBrainProfile(userId: string): Promise<BrainProfile> {
  const existing = await prisma.brainProfile.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.brainProfile.create({ data: { userId } });
}

/** Read current profile; returns null if user has no Brain row yet. */
export async function getBrainProfile(userId: string): Promise<BrainProfile | null> {
  return prisma.brainProfile.findUnique({ where: { userId } });
}

/** Is this user's profile complete enough to unlock the dashboard? */
export function isProfileUnlocked(profile: Partial<BrainProfile> | null | undefined): boolean {
  if (!profile) return false;
  const c = typeof profile.completeness === "number"
    ? profile.completeness
    : computeCompleteness(profile);
  return c >= PROFILE_UNLOCK_THRESHOLD;
}

/** Save one or more answers from /api/onboarding. Returns updated row. */
export async function updateBrainProfile(
  userId: string,
  patch: Partial<BrainProfile>
): Promise<BrainProfile> {
  await ensureBrainProfile(userId);
  const { id: _ignoreId, userId: _ignoreUser, createdAt: _c, updatedAt: _u, ...safe } = patch as any;
  const merged = await prisma.brainProfile.update({
    where: { userId },
    data: { ...safe, questionsSeen: { increment: 1 } },
  });
  // Recompute completeness from the merged state and store it.
  const completeness = computeCompleteness(merged);
  if (completeness !== merged.completeness) {
    return prisma.brainProfile.update({
      where: { userId },
      data: { completeness },
    });
  }
  return merged;
}
