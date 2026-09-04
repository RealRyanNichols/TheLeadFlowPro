import { NextResponse } from "next/server";
import crypto from "node:crypto";
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";
import { sendInternalLeadAlert } from "@/lib/leadNotify";
import { isCheckoutPaymentEvent } from "@/lib/eventPayments";
import { ensureEventSeatPaid } from "@/lib/eventSeatFulfillment";
import { LEAD_FOLLOW_UP } from "@/lib/leadFollowUp";
import { findFreeBuildTier } from "@/lib/freeBuild";
import { CONTENT_ENGINE } from "@/lib/contentEngineCourse";
import { CHATGPT_OPERATOR } from "@/lib/chatgptOperatorCourse";
import { OPERATOR_ACADEMY } from "@/lib/operatorAcademyCatalog";
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
import {
  licenseKey,
  proAccessSecrets,
  proKindFromSession,
  proKindSlug,
} from "@/lib/proAccess";
import { PRO_BUNDLE, getProTool, proCatalog } from "@/lib/tools/pro";

// Stripe webhook: records paid checkouts and unlocks training access.
// Needs STRIPE_WEBHOOK_SECRET (from Stripe dashboard → Webhooks) and
// SUPABASE_SERVICE_ROLE_KEY (Supabase → Settings → API) in Vercel env vars.
// Endpoint to register in Stripe: https://www.theleadflowpro.com/api/stripe-webhook
// Events to send: checkout.session.completed, checkout.session.async_payment_succeeded,
// invoice.finalized, invoice.sent,
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
  // Throw on failure. This used to be `.catch(() => {})` with no r.ok check,
  // so a 429 or 422 from Resend meant the buyer's access instructions silently
  // vanished, the handler still returned {received:true}, and Stripe never
  // retried. Every other paid path in this file throws for exactly that
  // reason: a retried webhook is recoverable, a swallowed one is not.
  const send = async (payload: object) => {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(`Resend rejected purchase email: ${r.status}`);
  };

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

async function sendContentEnginePurchaseEmails(email: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const send = async (payload: object) => {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Resend rejected course email: ${response.status}`);
  };

  await send({
    from: "The LeadFlow Pro <hello@theleadflowpro.com>",
    to: ["hello@theleadflowpro.com"],
    subject: `CONTENT ENGINE PURCHASE: ${email}`,
    text: `Founding course access purchased.\nBuyer: ${email}\nCourse: ${CONTENT_ENGINE.title}`,
  });
  await send({
    from: "Ryan Nichols <hello@theleadflowpro.com>",
    to: [email],
    reply_to: "hello@theleadflowpro.com",
    subject: "Your Content Engine course access",
    text: [
      "You are in.",
      "",
      "Create your login with the exact email you used at checkout:",
      "https://www.theleadflowpro.com/login?mode=signup&next=/training/content-engine",
      "",
      "Then open the course:",
      "https://www.theleadflowpro.com/training/content-engine",
      "",
      "Founding access includes the written lessons, workbook assignments, lesson checks, and final assessment now. Recorded lessons are added as they are produced.",
      "",
      "No promises. Do the work, build the system, and keep what you create.",
      "",
      "Ryan Nichols",
      "The LeadFlow Pro",
    ].join("\n"),
  });
}

async function sendAcademyPurchaseEmails(email: string, title: string, nextPath: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const send = async (payload: object) => {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Resend rejected academy email: ${response.status}`);
  };
  await send({
    from: "The LeadFlow Pro <hello@theleadflowpro.com>",
    to: ["hello@theleadflowpro.com"],
    subject: `OPERATOR ACADEMY PURCHASE: ${email}`,
    text: `Paid training access purchased.\nBuyer: ${email}\nAccess: ${title}`,
  });
  await send({
    from: "Ryan Nichols <hello@theleadflowpro.com>",
    to: [email],
    reply_to: "hello@theleadflowpro.com",
    subject: `Your ${title} access`,
    text: [
      "You are in.",
      "",
      "Create your login with the exact email used at checkout:",
      `https://www.theleadflowpro.com/login?mode=signup&next=${nextPath}`,
      "",
      "Then open your training library:",
      "https://www.theleadflowpro.com/training",
      "",
      "Written lessons, practices, workbooks, lesson checks, finals, and capstones are included. Recorded lessons appear in their lesson slots as they are produced.",
      "",
      "Do the work and keep what you build.",
      "",
      "Ryan Nichols",
      "The LeadFlow Pro",
    ].join("\n"),
  });
}

