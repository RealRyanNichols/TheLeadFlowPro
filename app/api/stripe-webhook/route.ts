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
// Event to send: checkout.session.completed

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

  let event: { type?: unknown; data?: { object?: StripeCheckoutSession } };
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  try {
    const session = event.data?.object ?? {};
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
    } else if (kind === "event" && typeof session.metadata?.registration_id === "string") {
      // Paid seat: confirm the registration automatically.
      const registration = await supabase
        .from("event_registrations")
        .update({ status: "confirmed" })
        .eq("id", session.metadata.registration_id);
      if (registration.error) {
        throw new Error(`Event registration update failed: ${registration.error.code}`);
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
