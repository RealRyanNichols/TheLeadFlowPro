import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rememberPublicVisitor } from "@/lib/lead-memory";
import { recordSitePulseEvent } from "@/lib/site-pulse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pickStr(v: FormDataEntryValue | null, max = 1000): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const fullName = pickStr(form.get("fullName"), 120);
  const email = pickStr(form.get("email"), 200);
  const toolName = pickStr(form.get("toolName"), 160);
  const toolProblem = pickStr(form.get("toolProblem"), 1800);
  const businessImpact = pickStr(form.get("businessImpact"), 1800);
  const currentProcess = pickStr(form.get("currentProcess"), 1800);
  const visitorId = pickStr(form.get("visitorId"), 80) ?? crypto.randomUUID();

  if (!fullName) return NextResponse.json({ error: "missing_name" }, { status: 400 });
  if (!email || !/.+@.+\..+/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (!toolName || !toolProblem) {
    return NextResponse.json({ error: "missing_tool_context" }, { status: 400 });
  }

  const budgetTier = pickStr(form.get("budgetTier"), 40) ?? "2000-5000";
  const routedTo = "/book?source=tool-challenge";
  const notes = [
    "Tool Challenge funnel submission.",
    `Tool name: ${toolName}`,
    `Problem to solve: ${toolProblem}`,
    businessImpact ? `Business impact if solved: ${businessImpact}` : null,
    currentProcess ? `Current process: ${currentProcess}` : null,
    `Timeline: ${pickStr(form.get("timeline"), 80) ?? "not provided"}`,
    `Ownership expectation: client owns the tool, process, and setup.`,
    "Pitch promise: Ryan can review/build a practical prototype or plan; no specific business outcome is guaranteed.",
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    await prisma.publicIntake.create({
      data: {
        fullName,
        email: email.toLowerCase(),
        phone: pickStr(form.get("phone"), 32),
        businessName: pickStr(form.get("businessName"), 200),
        businessUrl: pickStr(form.get("businessUrl"), 300),
        industry: pickStr(form.get("industry"), 80),
        platforms: {},
        monthlyRevenueRange: pickStr(form.get("monthlyRevenueRange"), 40),
        biggestGoal: "tool-challenge",
        biggestBlocker: toolProblem,
        budgetTier,
        bestContactMethod: pickStr(form.get("bestContactMethod"), 40),
        notes,
        routedTo,
      },
    });
  } catch (error) {
    console.error("tool_challenge_save_failed", {
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
      topic: "custom tool",
      stage: "tool-challenge",
      path: "/challenge",
      source: "tool-challenge-form",
      profile: {
        toolName,
        toolProblem,
        businessImpact,
        currentProcess,
        budgetTier,
        monthlyRevenueRange: pickStr(form.get("monthlyRevenueRange"), 40),
        timeline: pickStr(form.get("timeline"), 80),
        routedTo,
      },
    });
  } catch {
    // Never block a buyer because durable memory failed.
  }

  try {
    await recordSitePulseEvent({
      visitorId,
      path: "/challenge",
      eventType: "cta_service",
      source: "tool-challenge-form",
      target: "tool-challenge-submit",
      value: 1,
    });
  } catch {
    // Never block a buyer because analytics failed.
  }

  return NextResponse.redirect(new URL(routedTo, req.url), { status: 303 });
}
