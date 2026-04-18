// src/lib/brain.ts
// Helpers for the Brain profile gate + personalization layer.
//
// Two ideas live in one file on purpose:
//   1) The profile-gate math (completeness 0..100, unlock at 80).
//   2) The "push it into the tools" layer — getBrainContext() reads both
//      typed columns and the extras JSON so chatbot/ad-copy/FlowCard/etc.
//      can pre-populate their creative fields from what the user told Flo
//      during onboarding.

import { prisma } from "@/lib/prisma";
import type { BrainProfile, User } from "@prisma/client";

/** Minimum completeness to unlock dashboard. Below this, middleware redirects to /onboarding. */
export const PROFILE_UNLOCK_THRESHOLD = 80;

/** Columns that are typed on BrainProfile (the "core 9"). */
export const CORE_SLOTS = [
  "industry",
  "subIndustry",
  "city",
  "state",
  "teamSize",
  "avgCustomerValue",
  "idealCustomer",
  "topFrustration",
] as const satisfies readonly (keyof BrainProfile)[];

/** Typed bonus columns — count a little less toward unlock. */
export const BONUS_SLOTS = [
  "topGoal90d",
  "voiceSample",
] as const satisfies readonly (keyof BrainProfile)[];

/** The union of every typed top-level slot we accept by name. */
export const TYPED_SLOTS: readonly (keyof BrainProfile)[] = [
  ...CORE_SLOTS,
  ...BONUS_SLOTS,
];

/**
 * Compute a 0–100 completeness score for a BrainProfile.
 * Core 8 slots each worth ~11%, bonus slots worth the remaining ~12%.
 * Extras answers bump completeness toward 100 but can't exceed the cap.
 */
