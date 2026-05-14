import { NextRequest, NextResponse } from "next/server";
import { createLeadAuditReport } from "@/lib/lead-intelligence";
import { rememberPublicVisitor } from "@/lib/lead-memory";
import { prisma } from "@/lib/prisma";
import { recordSitePulseEvent } from "@/lib/site-pulse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pickStr(v: FormDataEntryValue | null, max = 600): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t.slice(0, max);
}

function validEmail(value: string | null) {
  return Boolean(value && /.+@.+\..+/.test(value));
}

function normalizeUrl(value: string | null) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value.slice(0, 300);
  return `https://${value}`.slice(0, 300);
}

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const fullName = pickStr(form.get("fullName"), 120);
  const email = pickStr(form.get("email"), 200)?.toLowerCase() ?? null;
  const businessName = pickStr(form.get("businessName"), 200);
  const businessUrl = normalizeUrl(pickStr(form.get("businessUrl"), 300));
  const visitorId = pickStr(form.get("visitorId"), 80) ?? crypto.randomUUID();
  const landingPage = pickStr(form.get("landingPage"), 160) ?? "/lead-leak-audit";
  const source = pickStr(form.get("source"), 80) ?? "lead-leak-audit";
  const industry = pickStr(form.get("industry"), 120);
  const pain = pickStr(form.get("pain"), 900);
  const currentLeadSource = pickStr(form.get("currentLeadSource"), 120);
  const responseTime = pickStr(form.get("responseTime"), 120);
  const leakConcern = pickStr(form.get("leakConcern"), 2000);
  const monthlyRevenueRange = pickStr(form.get("monthlyRevenueRange"), 60);
  const phone = pickStr(form.get("phone"), 40);

  if (!fullName) return NextResponse.json({ error: "missing_name" }, { status: 400 });
  if (!validEmail(email)) return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  if (!businessName && !businessUrl) {
    return NextResponse.json({ error: "missing_business" }, { status: 400 });
  }

  const routedTo = "/lead-leak-audit/thank-you";
  const notes = [
    "Requested free lead leak audit.",
    `Source: ${source}`,
    `Landing page: ${landingPage}`,
    industry ? `Industry: ${industry}` : null,
    pain ? `Page pain: ${pain}` : null,
    currentLeadSource ? `Main lead source: ${currentLeadSource}` : null,
    responseTime ? `Average first response: ${responseTime}` : null,
    leakConcern ? `Visitor concern: ${leakConcern}` : null,
  ].filter(Boolean).join("\n\n");

  let intakeId: string | null = null;
  try {
    const intake = await prisma.publicIntake.create({
      data: {
        fullName,
        email: email!,
        phone,
        businessName,
        businessUrl,
        industry,
        platforms: {},
        monthlyRevenueRange,
        biggestGoal: "lead-leak-audit",
        biggestBlocker: leakConcern ?? pain ?? "Wants Ryan to identify where leads are leaking.",
        budgetTier: "under-100",
        bestContactMethod: phone ? "any" : "email",
        notes,
        routedTo,
      },
    });
    intakeId = intake.id;
  } catch (error) {
    console.error("lead_leak_audit_save_failed", {
      source,
      landingPage,
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  let auditPublicId: string | null = null;
  try {
    const report = await createLeadAuditReport({
      intakeId,
      visitorId,
      fullName,
      email: email!,
      phone,
      businessName,
      businessUrl,
      industry,
      source,
      landingPage,
      pain,
      currentLeadSource,
      responseTime,
      leakConcern,
      monthlyRevenueRange,
    });
    auditPublicId = report.publicId;
  } catch (error) {
    console.error("lead_leak_audit_report_failed", {
      source,
      landingPage,
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  try {
    await rememberPublicVisitor({
      visitorId,
      email,
      fullName,
      phone,
      businessName,
      businessUrl,
      industry,
      topic: "lead leak audit",
      stage: "audit_requested",
      path: landingPage,
      source,
      profile: {
        landingPage,
        currentLeadSource,
        responseTime,
        monthlyRevenueRange,
        pain,
      },
    });
    await recordSitePulseEvent({
      visitorId,
      path: landingPage,
      eventType: "form_submit",
      source,
      target: "lead-leak-audit",
      value: 1,
    });
  } catch {
    // Never block a buyer because analytics or memory tables are unavailable.
  }

  const destination = auditPublicId
    ? `/audit/${auditPublicId}?submitted=1&source=${encodeURIComponent(source)}`
    : `${routedTo}?source=${encodeURIComponent(source)}`;
  return NextResponse.redirect(new URL(destination, req.url), { status: 303 });
}
