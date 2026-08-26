import { NextResponse } from "next/server";
import crypto from "node:crypto";
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";
import {
  HOLD_THE_LINE_PURCHASE_EVENT,
  sendInternalLeadAlert,
  sendSeriesEvent,
} from "@/lib/leadNotify";
import { HOLD_THE_LINE_OFFERS, holdTheLineOffer } from "@/lib/offers";
import { formatEventWhen, STANDS_ALONE_DISCLOSURE } from "@/lib/events";
import { LEAD_FOLLOW_UP } from "@/lib/leadFollowUp";
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
    subject: `💰 PURCHASE: ${kind} — ${email}`,
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
      "Work the courses in order. By the capstone you'll have your own platform live on your own domain — code in your GitHub, data in your database, nobody's hand in your pocket every month.",
      "",
      "Stuck on anything? Reply to this email. I read every one.",
      "",
      "Ryan Nichols",
      "The LeadFlow Pro | Own your platform.",
    ].join("\n"),
  });
}

// Hold The Line fulfillment. The Playbook is a digital delivery: the buyer
// gets the access link by email the moment the payment clears, the same way
// Learn It delivers training access above. The service rungs get the next-step
// email their offer page promised. Copy rules for this lane: no em dashes, no
// outcome guarantees, and never a word about researching a private person.
const HOLD_THE_LINE_BUYER_EMAILS: Record<string, { subject: string; text: string }> = {
  "hold-the-line-playbook": {
    subject: "Your Hold The Line Playbook is ready.",
    text: [
      "It is yours now. Read it here:",
      "",
      "https://www.theleadflowpro.com/hold-the-line/playbook",
      "",
      "Keep the link. Start with the sorting table, then read the never-type list twice. The sorting table tells you who you are dealing with. The never-type list is the difference between a business page and a memory.",
      "",
      "One more thing. Buying the playbook takes you out of the email series. Nobody needs a sales pitch for the thing they already own.",
      "",
      "If something is live in your comments right now and you want a second set of eyes on it, Comment Rescue is the fast lane:",
      "https://www.theleadflowpro.com/offers/comment-rescue",
      "",
      "Ryan Nichols",
      "The LeadFlow Pro | Hold the line.",
    ].join("\n"),
  },
  "comment-rescue": {
    subject: "Got it. Send me the thread.",
    text: [
      "Your Comment Rescue is paid and in my hands. Here is what I need, all in a reply to this email:",
      "",
      "1. The link to the post or thread.",
      "2. A screenshot of the comment and the thread around it, in case anything gets edited or deleted.",
      "3. One line of context. Who is this to your business, as far as you know?",
      "",
      "Within 24 hours of your reply you get the read on what type you are dealing with, the exact reply to paste, and what to do if they come back.",
      "",
      "Until then, do not answer them. The thread is not going anywhere and neither am I.",
      "",
      "Ryan Nichols",
      "The LeadFlow Pro | Hold the line.",
    ].join("\n"),
  },
  "voice-recovery": {
    subject: "Voice Recovery: let's get your session booked.",
    text: [
      "Your Voice Recovery Session is paid. Reply to this email with:",
      "",
      "1. Two or three times that work for a 60-minute call.",
      "2. Which platform and what happened, in a sentence.",
      "3. Whatever the platform sent you. Forward it or screenshot it. Do not clean it up.",
      "",
      "On the call we figure out what actually happened to the account, write the appeal together, and map where your voice lives if this ever happens again. You leave with the appeal text and a one-page rebuild plan.",
      "",
      "One thing I will say now so the call starts honest: nobody can promise an account comes back. I will tell you the truth about your odds.",
      "",
      "Ryan Nichols",
      "The LeadFlow Pro | Hold the line.",
    ].join("\n"),
  },
  "comment-cover": {
    subject: "Comment Cover is on. Two questions.",
    text: [
      "Comment Cover is active. Reply to this email with:",
      "",
      "1. The pages you want watched. Links, not names.",
      "2. How you want replies handed to you: text or email.",
      "",
      "From there we watch the page, sort what comes in, and hand you the reply. You approve and post. Nothing goes out under your name that you did not sign off on.",
      "",
      "Cancel any time by replying to any email from me.",
      "",
      "Ryan Nichols",
      "The LeadFlow Pro | Hold the line.",
    ].join("\n"),
  },
};