/**
 * Catch-all for a paid kind that has no dedicated fulfilment branch.
 *
 * Before this existed, `system_map`, `package_full`, a `package_deposit` for
 * anything other than the exact $500 Website Launch, and every `build_deposit`
 * ($250 to $25,000) fell straight off the end of the dispatch. A purchases row
 * was written and then nothing: no alert to hello@, no email to the buyer, no
 * lead marked won. Somebody could pay $497 for a System Map or $25,000 as a
 * custom deposit and the only evidence anywhere was Stripe's own receipt.
 *
 * This does not try to fulfil anything. It makes sure a human is told, with
 * the real amount, and that the buyer gets an acknowledgement instead of
 * silence. Throws on send failure so Stripe retries.
 */
// Plain acknowledgement to the person who just paid. Best effort by design:
// the internal alert and the idempotency marker are the contract that keeps
// a Stripe event retryable; a buyer email that fails must never block them,
// and a retry that resends this note is a smaller sin than a buyer who paid
// $500 and heard nothing from the business.
async function sendBuyerAcknowledgement(
  email: string,
  subject: string,
  lines: string[],
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key || !email || !email.includes("@") || email.includes("@no-email.")) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Ryan Nichols <ryan@theleadflowpro.com>",
        reply_to: "hello@theleadflowpro.com",
        to: [email],
        subject,
        text: [
          ...lines,
          "",
          "Talk soon,",
          "Ryan Nichols",
          "The LeadFlow Pro",
          "(903) 500-8898",
        ].join("\n"),
      }),
      signal: AbortSignal.timeout(8000),
    });
    return r.ok;
  } catch (e) {
    console.error("buyer acknowledgement failed:", e instanceof Error ? e.message : e);
    return false;
  }
}

