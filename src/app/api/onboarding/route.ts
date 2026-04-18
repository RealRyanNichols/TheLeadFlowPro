// src/app/api/onboarding/route.ts
// POST: save one or more onboarding answers, return updated completeness.
// GET:  load current BrainProfile state so the client can resume mid-flow.
//
// The endpoint is permissive on purpose: any slot that isn't one of the
// typed BrainProfile columns gets merged into BrainProfile.extras by
// updateBrainProfile(). That lets the "endless" onboarding flow ask any
// number of bonus questions without a migration per slot.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  ensureBrainProfile,
  getBrainProfile,
  updateBrainProfile,
  computeCompleteness,
  PROFILE_UNLOCK_THRESHOLD,
  TYPED_SLOTS,
} from "@/lib/brain";

// Safety cap: how many distinct extras keys we'll accept per account.
// Protects against abuse or runaway client bugs without blocking the
// legitimate flow (we ship ~30 bonus questions at launch).
const MAX_EXTRAS_KEYS = 200;

// Slot names we'll never accept by any route (Prisma-managed / sensitive).
const RESERVED = new Set<string>([
  "id", "userId", "createdAt", "updatedAt", "completeness", "questionsSeen",
  "extras",
]);

function isValidSlotName(key: string): boolean {
  // Slot names are JS-identifier-ish: letters, digits, underscores, dashes.
  // Length-bounded to keep extras JSON sane.
  return /^[A-Za-z][A-Za-z0-9_\-]{0,63}$/.test(key);
}

function normalizeValue(v: unknown): string | number | boolean | null | undefined {
  if (typeof v === "string") {
    const t = v.trim();
    return t.length ? t.slice(0, 4000) : undefined;
  }
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "boolean") return v;
  return undefined;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const profile = await getBrainProfile(session.user.id);
  return NextResponse.json({
    profile,
    threshold: PROFILE_UNLOCK_THRESHOLD,
    completeness: profile?.completeness ?? computeCompleteness(profile ?? {}),
    unlocked: (profile?.completeness ?? 0) >= PROFILE_UNLOCK_THRESHOLD,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Filter + normalize the incoming patch. Unknown slots are allowed and
  // will land in extras; we only reject reserved names and malformed keys.
  const patch: Record<string, any> = {};
  for (const [rawKey, rawVal] of Object.entries(body)) {
    if (!isValidSlotName(rawKey)) continue;
    if (RESERVED.has(rawKey)) continue;
    const v = normalizeValue(rawVal);
    if (v === undefined) continue;
    patch[rawKey] = v;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no_fields" }, { status: 400 });
  }

  // Safety: if the resulting extras JSON would exceed the cap, refuse.
  const existing = await ensureBrainProfile(session.user.id);
  const typedKeys = new Set<string>(TYPED_SLOTS as readonly string[]);
  const extrasKeysIncoming = Object.keys(patch).filter((k) => !typedKeys.has(k));
  if (extrasKeysIncoming.length > 0) {
    const currentExtras =
      (existing.extras && typeof existing.extras === "object" && !Array.isArray(existing.extras))
        ? (existing.extras as Record<string, unknown>)
        : {};
    const wouldHave = new Set([...Object.keys(currentExtras), ...extrasKeysIncoming]);
    if (wouldHave.size > MAX_EXTRAS_KEYS) {
      return NextResponse.json({ error: "extras_cap_reached" }, { status: 400 });
    }
  }

  const updated = await updateBrainProfile(session.user.id, patch);

  return NextResponse.json({
    profile: updated,
    completeness: updated.completeness,
    threshold: PROFILE_UNLOCK_THRESHOLD,
    unlocked: updated.completeness >= PROFILE_UNLOCK_THRESHOLD,
  });
}
