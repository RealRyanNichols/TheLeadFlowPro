import { NextResponse } from "next/server";
import crypto from "node:crypto";
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";
import { sendInternalLeadAlert } from "@/lib/leadNotify";
import {
  isUnmappedWebsiteLaunchPaymentLinkCandidate,
  isWebsiteLaunchDeposit,
  safeStripeKind,
  WEBSITE_LAUNCH_PAYMENT_LINK_ID,
  WEBSITE_LAUNCH_PURCHASE_KIND,
  stripePaymentLinkId,
  websiteLaunchCustomer,
  type StripeCheckoutSession,
} from "@/lib/stripeCheckout";

// Stripe webhook: records paid checkouts and unlocks training access.
// Needs STRIPE_WEBHOOK_SECRET (from Stripe dashboard → Webhooks) and
// SUPABASE_SERVICE_ROLE_KEY (Supabase → Settings → API) in Vercel env vars.
// Endpoint to register in Stripe: https://www.theleadflowpro.com/api/stripe-webhook
// Events to send: checkout.session.completed, invoice.finalized, invoice.sent,
// invoice.paid, invoice.payment_failed, invoice.voided, and invoice.marked_uncollectible

function verifySignature(payload: string, header: string, secret: string): boolean {
  try {
    const fields = header.split(",").map((part) => part.trim().split("="));
    const t = fields.find(([key]) => key === "t")?.[1];
    const signatures = fields
      .filter(([key, value]) => key === "v1" && !!value)
      .map(([, value]) => value);
    if (!t || signatures.length === 0) return false;
    // Reject stale events (>5 min) to block replay
    if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${t}.${payload}`)
      .digest("hex");
    return signatures.some((signature) => {
      const expectedBuffer = Buffer.from(expected, "hex");
      const receivedBuffer = Buffer.from(signature, "hex");
      return (
        expectedBuffer.length === receivedBuffer.length &&
        crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
      );
    });
  } catch {
    return false;
  }
}

async function sendPurchaseEmails(email: string, kind: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const send = (payload: object) =>
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});

  await send({
    from: "The LeadFlow Pro <hello@theleadflowpro.com>",
    to: ["hello@theleadflowpro.com"],
    subject: `💰 PURCHASE: ${kind} | ${email}`,
    text: `New purchase.\n\nProduct: ${kind}\nBuyer: ${email}\n\nAdmin: https://www.theleadflowpro.com/admin`,
  });
  await send({
    from: "Ryan Nichols <hello@theleadflowpro.com>",
    to: [email],
    reply_to: "hello@theleadflowpro.com",
    subject: "You're in. Here's your training.",
    text: [
      "Welcome to Own Your Platform.",
      "",
      "Your access is live. Here's how to get in:",
      "",
      `1. Create your login with THIS email address (${email}):`,
      "   https://www.theleadflowpro.com/login",
      "2. Head to the training area and start at the top:",
      "   https://www.theleadflowpro.com/training",
      "",
      "Work the courses in order. By the capstone you'll have your own platform live on your own domain, with code in your GitHub and data in your database.",
      "",
      "Stuck on anything? Reply to this email. I read every one.",
      "",
      "Ryan Nichols",
      "The LeadFlow Pro | Own your platform.",
    ].join("\n"),
  });
}

type IntakeLead = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  business_name: string | null;
  status: string;
  source: string | null;
  external_id: string | null;
};

const INTAKE_LEAD_FIELDS =
  "id, full_name, email, phone, business_name, status, source, external_id";

