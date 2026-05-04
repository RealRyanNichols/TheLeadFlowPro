// src/app/api/intake/route.ts
//
// Receives /start form submissions. Validates + persists to PublicIntake,
// then redirects to the right next page based on budgetTier:
//
//   free    → /start/thank-you?tier=free
//   starter → /pricing#starter
//   pro     → /pricing#pro
//   power   → /pricing#power
//   vip     → /book?tier=vip
//
// Form posts as application/x-www-form-urlencoded so it works with no JS.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TIERS = new Set(["free", "starter", "pro", "power", "vip"]);

function pickStr(v: FormDataEntryValue | null, max = 500): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t.slice(0, max);
}

function nextRouteFor(tier: string): string {
  switch (tier) {
    case "starter": return "/pricing?tier=starter#starter";
    case "pro":     return "/pricing?tier=pro#pro";
    case "power":   return "/pricing?tier=power#power";
    case "vip":     return "/book?tier=vip";
    default:        return "/start/thank-you?tier=free";
  }
}

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const fullName = pickStr(form.get("fullName"), 120);
  const email    = pickStr(form.get("email"), 200);
  const tier     = (pickStr(form.get("budgetTier"), 20) || "free").toLowerCase();

  if (!fullName) return NextResponse.json({ error: "missing_name" }, { status: 400 });
  if (!email || !/.+@.+\..+/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (!VALID_TIERS.has(tier)) {
    return NextResponse.json({ error: "invalid_tier" }, { status: 400 });
  }

  // platforms[] inputs are name="platforms.tiktok", name="platforms.facebook", etc.
  const platforms: Record<string, string> = {};
  for (const key of ["tiktok", "facebook", "x", "youtube", "instagram", "linkedin"]) {
    const v = pickStr(form.get(`platforms.${key}`), 120);
    if (v) platforms[key] = v;
  }

  const routedTo = nextRouteFor(tier);

  await prisma.publicIntake.create({
    data: {
      fullName,
      email: email.toLowerCase(),
      phone:               pickStr(form.get("phone"), 32),
      businessName:        pickStr(form.get("businessName"), 200),
      businessUrl:         pickStr(form.get("businessUrl"), 300),
      industry:            pickStr(form.get("industry"), 80),
      platforms,
      monthlyRevenueRange: pickStr(form.get("monthlyRevenueRange"), 40),
      biggestGoal:         pickStr(form.get("biggestGoal"), 80),
      biggestBlocker:      pickStr(form.get("biggestBlocker"), 1500),
      budgetTier:          tier,
      bestContactMethod:   pickStr(form.get("bestContactMethod"), 40),
      notes:               pickStr(form.get("notes"), 2000),
      routedTo,
    },
  });

  // 303 keeps the browser GETting the next URL after the POST,
  // which avoids the "do you want to resubmit?" reload prompt.
  return NextResponse.redirect(new URL(routedTo, req.url), { status: 303 });
}
