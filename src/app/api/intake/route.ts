// src/app/api/intake/route.ts
//
// Receives /start form submissions. Validates + persists to PublicIntake,
// then redirects to the best-fit live offer page based on the visitor's
// current problem, preferred work style, budget, and urgency.
//
// The customer should never have to compare ten offer pages cold.
// They answer once; the app sends them to the cleanest next click.
//
// Form posts as application/x-www-form-urlencoded so it works with no JS.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  type BudgetTier,
  type PrimaryNeed,
  type Urgency,
  type WorkStyle,
  recommendOffer,
  routeForRecommendation,
  VALID_BUDGET_TIERS,
  VALID_PRIMARY_NEEDS,
  VALID_URGENCIES,
  VALID_WORK_STYLES,
} from "@/lib/offer-recommendation";
import { rememberPublicVisitor } from "@/lib/lead-memory";
import { recordSitePulseEvent } from "@/lib/site-pulse";
import { attributionNoteBlock, extractFormAttribution } from "@/lib/form-attribution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pickStr(v: FormDataEntryValue | null, max = 500): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t.slice(0, max);
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
  const visitorId = pickStr(form.get("visitorId"), 80) ?? crypto.randomUUID();
  const primaryNeed = (pickStr(form.get("primaryNeed"), 40) || "").toLowerCase();
  const workStyle   = (pickStr(form.get("workStyle"), 40) || "").toLowerCase();
  const budgetTier  = (pickStr(form.get("budgetTier"), 40) || "").toLowerCase();
  const urgency     = (pickStr(form.get("urgency"), 40) || "").toLowerCase();
  const attribution = extractFormAttribution(form, {
    formType: "start_router",
    sourcePage: "/start",
  });

  if (!fullName) return NextResponse.json({ error: "missing_name" }, { status: 400 });
  if (!email || !/.+@.+\..+/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (!VALID_PRIMARY_NEEDS.has(primaryNeed as PrimaryNeed)) {
    return NextResponse.json({ error: "invalid_primary_need" }, { status: 400 });
  }
  if (!VALID_WORK_STYLES.has(workStyle as WorkStyle)) {
    return NextResponse.json({ error: "invalid_work_style" }, { status: 400 });
  }
  if (!VALID_BUDGET_TIERS.has(budgetTier as BudgetTier)) {
    return NextResponse.json({ error: "invalid_budget" }, { status: 400 });
  }
  if (!VALID_URGENCIES.has(urgency as Urgency)) {
    return NextResponse.json({ error: "invalid_urgency" }, { status: 400 });
  }

  // platforms[] inputs are name="platforms.tiktok", name="platforms.facebook", etc.
  const platforms: Record<string, string> = {};
  for (const key of ["tiktok", "facebook", "x", "youtube", "instagram", "linkedin"]) {
    const v = pickStr(form.get(`platforms.${key}`), 120);
    if (v) platforms[key] = v;
  }

  const recommendation = recommendOffer({ primaryNeed, workStyle, budgetTier, urgency });
  const routedTo = routeForRecommendation({ primaryNeed, budgetTier, urgency });
  const notes = pickStr(form.get("notes"), 2000);
  const routerNotes = [
    attributionNoteBlock(attribution),
    `Recommended offer: ${recommendation.slug}`,
    `Recommendation reason: ${recommendation.reason}`,
    `Work style: ${workStyle}`,
    `Urgency: ${urgency}`,
    notes ? `Visitor notes: ${notes}` : null,
  ].filter(Boolean).join("\n\n");

  try {
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
        biggestGoal:         primaryNeed,
        biggestBlocker:      pickStr(form.get("biggestBlocker"), 1500),
        budgetTier,
        bestContactMethod:   pickStr(form.get("bestContactMethod"), 40),
        notes:               routerNotes,
        routedTo,
      },
    });
  } catch (error) {
    // Do not strand a ready buyer on a database hiccup. Keep PII out of logs.
    console.error("public_intake_save_failed", {
      route: routedTo,
      recommendation: recommendation.slug,
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  try {
    await rememberPublicVisitor({
      visitorId,
      email,
      fullName,
      phone: pickStr(form.get("phone"), 32),
      businessName: pickStr(form.get("businessName"), 200),
      businessUrl: pickStr(form.get("businessUrl"), 300),
      industry: pickStr(form.get("industry"), 80),
      topic: primaryNeed,
      stage: "intake",
      path: "/start",
      source: "offer-router",
      profile: {
        primaryNeed,
        workStyle,
        budgetTier,
        urgency,
        monthlyRevenueRange: pickStr(form.get("monthlyRevenueRange"), 40),
        platforms,
        routedTo,
      },
    });
    await recordSitePulseEvent({
      visitorId,
      path: "/start",
      eventType: "cta_service",
      source: "offer-router-form",
      target: recommendation.slug,
      value: 1,
    });
  } catch {
    // Never strand a buyer because memory or analytics failed.
  }

  // 303 keeps the browser GETting the next URL after the POST,
  // which avoids the "do you want to resubmit?" reload prompt.
  return NextResponse.redirect(new URL(routedTo, req.url), { status: 303 });
}