async function notifyUnhandledPurchase(
  email: string,
  kind: string,
  amountCents: number | null,
  sessionId: string,
) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const amount =
    typeof amountCents === "number" && Number.isFinite(amountCents)
      ? `$${(amountCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      : "unknown amount";

  const send = async (payload: object) => {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(`Resend rejected purchase email: ${r.status}`);
  };

  await send({
    from: "The LeadFlow Pro <hello@theleadflowpro.com>",
    to: ["hello@theleadflowpro.com"],
    subject: `💰 PAID: ${kind} ${amount} — ${email}`,
    text: [
      "Somebody paid and there is no automated fulfilment for this product.",
      "",
      `Product: ${kind}`,
      `Amount:  ${amount}`,
      `Buyer:   ${email}`,
      `Stripe:  ${sessionId}`,
      "",
      "Reach out to them today. They have been sent a short acknowledgement",
      "telling them you will be in touch within one business day.",
      "",
      "Admin: https://www.theleadflowpro.com/admin",
    ].join("\n"),
  });

  await send({
    from: "Ryan Nichols <hello@theleadflowpro.com>",
    to: [email],
    reply_to: "hello@theleadflowpro.com",
    subject: "Got your payment. Here is what happens next.",
    text: [
      "Thanks. Your payment came through and I have it.",
      "",
      `What you paid for: ${kind.replace(/_/g, " ")}`,
      `Amount: ${amount}`,
      "",
      "I do this part by hand rather than firing you into a portal. I will",
      "reach out within one business day to get started and tell you exactly",
      "what I need from you.",
      "",
      "If you need me before then, just reply to this email or call.",
      "",
      "Ryan Nichols",
      "The LeadFlow Pro",
      "(903) 500-8898",
      "Longview, Texas",
    ].join("\n"),
  });
}

async function notifyToolStudioPurchase(
  email: string,
  kind: string,
  amountCents: number | null,
  session: StripeCheckoutSession,
) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const amount =
    typeof amountCents === "number" && Number.isFinite(amountCents)
      ? `$${(amountCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      : "the Stripe total";
  const order =
    typeof session.metadata?.order === "string"
      ? session.metadata.order.slice(0, 480)
      : kind.replace(/_/g, " ");
  const renewal =
    typeof session.metadata?.renews_monthly_usd === "string"
      ? session.metadata.renews_monthly_usd.slice(0, 40)
      : "0";
  const send = async (payload: object) => {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Resend rejected Tool Studio email: ${response.status}`);
  };

  await send({
    from: "The LeadFlow Pro <hello@theleadflowpro.com>",
    to: ["hello@theleadflowpro.com"],
    subject: `TOOL STUDIO PAID: ${amount} - ${email}`,
    text: [
      "A Tool Studio checkout completed.",
      "",
      `Buyer: ${email}`,
      `Paid today: ${amount}`,
      `Renews monthly: $${renewal}`,
      `Order: ${order}`,
      `Stripe session: ${typeof session.id === "string" ? session.id : "-"}`,
      "",
      "NEXT ACTION: match this payment to the Tool Studio lead, then lock the",
      "written inputs, outputs, revisions, exclusions, and delivery date.",
      "",
      "Admin: https://www.theleadflowpro.com/admin",
    ].join("\n"),
  });

  await send({
    from: "Ryan Nichols <hello@theleadflowpro.com>",
    to: [email],
    reply_to: "hello@theleadflowpro.com",
    subject: "Your Tool Studio order is in. Here is what happens next.",
    text: [
      "Your payment came through.",
      "",
      `Order: ${order}`,
      `Paid today: ${amount}`,
      renewal !== "0" ? `Monthly renewal: $${renewal}` : "No monthly menu selected.",
      "",
      "I will contact you within one business day. We will lock the written",
      "scope before production: the tool's inputs, outputs, logic, lead route,",
      "correction rounds, exclusions, and delivery target.",
      "",
      "Do not send passwords. I will use approved account invitations wherever",
      "access is required.",
      "",
      "Ryan Nichols",
      "The LeadFlow Pro",
      "(903) 500-8898",
    ].join("\n"),
  });
}

/**
 * A paid pro kit. The buyer already has access: the claim route set their
 * cookie the moment Stripe redirected them back. This is the durable half,
 * and the only thing it has to get right is the key, because that is what
 * restores the kit on their other phone in eight months.
 *
 * The key is derived from the email and the kind, so there is nothing to store
 * and nothing to lose. Throws on send failure so Stripe retries.
 */
async function sendProKitReceipt(email: string, kind: string) {
  const key = process.env.RESEND_API_KEY;
  const secrets = proAccessSecrets();
  if (!key || secrets.length === 0) return;

  const slug = proKindSlug(kind);
  const kit = slug ? getProTool(slug) : null;
  const isBundle = kind === PRO_BUNDLE.kind;
  const title = isBundle ? PRO_BUNDLE.name : kit?.name ?? "Pro Kit";
  const path = isBundle ? "/tools/pro" : `/tools/pro/${slug}`;
  const accessKey = licenseKey(email, kind, secrets[0]);
  const site = "https://www.theleadflowpro.com";

  const send = async (payload: object) => {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(`Resend rejected pro kit email: ${r.status}`);
  };

  await send({
    from: "The LeadFlow Pro <hello@theleadflowpro.com>",
    to: ["hello@theleadflowpro.com"],
    subject: `PRO KIT SOLD: ${title} - ${email}`,
    text: [
      `${title} was purchased.`,
      `Buyer: ${email}`,
      "",
      "No action needed. The kit unlocked itself and the key is on its way to them.",
    ].join("\n"),
  });

  await send({
    from: "Ryan Nichols <hello@theleadflowpro.com>",
    to: [email],
    reply_to: "hello@theleadflowpro.com",
    subject: `Your ${title} access key`,
    text: [
      `${title} is unlocked.`,
      "",
      "It is already open in the browser you bought it in. This email is how you",
      "open it anywhere else, so keep it.",
      "",
      `Your key: ${accessKey}`,
      "",
      `Open the kit: ${site}${path}`,
      `Unlock on another device: ${site}/tools/pro/unlock?email=${encodeURIComponent(email)}&key=${encodeURIComponent(accessKey)}`,
      "",
      isBundle
        ? "The bundle covers every kit on the shelf, including the ones added later. Same key."
        : "Change any answer in the kit and every document rebuilds, at no extra cost, for as long as the kit exists.",
      "",
      "There is nothing recurring here and nothing to cancel.",
      "",
      "If anything does not open, reply to this email and I will sort it out.",
      "",
      "Ryan Nichols",
      "The LeadFlow Pro",
      "(903) 500-8898",
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

    await sendBuyerAcknowledgement(customer.email, "Your Website Launch deposit is in.", [
      `${(lead.full_name || customer.fullName || "").trim().split(" ")[0] || "Hey"},`,
      "",
      "Your $500 Website Launch deposit is paid and the build is on my board. Stripe's receipt is your record.",
      "",
      "What happens next:",
      "",
      "1. I reach out within one business day from (903) 500-8898 to start the intake: your offer, your buyer, your five pages.",
      "2. We put the scope in writing before anything gets built. The remaining $500 is due only after you approve the build and before it goes live.",
      "3. Have ready if you can: real photos of real work, your logo if you have one, and the domain you want. No passwords, ever.",
      "",
      "If you do not hear from me inside one business day, text that number. It is my direct line.",
    ]);

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
    await sendBuyerAcknowledgement(customer.email, "Your Time Back order is paid.", [
      `${String(leadName || "").trim().split(" ")[0] || "Hey"},`,
      "",
      `Your Time Back order is paid${paidUsd !== null ? ` ($${paidUsd})` : ""}. ${orderSummary}. Stripe's receipt is your record.`,
      "",
      "What happens next:",
      "",
      `1. Finish the welcome intake if you have not yet: https://www.theleadflowpro.com/go/time-back/welcome?session_id=${encodeURIComponent(sessionId)}`,
      "2. Grant access the official way through the platform invites on that page. You never hand over a password, and you can revoke it in one click.",
      "3. I write and schedule the posts. The first batch waits for your approval. Posts go live within five business days of your onboarding landing.",
      "",
      "Questions in the meantime: text (903) 500-8898.",
    ]);
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
    await sendBuyerAcknowledgement(customer.email, "Your Follow-Up Campaign is paid.", [
      `${String(leadName || "").trim().split(" ")[0] || "Hey"},`,
      "",
      `Your $${LEAD_FOLLOW_UP.priceUsd} Lead Follow-Up Campaign is paid. Stripe's receipt is your record. I write the messages; you send them from your own accounts.`,
      "",
      "What happens next:",
      "",
      `1. Fill out the three-minute intake if you have not yet: https://www.theleadflowpro.com/go/lead-follow-up/intake?session_id=${encodeURIComponent(sessionId)}`,
      `2. I write the first draft within ${LEAD_FOLLOW_UP.turnaroundDays} business days of receiving it.`,
      "3. You review, I revise, you start sending.",
      "",
      "Nothing gets written until the intake comes back, so the campaign is built on your business instead of a template.",
    ]);
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

// Paid Free Build order (/free-build). The funnel already saved the lead
// before Stripe opened, so this marks that row won, stamps the payment, and
// tells Ryan to call. The build clock does not start until that call happens,
// which is why the alert names it as the next action instead of the work.
//
// Same idempotency contract as the other paid flows in this file: alert first,
// activity marker second, so a provider failure keeps the event retryable.
async function ensureFreeBuildPaid(
  supabase: SupabaseClient,
  session: StripeCheckoutSession,
  kind: string,
) {
  const tier = findFreeBuildTier(kind);
  if (!tier) throw new Error(`Paid Free Build checkout has an unknown tier: ${kind}`);

  const sessionId = typeof session.id === "string" ? session.id.slice(0, 200) : "";
  const customer = websiteLaunchCustomer(session);
  if (!sessionId || !customer.email) {
    throw new Error("Paid Free Build checkout is missing its session ID or email");
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
    .eq("diagnostic->>source", "free_build_funnel")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (found.error) throw new Error(`Free Build lookup failed: ${found.error.code}`);

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
      diagnostic: { ...diagnostic, paid: true, offer: tier.id, stripe: stripeStamp },
    };
    if (!found.data.phone && customer.phone) updates.phone = customer.phone;
    if (!found.data.external_id) updates.external_id = externalId;
    const updated = await supabase.from("leads").update(updates).eq("id", leadId);
    if (updated.error && updated.error.code !== "23505") {
      throw new Error(`Free Build update failed: ${updated.error.code}`);
    }
  } else {
    const inserted = await supabase
      .from("leads")
      .insert({
        full_name: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        interest: "launch_system",
        goals: `FREE BUILD paid through Stripe: ${tier.name} ($${tier.priceUsd}). Waiting on the twenty minute call.`,
        best_contact_method: "email",
        source: "stripe_checkout",
        utm_source: "stripe",
        utm_medium: "checkout",
        utm_campaign: "free_build",
        sms_consent: false,
        marketing_email_consent: false,
        status: "won",
        external_id: externalId,
        diagnostic: {
          version: 1,
          source: "free_build_funnel",
          offer: tier.id,
          tier_name: tier.name,
          price_usd: tier.priceUsd,
          paid: true,
          stripe: stripeStamp,
          next_action: "Paid without a funnel row. Call them and book the twenty minute call.",
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
      if (raced.error) throw new Error(`Free Build race recovery failed: ${raced.error.code}`);
      leadId = raced.data.id;
      leadName = raced.data.full_name || leadName;
    } else if (inserted.error) {
      throw new Error(`Free Build insert failed: ${inserted.error.code}`);
    } else {
      leadId = inserted.data.id;
      leadName = inserted.data.full_name || leadName;
    }
  }

  const activityDetail = `Free Build paid through Stripe: ${tier.name}. Stripe checkout: ${sessionId}.`;
  const existingActivity = await supabase
    .from("lead_activity")
    .select("id")
    .eq("lead_id", leadId)
    .eq("kind", "system")
    .eq("detail", activityDetail)
    .limit(1)
    .maybeSingle();
  if (existingActivity.error) {
    throw new Error(`Free Build activity lookup failed: ${existingActivity.error.code}`);
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
          subject: `FREE BUILD PAID: ${leadName} - ${tier.name} ($${tier.priceUsd})`,
          text: [
            `${tier.name} paid: $${tier.priceUsd}.`,
            `Email: ${customer.email}`,
            `Phone: ${customer.phone || "-"}`,
            `Free build included: ${tier.pages}`,
            "",
            "NEXT ACTION: call them and book the twenty minute call. The 10 business day",
            "delivery clock starts at that call, not at this payment.",
            "",
            "Admin: https://www.theleadflowpro.com/admin",
          ].join("\n"),
        }),
      }).catch(() => null);
      if (!alert?.ok) throw new Error("Internal Free Build alert was not accepted");
    }
    await sendBuyerAcknowledgement(customer.email, `Your ${tier.name} is paid. Here is what happens next.`, [
      `${String(leadName || "").trim().split(" ")[0] || "Hey"},`,
      "",
      `${tier.name} is paid, $${tier.priceUsd} one time. The free build (${tier.pages}) and the engine behind it are both on my board. Stripe's receipt is your record.`,
      "",
      "What happens next:",
      "",
      "1. I text or call you within one business day from (903) 500-8898 to set up our twenty minute call. Want to skip the wait? Text that number now.",
      "2. The ten business day delivery clock starts at that call and your photos landing, not at this payment.",
      "3. Have ready: real photos of real work, your logo if you have one, and the domain you want on the front of it. No passwords, ever.",
      "",
      "Your domain, your hosting account, your pixel, your leads. If you fired me tomorrow you would keep every bit of it.",
    ]);
    const activityInsert = await supabase.from("lead_activity").insert({
      lead_id: leadId,
      kind: "system",
      detail: activityDetail,
    });
    if (activityInsert.error) {
      throw new Error(`Free Build activity insert failed: ${activityInsert.error.code}`);
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

  if (!isCheckoutPaymentEvent(event.type)) {
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
      if (websiteLaunch || session.metadata?.kind === "event") {
        throw new Error("Paid checkout is missing its customer email");
      }
      return NextResponse.json({ received: true });
    }

    // A pro kit's purchase row carries the entitlement kind (pro_bundle, or
    // pro_tool:<slug>), not the generic checkout kind, because that row is
    // what unlocks the kit for a logged-in buyer. The amount is checked
    // against the catalog inside proKindFromSession, so a session for the $10
    // kit can never be recorded as the $29 one.
    const proKind = proKindFromSession(session, proCatalog());
    const kind = websiteLaunch
      ? WEBSITE_LAUNCH_PURCHASE_KIND
      : proKind ?? safeStripeKind(session);
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
    } else if (proKind) {
      await sendProKitReceipt(customer.email, proKind);
    } else if (kind === "timeback_order") {
      await ensureTimebackOrderPaid(supabase, session);
    } else if (kind === "event") {
      await ensureEventSeatPaid(supabase, session);
    } else if (kind === LEAD_FOLLOW_UP.id) {
      await ensureLeadFollowUpPaid(supabase, session);
    } else if (findFreeBuildTier(kind)) {
      await ensureFreeBuildPaid(supabase, session, kind);
    } else if (kind === "tool_studio_order" || kind === "tool_monthly_menu") {
      await notifyToolStudioPurchase(
        customer.email,
        kind,
        Number.isFinite(Number(session.amount_total)) ? Number(session.amount_total) : null,
        session,
      );
    } else if (kind === "learn_it") {
      await sendPurchaseEmails(customer.email, kind);
    } else if (kind === CONTENT_ENGINE.purchaseKind) {
      await sendContentEnginePurchaseEmails(customer.email);
    } else if (kind === CHATGPT_OPERATOR.purchaseKind) {
      await sendAcademyPurchaseEmails(customer.email, CHATGPT_OPERATOR.shortTitle, "/training/chatgpt-operator");
    } else if (kind === OPERATOR_ACADEMY.allAccessPurchaseKind) {
      await sendAcademyPurchaseEmails(customer.email, OPERATOR_ACADEMY.title, "/training");
    } else {
      // Nothing above claimed this payment. Do NOT let it fall off the end in
      // silence: system_map, package_full, a package_deposit that is not the
      // exact $500 Website Launch, and every build_deposit used to land here
      // and produce no alert and no buyer email at all.
      await notifyUnhandledPurchase(
        customer.email,
        kind,
        Number.isFinite(Number(session.amount_total)) ? Number(session.amount_total) : null,
        session.id,
      );
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
