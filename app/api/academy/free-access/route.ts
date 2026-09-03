import { NextResponse } from "next/server";
import {
  ACADEMY_ACCESS_COOKIE,
  ACADEMY_ACCESS_DAYS,
  academyAccessTokenHash,
  createAcademyAccessToken,
} from "@/lib/academyLeadAccess";
import { createServiceClient } from "@/lib/supabase/service";
import { recordServerEvent } from "@/lib/analytics/server";

export const runtime = "nodejs";

function cleanText(value: unknown, max: number) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").slice(0, max)
    : "";
}

function validEmail(value: unknown) {
  const email = cleanText(value, 254).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function validPhone(value: unknown) {
  const phone = cleanText(value, 50);
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 ? phone : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const fullName = cleanText(body.fullName, 200);
    const email = validEmail(body.email);
    const phone = validPhone(body.phone);
    const marketingEmailConsent = body.marketingEmailConsent === true;
    const smsConsent = body.smsConsent === true;
    const utm = {
      utm_source: cleanText(body.utm_source, 100) || null,
      utm_medium: cleanText(body.utm_medium, 100) || null,
      utm_campaign: cleanText(body.utm_campaign, 100) || null,
    };
    if (fullName.length < 2 || !email || !phone) {
      return NextResponse.json(
        { error: "Enter your name, a valid email, and a valid phone number." },
        { status: 400 },
      );
    }

    const service = createServiceClient();
    const { data: existingLead } = await service
      .from("leads")
      .select("id, marketing_email_consent, sms_consent, consent_at, diagnostic")
      .eq("email", email)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let leadId = existingLead?.id as string | undefined;
    const consentAt = marketingEmailConsent || smsConsent
      ? new Date().toISOString()
      : null;
    if (existingLead?.id) {
      // An existing lead keeps its source, interest, and funnel. Rewriting
      // those used to pull a Free Website applicant out of the 30-day
      // sequence the moment they unlocked a free course. Record the unlock
      // on the lead instead and leave the original journey intact.
      leadId = existingLead.id;
      const previousDiagnostic =
        existingLead.diagnostic && typeof existingLead.diagnostic === "object"
          ? (existingLead.diagnostic as Record<string, unknown>)
          : {};
      const { error } = await service
        .from("leads")
        .update({
          phone,
          marketing_email_consent:
            Boolean(existingLead.marketing_email_consent) || marketingEmailConsent,
          sms_consent: Boolean(existingLead.sms_consent) || smsConsent,
          consent_at: consentAt ?? existingLead.consent_at,
          diagnostic: {
            ...previousDiagnostic,
            free_courses: ["offer-engine", "lead-capture-system"],
            academy_free_access_at: new Date().toISOString(),
          },
        })
        .eq("id", leadId);
      if (error) throw new Error(`Lead update failed: ${error.code}`);
      await service.from("lead_activity").insert({
        lead_id: leadId,
        kind: "system",
        detail: "Unlocked the two free Operator Academy courses (Offer Engine, Lead Capture System).",
      });
    } else {
      const { data: lead, error } = await service
        .from("leads")
        .insert({
          full_name: fullName,
          email,
          phone,
          interest: "learn",
          source: "operator_academy_free_access",
          goals: "Requested access to the free Operator Academy courses.",
          marketing_email_consent: marketingEmailConsent,
          sms_consent: smsConsent,
          consent_at: consentAt,
          ...utm,
          diagnostic: {
            source: "operator_academy_free_access",
            free_courses: ["offer-engine", "lead-capture-system"],
            // Server-owned marker: queues the owner alert and the academy
            // welcome through the same durable outbox as every other intake.
            notification_pipeline: "lead_intake_v1",
          },
        })
        .select("id")
        .single();
      if (error || !lead) throw new Error(`Lead insert failed: ${error?.code ?? "missing"}`);
      leadId = lead.id;
    }
    if (!leadId) throw new Error("Lead record was not created");

    await recordServerEvent(request, {
      event_name: "lead_created",
      label: "operator_academy_free_access",
      ...utm,
    });

    const token = createAcademyAccessToken();
    const expiresAt = new Date(
      Date.now() + ACADEMY_ACCESS_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { error: tokenError } = await service
      .from("academy_lead_access_tokens")
      .insert({
        lead_id: leadId,
        token_hash: academyAccessTokenHash(token),
        expires_at: expiresAt,
      });
    if (tokenError) throw new Error(`Access token save failed: ${tokenError.code}`);

    const response = NextResponse.json({
      ok: true,
      redirectTo: "/training/offer-engine",
    });
    response.cookies.set(ACADEMY_ACCESS_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ACADEMY_ACCESS_DAYS * 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    console.error(
      "Academy free access failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return NextResponse.json(
      { error: "Free access could not be created. Please try again." },
      { status: 500 },
    );
  }
}
