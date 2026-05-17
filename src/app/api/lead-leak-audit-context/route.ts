import { NextRequest, NextResponse } from "next/server";
import { attributionNoteBlock, extractFormAttribution } from "@/lib/form-attribution";
import { rememberPublicVisitor } from "@/lib/lead-memory";
import { sendPaidAuditContextNotification } from "@/lib/paid-audit-notifications";
import { prisma } from "@/lib/prisma";
import { recordSitePulseEvent } from "@/lib/site-pulse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pickStr(v: FormDataEntryValue | null, max = 1000): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed ? trimmed.slice(0, max) : null;
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

  const email = pickStr(form.get("email"), 200)?.toLowerCase() ?? null;
  const fullName = pickStr(form.get("fullName"), 120);
  const phone = pickStr(form.get("phone"), 40);
  const businessName = pickStr(form.get("businessName"), 200);
  const businessUrl = normalizeUrl(pickStr(form.get("businessUrl"), 300));
  const linksToReview = pickStr(form.get("linksToReview"), 2000);
  const leadPathNotes = pickStr(form.get("leadPathNotes"), 2200);
  const accessNotes = pickStr(form.get("accessNotes"), 1600);
  const currentPageUrl = pickStr(form.get("currentPageUrl"), 500);
  const clientCreatedAt = pickStr(form.get("clientCreatedAt"), 80);
  const visitorId = pickStr(form.get("visitorId"), 80) ?? crypto.randomUUID();
  const attribution = extractFormAttribution(form, {
    formType: "paid_lead_leak_audit_197_context",
    sourcePage: "/lead-leak-audit-197/thank-you",
  });

  if (!validEmail(email)) return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  if (!linksToReview && !leadPathNotes && !accessNotes) {
    return NextResponse.json({ error: "missing_context" }, { status: 400 });
  }

  const routedTo = "/lead-leak-audit-197/thank-you?context=1";
  const safeName = fullName || email!.split("@")[0] || "Audit follow-up";
  const notes = [
    attributionNoteBlock(attribution),
    "Post-submit context for the $197 Lead Leak Audit.",
    `email: ${email}`,
    fullName ? `name: ${fullName}` : null,
    phone ? `phone: ${phone}` : null,
    businessName ? `business: ${businessName}` : null,
    businessUrl ? `website: ${businessUrl}` : null,
    linksToReview ? `links_to_review_first:\n${linksToReview}` : null,
    leadPathNotes ? `lead_path_notes:\n${leadPathNotes}` : null,
    accessNotes ? `access_notes_no_passwords:\n${accessNotes}` : null,
    currentPageUrl ? `current_page_url: ${currentPageUrl}` : null,
    clientCreatedAt ? `client_created_at: ${clientCreatedAt}` : null,
    "status: new follow-up context for Ryan to review with the original paid audit application.",
  ]
    .filter(Boolean)
    .join("\n\n");

  let intakeId: string | null = null;
  try {
    const intake = await prisma.publicIntake.create({
      data: {
        fullName: safeName,
        email: email!,
        phone,
        businessName,
        businessUrl,
        industry: "paid-lead-leak-audit-follow-up",
        platforms: {},
        monthlyRevenueRange: null,
        biggestGoal: "paid-lead-leak-audit-197-follow-up",
        biggestBlocker: leadPathNotes || linksToReview || accessNotes || "Follow-up context after paid audit application.",
        budgetTier: "follow-up-context",
        bestContactMethod: phone ? "any" : "email",
        notes,
        routedTo,
      },
    });
    intakeId = intake.id;
  } catch (error) {
    console.error("paid_lead_leak_audit_context_save_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    try {
      await sendPaidAuditContextNotification({
        intakeId: "database-save-failed",
        fullName,
        email: email!,
        phone,
        businessName,
        businessUrl,
        linksToReview,
        leadPathNotes,
        accessNotes,
        currentPageUrl,
        clientCreatedAt,
        attribution,
      });
    } catch (notificationError) {
      console.error("paid_lead_leak_audit_context_failure_notification_failed", {
        error: notificationError instanceof Error ? notificationError.message : "unknown",
      });
    }
    return NextResponse.redirect(new URL("/lead-leak-audit-197/thank-you?context_error=1", req.url), {
      status: 303,
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
      topic: "paid lead leak audit context",
      stage: "audit_follow_up_context",
      path: "/lead-leak-audit-197/thank-you",
      source: attribution.utmSource ? `utm:${attribution.utmSource}` : "paid-audit-197-thank-you",
      profile: {
        intakeId,
        linksToReview,
        leadPathNotes,
        accessNotes,
        currentPageUrl,
        clientCreatedAt,
        attribution,
      },
    });
    await recordSitePulseEvent({
      visitorId,
      path: "/lead-leak-audit-197/thank-you",
      eventType: "form_submit",
      source: attribution.utmSource ? `utm:${attribution.utmSource}` : "paid-audit-197-thank-you",
      target: "paid-lead-leak-audit-context",
      value: 1,
    });
  } catch {
    // Never block a buyer because memory or analytics failed.
  }

  try {
    await sendPaidAuditContextNotification({
      intakeId,
      fullName,
      email: email!,
      phone,
      businessName,
      businessUrl,
      linksToReview,
      leadPathNotes,
      accessNotes,
      currentPageUrl,
      clientCreatedAt,
      attribution,
    });
  } catch (error) {
    console.error("paid_lead_leak_audit_context_notification_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  return NextResponse.redirect(new URL(routedTo, req.url), { status: 303 });
}
