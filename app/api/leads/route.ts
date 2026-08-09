import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";

const INTEREST_LABELS: Record<string, string> = {
  learn: "Learn It (training)",
  build_with_you: "Build It With You",
  done_for_you: "Done For You",
  unsure: "Not sure yet",
  blueprint: "System Map",
  launch_system: "LeadFlow Launch",
  industry_os: "Industry OS",
  custom_platform: "Custom Platform",
  operations: "Operations Partner",
};

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

// Automation emails via Resend. Activates automatically once RESEND_API_KEY
// is set in Vercel env vars. Never blocks the lead from being saved.
async function sendLeadEmails(lead: {
  full_name: string;
  email: string;
  phone?: string | null;
  business_name?: string | null;
  interest: string;
  goals?: string | null;
  current_platform?: string | null;
  timeline?: string | null;
  utm_source?: string | null;
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;

  const send = (payload: object) =>
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }).catch(() => {});

  const first = lead.full_name.split(" ")[0];

  await send({
    from: "The LeadFlow Pro <hello@theleadflowpro.com>",
    to: ["hello@theleadflowpro.com"],
    subject: `NEW LEAD: ${lead.full_name}${lead.business_name ? ` (${lead.business_name})` : ""} — ${INTEREST_LABELS[lead.interest] ?? lead.interest}`,
    text: [
      `Name: ${lead.full_name}`,
      `Business: ${lead.business_name || "-"}`,
      `Email: ${lead.email}`,
      `Phone: ${lead.phone || "-"}`,
      `Recommended path: ${INTEREST_LABELS[lead.interest] ?? lead.interest}`,
      `Home base: ${lead.current_platform || "-"}`,
      `Timeline: ${lead.timeline || "-"}`,
      `Source: ${lead.utm_source || "direct"}`,
      ``,
      `System map summary:`,
      lead.goals || "-",
      ``,
      `Manage: https://www.theleadflowpro.com/admin`,
    ].join("\n"),
  });

  await send({
    from: "Ryan Nichols <hello@theleadflowpro.com>",
    to: [lead.email],
    reply_to: "hello@theleadflowpro.com",
    subject: `Got it, ${first}. Your system map is in my hands.`,
    text: [
      `${first},`,
      ``,
      `Your system map request just landed in my system. Not a ticket queue. Mine. I read every one of these myself.`,
      ``,
      `Here is what happens next:`,
      ``,
      `1. I review the map you built: the problem, the home base, the channels, and the modules you picked.`,
      `2. I reach out within one business day on the channel you chose.`,
      `3. You leave that first conversation knowing your next three moves, whether you hire me or not.`,
      ``,
      `Want a head start? The live systems I have already built and handed over are here:`,
      `https://www.theleadflowpro.com/portfolio`,
      ``,
      `Talk soon,`,
      `Ryan Nichols`,
      `The LeadFlow Pro`,
      `https://www.theleadflowpro.com`,
    ].join("\n"),
  });
}

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

    // Automation emails (no-op until RESEND_API_KEY is configured)
    await sendLeadEmails(lead);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
