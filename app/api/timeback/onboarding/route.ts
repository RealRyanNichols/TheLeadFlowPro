import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";

// Receives the Time Back welcome intake (/go/time-back/welcome) and stamps it
// onto the buyer's lead: business details, confirmed platforms, access grant
// status, and the storage paths of their voice samples and brand assets.
// Files never pass through here; the browser uploads them straight to the
// private intake bucket. Needs SUPABASE_SERVICE_ROLE_KEY to write the lead;
// falls back to the internal alert email so an intake is never lost silently.

const ACCESS_KEYS = ["meta", "x", "email"] as const;
const PLATFORM_IDS = ["facebook", "instagram", "x"] as const;

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().slice(0, max);
  return v || null;
}

function escapeIlike(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const email = clean(body.email, 200);
  const fullName = clean(body.full_name, 200);
  const businessName = clean(body.business_name, 200);
  if (!email || !fullName || !businessName) {
    return NextResponse.json({ error: "Name, business, and email are required." }, { status: 400 });
  }

  const platforms = Array.isArray(body.platforms)
    ? body.platforms.filter((p): p is string =>
        PLATFORM_IDS.includes(p as (typeof PLATFORM_IDS)[number]),
      )
    : [];
  const handles: Record<string, string> = {};
  if (body.handles && typeof body.handles === "object") {
    for (const id of PLATFORM_IDS) {
      const v = clean((body.handles as Record<string, unknown>)[id], 200);
      if (v) handles[id] = v;
    }
  }
  const access: Record<string, string> = {};
  if (body.access && typeof body.access === "object") {
    for (const key of ACCESS_KEYS) {
      const v = (body.access as Record<string, unknown>)[key];
      if (v === "done" || v === "kickoff") access[key] = v;
    }
  }
  const uploads = Array.isArray(body.uploads)
    ? body.uploads
        .filter((u): u is string => typeof u === "string" && u.startsWith("timeback/"))
        .map((u) => u.slice(0, 300))
        .slice(0, 20)
    : [];

  const onboarding = {
    completed_at: new Date().toISOString(),
    stripe_session_id: clean(body.stripe_session_id, 200),
    business_name: businessName,
    full_name: fullName,
    phone: clean(body.phone, 50),
    website_url: clean(body.website_url, 300),
    platforms,
    handles,
    email_platform: clean(body.email_platform, 120),
    access,
    voice_notes: clean(body.voice_notes, 1500),
    notes: clean(body.notes, 1500),
    uploads,
  };

  const accessSummary = ACCESS_KEYS.map(
    (k) => `${k}: ${access[k] === "done" ? "done" : access[k] === "kickoff" ? "wants kickoff walkthrough" : "no answer"}`,
  ).join(", ");
  const summary = [
    `Time Back welcome intake from ${fullName} (${businessName}, ${email}).`,
    `Platforms: ${platforms.join(", ") || "none picked"}.`,
    `Access: ${accessSummary}.`,
    onboarding.email_platform ? `Email platform: ${onboarding.email_platform}.` : "",
    uploads.length ? `${uploads.length} file(s) in intake storage.` : "No files uploaded.",
    "Next: send the partner access invites from hello@theleadflowpro.com.",
  ]
    .filter(Boolean)
    .join(" ");

  let stored = false;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    try {
      const supabase = createSupabaseClient(SUPABASE_URL, serviceKey);
      const found = await supabase
        .from("leads")
        .select("id, diagnostic, phone, website_url, business_name")
        .ilike("email", escapeIlike(email))
        .eq("diagnostic->>source", "time_back_funnel")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (found.error) throw new Error(`Lead lookup failed: ${found.error.code}`);

      if (found.data) {
        const lead = found.data;
        const diagnostic =
          lead.diagnostic && typeof lead.diagnostic === "object" ? lead.diagnostic : {};
        const updates: Record<string, unknown> = {
          diagnostic: { ...diagnostic, onboarding },
        };
        if (!lead.phone && onboarding.phone) updates.phone = onboarding.phone;
        if (!lead.website_url && onboarding.website_url) updates.website_url = onboarding.website_url;
        if (!lead.business_name) updates.business_name = businessName;
        const updated = await supabase.from("leads").update(updates).eq("id", lead.id);
        if (updated.error) throw new Error(`Lead update failed: ${updated.error.code}`);

        const activity = await supabase.from("lead_activity").insert({
          lead_id: lead.id,
          kind: "system",
          detail: summary.slice(0, 2000),
        });
        if (activity.error) throw new Error(`Activity insert failed: ${activity.error.code}`);
      } else {
        // They paid through Stripe but their lead never saved (or used a
        // different email at checkout). Create the lead so the order has a
        // home in the CRM instead of dropping the intake.
        const inserted = await supabase.from("leads").insert({
          full_name: fullName,
          email,
          phone: onboarding.phone,
          business_name: businessName,
          website_url: onboarding.website_url,
          interest: "done_for_you",
          goals: summary.slice(0, 2000),
          best_contact_method: onboarding.phone ? "text" : "email",
          source: "website",
          sms_consent: false,
          marketing_email_consent: false,
          diagnostic: {
            version: 2,
            source: "time_back_funnel",
            onboarding,
            next_action:
              "Welcome intake arrived without a matching funnel lead. Match it to the Stripe payment, then send the access invites.",
          },
        });
        if (inserted.error) throw new Error(`Lead insert failed: ${inserted.error.code}`);
      }
      stored = true;
    } catch (error) {
      console.error(
        "Time Back onboarding write failed:",
        error instanceof Error ? error.message : "unknown error",
      );
    }
  }

  // Ryan gets the intake in his inbox either way. When the database write is
  // unavailable this alert is the only copy, so treat its failure as real.
  let alerted = false;
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "The LeadFlow Pro <hello@theleadflowpro.com>",
          to: ["hello@theleadflowpro.com"],
          subject: `🛠️ TIME BACK INTAKE: ${businessName} — ${email}`,
          text: [
            summary,
            "",
            onboarding.voice_notes ? `Voice notes: ${onboarding.voice_notes}` : "",
            onboarding.notes ? `Notes: ${onboarding.notes}` : "",
            Object.keys(handles).length
              ? `Handles: ${Object.entries(handles)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(", ")}`
              : "",
            uploads.length ? `Files:\n${uploads.join("\n")}` : "",
            "",
            "Admin: https://www.theleadflowpro.com/admin/time-back",
          ]
            .filter(Boolean)
            .join("\n"),
        }),
      });
      alerted = r.ok;
    } catch {
      alerted = false;
    }
  }

  if (!stored && !alerted) {
    return NextResponse.json(
      { error: "The intake could not be saved. Reply to your receipt email with these details." },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true });
}
