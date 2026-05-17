import { NextRequest, NextResponse } from "next/server";
import { attributionNoteBlock, extractFormAttribution } from "@/lib/form-attribution";
import { rememberPublicVisitor } from "@/lib/lead-memory";
import { sendPaidAuditNotification } from "@/lib/paid-audit-notifications";
import { prisma } from "@/lib/prisma";
import { recordSitePulseEvent } from "@/lib/site-pulse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pickStr(v: FormDataEntryValue | null, max = 800): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t.slice(0, max);
}

function normalizeUrl(value: string | null) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value.slice(0, 300);
  return `https://${value}`.slice(0, 300);
}

function validEmail(value: string | null) {
  return Boolean(value && /.+@.+\..+/.test(value));
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
  const phone = pickStr(form.get("phone"), 40);
  const businessName = pickStr(form.get("businessName"), 200);
  const businessUrl = normalizeUrl(pickStr(form.get("businessUrl"), 300));
  const monthlyRevenueRange = pickStr(form.get("monthlyRevenueRange"), 80);
  const currentLeadSource = pickStr(form.get("currentLeadSource"), 160);
  const responseTime = pickStr(form.get("responseTime"), 160);
  const leakConcern = pickStr(form.get("leakConcern"), 2000);
  const auditReadiness = pickStr(form.get("auditReadiness"), 200);
  const reviewTimeline = pickStr(form.get("reviewTimeline"), 120);
  const currentPageUrl = pickStr(form.get("currentPageUrl"), 500);
  const clientCreatedAt = pickStr(form.get("clientCreatedAt"), 80);
  const visitorId = pickStr(form.get("visitorId"), 80) ?? crypto.randomUUID();
  const attribution = extractFormAttribution(form, {
    formType: "paid_lead_leak_audit_197",
    sourcePage: "/lead-leak-audit-197",
  });

  if (!fullName) return NextResponse.json({ error: "missing_name" }, { status: 400 });
  if (!validEmail(email)) return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  if (!phone) return NextResponse.json({ error: "missing_phone" }, { status: 400 });
  if (!businessName && !businessUrl) {
    return NextResponse.json({ error: "missing_business" }, { status: 400 });
  }

  const routedTo = "/lead-leak-audit-197/thank-you?application=1";
  const budgetSignal = auditReadiness?.toLowerCase().includes("yes") ? "197-ready" : "fit-confirm-first";
  const notes = [
    attributionNoteBlock(attribution),
    "Paid traffic application: $197 Lead Leak Audit.",
    `name: ${fullName}`,
    `email: ${email}`,
    phone ? `phone: ${phone}` : null,
    businessName ? `business: ${businessName}` : null,
    businessUrl ? `website: ${businessUrl}` : null,
    monthlyRevenueRange ? `monthly_revenue_range: ${monthlyRevenueRange}` : null,
    currentLeadSource ? `main_lead_source: ${currentLeadSource}` : null,
    responseTime ? `average_first_response_time: ${responseTime}` : null,
    leakConcern ? `problem: ${leakConcern}` : null,
    auditReadiness ? `budget_signal: ${auditReadiness}` : null,
    reviewTimeline ? `urgency: ${reviewTimeline}` : null,
    currentPageUrl ? `current_page_url: ${currentPageUrl}` : null,
    clientCreatedAt ? `client_created_at: ${clientCreatedAt}` : null,
    "deliverable: plain-English readout, top 3 leaks, recommended next move, screenshots where appropriate, path to fix with Ryan if it makes sense.",
  ]
    .filter(Boolean)
    .join("\n");

  let intakeId: string | null = null;
  try {
    const intake = await prisma.publicIntake.create({
      data: {
        fullName,
        email: email!,
        phone,
        businessName,
        businessUrl,
        industry: "paid-lead-leak-audit",
        platforms: {},
        monthlyRevenueRange,
        biggestGoal: "paid-lead-leak-audit-197",
        biggestBlocker: leakConcern ?? "Wants Ryan to identify where serious leads are falling out.",
        budgetTier: budgetSignal,
        bestContactMethod: phone ? "any" : "email",
        notes,
        routedTo,
      },
    });
    intakeId = intake.id;
  } catch (error) {
    console.error("paid_lead_leak_audit_save_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    try {
      await sendPaidAuditNotification({
        intakeId: "database-save-failed",
        fullName,
        email: email!,
        phone,
        businessName,
        businessUrl,
        monthlyRevenueRange,
        currentLeadSource,
        responseTime,
        leakConcern,
        auditReadiness,
        reviewTimeline,
        currentPageUrl,
        clientCreatedAt,
        attribution,
      });
    } catch (notificationError) {
      console.error("paid_lead_leak_audit_failure_notification_failed", {
        error: notificationError instanceof Error ? notificationError.message : "unknown",
      });
    }
    return NextResponse.redirect(new URL("/lead-leak-audit-197?error=save_failed#audit-application", req.url), {
      status: 303,
    });
  }

  try {
    await sendPaidAuditNotification({
      intakeId,
      fullName,
      email: email!,
      phone,
      businessName,
      businessUrl,
      monthlyRevenueRange,
      currentLeadSource,
      responseTime,
      leakConcern,
      auditReadiness,
      reviewTimeline,
      currentPageUrl,
      clientCreatedAt,
      attribution,
    });
  } catch (error) {
    console.error("paid_lead_leak_audit_notification_failed", {
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
      industry: "paid-lead-leak-audit",
      topic: "paid lead leak audit",
      stage: "audit_application",
      path: "/lead-leak-audit-197",
      source: attribution.utmSource ? `utm:${attribution.utmSource}` : "paid-audit-197",
      profile: {
        intakeId,
        monthlyRevenueRange,
        currentLeadSource,
        responseTime,
        leakConcern,
        auditReadiness,
        reviewTimeline,
        currentPageUrl,
        clientCreatedAt,
        attribution,
      },
    });
    await recordSitePulseEvent({
      visitorId,
      path: "/lead-leak-audit-197",
      eventType: "form_submit",
      source: attribution.utmSource ? `utm:${attribution.utmSource}` : "paid-audit-197",
      target: "paid-lead-leak-audit-197",
      value: 1,
    });
  } catch {
    // Never block a buyer because memory or analytics failed.
  }

  return NextResponse.redirect(new URL(routedTo, req.url), { status: 303 });
}
