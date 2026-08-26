import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";
import {
  HOLD_THE_LINE_SERIES_EVENT,
  enrollInEmailSeries,
  sendInternalLeadAlert,
  textLeadBack,
} from "@/lib/leadNotify";
import { recordServerEvent } from "@/lib/analytics/server";

// Intake for the Hold The Line lane (/hold-the-line). Writes a lead the same
// way /api/leads does, then enrolls it in the Hold The Line nurture series by
// firing the hold-the-line-lead event to Resend. Deliberately NOT the
// free-build-lead event: that one belongs to the retired 31-email Free Build
// series and reusing it would drop these leads into the wrong sequence.
//
// Enrollment runs with the service role when it is configured, because the
// lead_emails claim table is admin-only under RLS. Step 0 in lead_emails is
// the enrollment marker, and UNIQUE (lead_id, step) guarantees a lead can
// never be enrolled twice, even if this route and the followups cron overlap.
// Without the service key the lead still saves and Ryan still gets the alert;
// the cron sweep enrolls them on its next run.
//
// The lead does not get the generic "your build request is in my hands" reply
// from notifyNewLead: day 0 of the Hold The Line series is the welcome, and a
// build-flavored auto-reply would read wrong to somebody who just got piled
// on in their comments. Internal alert and the opt-in text still fire.

export async function POST(request: Request) {
  try {
    const body = await request.json();

    for (const f of ["full_name", "email"]) {
      if (!body[f] || typeof body[f] !== "string") {
        return NextResponse.json({ error: `Missing ${f}` }, { status: 400 });
      }
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createSupabaseClient(SUPABASE_URL, serviceKey || SUPABASE_ANON_KEY);

    const smsConsent = body.sms_consent === true;
    const marketingEmailConsent = body.marketing_email_consent === true;
    const phone = body.phone ? String(body.phone).slice(0, 50) : null;

    const lead = {
      full_name: String(body.full_name).slice(0, 200),
      email: String(body.email).slice(0, 200),
      phone,
      business_name: body.business_name ? String(body.business_name).slice(0, 200) : null,
      current_platform: body.current_platform
        ? String(body.current_platform).slice(0, 100)
        : null,
      interest: "hold_the_line",
      goals: body.goals ? String(body.goals).slice(0, 2000) : null,
      best_contact_method: phone && smsConsent ? "text" : "email",
      source: "website",
      utm_source: body.utm_source ? String(body.utm_source).slice(0, 100) : null,
      utm_medium: body.utm_medium ? String(body.utm_medium).slice(0, 100) : null,
      utm_campaign: body.utm_campaign
        ? String(body.utm_campaign).slice(0, 100)
        : "hold-the-line",
      sms_consent: smsConsent && !!phone,
      marketing_email_consent: marketingEmailConsent,
      consent_at: smsConsent || marketingEmailConsent ? new Date().toISOString() : null,
      diagnostic: {
        version: 1,
        source: "hold_the_line_landing",
        next_action:
          "Hold The Line lead. They are dealing with comments, critics, or a platform penalty right now. Speed matters more here than anywhere else on the site.",
      },
    };

    // Reading the row back needs SELECT, which anon RLS does not grant, so the
    // id is only requested when the service role is doing the writing. The
    // anon fallback still saves the lead; enrollment then waits for the cron.
    let leadId: string | null = null;
    if (serviceKey) {
      const inserted = await supabase.from("leads").insert(lead).select("id").maybeSingle();
      if (inserted.error) {
        console.error("Hold The Line lead insert failed:", inserted.error.message);
        return NextResponse.json({ error: "Could not save. Try again." }, { status: 500 });
      }
      leadId = inserted.data?.id ?? null;
    } else {
      const inserted = await supabase.from("leads").insert(lead);
      if (inserted.error) {
        console.error("Hold The Line lead insert failed:", inserted.error.message);
        return NextResponse.json({ error: "Could not save. Try again." }, { status: 500 });
      }
    }

    await recordServerEvent(request, {
      event_name: "lead_created",
      label: "hold_the_line",
      utm_source: lead.utm_source,
      utm_medium: lead.utm_medium,
      utm_campaign: lead.utm_campaign,
    });

    try {
      await sendInternalLeadAlert(lead);
    } catch (e) {
      console.error("Hold The Line lead alert failed:", e);
    }
    try {
      if (lead.sms_consent && lead.phone) await textLeadBack(lead);
    } catch (e) {
      console.error("Hold The Line lead text failed:", e);
    }

    // Series enrollment, fail-soft: a broken provider never blocks the lead.
    try {
      if (serviceKey && leadId) {
        // A paid Playbook buyer never enters the nurture, even if they come
        // back through the front door later. The webhook also stamps their
        // lead rows, but the purchases table is the source of truth.
        const bought = await supabase
          .from("purchases")
          .select("id")
          .ilike("email", lead.email.replace(/[\\%_]/g, (c) => `\\${c}`))
          .eq("kind", "hold-the-line-playbook")
          .eq("status", "paid")
          .limit(1)
          .maybeSingle();

        if (!bought.data) {
          const claim = await supabase
            .from("lead_emails")
            .insert({ lead_id: leadId, step: 0 });
          if (!claim.error) {
            await enrollInEmailSeries(lead.email, HOLD_THE_LINE_SERIES_EVENT);
            await supabase.from("lead_activity").insert({
              lead_id: leadId,
              // 'kind' has a CHECK constraint: stage_change | owner_change |
              // note | task | system | message | delete. Anything else throws.
              kind: "system",
              detail: "Enrolled in the Hold The Line email series",
            });
          }
        }
      }
    } catch (e) {
      console.error("Hold The Line series enroll failed:", e);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