export function computeCompleteness(p: Partial<BrainProfile>): number {
  if (!p) return 0;
  let score = 0;
  const corePer = 88 / CORE_SLOTS.length;       // ≈ 11
  const bonusPer = 12 / BONUS_SLOTS.length;     // ≈ 6

  for (const slot of CORE_SLOTS) {
    const v = p[slot];
    if (typeof v === "string" && v.trim().length > 0) score += corePer;
  }
  for (const slot of BONUS_SLOTS) {
    const v = p[slot];
    if (typeof v === "string" && v.trim().length > 0) score += bonusPer;
  }

  // Every extras answer adds a small bump so the "endless" flow keeps
  // rewarding the user visually — capped at 100.
  const extras = (p.extras ?? {}) as Record<string, unknown>;
  const extraAnsweredCount = Object.values(extras).filter(
    (v) => typeof v === "string" && v.trim().length > 0,
  ).length;
  score += Math.min(20, extraAnsweredCount * 2); // up to +20

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

/**
 * Save one or more answers from /api/onboarding.
 *
 * - Known top-level slots (industry, idealCustomer, voiceSample, …) are
 *   written to their typed columns.
 * - Anything else is merged into the extras JSONB blob so we can keep
 *   asking new questions without a per-slot migration.
 */
export async function updateBrainProfile(
  userId: string,
  patch: Record<string, any>,
): Promise<BrainProfile> {
  const existing = await ensureBrainProfile(userId);

  // Split the incoming patch into typed columns vs. extras additions.
  const typed: Partial<BrainProfile> = {};
  const extrasPatch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (!v && v !== 0 && v !== false) continue;
    if ((TYPED_SLOTS as readonly string[]).includes(k)) {
      (typed as any)[k] = v;
    } else if (k !== "id" && k !== "userId" && k !== "createdAt" && k !== "updatedAt" && k !== "extras" && k !== "completeness") {
      extrasPatch[k] = v;
    }
  }

  const currentExtras =
    (existing.extras && typeof existing.extras === "object" && !Array.isArray(existing.extras))
      ? (existing.extras as Record<string, unknown>)
      : {};
  const mergedExtras = { ...currentExtras, ...extrasPatch };

  const merged = await prisma.brainProfile.update({
    where: { userId },
    data: {
      ...typed,
      extras: mergedExtras,
      questionsSeen: { increment: 1 },
    },
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

/* ---------------------------------------------------------------- */
/* getBrainContext — the "push it into every tool" surface           */
/* ---------------------------------------------------------------- */

export type BrainContext = {
  /** Raw BrainProfile row (null if the user hasn't started onboarding). */
  profile: BrainProfile | null;
  /** Convenience: profile.extras as a plain object. */
  extras: Record<string, string | number | boolean | null | undefined>;
  /** Friendly strings derived for tool pre-fill. All fall back to sensible defaults. */
  derived: {
    businessName: string;       // user.businessName || extras.businessName || "Your business"
    displayName: string;        // user.name || email-local
    industryLabel: string;      // human-readable industry (e.g. "Home services")
    subIndustry: string;        // free-text user typed ("HVAC", "hair salon")
    locationLine: string;       // "Longview, TX" / "" if unknown
    idealCustomer: string;      // user's own words
    topGoal: string;            // human-readable goal
    valueProp: string;          // generated tagline-ish sentence
    toneHint: string;           // guidance for chatbot voice
    doOffer: string;            // suggested starter text for "what you DO offer"
    dontOffer: string;          // starter text for "what you DON'T offer"
  };
};

const INDUSTRY_LABELS: Record<string, string> = {
  home_services:    "Home services",
  auto_services:    "Auto services",
  beauty_wellness:  "Beauty & wellness",
  medical_dental:   "Medical & dental",
  fitness_coaching: "Fitness & coaching",
  food_beverage:    "Food & beverage",
  cleaning:         "Cleaning services",
  retail:           "Retail",
  ecommerce:        "E-commerce / online",
  professional:    "Professional services",
  education:        "Education & tutoring",
  events:           "Events & creative",
  real_estate:      "Real estate",
  other:            "Your business",
};

const GOAL_LABELS: Record<string, string> = {
  more_leads:      "double your leads",
  better_close:    "close more of the leads you already get",
  cut_ad_spend:    "cut ad spend without losing leads",
  add_team:        "add a team member without breaking what works",
  automate_follow: "automate your follow-up",
  launch_new:      "launch a new service",
};

export async function getBrainContext(userId: string): Promise<BrainContext> {
  // Load User + BrainProfile in parallel so tool pages only need one call.
  const [user, profile] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.brainProfile.findUnique({ where: { userId } }),
  ]);

  const extras =
    (profile?.extras && typeof profile.extras === "object" && !Array.isArray(profile.extras))
      ? (profile.extras as Record<string, any>)
      : {};

  const displayName =
    user?.name?.trim() ||
    (user?.email ? user.email.split("@")[0] : "") ||
    "there";

  const businessName =
    user?.businessName?.trim() ||
    (typeof extras.businessName === "string" && extras.businessName.trim()) ||
    "Your business";

  const industryLabel =
    (profile?.industry && INDUSTRY_LABELS[profile.industry]) ||
    user?.industry?.trim() ||
    "Your business";

  const subIndustry = profile?.subIndustry?.trim() || "";
  const locationLine = [profile?.city?.trim(), profile?.state?.trim()].filter(Boolean).join(", ");
  const idealCustomer = profile?.idealCustomer?.trim() || "";
  const topGoal = (profile?.topGoal90d && GOAL_LABELS[profile.topGoal90d]) || "grow your business";

  const valueProp = buildValueProp(industryLabel, subIndustry, locationLine, topGoal);
  const toneHint = buildToneHint(profile);
  const doOffer = buildDoOffer(industryLabel, subIndustry, idealCustomer);
  const dontOffer = buildDontOffer(industryLabel, subIndustry);

  return {
    profile,
    extras,
    derived: {
      businessName,
      displayName,
      industryLabel,
      subIndustry,
      locationLine,
      idealCustomer,
      topGoal,
      valueProp,
      toneHint,
      doOffer,
      dontOffer,
    },
  };
}

function buildValueProp(industry: string, sub: string, location: string, goal: string): string {
  const what = sub || industry.toLowerCase();
  const where = location ? ` in ${location}` : "";
  return `Helping ${what} clients${where} ${goal}.`;
}

function buildToneHint(p: BrainProfile | null): string {
  const voice = p?.voiceSample?.trim();
  if (voice && voice.length > 20) {
    return `Match this voice: "${voice.slice(0, 140)}${voice.length > 140 ? "…" : ""}"`;
  }
  return "Friendly, casual, never pushy. Texts like a real person.";
}

function buildDoOffer(industry: string, sub: string, ideal: string): string {
  const subjectLabel = sub || industry.toLowerCase();
  const who = ideal ? ` for ${ideal.slice(0, 120)}` : "";
  return `Core ${subjectLabel} services${who}. Replace with the specific services you want leads to ask about.`;
}

function buildDontOffer(industry: string, sub: string): string {
  const subjectLabel = sub || industry.toLowerCase();
  return `Anything outside of ${subjectLabel}. Add specific things you want Flo's chatbot to politely decline or refer out.`;
}
