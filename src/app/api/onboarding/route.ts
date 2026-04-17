// src/app/api/onboarding/route.ts
// POST: save one onboarding answer, return updated completeness.
// GET: load current BrainProfile state so the client can resume mid-flow.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  ensureBrainProfile,
  getBrainProfile,
  updateBrainProfile,
  computeCompleteness,
  PROFILE_UNLOCK_THRESHOLD,
} from "@/lib/brain";

// Whitelisted slots the client can write. Keeps the endpoint tight.
const ALLOWED_SLOTS = new Set<string>([
  "industry",
  "subIndustry",
  "city",
  "state",
  "teamSize",
  "avgCustomerValue",
  "idealCustomer",
  "topFrustration",
  "topGoal90d",
  "voiceSample",
]);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const profile = await getBrainProfile(session.user.id);
  return NextResponse.json({
    profile,
    threshold: PROFILE_UNLOCK_THRESHOLD,
    completeness: profile?.completeness ?? computeCompleteness(profile ?? {}),
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: Record<string, any> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Only allow whitelisted keys through; trim strings, drop empties.
  const patch: Record<string, any> = {};
  for (const [k, v] of Object.entries(body)) {
    if (!ALLOWED_SLOTS.has(k)) continue;
    if (typeof v === "string") {
      const t = v.trim();
      if (t.length) patch[k] = t;
    } else if (v != null) {
      patch[k] = v;
    }
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no_fields" }, { status: 400 });
  }

  await ensureBrainProfile(session.user.id);
  const updated = await updateBrainProfile(session.user.id, patch as any);

  return NextResponse.json({
    profile: updated,
    completeness: updated.completeness,
    threshold: PROFILE_UNLOCK_THRESHOLD,
    unlocked: updated.completeness >= PROFILE_UNLOCK_THRESHOLD,
  });
}
