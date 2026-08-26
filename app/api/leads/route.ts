import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";
import { INTEREST_LABELS, notifyNewLead } from "@/lib/leadNotify";
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

    const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

    const smsConsent = body.sms_consent === true;
    const marketingEmailConsent = body.marketing_email_consent === true;
    const phone = body.phone ? String(body.phone).slice(0, 50) : null;

    const lead = {
      full_name: String(body.full_name).slice(0, 200),
      email: String(body.email).slice(0, 200),
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
      consent_at: smsConsent || marketingEmailConsent ? new Date().toISOString() : null,
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

    // Alert Ryan, reply to the lead, text them back. Shared with the Meta
    // instant form pipeline so both doors behave the same.
    await notifyNewLead({
      ...lead,
      funnel:
        diagnostic && typeof (diagnostic as { source?: unknown }).source === "string"
          ? String((diagnostic as { source?: unknown }).source)
          : null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
