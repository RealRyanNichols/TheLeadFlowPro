import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";
import { LEAD_FOLLOW_UP } from "@/lib/leadFollowUp";

// Post-payment writing intake for the Lead Follow-Up Campaign.
//
// Attaches the buyer's answers to the lead row the funnel already created,
// matched on the email they paid with. Service role is required to write to
// leads/lead_tasks, which is why this is a server route and never a direct
// browser call. Nothing here touches Stripe or a card number, and no price
// is read from the request.

function text(value: unknown, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function escapeIlike(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export async function POST(request: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "not_configured" }, { status: 501 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const email = text(body.email, 200)?.toLowerCase();
  const offer = text(body.offer, 500);
  const customer = text(body.customer, 500);
  if (!email || !offer || !customer) {
    return NextResponse.json(
      { error: "Email, the offer, and who buys it are all required." },
      { status: 400 },
    );
  }

  const intake = {
    offer,
    customer,
    objection: text(body.objection, 2000),
    voice: text(body.voice, 2000),
    review_link: text(body.review_link, 500),
    session_id: text(body.session_id, 200),
    submitted_at: new Date().toISOString(),
  };

  const supabase = createSupabaseClient(SUPABASE_URL, serviceKey);

  const found = await supabase
    .from("leads")
    .select("id, full_name, business_name, diagnostic")
    .ilike("email", escapeIlike(email))
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (found.error) {
    console.error("Lead Follow-Up intake lookup failed:", found.error.code);
    return NextResponse.json({ error: "Could not save that. Try again." }, { status: 500 });
  }

  // No matching lead means they paid with a different email than they ordered
  // with. Keep the answers rather than dropping them: create the row so the
  // work is not lost, and let the alert tell Ryan to reconcile.
  let leadId: string;
  let leadName = "Lead Follow-Up buyer";
  if (found.data) {
    leadId = found.data.id;
    leadName = found.data.full_name || leadName;
    const diagnostic =
      found.data.diagnostic && typeof found.data.diagnostic === "object"
        ? (found.data.diagnostic as Record<string, unknown>)
        : {};
    const updated = await supabase
      .from("leads")
      .update({
        diagnostic: { ...diagnostic, source: "lead_follow_up_funnel", intake },
      })
      .eq("id", leadId);
    if (updated.error) {
      console.error("Lead Follow-Up intake update failed:", updated.error.code);
      return NextResponse.json({ error: "Could not save that. Try again." }, { status: 500 });
    }
  } else {
    const inserted = await supabase
      .from("leads")
      .insert({
        full_name: leadName,
        email,
        interest: "done_for_you",
        goals: `LEAD FOLLOW-UP CAMPAIGN intake arrived without a matching order row. Offer: ${offer}`,
        best_contact_method: "email",
        source: "lead_follow_up_funnel",
        sms_consent: false,
        marketing_email_consent: false,
        diagnostic: {
          version: 1,
          source: "lead_follow_up_funnel",
          offer: LEAD_FOLLOW_UP.id,
          intake,
          next_action:
            "Intake arrived with no matching order. Reconcile against Stripe before writing.",
        },
      })
      .select("id")
      .single();
    if (inserted.error) {
      console.error("Lead Follow-Up intake insert failed:", inserted.error.code);
      return NextResponse.json({ error: "Could not save that. Try again." }, { status: 500 });
    }
    leadId = inserted.data.id;
  }

  // One open writing task per buyer, so a resubmitted intake does not stack
  // duplicates in the queue.
  const openTask = await supabase
    .from("lead_tasks")
    .select("id")
    .eq("lead_id", leadId)
    .eq("title", "Write the Lead Follow-Up Campaign")
    .is("completed_at", null)
    .limit(1)
    .maybeSingle();
  if (!openTask.error && !openTask.data) {
    await supabase.from("lead_tasks").insert({
      lead_id: leadId,
      title: "Write the Lead Follow-Up Campaign",
      due_date: new Date(Date.now() + LEAD_FOLLOW_UP.turnaroundDays * 86_400_000)
        .toISOString()
        .slice(0, 10),
    });
  }

  await supabase.from("lead_activity").insert({
    lead_id: leadId,
    kind: "system",
    detail: `Lead Follow-Up Campaign intake submitted. Offer: ${offer}`,
  });

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "The LeadFlow Pro <leadflow@theleadflowpro.com>",
        to: ["hello@theleadflowpro.com"],
        subject: `✍️ FOLLOW-UP CAMPAIGN INTAKE: ${leadName} — ${email}`,
        text: [
          found.data ? "" : "NO MATCHING ORDER ROW. Reconcile against Stripe before writing.",
          `Offer: ${offer}`,
          `Buyer: ${customer}`,
          intake.objection ? `Objection: ${intake.objection}` : "",
          intake.voice ? `Their voice:\n${intake.voice}` : "",
          intake.review_link ? `Review link: ${intake.review_link}` : "",
          "",
          "Admin: https://www.theleadflowpro.com/admin/leads",
        ]
          .filter(Boolean)
          .join("\n"),
      }),
    }).catch(() => null);
  }

  return NextResponse.json({ ok: true });
}