function escapeIlike(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

async function findWebsiteLaunchLead(
  supabase: SupabaseClient,
  session: StripeCheckoutSession,
) {
  const sessionId = typeof session.id === "string" ? session.id.slice(0, 200) : "";
  const customer = websiteLaunchCustomer(session);
  if (!sessionId || !customer.email) {
    throw new Error("Paid Website Launch checkout is missing its session ID or email");
  }

  const externalId = `stripe_checkout:${sessionId}`;
  const byCheckout = await supabase
    .from("leads")
    .select(INTAKE_LEAD_FIELDS)
    .eq("external_id", externalId)
    .is("deleted_at", null)
    .maybeSingle();
  if (byCheckout.error) throw new Error(`Lead lookup failed: ${byCheckout.error.code}`);

  let lead = byCheckout.data as IntakeLead | null;
  if (!lead) {
    const byEmail = await supabase
      .from("leads")
      .select(INTAKE_LEAD_FIELDS)
      .ilike("email", escapeIlike(customer.email))
      .is("deleted_at", null)
      .eq("is_test", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (byEmail.error) throw new Error(`Lead email lookup failed: ${byEmail.error.code}`);
    lead = byEmail.data as IntakeLead | null;
  }

  if (!lead) {
    const source = stripePaymentLinkId(session) ? "stripe_payment_link" : "stripe_checkout";
    const inserted = await supabase
      .from("leads")
      .insert({
        full_name: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        interest: "launch_system",
        goals:
          "Paid the $500 Website Launch deposit for the approved $1,000 five-page base scope. Intake is ready. The final $500 is due only after approval and before launch.",
        budget_range: "$1,000 base scope | $500 deposit paid",
        timeline: "Deposit paid; intake ready",
        best_contact_method: "email",
        source,
        utm_source: "stripe",
        utm_medium: stripePaymentLinkId(session) ? "payment_link" : "checkout",
        utm_campaign: "website_launch",
        sms_consent: false,
        marketing_email_consent: false,
        external_id: externalId,
        diagnostic: {
          version: 1,
          source,
          offer: "website_launch",
          approved_base_scope_usd: 1000,
          deposit_paid_usd: 500,
          next_action: "Start Website Launch intake against the approved five-page base scope.",
        },
      })
      .select(INTAKE_LEAD_FIELDS)
      .single();

    if (inserted.error?.code === "23505") {
      const raced = await supabase
        .from("leads")
        .select(INTAKE_LEAD_FIELDS)
        .eq("external_id", externalId)
        .is("deleted_at", null)
        .single();
      if (raced.error) throw new Error(`Lead race recovery failed: ${raced.error.code}`);
      lead = raced.data as IntakeLead;
    } else if (inserted.error) {
      throw new Error(`Lead insert failed: ${inserted.error.code}`);
    } else {
      lead = inserted.data as IntakeLead;
    }
  } else {
    const updates: Record<string, string> = { interest: "launch_system" };
    if (!lead.phone && customer.phone) updates.phone = customer.phone;
    if (["won", "lost"].includes(lead.status)) updates.status = "new";
    if (!lead.external_id) updates.external_id = externalId;

    const updated = await supabase
      .from("leads")
      .update(updates)
      .eq("id", lead.id)
      .select(INTAKE_LEAD_FIELDS)
      .single();
    if (updated.error?.code === "23505") {
      const raced = await supabase
        .from("leads")
        .select(INTAKE_LEAD_FIELDS)
        .eq("external_id", externalId)
        .is("deleted_at", null)
        .single();
      if (raced.error) throw new Error(`Lead update recovery failed: ${raced.error.code}`);
      lead = raced.data as IntakeLead;
    } else if (updated.error) {
      throw new Error(`Lead update failed: ${updated.error.code}`);
    } else {
      lead = updated.data as IntakeLead;
    }
  }

  return { customer, lead, sessionId };
}

async function ensureWebsiteLaunchIntake(
  supabase: SupabaseClient,
  session: StripeCheckoutSession,
) {
  const { customer, lead, sessionId } = await findWebsiteLaunchLead(supabase, session);

  const openTask = await supabase
    .from("lead_tasks")
    .select("id")
    .eq("lead_id", lead.id)
    .eq("title", "Start Website Launch intake")
    .is("completed_at", null)
    .limit(1)
    .maybeSingle();
  if (openTask.error) throw new Error(`Intake task lookup failed: ${openTask.error.code}`);
  if (!openTask.data) {
    const taskInsert = await supabase.from("lead_tasks").insert({
      lead_id: lead.id,
      title: "Start Website Launch intake",
      due_date: new Date().toISOString().slice(0, 10),
    });
    if (taskInsert.error) throw new Error(`Intake task insert failed: ${taskInsert.error.code}`);
  }

  const activityDetail =
    `Website Launch $500 deposit paid through Stripe. Intake is ready. Stripe checkout: ${sessionId}.`;
  const existingActivity = await supabase
    .from("lead_activity")
    .select("id")
    .eq("lead_id", lead.id)
    .eq("kind", "system")
    .eq("detail", activityDetail)
    .limit(1)
    .maybeSingle();
  if (existingActivity.error) {
    throw new Error(`Deposit activity lookup failed: ${existingActivity.error.code}`);
  }

  // The activity row is the idempotency marker for the internal alert. It is
  // written only after Resend accepts the alert, so a provider failure keeps
  // the Stripe event retryable. A crash between the send and insert can cause
  // a duplicate internal alert, which is safer than silently losing a paid
  // intake. This branch never calls the customer email or SMS helpers.
  if (!existingActivity.data) {
    const accepted = await sendInternalLeadAlert({
      full_name: lead.full_name || customer.fullName,
      email: customer.email,
      phone: lead.phone,
      business_name: lead.business_name,
      interest: "launch_system",
      goals:
        "The $500 Website Launch deposit is paid. Begin intake for the approved $1,000 five-page base scope. The final $500 is due only after approval and before launch.",
      timeline: "Deposit paid; intake ready",
      source: stripePaymentLinkId(session) ? "stripe_payment_link" : "stripe_checkout",
      utm_source: "stripe",
      sms_consent: false,
    });
    if (!accepted) throw new Error("Internal Website Launch alert was not accepted");

    const activityInsert = await supabase.from("lead_activity").insert({
      lead_id: lead.id,
      kind: "system",
      detail: activityDetail,
    });
    if (activityInsert.error) {
      throw new Error(`Deposit activity insert failed: ${activityInsert.error.code}`);
    }
  }
}

// Time Back funnel orders (/go/time-back). The funnel saves the lead before
// Stripe opens, so a paid session finds that lead by email, marks it won, and
// stamps the Stripe order details onto its diagnostic for the admin view.
async function ensureTimebackOrderPaid(
  supabase: SupabaseClient,
  session: StripeCheckoutSession,
) {
  const sessionId = typeof session.id === "string" ? session.id.slice(0, 200) : "";
  const customer = websiteLaunchCustomer(session);
  if (!sessionId || !customer.email) {
    throw new Error("Paid Time Back checkout is missing its session ID or email");
  }

  const metadata = session.metadata ?? {};
  const stripeStamp = {
    session_id: sessionId,
    paid_at: new Date().toISOString(),
    amount_total_cents: Number.isFinite(Number(session.amount_total))
      ? Number(session.amount_total)
      : null,
    order: typeof metadata.order === "string" ? metadata.order.slice(0, 480) : null,
    total_usd: typeof metadata.total_usd === "string" ? metadata.total_usd.slice(0, 20) : null,
    platforms: typeof metadata.platforms === "string" ? metadata.platforms.slice(0, 100) : null,
  };
  const externalId = `stripe_checkout:${sessionId}`;
  const paidUsd = stripeStamp.amount_total_cents !== null
    ? Math.round(stripeStamp.amount_total_cents / 100)
    : null;
  const orderSummary =
    stripeStamp.order ?? (paidUsd !== null ? `Time Back order, $${paidUsd}` : "Time Back order");

  const found = await supabase
    .from("leads")
    .select("id, full_name, business_name, phone, status, diagnostic, external_id")
    .ilike("email", escapeIlike(customer.email))
    .eq("diagnostic->>source", "time_back_funnel")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (found.error) throw new Error(`Time Back lead lookup failed: ${found.error.code}`);

  let leadId: string;
  let leadName = customer.fullName;
  if (found.data) {
    const lead = found.data;
    leadId = lead.id;
    leadName = lead.full_name || customer.fullName;
    const diagnostic =
      lead.diagnostic && typeof lead.diagnostic === "object" ? lead.diagnostic : {};
    const updates: Record<string, unknown> = {
      status: "won",
      diagnostic: { ...diagnostic, paid: true, stripe: stripeStamp },
    };
    if (!lead.phone && customer.phone) updates.phone = customer.phone;
    if (!lead.external_id) updates.external_id = externalId;
    const updated = await supabase.from("leads").update(updates).eq("id", lead.id);
    if (updated.error?.code === "23505") {
      // Another event already claimed this checkout's external_id; keep the
      // payment stamp and let the id stand where it landed first.
      const retry = await supabase
        .from("leads")
        .update({ status: "won", diagnostic: { ...diagnostic, paid: true, stripe: stripeStamp } })
        .eq("id", lead.id);
      if (retry.error) throw new Error(`Time Back lead update failed: ${retry.error.code}`);
    } else if (updated.error) {
      throw new Error(`Time Back lead update failed: ${updated.error.code}`);
    }
  } else {
    // Paid, but no funnel lead saved (network hiccup, or a different email
    // at checkout). Create the lead so the order has a home in the CRM.
    const inserted = await supabase
      .from("leads")
      .insert({
        full_name: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        interest: "done_for_you",
        goals: `TIME BACK FUNNEL ORDER, paid through Stripe. ${orderSummary}.`,
        best_contact_method: customer.phone ? "text" : "email",
        source: "stripe_checkout",
        utm_source: "stripe",
        utm_medium: "checkout",
        utm_campaign: "time_back",
        sms_consent: false,
        marketing_email_consent: false,
        status: "won",
        external_id: externalId,
        diagnostic: {
          version: 2,
          source: "time_back_funnel",
          paid: true,
          stripe: stripeStamp,
          next_action:
            "Paid Time Back order arrived without a matching funnel lead. Send the welcome intake link and the access invites.",
        },
      })
      .select("id, full_name")
      .single();
    if (inserted.error?.code === "23505") {
      const raced = await supabase
        .from("leads")
        .select("id, full_name")
        .eq("external_id", externalId)
        .is("deleted_at", null)
        .single();
      if (raced.error) throw new Error(`Time Back lead race recovery failed: ${raced.error.code}`);
      leadId = raced.data.id;
      leadName = raced.data.full_name || leadName;
    } else if (inserted.error) {
      throw new Error(`Time Back lead insert failed: ${inserted.error.code}`);
    } else {
      leadId = inserted.data.id;
      leadName = inserted.data.full_name || leadName;
    }
  }

  // The activity row is the idempotency marker for the internal alert, same
  // contract as the Website Launch flow: alert first, marker after, so a
  // provider failure keeps the Stripe event retryable. Missing RESEND config
  // is not a failure; the payment is already recorded either way.
  const activityDetail = `Time Back order paid through Stripe. ${orderSummary}. Stripe checkout: ${sessionId}.`;
  const existingActivity = await supabase
    .from("lead_activity")
    .select("id")
    .eq("lead_id", leadId)
    .eq("kind", "system")
    .eq("detail", activityDetail)
    .limit(1)
    .maybeSingle();
  if (existingActivity.error) {
    throw new Error(`Time Back activity lookup failed: ${existingActivity.error.code}`);
  }
  if (!existingActivity.data) {
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "The LeadFlow Pro <hello@theleadflowpro.com>",
          to: ["hello@theleadflowpro.com"],
          subject: `💰 TIME BACK ORDER PAID: ${leadName} | ${customer.email}`,
          text: [
            orderSummary,
            paidUsd !== null ? `Paid: $${paidUsd}` : "",
            stripeStamp.platforms ? `Platforms: ${stripeStamp.platforms}` : "",
            "",
            "They were sent to the welcome intake. Next: the access invites.",
            "Admin: https://www.theleadflowpro.com/admin/time-back",
          ]
            .filter(Boolean)
            .join("\n"),
        }),
      }).catch(() => null);
      if (!r?.ok) throw new Error("Internal Time Back paid alert was not accepted");
    }
    const activityInsert = await supabase.from("lead_activity").insert({
      lead_id: leadId,
      kind: "system",
      detail: activityDetail,
    });
    if (activityInsert.error) {
      throw new Error(`Time Back activity insert failed: ${activityInsert.error.code}`);
    }
  }
}