async function sendHoldTheLinePurchaseEmails(email: string, kind: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const offer = holdTheLineOffer(kind);
  const buyer = HOLD_THE_LINE_BUYER_EMAILS[kind];
  const send = (payload: object) =>
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});

  await send({
    from: "The LeadFlow Pro <hello@theleadflowpro.com>",
    to: ["hello@theleadflowpro.com"],
    subject: `💰 PURCHASE: ${offer?.name ?? kind} — ${email}`,
    text: `New Hold The Line purchase.\n\nProduct: ${offer?.name ?? kind} (${offer?.priceLabel ?? ""})\nBuyer: ${email}\n\nAdmin: https://www.theleadflowpro.com/admin`,
  });
  if (buyer) {
    await send({
      from: "Ryan Nichols <hello@theleadflowpro.com>",
      to: [email],
      reply_to: "hello@theleadflowpro.com",
      subject: buyer.subject,
      text: buyer.text,
    });
  }
}

// Buyers must never keep getting the nurture that sells them the thing they
// just bought. Three layers, from most to least authoritative:
//   1. The purchases row written above: both enrollment paths check it.
//   2. The hold-the-line-purchase event to Resend: the automation's exit rule
//      listens for it and pulls the contact out of the running series.
//   3. A step 0 claim on every matching lead row, so the cron sweep can never
//      enroll this buyer later. UNIQUE (lead_id, step) makes it idempotent.
async function excludeHoldTheLineBuyerFromNurture(
  supabase: SupabaseClient,
  email: string,
) {
  await sendSeriesEvent(HOLD_THE_LINE_PURCHASE_EVENT, email);

  const { data: leads } = await supabase
    .from("leads")
    .select("id")
    .ilike("email", escapeIlike(email))
    .eq("interest", "hold_the_line")
    .is("deleted_at", null);

  const detail = "Bought the Hold The Line Playbook. Excluded from the nurture series.";
  for (const lead of leads ?? []) {
    await supabase.from("lead_emails").insert({ lead_id: lead.id, step: 0 });
    const existing = await supabase
      .from("lead_activity")
      .select("id")
      .eq("lead_id", lead.id)
      .eq("kind", "system")
      .eq("detail", detail)
      .limit(1)
      .maybeSingle();
    if (!existing.data) {
      await supabase.from("lead_activity").insert({
        lead_id: lead.id,
        // 'kind' has a CHECK constraint: stage_change | owner_change | note |
        // task | system | message | delete. Anything else throws.
        kind: "system",
        detail,
      });
    }
  }
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
          subject: `💰 TIME BACK ORDER PAID: ${leadName} — ${customer.email}`,
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

// Paid workshop seat. claim_event_seat() locks the event row, so two people
// paying at the same instant cannot both take the last seat: the second one
// lands as 'overbooked' and Ryan gets told to refund it rather than the money
// disappearing into a full room.
async function ensureEventSeatPaid(
  supabase: SupabaseClient,
  session: StripeCheckoutSession,
) {
  const registrationId =
    typeof session.metadata?.registration_id === "string" ? session.metadata.registration_id : "";
  if (!registrationId) {
    // A paid event checkout with no registration attached cannot be matched to
    // a seat. Non-2xx keeps it retryable and visible in the Stripe dashboard.
    throw new Error("Paid event checkout has no registration_id");
  }
  const sessionId = typeof session.id === "string" ? session.id.slice(0, 200) : null;
  const amountCents = Number.isFinite(Number(session.amount_total))
    ? Number(session.amount_total)
    : null;

  const claim = await supabase.rpc("claim_event_seat", {
    p_registration_id: registrationId,
    p_stripe_session_id: sessionId,
    p_amount_cents: amountCents,
  });
  if (claim.error) throw new Error(`Seat claim failed: ${claim.error.code ?? claim.error.message}`);
  const claimed = Array.isArray(claim.data) ? claim.data[0] : claim.data;
  const seatStatus = claimed?.seat_status ?? "paid";

  const loaded = await supabase
    .from("event_registrations")
    .select(
      "id, full_name, email, phone, business_name, bottleneck, access_token, seat_number, confirmation_sent_at, " +
        "events(id, slug, title, starts_at, duration_minutes, timezone, venue, city, clinic_enabled, instructor_name)",
    )
    .eq("id", registrationId)
    .single();
  if (loaded.error) throw new Error(`Seat lookup failed: ${loaded.error.code}`);

  const registration = loaded.data as unknown as {
    full_name: string;
    email: string;
    business_name: string | null;
    bottleneck: string | null;
    access_token: string;
    seat_number: number | null;
    confirmation_sent_at: string | null;
    events: EventForEmail | EventForEmail[] | null;
  };
  const event = Array.isArray(registration.events) ? registration.events[0] : registration.events;
  if (!event) throw new Error("Paid seat has no event attached");

  if (registration.confirmation_sent_at) return;

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const when = formatEventWhen(event);
    const confirmUrl = `https://www.theleadflowpro.com/events/${event.slug}/confirmed?t=${encodeURIComponent(
      registration.access_token,
    )}`;
    // The exact address lives in private.workshop_event_details, never in the
    // anon-readable events row. Paid attendees always get it.
    const addr = await supabase.rpc("event_exact_address", { p_event_id: event.id });
    const details = Array.isArray(addr.data) ? addr.data[0] : addr.data;
    const location = [event.venue, details?.exact_address, event.city]
      .filter(Boolean)
      .join("\n");

    const overbooked = seatStatus === "overbooked";
    const internal = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "The LeadFlow Pro <hello@theleadflowpro.com>",
        to: ["hello@theleadflowpro.com"],
        subject: overbooked
          ? `⚠️ OVERBOOKED SEAT (refund needed): ${event.title} — ${registration.email}`
          : `🎟️ PAID SEAT ${registration.seat_number ?? ""}: ${event.title} — ${registration.email}`,
        text: [
          overbooked
            ? "This payment arrived after the room filled. Refund it or open another seat."
            : `Seat ${registration.seat_number ?? "?"} is paid.`,
          "",
          `Name: ${registration.full_name}`,
          `Email: ${registration.email}`,
          registration.business_name ? `Business: ${registration.business_name}` : "",
          registration.bottleneck ? `Bottleneck: ${registration.bottleneck}` : "Bottleneck: not submitted yet",
          "",
          "Admin: https://www.theleadflowpro.com/admin/events",
        ]
          .filter(Boolean)
          .join("\n"),
      }),
    }).catch(() => null);
    if (!internal?.ok) throw new Error("Internal paid-seat alert was not accepted");

    const attendee = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Ryan Nichols <hello@theleadflowpro.com>",
        to: [registration.email],
        reply_to: "hello@theleadflowpro.com",
        subject: overbooked
          ? `About your ${event.title} payment`
          : `Your seat is confirmed — ${event.title}`,
        text: overbooked
          ? [
              `${registration.full_name.split(" ")[0]},`,
              "",
              "Your payment came in just after the last seat was taken, so I am refunding it in full today.",
              "You are first in line for the next date — reply to this email and I will hold you a seat.",
              "",
              "Sorry for the shuffle.",
              "",
              "Ryan Nichols",
              "The LeadFlow Pro",
            ].join("\n")
          : [
              `${registration.full_name.split(" ")[0]}, your seat is confirmed.`,
              "",
              event.title,
              when.full,
              "",
              location,
              "",
              "Bring a laptop, charged, with a charger. A free ChatGPT account is enough.",
              "",
              event.clinic_enabled
                ? "Before class, tell me the one bottleneck in your business you want looked at. Everyone who submits one gets a Next Move card, and two businesses get a live hot seat:"
                : "Your registration details:",
              confirmUrl,
              "",
              STANDS_ALONE_DISCLOSURE,
              "",
              "See you there.",
              "",
              "Ryan Nichols",
              "The LeadFlow Pro | Longview, Texas",
            ].join("\n"),
      }),
    }).catch(() => null);
    if (!attendee?.ok) throw new Error("Attendee confirmation email was not accepted");
  }

  const marked = await supabase
    .from("event_registrations")
    .update({ confirmation_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", registrationId);
  if (marked.error) throw new Error(`Confirmation marker failed: ${marked.error.code}`);
}

type EventForEmail = {
  id: string;
  slug: string;
  title: string;
  starts_at: string | null;
  duration_minutes: number | null;
  timezone: string;
  venue: string | null;
  city: string | null;
  clinic_enabled: boolean;
  instructor_name: string;
};

// Paid $197 Lead Follow-Up Campaign. The funnel already saved the lead before
// Stripe opened, so this marks that row won and stamps the payment. The
// writing itself waits on the intake form the buyer lands on next; that route
// creates the work task.
async function ensureLeadFollowUpPaid(
  supabase: SupabaseClient,
  session: StripeCheckoutSession,
) {
  const sessionId = typeof session.id === "string" ? session.id.slice(0, 200) : "";
  const customer = websiteLaunchCustomer(session);
  if (!sessionId || !customer.email) {
    throw new Error("Paid Lead Follow-Up checkout is missing its session ID or email");
  }

  const externalId = `stripe_checkout:${sessionId}`;
  const stripeStamp = {
    session_id: sessionId,
    paid_at: new Date().toISOString(),
    amount_total_cents: Number.isFinite(Number(session.amount_total))
      ? Number(session.amount_total)
      : null,
  };

  const found = await supabase
    .from("leads")
    .select("id, full_name, phone, diagnostic, external_id")
    .ilike("email", escapeIlike(customer.email))
    .eq("diagnostic->>source", "lead_follow_up_funnel")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (found.error) throw new Error(`Lead Follow-Up lookup failed: ${found.error.code}`);

  let leadId: string;
  let leadName = customer.fullName;
  if (found.data) {
    leadId = found.data.id;
    leadName = found.data.full_name || leadName;
    const diagnostic =
      found.data.diagnostic && typeof found.data.diagnostic === "object"
        ? (found.data.diagnostic as Record<string, unknown>)
        : {};
    const updates: Record<string, unknown> = {
      status: "won",
      diagnostic: { ...diagnostic, paid: true, stripe: stripeStamp },
    };
    if (!found.data.phone && customer.phone) updates.phone = customer.phone;
    if (!found.data.external_id) updates.external_id = externalId;
    const updated = await supabase.from("leads").update(updates).eq("id", leadId);
    if (updated.error && updated.error.code !== "23505") {
      throw new Error(`Lead Follow-Up update failed: ${updated.error.code}`);
    }
  } else {
    // Paid without a funnel row (different email at checkout, or a saved
    // link). Create the lead so the order has a home in the CRM.
    const inserted = await supabase
      .from("leads")
      .insert({
        full_name: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        interest: "done_for_you",
        goals: `LEAD FOLLOW-UP CAMPAIGN paid through Stripe ($${LEAD_FOLLOW_UP.priceUsd}). Waiting on the writing intake.`,
        best_contact_method: "email",
        source: "stripe_checkout",
        utm_source: "stripe",
        utm_medium: "checkout",
        utm_campaign: "lead_follow_up",
        sms_consent: false,
        marketing_email_consent: false,
        status: "won",
        external_id: externalId,
        diagnostic: {
          version: 1,
          source: "lead_follow_up_funnel",
          offer: LEAD_FOLLOW_UP.id,
          paid: true,
          stripe: stripeStamp,
          next_action: "Paid without a funnel row. Send the intake link if it does not arrive.",
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
      if (raced.error) throw new Error(`Lead Follow-Up race recovery failed: ${raced.error.code}`);
      leadId = raced.data.id;
      leadName = raced.data.full_name || leadName;
    } else if (inserted.error) {
      throw new Error(`Lead Follow-Up insert failed: ${inserted.error.code}`);
    } else {
      leadId = inserted.data.id;
      leadName = inserted.data.full_name || leadName;
    }
  }

  // The activity row is the idempotency marker for the internal alert: alert
  // first, marker after, so a provider failure keeps the Stripe event
  // retryable. Same contract as the other paid flows in this file.
  const activityDetail = `Lead Follow-Up Campaign paid through Stripe. Stripe checkout: ${sessionId}.`;
  const existingActivity = await supabase
    .from("lead_activity")
    .select("id")
    .eq("lead_id", leadId)
    .eq("kind", "system")
    .eq("detail", activityDetail)
    .limit(1)
    .maybeSingle();
  if (existingActivity.error) {
    throw new Error(`Lead Follow-Up activity lookup failed: ${existingActivity.error.code}`);
  }
  if (!existingActivity.data) {
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const alert = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "The LeadFlow Pro <leadflow@theleadflowpro.com>",
          to: ["hello@theleadflowpro.com"],
          subject: `💰 FOLLOW-UP CAMPAIGN PAID: ${leadName} — ${customer.email}`,
          text: [
            `$${LEAD_FOLLOW_UP.priceUsd} Lead Follow-Up Campaign paid.`,
            "",
            "They were sent to the writing intake. The work task is created when that form comes back.",
            "Admin: https://www.theleadflowpro.com/admin/leads",
          ].join("\n"),
        }),
      }).catch(() => null);
      if (!alert?.ok) throw new Error("Internal Lead Follow-Up alert was not accepted");
    }
    const activityInsert = await supabase.from("lead_activity").insert({
      lead_id: leadId,
      kind: "system",
      detail: activityDetail,
    });
    if (activityInsert.error) {
      throw new Error(`Lead Follow-Up activity insert failed: ${activityInsert.error.code}`);
    }
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
    } else if (kind === "event") {
      await ensureEventSeatPaid(supabase, session);
    } else if (kind === LEAD_FOLLOW_UP.id) {
      await ensureLeadFollowUpPaid(supabase, session);
    } else if (kind === "learn_it") {
      await sendPurchaseEmails(customer.email, kind);
    } else if (HOLD_THE_LINE_OFFERS.some((offer) => offer.slug === kind)) {
      await sendHoldTheLinePurchaseEmails(customer.email, kind);
      if (kind === "hold-the-line-playbook") {
        await excludeHoldTheLineBuyerFromNurture(supabase, customer.email);
      }
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
