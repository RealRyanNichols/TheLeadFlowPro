import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";
import { INTEREST_LABELS, notifyNewLeadSms } from "@/lib/leadNotify";
import { deliverLeadEmailNotificationsForLead } from "@/lib/leadEmailNotifications";
import { leadFlowSupabaseRuntimeIssues } from "@/lib/metaCampaignGuard";
import { recordServerEvent } from "@/lib/analytics/server";

const ALLOWED_INTERESTS = Object.keys(INTEREST_LABELS);

const MODULE_IDS = new Set([
  "website_funnels",
  "crm_pipeline",
  "admin_workspace",
  "customer_portal",
  "forms_tools",
  "courses_training",
  "archive_library",
  "email_automation",
  "calls_texts",
  "booking_routing",
  "ads_attribution",
  "analytics_reporting",
  "ai_agent",
  "payments_checkout",
  "commerce_hub",
  "connector_mcp",
]);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const required = ["full_name", "email"];
    for (const f of required) {
      if (!body[f] || typeof body[f] !== "string") {
        return NextResponse.json({ error: `Missing ${f}` }, { status: 400 });
      }
    }

    const fullName = body.full_name.trim();
    const email = body.email.trim();
    if (!fullName || fullName.length > 200) {
      return NextResponse.json({ error: "Enter a valid name" }, { status: 400 });
    }
    if (
      email.length < 3 ||
      email.length > 200 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }

    // The transactional email trigger accepts only service-role inserts. This
    // keeps the outbox marker genuinely server-controlled instead of letting a
    // direct anonymous Supabase insert enqueue arbitrary outbound email.
    const runtimeIdentityIssues = leadFlowSupabaseRuntimeIssues(SUPABASE_URL);
    if (runtimeIdentityIssues.length) {
      console.error("Lead intake identity check failed:", runtimeIdentityIssues.join("; "));
      return NextResponse.json({ error: "Lead intake identity check failed" }, { status: 503 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!serviceKey) {
      console.error("Lead intake unavailable: SUPABASE_SERVICE_ROLE_KEY missing");
      return NextResponse.json({ error: "Lead intake is not configured" }, { status: 503 });
    }
    const supabase = createSupabaseClient(SUPABASE_URL, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const desiredModules = Array.isArray(body.desired_modules)
      ? body.desired_modules
          .filter((m: unknown) => typeof m === "string" && MODULE_IDS.has(m))
          .slice(0, 20)
      : [];

    // The guided router sends the full diagnostic: answers, labels,
    // recommendation, and next action. Stored as jsonb for the admin
    // System Map viewer. Size-capped to keep the row sane.
    let diagnostic: object | null = null;
    if (body.diagnostic && typeof body.diagnostic === "object") {
      const raw = JSON.stringify(body.diagnostic);
      if (raw.length <= 16000) diagnostic = JSON.parse(raw);
    }
    // Server-controlled outbox marker. The database trigger queues immediate
    // emails only for the two lead-intake APIs, not every internal workflow
    // that happens to create a CRM lead.
    diagnostic = { ...(diagnostic ?? {}), notification_pipeline: "lead_intake_v1" };

    const smsConsent = body.sms_consent === true;
    const marketingEmailConsent = body.marketing_email_consent === true;
    const phone = body.phone ? String(body.phone).slice(0, 50) : null;

    const leadId = randomUUID();
    const lead = {
      id: leadId,
      full_name: fullName,
      email,
      phone,
      business_name: body.business_name ? String(body.business_name).slice(0, 200) : null,
      website_url: body.website_url ? String(body.website_url).slice(0, 300) : null,
      current_platform: body.current_platform ? String(body.current_platform).slice(0, 100) : null,
      industry: body.industry ? String(body.industry).slice(0, 100) : null,
      desired_modules: desiredModules,
      interest: ALLOWED_INTERESTS.includes(body.interest) ? body.interest : "unsure",
      goals: body.goals ? String(body.goals).slice(0, 2000) : null,
      budget_range: body.budget_range ? String(body.budget_range).slice(0, 50) : null,
      timeline: body.timeline ? String(body.timeline).slice(0, 100) : null,
      best_contact_method: body.best_contact_method
        ? String(body.best_contact_method).slice(0, 50)
        : null,
      source: "website",
      utm_source: body.utm_source ? String(body.utm_source).slice(0, 100) : null,
      utm_medium: body.utm_medium ? String(body.utm_medium).slice(0, 100) : null,
      utm_campaign: body.utm_campaign ? String(body.utm_campaign).slice(0, 100) : null,
      sms_consent: smsConsent && !!phone,
      marketing_email_consent: marketingEmailConsent,
      consent_at:
        (smsConsent && !!phone) || marketingEmailConsent ? new Date().toISOString() : null,
      diagnostic,
    };

    const { error } = await supabase.from("leads").insert(lead);

    if (error) {
      console.error("Lead insert failed:", error.message);
      return NextResponse.json({ error: "Could not save. Try again." }, { status: 500 });
    }

    // First-party conversion event: attribution only (UTM + anonymous
    // visitor/session cookies), never the lead's identity.
    await recordServerEvent(request, {
      event_name: "lead_created",
      label: lead.interest,
      utm_source: lead.utm_source,
      utm_medium: lead.utm_medium,
      utm_campaign: lead.utm_campaign,
    });

    // The database trigger committed the owner-alert and applicant-welcome
    // outbox rows in the same transaction as this lead. Try them now for an
    // immediate reply; a protected cron retries any provider failure.
    try {
      await deliverLeadEmailNotificationsForLead(supabase, leadId);
    } catch (error) {
      console.error(
        "Immediate lead email delivery failed; queued retry remains:",
        error instanceof Error ? error.message : error,
      );
    }

    // SMS is intentionally outside the email outbox and remains best effort.
    await notifyNewLeadSms(lead);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