function workshopMeta(session: StripeCheckoutSession) {
  const metadata = session.metadata ?? {};
  return {
    eventId: webhookString(metadata.event_id, 80) ?? "",
    registrationId: webhookString(metadata.registration_id, 80) ?? "",
    email: (webhookString(metadata.registration_email, 200) ?? "").trim().toLowerCase(),
    holdToken: webhookString(metadata.hold_token, 80) ?? "",
  };
}

async function releaseExpiredWorkshopCheckout(
  supabase: SupabaseClient,
  session: StripeCheckoutSession,
) {
  const meta = workshopMeta(session);
  const sessionId = webhookString(session.id, 200);
  if (!meta.eventId || !meta.registrationId || !meta.holdToken || !sessionId) return;
  const { error } = await supabase.rpc("workshop_release_hold", {
    p_event_id: meta.eventId,
    p_registration_id: meta.registrationId,
    p_hold_token: meta.holdToken,
    p_stripe_checkout_session_id: sessionId,
  });
  if (error) throw new Error(`Workshop hold release failed: ${error.message}`);
}

async function ensureWorkshopPaid(
  supabase: SupabaseClient,
  session: StripeCheckoutSession,
) {
  const meta = workshopMeta(session);
  const sessionId = webhookString(session.id, 200);
  const paymentIntent = webhookString(session.payment_intent, 200) ?? "";
  const amountPaid = Number(session.amount_total);
  if (
    !meta.eventId ||
    !meta.registrationId ||
    !meta.email ||
    !meta.holdToken ||
    !sessionId ||
    !Number.isInteger(amountPaid)
  ) {
    throw new Error("Paid workshop checkout is missing protected metadata");
  }

  const { data: confirmation, error: confirmError } = await supabase.rpc(
    "workshop_confirm_paid",
    {
      p_event_id: meta.eventId,
      p_registration_id: meta.registrationId,
      p_email: meta.email,
      p_hold_token: meta.holdToken,
      p_stripe_checkout_session_id: sessionId,
      p_stripe_payment_intent_id: paymentIntent,
      p_amount_paid_cents: amountPaid,
    },
  );
  if (confirmError) throw new Error(`Workshop payment confirmation failed: ${confirmError.message}`);
  const result = Array.isArray(confirmation) ? confirmation[0] : confirmation;

  const { data: registration, error: registrationError } = await supabase
    .from("workshop_registrations")
    .select("id, event_id, full_name, email, phone, business_name, notes, status, payment_status, confirmation_sent_at")
    .eq("id", meta.registrationId)
    .single();
  if (registrationError || !registration) {
    throw new Error(`Workshop registration lookup failed: ${registrationError?.code ?? "missing"}`);
  }
  const { data: workshop, error: workshopError } = await supabase
    .from("workshop_events")
    .select("id, slug, title, city, starts_at, duration_minutes, instructor_name")
    .eq("id", meta.eventId)
    .single();
  if (workshopError || !workshop) {
    throw new Error(`Workshop lookup failed: ${workshopError?.code ?? "missing"}`);
  }

  const externalId = `workshop_registration:${registration.id}`;
  const { data: existingLead, error: existingLeadError } = await supabase
    .from("leads")
    .select("id")
    .eq("external_id", externalId)
    .is("deleted_at", null)
    .maybeSingle();
  if (existingLeadError) throw new Error(`Workshop lead lookup failed: ${existingLeadError.code}`);

  let leadId = existingLead?.id as string | undefined;
  if (!leadId) {
    const inserted = await supabase
      .from("leads")
      .insert({
        full_name: registration.full_name,
        email: registration.email,
        phone: registration.phone,
        business_name: registration.business_name,
        interest: "operations",
        goals: registration.notes || "Paid attendee for the East Texas ChatGPT Operator Workshop.",
        budget_range: "$97 workshop attendee",
        timeline: "Post-workshop implementation follow-up",
        best_contact_method: registration.phone ? "phone" : "email",
        source: "workshop",
        utm_source: "workshop_checkout",
        utm_medium: "paid_event",
        utm_campaign: workshop.slug,
        status: "new",
        owner: "Pat Grabbs",
        priority: "high",
        sms_consent: false,
        marketing_email_consent: false,
        external_id: externalId,
        diagnostic: {
          version: 1,
          source: "paid_workshop",
          event_id: workshop.id,
          registration_id: registration.id,
          payment_status: result?.payment_status ?? registration.payment_status,
          next_action: "Follow up after Ryan delivers the workshop and attendee asks for implementation help.",
        },
      })
      .select("id")
      .single();
    if (inserted.error?.code === "23505") {
      const raced = await supabase
        .from("leads")
        .select("id")
        .eq("external_id", externalId)
        .single();
      if (raced.error) throw new Error(`Workshop lead race recovery failed: ${raced.error.code}`);
      leadId = raced.data.id;
    } else if (inserted.error) {
      throw new Error(`Workshop lead insert failed: ${inserted.error.code}`);
    } else {
      leadId = inserted.data.id;
    }
  }

  if (leadId) {
    const taskTitle = "Post-workshop implementation follow-up";
    const { data: openTask, error: taskLookupError } = await supabase
      .from("lead_tasks")
      .select("id")
      .eq("lead_id", leadId)
      .eq("title", taskTitle)
      .is("completed_at", null)
      .maybeSingle();
    if (taskLookupError) throw new Error(`Workshop task lookup failed: ${taskLookupError.code}`);
    if (!openTask) {
      const eventDate = workshop.starts_at ? new Date(workshop.starts_at) : new Date();
      eventDate.setUTCDate(eventDate.getUTCDate() + 1);
      const task = await supabase.from("lead_tasks").insert({
        lead_id: leadId,
        title: taskTitle,
        due_date: eventDate.toISOString().slice(0, 10),
        priority: "high",
        assigned_to: "Pat Grabbs",
        task_type: "call",
      });
      if (task.error) throw new Error(`Workshop task insert failed: ${task.error.code}`);
    }
    const activityDetail = `Paid workshop seat confirmed. Registration ${registration.id}. Stripe checkout ${sessionId}.`;
    const { data: activity } = await supabase
      .from("lead_activity")
      .select("id")
      .eq("lead_id", leadId)
      .eq("kind", "system")
      .eq("detail", activityDetail)
      .maybeSingle();
    if (!activity) {
      const insertedActivity = await supabase.from("lead_activity").insert({
        lead_id: leadId,
        kind: "system",
        detail: activityDetail,
      });
      if (insertedActivity.error) {
        throw new Error(`Workshop activity insert failed: ${insertedActivity.error.code}`);
      }
    }
  }

  if (registration.status !== "confirmed" || registration.payment_status !== "paid") return;
  if (registration.confirmation_sent_at) return;
  const { data: privateRows, error: privateError } = await supabase.rpc(
    "workshop_confirmation_details",
    { p_event_id: workshop.id },
  );
  if (privateError) throw new Error(`Workshop private details failed: ${privateError.message}`);
  const privateDetails = Array.isArray(privateRows) ? privateRows[0] : privateRows;
  if (!privateDetails?.exact_address) throw new Error("Workshop address is not configured");

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const firstName = String(registration.full_name).trim().split(/\s+/)[0] || "there";
    const when = workshop.starts_at
      ? new Date(workshop.starts_at).toLocaleString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZone: "America/Chicago",
        })
      : "Date being finalized";
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Ryan Nichols <hello@theleadflowpro.com>",
        to: [registration.email],
        reply_to: "hello@theleadflowpro.com",
        subject: `Your seat is confirmed: ${workshop.title}`,
        text: [
          `${firstName}, your paid seat is confirmed.`,
          "",
          when,
          privateDetails.exact_address,
          privateDetails.arrival_notes || "",
          "",
          "Bring a charged laptop, your ChatGPT login, and one real business bottleneck.",
          "You will receive a Next Move card and can stay for the optional founding AI Business Clinic.",
          "",
          `Your private preparation page: https://www.theleadflowpro.com/events/${workshop.slug}/confirmed?session_id=${sessionId}`,
          "",
          "Ryan Nichols",
          "The LeadFlow Pro",
        ].filter(Boolean).join("\n"),
      }),
    });
    if (!emailResponse.ok) throw new Error("Workshop confirmation email was not accepted");
    const marker = await supabase
      .from("workshop_registrations")
      .update({ confirmation_sent_at: new Date().toISOString() })
      .eq("id", registration.id)
      .is("confirmation_sent_at", null);
    if (marker.error) throw new Error(`Workshop email marker failed: ${marker.error.code}`);
  }
}

type StripeInvoiceWebhook = {
  id?: unknown;
  number?: unknown;
  status?: unknown;
  hosted_invoice_url?: unknown;
  invoice_pdf?: unknown;
  amount_due?: unknown;
};

const INVOICE_EVENT_STATUS: Record<string, string> = {
  "invoice.finalized": "open",
  "invoice.sent": "open",
  "invoice.paid": "paid",
  "invoice.payment_failed": "payment_failed",
  "invoice.voided": "void",
  "invoice.marked_uncollectible": "uncollectible",
};

function webhookString(value: unknown, max = 1000) {
  return typeof value === "string" ? value.slice(0, max) : null;
}

export async function POST(request: Request) {
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!whSecret || !serviceKey) {
    return NextResponse.json({ error: "not_configured" }, { status: 501 });
  }

  const payload = await request.text();
  const sig = request.headers.get("stripe-signature") ?? "";
  if (!verifySignature(payload, sig, whSecret)) {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  let event: {
    type?: unknown;
    data?: { object?: StripeCheckoutSession | StripeInvoiceWebhook };
  };
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  if (typeof event.type === "string" && INVOICE_EVENT_STATUS[event.type]) {
    try {
      const invoice = (event.data?.object ?? {}) as StripeInvoiceWebhook;
      const invoiceId = webhookString(invoice.id, 200);
      if (!invoiceId) throw new Error("Stripe invoice event has no invoice ID");
      const updates: Record<string, unknown> = {
        status: INVOICE_EVENT_STATUS[event.type],
        updated_at: new Date().toISOString(),
      };
      const number = webhookString(invoice.number, 100);
      const hostedUrl = webhookString(invoice.hosted_invoice_url);
      const pdf = webhookString(invoice.invoice_pdf);
      if (number) updates.invoice_number = number;
      if (hostedUrl) updates.hosted_invoice_url = hostedUrl;
      if (pdf) updates.invoice_pdf = pdf;

      const invoiceSupabase = createSupabaseClient(SUPABASE_URL, serviceKey);
      const result = await invoiceSupabase
        .from("sales_invoices")
        .update(updates)
        .eq("stripe_invoice_id", invoiceId);
      if (result.error) throw new Error(`Invoice status sync failed: ${result.error.code}`);
      return NextResponse.json({ received: true });
    } catch (error) {
      console.error(
        "Stripe invoice webhook failed:",
        error instanceof Error ? error.message : "unknown invoice error",
      );
      return NextResponse.json({ error: "Invoice processing failed" }, { status: 500 });
    }
  }

  if (event.type === "checkout.session.expired") {
    try {
      const expiredSession = (event.data?.object ?? {}) as StripeCheckoutSession;
      if (safeStripeKind(expiredSession) === "event") {
        const supabase = createSupabaseClient(SUPABASE_URL, serviceKey);
        await releaseExpiredWorkshopCheckout(supabase, expiredSession);
      }
      return NextResponse.json({ received: true });
    } catch (error) {
      console.error(
        "Stripe workshop expiration failed:",
        error instanceof Error ? error.message : "unknown expiration error",
      );
      return NextResponse.json({ error: "Expiration processing failed" }, { status: 500 });
    }
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  try {
    const session = (event.data?.object ?? {}) as StripeCheckoutSession;
    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true });
    }
    if (typeof session.id !== "string" || !session.id.trim()) {
      throw new Error("Paid Stripe checkout has no session ID");
    }

    const configuredPaymentLinkId =
      process.env.STRIPE_WEBSITE_LAUNCH_PAYMENT_LINK_ID?.trim() ||
      WEBSITE_LAUNCH_PAYMENT_LINK_ID;
    if (
      isUnmappedWebsiteLaunchPaymentLinkCandidate(session, configuredPaymentLinkId)
    ) {
      // Never guess that an unknown $500 Payment Link is this offer. A non-2xx
      // response keeps the event retryable until its metadata or exact public
      // Payment Link ID is intentionally mapped.
      throw new Error("Unmapped paid $500 Stripe Payment Link");
    }

    const websiteLaunch = isWebsiteLaunchDeposit(session, configuredPaymentLinkId);
    const customer = websiteLaunchCustomer(session);
    if (!customer.email) {
      if (websiteLaunch) throw new Error("Paid Website Launch checkout has no email");
      return NextResponse.json({ received: true });
    }

    const kind = websiteLaunch ? WEBSITE_LAUNCH_PURCHASE_KIND : safeStripeKind(session);
    const supabase = createSupabaseClient(SUPABASE_URL, serviceKey);
    const purchase = await supabase.from("purchases").upsert(
      {
        email: customer.email,
        kind,
        amount_cents: Number.isFinite(Number(session.amount_total))
          ? Number(session.amount_total)
          : null,
        stripe_session_id: session.id.slice(0, 200),
        status: "paid",
      },
      { onConflict: "stripe_session_id" },
    );
    if (purchase.error) {
      throw new Error(`Purchase record failed: ${purchase.error.code}`);
    }

    if (websiteLaunch) {
      await ensureWebsiteLaunchIntake(supabase, session);
    } else if (kind === "timeback_order") {
      await ensureTimebackOrderPaid(supabase, session);
    } else if (kind === "event" && session.metadata?.workshop_schema === "v2") {
      await ensureWorkshopPaid(supabase, session);
    } else if (kind === "event" && typeof session.metadata?.registration_id === "string") {
      // Compatibility for a legacy checkout created before the workshop-v2
      // cutover. Keep this until production has been verified on the new path.
      const registration = await supabase
        .from("event_registrations")
        .update({ status: "confirmed" })
        .eq("id", session.metadata.registration_id);
      if (registration.error) {
        throw new Error(`Legacy event registration update failed: ${registration.error.code}`);
      }
    } else if (kind === "learn_it") {
      await sendPurchaseEmails(customer.email, kind);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(
      "Stripe webhook processing failed:",
      error instanceof Error ? error.message : "unknown processing error",
    );
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
