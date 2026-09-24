import { NextResponse } from "next/server";
import crypto from "node:crypto";
import type Stripe from "stripe";
import { handleSpecialWebhook } from "@/lib/septemberSpecialServer";
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";
import { sendInternalLeadAlert } from "@/lib/leadNotify";
import { isCheckoutPaymentEvent } from "@/lib/eventPayments";
import { sendProKitReceipt } from "@/lib/proKitFulfillment";
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
import { proKindFromSession } from "@/lib/proAccess";
import { proCatalog } from "@/lib/tools/pro";
import { SELLERPROOF } from "@/lib/sellerproof/packet";
import { sendSellerProofReceipt } from "@/lib/sellerproof/receipt";
import { handleHqStripeEvent } from "@/lib/hq/subscription";
import { HQ_PLAN } from "@/lib/hq/types";
import { AGENCY_PAYMENT, agencyPaymentFromMetadata } from "@/lib/agencyPayment";
import { CHASE_SHEET, isChaseSheetKind } from "@/lib/chaseSheet/product";
import { applyChaseSheetMoneyBack, ensureChaseSheetPaid, handleChaseSheetSubscription, markChaseSheetRenewed } from "@/lib/chaseSheet/subscription";
import { deliverPaymentEmail } from "@/lib/paymentEmailDelivery";
import { classifyStripeInvoice, dollars, renewalAction } from "@/lib/stripeInvoiceEvents";
import { refundOutcome } from "@/lib/stripeRefunds";
import { BUSINESS } from "@/lib/site/business";
import { PRICES, usd } from "@/lib/site/prices";
import { TLFP_CREDITS, TLFP_FOUNDING, findPack, foundingSeatsLeft, foundingTier } from "@/lib/tlfpCredits";
import { findToolBuild } from "@/lib/toolStudio";
import {
  FoundingNotInstalledError,
  applyFoundingPerks,
  awardReferralPurchase,
  creditPackPaid,
  creditPackReversed,
  foundingAwardedOn,
  reverseFoundingCredits,
  settleHold,
} from "@/lib/tlfp";

// Stripe webhook: records paid checkouts and unlocks training access.
// Needs STRIPE_WEBHOOK_SECRET (from Stripe dashboard → Webhooks) and
// SUPABASE_SERVICE_ROLE_KEY (Supabase → Settings → API) in Vercel env vars.
// Endpoint to register in Stripe: https://www.theleadflowpro.com/api/stripe-webhook
// Events to send: checkout.session.completed, checkout.session.async_payment_succeeded,
// checkout.session.async_payment_failed, charge.refunded, charge.dispute.created, charge.dispute.closed,
// customer.subscription.updated, customer.subscription.deleted,
// invoice.finalized, invoice.sent,
// invoice.paid, invoice.payment_failed, invoice.voided, and invoice.marked_uncollectible
//
// Every email this file sends goes through the payment_email_deliveries
// ledger (lib/paymentEmailDelivery.ts), keyed by the Stripe object id and a
// purpose, so a retried event never sends the same email twice. The ledger
// throws when the provider rejects a send, which keeps the event retryable.

/**
 * Owner-only alert through the delivery ledger. Skipped, not failed, when
 * Resend is not configured.
 *
 * The ledger refuses a retry whose body differs from the first attempt, so
 * a body that carries state which can change between attempts (whether the
 * buyer acknowledgement left) needs its own ledger key per state. The
 * `acknowledged: false` case is keyed separately; if the acknowledgement
 * succeeds on a later retry the "sent" alert goes out as a new row instead
 * of tripping the hash guard, and the owner hears the truth twice rather
 * than never.
 */
async function internalAlert(supabase: SupabaseClient, sessionId: string, purpose: string, subject: string, lines: string[], options: { acknowledged?: boolean } = {}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return false;
  await deliverPaymentEmail({
    supabase,
    sessionId,
    purpose: options.acknowledged === false ? `${purpose}:noack` : purpose,
    payload: {
      from: `${BUSINESS.name} <${BUSINESS.email.alerts}>`,
      to: [BUSINESS.email.hello],
      subject: subject.slice(0, 200),
      text: lines.join("\n"),
    },
    apiKey,
  });
  return true;
}

/**
 * The one writer of public.purchases. A row is created once per Stripe
 * object; a retry never rewrites a status a refund or dispute has since
 * changed. The only status that may move back to "paid" is
 * "payment_failed" (a later invoice.paid on the same invoice).
 */
async function recordPurchase(
  supabase: SupabaseClient,
  purchase: { email: string; kind: string; amount_cents: number | null; stripe_session_id: string; status: "paid" | "payment_failed" },
) {
  const existing = await supabase
    .from("purchases")
    .select("status")
    .eq("stripe_session_id", purchase.stripe_session_id)
    .maybeSingle();
  if (existing.error) throw new Error(`Purchase lookup failed: ${existing.error.code}`);
  if (!existing.data) {
    const inserted = await supabase.from("purchases").insert(purchase);
    if (inserted.error && inserted.error.code !== "23505") {
      throw new Error(`Purchase record failed: ${inserted.error.code}`);
    }
    return;
  }
  if (existing.data.status === "payment_failed" && purchase.status === "paid") {
    const updated = await supabase
      .from("purchases")
      .update({ status: "paid", amount_cents: purchase.amount_cents })
      .eq("stripe_session_id", purchase.stripe_session_id);
    if (updated.error) throw new Error(`Purchase status update failed: ${updated.error.code}`);
  }
}

function amountCentsOf(session: StripeCheckoutSession): number | null {
  return Number.isFinite(Number(session.amount_total)) ? Number(session.amount_total) : null;
}

function dollarsOrUnknown(amountCents: number | null): string {
  return typeof amountCents === "number" && Number.isFinite(amountCents) ? dollars(amountCents) : "unknown amount";
}

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

/**
 * A pair of one-shot emails (owner, then buyer) through the ledger. Throws
 * when the provider rejects one, which keeps the Stripe event retryable; a
 * retry then sends only the half that never got a provider id.
 */
function ledgerPair(supabase: SupabaseClient, sessionId: string, family: string) {
  const key = process.env.RESEND_API_KEY?.trim();
  return async (purpose: "internal" | "buyer", payload: object) => {
    if (!key) return;
    await deliverPaymentEmail({ supabase, sessionId, purpose: `${family}:${purpose}`, payload, apiKey: key });
  };
}

async function sendPurchaseEmails(supabase: SupabaseClient, sessionId: string, email: string, kind: string) {
  // Throw on failure. This used to be `.catch(() => {})` with no r.ok check,
  // so a 429 or 422 from Resend meant the buyer's access instructions silently
  // vanished, the handler still returned {received:true}, and Stripe never
  // retried. Every other paid path in this file throws for exactly that
  // reason: a retried webhook is recoverable, a swallowed one is not.
  const send = ledgerPair(supabase, sessionId, "learn-it");

  await send("internal", {
    from: `${BUSINESS.name} <${BUSINESS.email.hello}>`,
    to: [BUSINESS.email.hello],
    subject: `💰 PURCHASE: ${kind} | ${email}`,
    text: `New purchase.\n\nProduct: ${kind}\nBuyer: ${email}\n\nAdmin: https://www.theleadflowpro.com/admin/purchases`,
  });
  await send("buyer", {
    from: `${BUSINESS.operator} <${BUSINESS.email.hello}>`,
    to: [email],
    reply_to: BUSINESS.email.hello,
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
      "Work the courses in order. By the capstone you'll have your own platform live on your own domain: code in your GitHub, data in your database, nobody's hand in your pocket every month.",
      "",
      "Stuck on anything? Reply to this email. I read every one.",
      "",
      "Ryan Nichols",
      "The LeadFlow Pro | Own your platform.",
    ].join("\n"),
  });
}

async function sendContentEnginePurchaseEmails(supabase: SupabaseClient, sessionId: string, email: string) {
  const send = ledgerPair(supabase, sessionId, "content-engine");

  await send("internal", {
    from: `${BUSINESS.name} <${BUSINESS.email.hello}>`,
    to: [BUSINESS.email.hello],
    subject: `CONTENT ENGINE PURCHASE: ${email}`,
    text: `Founding course access purchased.\nBuyer: ${email}\nCourse: ${CONTENT_ENGINE.title}`,
  });
  await send("buyer", {
    from: `${BUSINESS.operator} <${BUSINESS.email.hello}>`,
    to: [email],
    reply_to: BUSINESS.email.hello,
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

async function sendAcademyPurchaseEmails(supabase: SupabaseClient, sessionId: string, email: string, title: string, nextPath: string) {
  const send = ledgerPair(supabase, sessionId, "academy");
  await send("internal", {
    from: `${BUSINESS.name} <${BUSINESS.email.hello}>`,
    to: [BUSINESS.email.hello],
    subject: `OPERATOR ACADEMY PURCHASE: ${email}`,
    text: `Paid training access purchased.\nBuyer: ${email}\nAccess: ${title}`,
  });
  await send("buyer", {
    from: `${BUSINESS.operator} <${BUSINESS.email.hello}>`,
    to: [email],
    reply_to: BUSINESS.email.hello,
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
// a Stripe event retryable; a buyer email that fails must never block them.
// It goes through the delivery ledger, so a retried event cannot send it
// twice, and a failed send is visible as a ledger row with no sent_at. The
// callers put the result in the owner alert so Ryan knows whether the buyer
// heard anything.
async function sendBuyerAcknowledgement(
  supabase: SupabaseClient,
  sessionId: string,
  purpose: string,
  email: string,
  subject: string,
  lines: string[],
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key || !email || !email.includes("@") || email.includes("@no-email.")) return false;
  try {
    await deliverPaymentEmail({
      supabase,
      sessionId,
      purpose,
      payload: {
        from: `${BUSINESS.operator} <${BUSINESS.email.ryan}>`,
        reply_to: BUSINESS.email.hello,
        to: [email],
        subject,
        text: [
          ...lines,
          "",
          "Talk soon,",
          "Ryan Nichols",
          "The LeadFlow Pro",
          BUSINESS.phone.display,
        ].join("\n"),
      },
      apiKey: key,
    });
    return true;
  } catch (e) {
    console.error("buyer acknowledgement failed:", e instanceof Error ? e.message : e);
    return false;
  }
}

function acknowledgementLine(sent: boolean): string {
  return sent ? "Buyer acknowledgement: sent." : "Buyer acknowledgement: FAILED, reach out today.";
}

async function notifyUnhandledPurchase(
  supabase: SupabaseClient,
  email: string,
  kind: string,
  amountCents: number | null,
  sessionId: string,
) {
  const amount = dollarsOrUnknown(amountCents);

  // Buyer first (idempotent through the ledger), so the owner alert can say
  // truthfully whether the acknowledgement left.
  const acknowledged = await sendBuyerAcknowledgement(supabase, sessionId, "unhandled:buyer", email, "Got your payment. Here is what happens next.", [
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
  ]);

  await internalAlert(supabase, sessionId, "unhandled:internal", `💰 PAID: ${kind} ${amount} | ${email}`, [
    "Somebody paid and there is no automated fulfilment for this product.",
    "",
    `Product: ${kind}`,
    `Amount:  ${amount}`,
    `Buyer:   ${email}`,
    `Stripe:  ${sessionId}`,
    "",
    "Reach out to them today.",
    acknowledgementLine(acknowledged),
    "",
    "Admin: https://www.theleadflowpro.com/admin/purchases",
  ], { acknowledged });
}

/**
 * Finds or creates the lead a paid checkout belongs to for the flows whose
 * funnel saves the lead before Stripe opens (System Map on a package page,
 * Tool Studio), marks it won, stamps the payment, and opens the next task.
 * These sources have no competing admin board, so diagnostic.paid and
 * diagnostic.stripe are theirs to set. Returns the lead id and first name.
 */
async function claimFunnelLead(
  supabase: SupabaseClient,
  session: StripeCheckoutSession,
  input: { source: string; offer: string; campaign: string; interest: string; goals: string; taskTitle: string; nextAction: string },
) {
  const sessionId = typeof session.id === "string" ? session.id.slice(0, 200) : "";
  const customer = websiteLaunchCustomer(session);
  if (!sessionId || !customer.email) throw new Error(`Paid ${input.offer} checkout is missing its session ID or email`);
  const externalId = `stripe_checkout:${sessionId}`;
  const stripeStamp = { session_id: sessionId, paid_at: new Date().toISOString(), amount_total_cents: amountCentsOf(session) };

  const found = await supabase
    .from("leads")
    .select("id, full_name, phone, diagnostic, external_id")
    .ilike("email", escapeIlike(customer.email))
    .eq("diagnostic->>source", input.source)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (found.error) throw new Error(`${input.offer} lead lookup failed: ${found.error.code}`);

  let leadId: string;
  let leadName = customer.fullName;
  if (found.data) {
    leadId = found.data.id;
    leadName = found.data.full_name || leadName;
    const diagnostic = found.data.diagnostic && typeof found.data.diagnostic === "object" ? (found.data.diagnostic as Record<string, unknown>) : {};
    const updates: Record<string, unknown> = { status: "won", diagnostic: { ...diagnostic, paid: true, offer: input.offer, stripe: stripeStamp } };
    if (!found.data.phone && customer.phone) updates.phone = customer.phone;
    if (!found.data.external_id) updates.external_id = externalId;
    const updated = await supabase.from("leads").update(updates).eq("id", leadId);
    if (updated.error && updated.error.code !== "23505") throw new Error(`${input.offer} lead update failed: ${updated.error.code}`);
  } else {
    const inserted = await supabase
      .from("leads")
      .insert({
        full_name: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        interest: input.interest,
        goals: input.goals,
        best_contact_method: customer.phone ? "phone" : "email",
        source: "stripe_checkout",
        utm_source: "stripe",
        utm_medium: "checkout",
        utm_campaign: input.campaign,
        sms_consent: false,
        marketing_email_consent: false,
        status: "won",
        external_id: externalId,
        diagnostic: { version: 1, source: input.source, offer: input.offer, paid: true, stripe: stripeStamp, next_action: input.nextAction },
      })
      .select("id, full_name")
      .single();
    if (inserted.error?.code === "23505") {
      const raced = await supabase.from("leads").select("id, full_name").eq("external_id", externalId).is("deleted_at", null).single();
      if (raced.error) throw new Error(`${input.offer} lead race recovery failed: ${raced.error.code}`);
      leadId = raced.data.id;
      leadName = raced.data.full_name || leadName;
    } else if (inserted.error) {
      throw new Error(`${input.offer} lead insert failed: ${inserted.error.code}`);
    } else {
      leadId = inserted.data.id;
      leadName = inserted.data.full_name || leadName;
    }
  }

  const openTask = await supabase
    .from("lead_tasks")
    .select("id")
    .eq("lead_id", leadId)
    .eq("title", input.taskTitle)
    .is("completed_at", null)
    .limit(1)
    .maybeSingle();
  if (openTask.error) throw new Error(`${input.offer} task lookup failed: ${openTask.error.code}`);
  if (!openTask.data) {
    const taskInsert = await supabase.from("lead_tasks").insert({ lead_id: leadId, title: input.taskTitle, due_date: new Date().toISOString().slice(0, 10) });
    if (taskInsert.error) throw new Error(`${input.offer} task insert failed: ${taskInsert.error.code}`);
  }

  return { leadId, leadName, customer, sessionId };
}

/** Writes the system activity row that records a paid event on the lead, once. */
async function markLeadActivity(supabase: SupabaseClient, leadId: string, detail: string, label: string) {
  const existing = await supabase.from("lead_activity").select("id").eq("lead_id", leadId).eq("kind", "system").eq("detail", detail).limit(1).maybeSingle();
  if (existing.error) throw new Error(`${label} activity lookup failed: ${existing.error.code}`);
  if (existing.data) return false;
  const inserted = await supabase.from("lead_activity").insert({ lead_id: leadId, kind: "system", detail });
  if (inserted.error) throw new Error(`${label} activity insert failed: ${inserted.error.code}`);
  return true;
}

// Paid System Map ($497 from a package page). The order form saved the lead
// with diagnostic.source "package_page" before Stripe opened. Until
// 2026-09-21 this fell into the catch-all: an alert, an acknowledgement, and
// a lead still sitting at "new".
/**
 * A paid TLFP Credits pack (/tlfp). The credits post to the buyer's email
 * through the ledger function, idempotent on the session id, so a retried
 * event never double-credits. The buyer hears where to see the balance; the
 * email body carries no live number because a retry must send the same body.
 */
async function ensureCreditPackPaid(supabase: SupabaseClient, session: StripeCheckoutSession) {
  const sessionId = String(session.id);
  const customer = websiteLaunchCustomer(session);
  const pack = findPack(session.metadata?.pack);
  if (!pack) throw new Error("Paid credit pack has no pack id");
  const amount = amountCentsOf(session);
  const posted = await creditPackPaid(supabase, { email: customer.email, pack, sessionId, amountCents: amount });
  if (!posted.ok && posted.error !== "balance_cap") throw new Error(`Credit pack post failed: ${posted.error ?? "unknown"}`);
  const first = String(customer.fullName || "").trim().split(" ")[0] || "Hey";
  // Say what really posted: the ledger caps at the balance limit. A retry
  // reads the same number (a duplicate post returns the original row).
  const credited = posted.ok ? Math.max(0, Number(posted.applied ?? pack.credits)) : 0;
  const cap = TLFP_CREDITS.maxBalance.toLocaleString("en-US");
  const landed =
    credited >= pack.credits
      ? `and ${pack.credits} credits are on the account for ${customer.email}.`
      : credited > 0
        ? `and ${credited} of its ${pack.credits} credits are on the account for ${customer.email}. A balance tops out at ${cap} credits, so the rest could not post. Reply to this email and we will make it right.`
        : `but the account for ${customer.email} is already at the ${cap} credit limit, so the credits could not post. Reply to this email and we will make it right.`;
  const acknowledged = await sendBuyerAcknowledgement(supabase, sessionId, "tlfp-pack:buyer", customer.email, credited > 0 ? `${credited} ${TLFP_CREDITS.name} are on your account.` : `Your ${pack.name} is paid.`, [
    `${first},`,
    "",
    `Your ${pack.name} is paid (${dollarsOrUnknown(amount)}) ${landed}`,
    "",
    "How to use them:",
    "",
    `1. Log in at ${BUSINESS.siteUrl}/login with this same email. No password yet? Use the magic link.`,
    `2. Open ${BUSINESS.siteUrl}${TLFP_CREDITS.path} to see your balance, your history, and your referral link.`,
    "3. Pick what you want to put them on. Credits apply first, the card covers the rest.",
    "",
    "1 credit = $1 of LeadFlow Pro services. No cash value, not transferable, redeem only with The LeadFlow Pro.",
    `Terms: ${BUSINESS.siteUrl}${TLFP_CREDITS.termsPath}`,
  ]);
  await internalAlert(supabase, sessionId, "tlfp-pack:internal", `💰 CREDIT PACK: ${pack.name} ${dollarsOrUnknown(amount)} | ${customer.email}`, [
    `${pack.name} paid: ${dollarsOrUnknown(amount)} for ${pack.credits} credits.`,
    `Buyer: ${customer.fullName || "-"}`,
    `Email: ${customer.email}`,
    `Stripe session: ${sessionId}`,
    posted.ok
      ? `Ledger: ${posted.duplicate ? "already posted (retry)" : `posted ${posted.applied} credits`}${typeof posted.requested === "number" && posted.applied !== posted.requested ? ` (capped from ${posted.requested})` : ""}`
      : "Ledger: NOT POSTED, balance cap reached. Refund or grant by hand.",
    "",
    "Deferred revenue until they redeem it. Nothing to fulfil today.",
    acknowledgementLine(acknowledged),
    "",
    `Credits admin: ${BUSINESS.siteUrl}/admin/tlfp`,
  ], { acknowledged });
}

/**
 * Founding 100 on a paid checkout or invoice (lib/tlfp.ts applyFoundingPerks):
 * a qualifying purchase claims a seat and its bonus while seats last, and a
 * seat holder earns the monthly bonus and the standing rebate. Runs after
 * fulfilment. Every award is idempotent on `key`, so on a real failure the
 * owner is told once and the error is rethrown: Stripe redelivers the event,
 * fulfilment replays as a no-op, and the redelivery posts what was missed and
 * nothing twice. A hand grant would not record the seat, so the alert says
 * not to. The one failure that does not throw is the founding migration not
 * being applied yet, so merging first can never turn every paid event into a
 * 500. The seat alert to the owner is best effort; nothing goes to the buyer.
 */
async function foundingPerksOnPaid(
  supabase: SupabaseClient,
  input: {
    email: string;
    kind: string;
    amountCents: number | null;
    key: string;
    purchaseKey?: string;
    billing?: string | null;
    tierKind?: string;
    tierCents?: number | null;
  },
) {
  let outcome: Awaited<ReturnType<typeof applyFoundingPerks>>;
  try {
    outcome = await applyFoundingPerks(supabase, input);
  } catch (error) {
    if (error instanceof FoundingNotInstalledError) {
      // Never fail a paid event over it, but never lose the purchase either.
      console.warn("TLFP founding skipped, migration not applied:", error.message);
      try {
        await internalAlert(supabase, input.key, "founding-not-installed:internal", `FOUNDING 100 NOT INSTALLED: ${input.email}`, [
          `A paid ${input.kind.replace(/_/g, " ")} (${dollarsOrUnknown(input.amountCents)}, ${input.key}) was not checked for Founding 100: the founding migration is not in the database.`,
          "Apply supabase/migrations/20260924200000_tlfp_founding.sql, then resend this event from the Stripe dashboard (Developers, Events). It posts once.",
        ]);
      } catch {
        // The log line above is the record.
      }
      return;
    }
    console.error("TLFP founding perks failed:", error instanceof Error ? error.message : "unknown");
    try {
      await internalAlert(supabase, input.key, "founding-failed:internal", `FOUNDING 100 CHECK FAILED: ${input.email}`, [
        `A paid ${input.kind.replace(/_/g, " ")} (${dollarsOrUnknown(input.amountCents)}, ${input.key}) could not finish the Founding 100 check.`,
        "The webhook answered Stripe with an error, so Stripe retries the event on its own and the retry posts whatever was missed, once.",
        "If Stripe gives up, fix the cause and resend the event from the Stripe dashboard (Developers, Events).",
        "Do not grant founding credits by hand: a hand grant does not record the seat, and a later retry would pay the bonus again.",
        `Credits admin: ${BUSINESS.siteUrl}/admin/tlfp`,
      ]);
    } catch {
      // The log line above is the record.
    }
    throw error;
  }
  if (!outcome.claimedHere || outcome.seatNo === null || !outcome.tier) return;
  const tier = foundingTier(outcome.tier);
  try {
    await internalAlert(supabase, input.key, "founding-seat:internal", `FOUNDING SEAT ${outcome.seatNo} of ${TLFP_FOUNDING.seats}: ${input.email}`, [
      `${input.email} took founding seat ${outcome.seatNo} of ${TLFP_FOUNDING.seats} as a ${tier.label}.`,
      `Purchase: ${input.kind.replace(/_/g, " ")} ${dollarsOrUnknown(input.amountCents)} (${input.key})`,
      `Founding bonus posted: ${outcome.bonus} credits.${tier.monthlyCredits ? ` Monthly: ${outcome.monthly} credits.` : ""}`,
      `Rebate on this purchase: ${outcome.rebate} credits (${TLFP_FOUNDING.rebatePercent}%).`,
      `Seats left: ${foundingSeatsLeft(outcome.seatNo)}.`,
      "",
      "Nothing was sent to the client. Their balance card shows the seat when they log in.",
      `Credits admin: ${BUSINESS.siteUrl}/admin/tlfp`,
    ]);
  } catch (error) {
    // Best effort: the seat and its credits are already posted, and a retry
    // with a different body (a refund can change the bonus) must never wedge
    // the event. The admin page lists every seat.
    console.error("TLFP founding seat alert failed:", error instanceof Error ? error.message : "unknown");
  }
}

async function ensureSystemMapPaid(supabase: SupabaseClient, session: StripeCheckoutSession) {
  const amount = amountCentsOf(session);
  const { leadId, leadName, customer, sessionId } = await claimFunnelLead(supabase, session, {
    source: "package_page",
    offer: "system_map",
    campaign: "system_map",
    interest: "system_map",
    goals: `SYSTEM MAP paid through Stripe (${dollarsOrUnknown(amount)}). Schedule the mapping call.`,
    taskTitle: "Schedule System Map call",
    nextAction: "Paid without a package-page lead. Schedule the mapping call.",
  });
  const first = String(leadName || "").trim().split(" ")[0] || "Hey";
  const acknowledged = await sendBuyerAcknowledgement(supabase, sessionId, "system-map:buyer", customer.email, "Your System Map is paid. Here is what happens next.", [
    `${first},`,
    "",
    `Your System Map is paid (${dollarsOrUnknown(amount)}). Stripe's receipt is your record.`,
    "",
    "What happens next:",
    "",
    `1. I reach out within one business day from ${BUSINESS.phone.display} to set the mapping call.`,
    "2. Have ready: where your leads come from now, the software you pay for, and the one thing you want more of.",
    "3. You get the written map: what to fix first, what it costs, and what you keep.",
  ]);
  await internalAlert(supabase, sessionId, "system-map:internal", `💰 SYSTEM MAP PAID: ${leadName || customer.email} ${dollarsOrUnknown(amount)}`, [
    `System Map paid: ${dollarsOrUnknown(amount)}.`,
    `Buyer: ${leadName || "-"}`,
    `Email: ${customer.email}`,
    `Phone: ${customer.phone || "-"}`,
    `Stripe session: ${sessionId}`,
    "",
    "NEXT ACTION: schedule the mapping call. The task is on the lead.",
    acknowledgementLine(acknowledged),
    "",
    `Lead: ${BUSINESS.siteUrl}/admin/leads/${leadId}`,
  ], { acknowledged });
  await markLeadActivity(supabase, leadId, `System Map paid through Stripe. Stripe checkout: ${sessionId}.`, "System Map");
}

// Paid Tool Studio order or monthly menu. The funnel saved the lead with
// diagnostic.source "tool_studio" before Stripe opened.
async function ensureToolStudioPaid(supabase: SupabaseClient, session: StripeCheckoutSession, kind: string) {
  const amount = amountCentsOf(session);
  const order = typeof session.metadata?.order === "string" ? session.metadata.order.slice(0, 480) : kind.replace(/_/g, " ");
  const renewal = typeof session.metadata?.renews_monthly_usd === "string" ? session.metadata.renews_monthly_usd.slice(0, 40) : "0";
  const { leadId, leadName, customer, sessionId } = await claimFunnelLead(supabase, session, {
    source: "tool_studio",
    offer: kind,
    campaign: "tool_studio",
    interest: "custom_platform",
    goals: `TOOL STUDIO paid through Stripe (${dollarsOrUnknown(amount)}). ${order}. Lock the written scope.`,
    taskTitle: "Lock Tool Studio scope",
    nextAction: "Paid without a Tool Studio lead. Lock the written scope.",
  });
  const acknowledged = await sendBuyerAcknowledgement(supabase, sessionId, "tool-studio:buyer", customer.email, "Your Tool Studio order is in. Here is what happens next.", [
    "Your payment came through.",
    "",
    `Order: ${order}`,
    `Paid today: ${dollarsOrUnknown(amount)}`,
    renewal !== "0" ? `Monthly renewal: $${renewal}` : "No monthly menu selected.",
    "",
    "I will contact you within one business day. We will lock the written",
    "scope before production: the tool's inputs, outputs, logic, lead route,",
    "correction rounds, exclusions, and delivery target.",
    "",
    "Do not send passwords. I will use approved account invitations wherever",
    "access is required.",
  ]);
  await internalAlert(supabase, sessionId, "tool-studio:internal", `TOOL STUDIO PAID: ${dollarsOrUnknown(amount)} - ${customer.email}`, [
    "A Tool Studio checkout completed.",
    "",
    `Buyer: ${leadName || customer.email}`,
    `Paid today: ${dollarsOrUnknown(amount)}`,
    `Renews monthly: $${renewal}`,
    `Order: ${order}`,
    `Stripe session: ${sessionId}`,
    "",
    "NEXT ACTION: lock the written inputs, outputs, revisions, exclusions, and",
    "delivery date. The task is on the lead.",
    acknowledgementLine(acknowledged),
    "",
    `Lead: ${BUSINESS.siteUrl}/admin/leads/${leadId}`,
  ], { acknowledged });
  await markLeadActivity(supabase, leadId, `Tool Studio order paid through Stripe (${kind}). Stripe checkout: ${sessionId}.`, "Tool Studio");
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
          `Paid the ${usd(PRICES.websiteLaunchDeposit)} Website Launch deposit for the approved ${usd(PRICES.websiteLaunchTotal)} five-page base scope. Intake is ready. The final ${usd(PRICES.websiteLaunchFinal)} is due only after approval and before launch.`,
        budget_range: `${usd(PRICES.websiteLaunchTotal)} base scope | ${usd(PRICES.websiteLaunchDeposit)} deposit paid`,
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
          approved_base_scope_usd: PRICES.websiteLaunchTotal,
          deposit_paid_usd: PRICES.websiteLaunchDeposit,
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
    `Website Launch ${usd(PRICES.websiteLaunchDeposit)} deposit paid through Stripe. Intake is ready. Stripe checkout: ${sessionId}.`;
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
    // Buyer first (idempotent through the ledger) so the alert can say
    // whether the acknowledgement left.
    const acknowledged = await sendBuyerAcknowledgement(supabase, sessionId, "website-launch:buyer", customer.email, "Your Website Launch deposit is in.", [
      `${(lead.full_name || customer.fullName || "").trim().split(" ")[0] || "Hey"},`,
      "",
      `Your ${usd(PRICES.websiteLaunchDeposit)} Website Launch deposit is paid and the build is on my board. Stripe's receipt is your record.`,
      "",
      "What happens next:",
      "",
      `1. I reach out within one business day from ${BUSINESS.phone.display} to start the intake: your offer, your buyer, your five pages.`,
      `2. We put the scope in writing before anything gets built. The remaining ${usd(PRICES.websiteLaunchFinal)} is due only after you approve the build and before it goes live.`,
      "3. Have ready if you can: real photos of real work, your logo if you have one, and the domain you want. No passwords, ever.",
      "",
      "If you do not hear from me inside one business day, text that number. It is my direct line.",
    ]);

    const accepted = await sendInternalLeadAlert({
      full_name: lead.full_name || customer.fullName,
      email: customer.email,
      phone: lead.phone,
      business_name: lead.business_name,
      interest: "launch_system",
      goals:
        `The ${usd(PRICES.websiteLaunchDeposit)} Website Launch deposit is paid. Begin intake for the approved ${usd(PRICES.websiteLaunchTotal)} five-page base scope. The final ${usd(PRICES.websiteLaunchFinal)} is due only after approval and before launch. ${acknowledgementLine(acknowledged)}`,
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
    const acknowledged = await sendBuyerAcknowledgement(supabase, sessionId, "time-back:buyer", customer.email, "Your Time Back order is paid.", [
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
      `Questions in the meantime: text ${BUSINESS.phone.display}.`,
    ]);
    await internalAlert(supabase, sessionId, "time-back:internal", `💰 TIME BACK ORDER PAID: ${leadName} | ${customer.email}`, [
      orderSummary,
      paidUsd !== null ? `Paid: $${paidUsd}` : "",
      stripeStamp.platforms ? `Platforms: ${stripeStamp.platforms}` : "",
      "",
      "They were sent to the welcome intake. Next: the access invites.",
      acknowledgementLine(acknowledged),
      "Admin: https://www.theleadflowpro.com/admin/time-back",
    ].filter(Boolean), { acknowledged });
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
    const acknowledged = await sendBuyerAcknowledgement(supabase, sessionId, "lead-follow-up:buyer", customer.email, "Your Follow-Up Campaign is paid.", [
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
    await internalAlert(supabase, sessionId, "lead-follow-up:internal", `💰 FOLLOW-UP CAMPAIGN PAID: ${leadName} | ${customer.email}`, [
      `$${LEAD_FOLLOW_UP.priceUsd} Lead Follow-Up Campaign paid.`,
      "",
      "They were sent to the writing intake. The work task is created when that form comes back.",
      acknowledgementLine(acknowledged),
      `Lead: ${BUSINESS.siteUrl}/admin/leads/${leadId}`,
    ], { acknowledged });
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
    const acknowledged = await sendBuyerAcknowledgement(supabase, sessionId, "free-build:buyer", customer.email, `Your ${tier.name} is paid. Here is what happens next.`, [
      `${String(leadName || "").trim().split(" ")[0] || "Hey"},`,
      "",
      `${tier.name} is paid, $${tier.priceUsd} one time. The free build (${tier.pages}) and the engine behind it are both on my board. Stripe's receipt is your record.`,
      "",
      "What happens next:",
      "",
      `1. I text or call you within one business day from ${BUSINESS.phone.display} to set up our twenty minute call. Want to skip the wait? Text that number now.`,
      "2. The ten business day delivery clock starts at that call and your photos landing, not at this payment.",
      "3. Have ready: real photos of real work, your logo if you have one, and the domain you want on the front of it. No passwords, ever.",
      "",
      "Your domain, your hosting account, your pixel, your leads. If you fired me tomorrow you would keep every bit of it.",
    ]);
    await internalAlert(supabase, sessionId, "free-build:internal", `FREE BUILD PAID: ${leadName} - ${tier.name} ($${tier.priceUsd})`, [
      `${tier.name} paid: $${tier.priceUsd}.`,
      `Email: ${customer.email}`,
      `Phone: ${customer.phone || "-"}`,
      `Free build included: ${tier.pages}`,
      "",
      "NEXT ACTION: call them and book the twenty minute call. The 10 business day",
      "delivery clock starts at that call, not at this payment.",
      acknowledgementLine(acknowledged),
      "",
      `Lead: ${BUSINESS.siteUrl}/admin/leads/${leadId}`,
    ], { acknowledged });
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

// Paid agency scope (/agency/pay). The client paid the number from a written
// scope, one time or as the first month of a management fee, for one of the
// six agency services. The intake usually came first, so this finds that
// lead by email, marks it won, stamps the payment, opens the build task, and
// tells Ryan and the buyer. Same idempotency contract as every other paid
// flow in this file: alert first, activity marker second, so a provider
// failure keeps the Stripe event retryable.
async function ensureAgencyPaymentPaid(
  supabase: SupabaseClient,
  session: StripeCheckoutSession,
) {
  const sessionId = typeof session.id === "string" ? session.id.slice(0, 200) : "";
  const customer = websiteLaunchCustomer(session);
  if (!sessionId || !customer.email) {
    throw new Error("Paid agency checkout is missing its session ID or email");
  }
  const details = agencyPaymentFromMetadata(session.metadata);
  const serviceName = details.service?.name ?? "Agency service";
  const serviceSlug = details.service?.slug ?? "unknown";
  const cadence = details.billing === "monthly" ? "monthly" : "one-time";
  const externalId = `stripe_checkout:${sessionId}`;
  const amountCents = Number.isFinite(Number(session.amount_total)) ? Number(session.amount_total) : null;
  const paidUsd = amountCents !== null ? Math.round(amountCents / 100) : details.scopeUsd;
  const paidLabel = paidUsd !== null ? `$${paidUsd.toLocaleString("en-US")}` : "the amount on the Stripe receipt";
  const stripeStamp = {
    session_id: sessionId,
    paid_at: new Date().toISOString(),
    amount_total_cents: amountCents,
    service: serviceSlug,
    billing: details.billing,
    reference: details.reference || null,
  };
  const summary = `AGENCY PAYMENT: ${serviceName}, ${cadence}, ${paidLabel}${details.reference ? ` (scope: ${details.reference})` : ""}.`;

  // Which lead this payment belongs to, in order:
  //   1. The lead Ryan put on the pay link (/agency/pay?lead=<id>), so a
  //      payment against a Meta, consultation, or /start lead lands on it.
  //   2. The agency intake this person filled in.
  //   3. The newest lead with this email that no other funnel owns. Time
  //      Back, Free Build, and Follow-Up boards read `diagnostic.paid` and
  //      `diagnostic.stripe` as *their* order, so those are never reused and
  //      a lead matched this way gets only `diagnostic.agency_payment`.
  //   4. A new lead, like the sibling flows.
  const LEAD_FIELDS = "id, full_name, phone, business_name, status, diagnostic, external_id";
  const FUNNEL_OWNED_SOURCES = ["time_back_funnel", "lead_follow_up_funnel", "free_build_funnel"];
  const linkedLeadId = typeof session.metadata?.lead_id === "string" && UUID_RE.test(session.metadata.lead_id) ? session.metadata.lead_id.toLowerCase() : null;
  const isPlaceholderEmail = customer.email.toLowerCase().endsWith("@no-email.facebook.lead");

  let found: { id: string; full_name: string | null; phone: string | null; business_name: string | null; status: string; diagnostic: unknown; external_id: string | null } | null = null;
  let matchedBy: "link" | "intake" | "email" | null = null;
  if (linkedLeadId) {
    const byLink = await supabase.from("leads").select(LEAD_FIELDS).eq("id", linkedLeadId).is("deleted_at", null).maybeSingle();
    if (byLink.error) throw new Error(`Agency linked lead lookup failed: ${byLink.error.code}`);
    if (byLink.data) {
      found = byLink.data;
      matchedBy = "link";
    }
  }
  if (!found) {
    const byIntake = await supabase
      .from("leads")
      .select(LEAD_FIELDS)
      .ilike("email", escapeIlike(customer.email))
      .eq("diagnostic->>source", "agency_intake")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (byIntake.error) throw new Error(`Agency lead lookup failed: ${byIntake.error.code}`);
    if (byIntake.data) {
      found = byIntake.data;
      matchedBy = "intake";
    }
  }
  if (!found && !isPlaceholderEmail) {
    // NOT IN drops rows whose source is null (contact, consultation, and
    // /start leads have no diagnostic.source), so null is allowed explicitly.
    const byEmail = await supabase
      .from("leads")
      .select(LEAD_FIELDS)
      .ilike("email", escapeIlike(customer.email))
      .or(`diagnostic->>source.is.null,diagnostic->>source.not.in.(${FUNNEL_OWNED_SOURCES.map((s) => `"${s}"`).join(",")})`)
      .is("deleted_at", null)
      .eq("is_test", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (byEmail.error) throw new Error(`Agency email lead lookup failed: ${byEmail.error.code}`);
    if (byEmail.data) {
      found = byEmail.data;
      matchedBy = "email";
    }
  }

  let leadId: string;
  let leadName = customer.fullName;
  let businessName: string | null = null;
  if (found) {
    leadId = found.id;
    leadName = found.full_name || leadName;
    businessName = found.business_name ?? null;
    const diagnostic =
      found.diagnostic && typeof found.diagnostic === "object"
        ? (found.diagnostic as Record<string, unknown>)
        : {};
    const agencyStamp = { service: serviceSlug, billing: details.billing, reference: details.reference || null, stripe: stripeStamp };
    const updates: Record<string, unknown> = {
      status: "won",
      interest: "done_for_you",
      diagnostic:
        matchedBy === "intake"
          ? { ...diagnostic, paid: true, agency_payment: agencyStamp, stripe: stripeStamp }
          : // A lead from another door keeps its own diagnostic; the payment
            // rides in its own key so no other board reads it as its order.
            { ...diagnostic, agency_payment: agencyStamp },
    };
    if (!found.phone && customer.phone) updates.phone = customer.phone;
    if (!found.external_id) updates.external_id = externalId;
    const updated = await supabase.from("leads").update(updates).eq("id", leadId);
    if (updated.error && updated.error.code !== "23505") {
      throw new Error(`Agency lead update failed: ${updated.error.code}`);
    }
  } else {
    // Paid without an intake (a scope sent by hand, or a different email at
    // checkout). Create the lead so the payment has a home in the CRM.
    const inserted = await supabase
      .from("leads")
      .insert({
        full_name: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        business_name: details.reference || null,
        interest: "done_for_you",
        goals: `${summary} Paid through Stripe without a matching intake.`,
        best_contact_method: customer.phone ? "phone" : "email",
        source: "stripe_checkout",
        utm_source: "stripe",
        utm_medium: "checkout",
        utm_campaign: "agency",
        sms_consent: false,
        marketing_email_consent: false,
        status: "won",
        external_id: externalId,
        diagnostic: {
          version: 1,
          source: "agency_payment",
          services: details.service ? [details.service.slug] : [],
          paid: true,
          agency_payment: { service: serviceSlug, billing: details.billing, reference: details.reference || null },
          stripe: stripeStamp,
          next_action: "Paid without an intake. Call them, confirm the written scope, and start the build.",
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
      if (raced.error) throw new Error(`Agency lead race recovery failed: ${raced.error.code}`);
      leadId = raced.data.id;
      leadName = raced.data.full_name || leadName;
    } else if (inserted.error) {
      throw new Error(`Agency lead insert failed: ${inserted.error.code}`);
    } else {
      leadId = inserted.data.id;
      leadName = inserted.data.full_name || leadName;
    }
  }

  // One open build task per service, so a retried event does not stack them.
  const taskTitle = `Start agency build: ${serviceName}`;
  const openTask = await supabase
    .from("lead_tasks")
    .select("id")
    .eq("lead_id", leadId)
    .eq("title", taskTitle)
    .is("completed_at", null)
    .limit(1)
    .maybeSingle();
  if (openTask.error) throw new Error(`Agency task lookup failed: ${openTask.error.code}`);
  if (!openTask.data) {
    const taskInsert = await supabase.from("lead_tasks").insert({
      lead_id: leadId,
      title: taskTitle,
      due_date: new Date().toISOString().slice(0, 10),
    });
    if (taskInsert.error) throw new Error(`Agency task insert failed: ${taskInsert.error.code}`);
  }

  const activityDetail = `${summary} Paid through Stripe. Stripe checkout: ${sessionId}.`;
  const existingActivity = await supabase
    .from("lead_activity")
    .select("id")
    .eq("lead_id", leadId)
    .eq("kind", "system")
    .eq("detail", activityDetail)
    .limit(1)
    .maybeSingle();
  if (existingActivity.error) {
    throw new Error(`Agency activity lookup failed: ${existingActivity.error.code}`);
  }
  if (!existingActivity.data) {
    const acknowledged = await sendBuyerAcknowledgement(supabase, sessionId, "agency:buyer", customer.email, `Your ${serviceName} payment is in. Here is what happens next.`, [
      `${String(leadName || "").trim().split(" ")[0] || "Hey"},`,
      "",
      `${serviceName} is paid, ${paidLabel} ${cadence}${details.reference ? `, against the scope marked "${details.reference}"` : ""}. Stripe's receipt is your record, and the written scope is the contract for what gets built.`,
      "",
      "What happens next:",
      "",
      `1. I reach out within one business day from ${BUSINESS.phone.display} to start the Map step and agree the launch date.`,
      `2. Connect your accounts so everything is built in your name from day one: ${BUSINESS.siteUrl}/connect. You log in, you tap approve, you can revoke me in one click.`,
      "3. Nothing runs without your written approval. Ad spend, if any, goes from your card to Meta or Google directly and never through me.",
      "",
      `If you want the same loop in ChatGPT or Claude while we build, the plugin is here: ${BUSINESS.siteUrl}/plugin`,
      "",
      "No passwords, ever. If you do not hear from me inside one business day, text that number. It is my direct line.",
    ]);
    await internalAlert(supabase, sessionId, "agency:internal", `💰 AGENCY PAID: ${leadName}${businessName ? ` (${businessName})` : ""} - ${serviceName} ${paidLabel} ${cadence}`, [
      summary,
      `Buyer: ${leadName}`,
      `Email: ${customer.email}`,
      `Phone: ${customer.phone || "-"}`,
      `Business: ${businessName || details.reference || "-"}`,
      `Billing: ${cadence}${details.billing === "monthly" ? " (Stripe subscription; renews until cancelled)" : ""}`,
      `Stripe session: ${sessionId}`,
      "",
      "NEXT ACTION: match this payment to the written scope, then start the",
      "Map step: accounts in their name, tracking proven, launch date agreed.",
      acknowledgementLine(acknowledged),
      "",
      `Lead: ${BUSINESS.siteUrl}/admin/leads/${leadId}`,
    ], { acknowledged });
    const activityInsert = await supabase.from("lead_activity").insert({
      lead_id: leadId,
      kind: "system",
      detail: activityDetail,
    });
    if (activityInsert.error) {
      throw new Error(`Agency activity insert failed: ${activityInsert.error.code}`);
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
  amount_paid?: unknown;
  customer_email?: unknown;
  metadata?: unknown;
  billing_reason?: unknown;
  subscription?: unknown;
  subscription_details?: unknown;
  parent?: unknown;
  lines?: unknown;
};

/** The newest open lead with this email whose diagnostic carries an agency payment, for renewal and cancel notes. */
async function findAgencyLeadByEmail(supabase: SupabaseClient, email: string | null): Promise<string | null> {
  if (!email || !email.includes("@")) return null;
  const found = await supabase
    .from("leads")
    .select("id")
    .ilike("email", escapeIlike(email))
    .not("diagnostic->agency_payment", "is", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (found.error) {
    console.warn("agency lead lookup for renewal note failed:", found.error.code);
    return null;
  }
  return found.data?.id ?? null;
}

/**
 * Month two onward of an agency retainer or a Tool Studio menu, and every
 * paid plugin month. The checkout session recorded the first charge for the
 * first two; the plugin's checkout never wrote a purchase, so every paid
 * plugin invoice is recorded. Returns true when the invoice was one of these.
 */
async function recordSubscriptionInvoice(
  supabase: SupabaseClient,
  eventType: string,
  invoice: ReturnType<typeof classifyStripeInvoice>,
): Promise<boolean> {
  const action = renewalAction(invoice, eventType);
  if (action === "ignore") return invoice.family === "hq_subscription" || invoice.family === "agency_payment" || invoice.family === "tool_monthly_menu" || invoice.family === "chase_sheet";
  if (action === "skip_first_invoice") return true;
  const invoiceId = invoice.invoiceId;
  if (!invoiceId) throw new Error("Stripe invoice event has no invoice ID");
  const email = invoice.email ?? "unknown";
  const meta = invoice.subscriptionMetadata;
  const what =
    invoice.family === "hq_subscription"
      ? HQ_PLAN.name
      : invoice.family === "agency_payment"
        ? `Agency retainer: ${meta.service_name ?? meta.service ?? "service"}${meta.reference ? ` (${meta.reference})` : ""}`
        : invoice.family === "chase_sheet"
          ? `${CHASE_SHEET.name} monthly`
          : `Tool Studio monthly menu: ${meta.monthly_ids ?? "menu"}`;
  const kind = invoice.family === "hq_subscription" ? HQ_PLAN.kind : invoice.family === "chase_sheet" ? CHASE_SHEET.monthlyKind : invoice.family;

  if (action === "record_failed") {
    await internalAlert(supabase, invoiceId, "renewal-failed:internal", `RENEWAL FAILED: ${what} for ${email}`, [
      "Stripe could not collect a renewal. Stripe retries the card on its own schedule and emails the customer.",
      "",
      `What: ${what}`,
      `Customer: ${email}`,
      `Invoice: ${invoice.number ?? invoiceId}${invoice.hostedUrl ? ` ${invoice.hostedUrl}` : ""}`,
      `Subscription: ${invoice.subscriptionId ?? "-"}`,
      "",
      "Nothing to send them. Only this first failure is reported here; Stripe's later retries on the same invoice are in the Stripe dashboard, and a cancellation will be reported.",
    ]);
    if (invoice.family !== "hq_subscription") {
      await recordPurchase(supabase, { email, kind, amount_cents: invoice.amountPaidCents || null, stripe_session_id: invoiceId, status: "payment_failed" });
    }
    return true;
  }

  // record_paid
  await internalAlert(supabase, invoiceId, invoice.family === "hq_subscription" ? "plugin-paid:internal" : "renewal-paid:internal", `💰 ${invoice.family === "hq_subscription" ? "PLUGIN PAID" : "RENEWAL PAID"}: ${what} ${dollars(invoice.amountPaidCents)} - ${email}`, [
    `${what} paid: ${dollars(invoice.amountPaidCents)}.`,
    `Customer: ${email}`,
    `Invoice: ${invoice.number ?? invoiceId}${invoice.hostedUrl ? ` ${invoice.hostedUrl}` : ""}`,
    `Subscription: ${invoice.subscriptionId ?? "-"}`,
    `Reason: ${invoice.billingReason ?? "-"}`,
    "",
    "Stripe sent the receipt. Nothing to do unless the work is behind.",
    "Purchases: https://www.theleadflowpro.com/admin/purchases",
  ]);
  await recordPurchase(supabase, { email, kind, amount_cents: invoice.amountPaidCents, stripe_session_id: invoiceId, status: "paid" });
  if (invoice.family === "chase_sheet" && invoice.subscriptionId) {
    // A paid month keeps the sheet open even when the subscription webhooks were never registered.
    await markChaseSheetRenewed(supabase, invoice.subscriptionId);
  }
  if (invoice.family === "agency_payment") {
    const leadId = await findAgencyLeadByEmail(supabase, invoice.email);
    if (leadId) await markLeadActivity(supabase, leadId, `Agency retainer renewed: ${meta.service_name ?? meta.service ?? "service"}, ${dollars(invoice.amountPaidCents)}. Stripe invoice: ${invoiceId}.`, "Agency renewal");
  }
  // A retainer month is an Operations Partner month; every renewal earns a
  // seat holder the rebate. Month one was handled on the checkout session.
  await foundingPerksOnPaid(supabase, {
    email,
    kind,
    amountCents: invoice.amountPaidCents,
    key: invoiceId,
    billing: invoice.family === "agency_payment" ? "monthly" : null,
  });
  return true;
}

/**
 * A Sales Desk invoice (raised from a lead at /admin/sales/invoices) or one
 * raised by hand in the Stripe dashboard was paid. Finish the sale: tell the
 * owner, write the purchase, mark the lead won, and open the delivery task.
 */
async function finishPaidInvoice(
  supabase: SupabaseClient,
  invoice: ReturnType<typeof classifyStripeInvoice>,
  matched: { lead_id: string | null; customer_email: string | null; invoice_number: string | null } | null,
) {
  const invoiceId = invoice.invoiceId;
  if (!invoiceId) throw new Error("Stripe invoice event has no invoice ID");
  const leadId = matched?.lead_id ?? invoice.leadId;
  const email = (matched?.customer_email ?? invoice.email ?? "unknown").toLowerCase();
  const number = matched?.invoice_number ?? invoice.number ?? invoiceId;
  const amount = dollars(invoice.amountPaidCents);
  if (!matched && !invoice.leadId) console.warn(`Stripe invoice ${invoiceId} paid with no sales_invoices row`);

  await internalAlert(supabase, invoiceId, "invoice-paid:internal", `💰 INVOICE PAID: ${email} ${amount}`, [
    `Invoice ${number} paid: ${amount}.`,
    `Customer: ${email}`,
    invoice.hostedUrl ? `Invoice: ${invoice.hostedUrl}` : "",
    leadId ? `Lead: ${BUSINESS.siteUrl}/admin/leads/${leadId}` : "No lead is attached to this invoice (raised outside the Sales Desk).",
    "",
    "NEXT ACTION: start the paid scope. The task is on the lead when there is one.",
    "Purchases: https://www.theleadflowpro.com/admin/purchases",
  ].filter(Boolean));
  // A Sales Desk invoice's money already lives in sales_invoices, which the
  // cash ledger, the scoreboard, and the digest count alongside purchases.
  // Writing it to purchases too would count it twice. Only an invoice raised
  // outside the Sales Desk (no row) is recorded here.
  if (!matched) {
    await recordPurchase(supabase, { email, kind: "stripe_invoice", amount_cents: invoice.amountPaidCents, stripe_session_id: invoiceId, status: "paid" });
  }
  if (leadId) {
    const won = await supabase.from("leads").update({ status: "won" }).eq("id", leadId).is("deleted_at", null);
    if (won.error) throw new Error(`Invoice lead update failed: ${won.error.code}`);
    await markLeadActivity(supabase, leadId, `Invoice ${number} paid through Stripe (${amount}). Stripe invoice: ${invoiceId}.`, "Invoice");
    const taskTitle = `Start paid scope: invoice ${number}`;
    const openTask = await supabase.from("lead_tasks").select("id").eq("lead_id", leadId).eq("title", taskTitle).is("completed_at", null).limit(1).maybeSingle();
    if (openTask.error) throw new Error(`Invoice task lookup failed: ${openTask.error.code}`);
    if (!openTask.data) {
      const taskInsert = await supabase.from("lead_tasks").insert({ lead_id: leadId, title: taskTitle, due_date: new Date().toISOString().slice(0, 10) });
      if (taskInsert.error) throw new Error(`Invoice task insert failed: ${taskInsert.error.code}`);
    }
  }
  // Last, after the sale is finished: a paid Sales Desk or dashboard invoice
  // counts as build work for Founding 100.
  await foundingPerksOnPaid(supabase, { email, kind: "stripe_invoice", amountCents: invoice.amountPaidCents, key: invoiceId });
}

/**
 * Refunds, disputes, failed async payments, and disputes won: tell the owner
 * and move the purchase status so the totals and account-based access
 * follow. A purchase is keyed by the checkout session id for one-time
 * checkouts and by the invoice id for everything paid through an invoice
 * (renewals, plugin months, Sales Desk and dashboard invoices), so the
 * charge's own `invoice` field is tried first, then the session by payment
 * intent, then the charge's invoice through the Stripe API.
 */
/** "This purchase used N credits" when a refunded checkout had TLFP Credits on it; "" otherwise. */
async function creditsAppliedLine(supabase: SupabaseClient, sessionId: string | null): Promise<string> {
  if (!sessionId) return "";
  const { data } = await supabase.from("tlfp_ledger").select("delta").eq("stripe_session_id", sessionId).eq("reason", "redeem").eq("status", "posted").maybeSingle();
  if (!data) return "";
  return `This purchase used ${Math.abs(Number(data.delta))} TLFP Credits. A full refund does not return them automatically: grant them back at /admin/tlfp if that is the deal.`;
}

async function handleMoneyBack(supabase: SupabaseClient, eventType: string, object: unknown) {
  const outcome = refundOutcome(eventType, object);
  if (!outcome) return false;
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  const stripeGet = async (path: string) => {
    const r = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { Authorization: `Bearer ${stripeKey}` }, cache: "no-store" });
    if (!r.ok) throw new Error(`Stripe lookup for ${outcome.status} failed: ${r.status}`);
    return (await r.json().catch(() => null)) as Record<string, unknown> | null;
  };

  // The keys a purchases row might carry for this money, most direct first.
  const candidates: string[] = [];
  if (outcome.invoiceId) candidates.push(outcome.invoiceId);
  if (outcome.sessionId) candidates.push(outcome.sessionId);
  if (!candidates.length && outcome.paymentIntent) {
    if (stripeKey) {
      const sessions = await stripeGet(`checkout/sessions?payment_intent=${encodeURIComponent(outcome.paymentIntent)}&limit=1`);
      const id = (sessions?.data as { id?: unknown }[] | undefined)?.[0]?.id;
      if (typeof id === "string") candidates.push(id.slice(0, 200));
    } else {
      console.error(`No STRIPE_SECRET_KEY: cannot map ${outcome.status} on ${outcome.paymentIntent} to a purchase`);
    }
  }
  if (!candidates.length && outcome.chargeId && stripeKey && eventType !== "checkout.session.async_payment_failed") {
    const charge = await stripeGet(`charges/${encodeURIComponent(outcome.chargeId)}`);
    const inv = charge?.invoice;
    const id = typeof inv === "string" ? inv : typeof (inv as { id?: unknown })?.id === "string" ? (inv as { id: string }).id : null;
    if (id) candidates.push(id.slice(0, 200));
  }

  let purchase: { stripe_session_id: string; email: string | null; kind: string | null; status: string | null } | null = null;
  for (const key of candidates) {
    const row = await supabase.from("purchases").select("stripe_session_id, email, kind, status").eq("stripe_session_id", key).maybeSingle();
    if (!row.error && row.data) {
      purchase = row.data;
      break;
    }
  }

  const restoring = outcome.status === "dispute_won";
  // Founding awards carry the key the money maps to: the purchase row's key,
  // or an invoice id with no purchases row (a Sales Desk invoice, a
  // subscription's first month). Every candidate is tried.
  const foundingKeys = [...new Set([...(purchase ? [purchase.stripe_session_id] : []), ...candidates])];
  // A dispute inquiry (status warning_*) moves no money, and its close is not
  // reported as a win, so founding credits stay put for it.
  const disputeObject = object && typeof object === "object" ? (object as { status?: unknown; id?: unknown }) : {};
  const disputeStatus = disputeObject.status;
  const inquiry = eventType === "charge.dispute.created" && typeof disputeStatus === "string" && disputeStatus.startsWith("warning_");
  // Founding moves are tagged with their cause: the dispute for dispute
  // events (so a dispute won returns only what that dispute took, and a
  // second dispute on the same charge still acts), else the charge.
  const disputeId = eventType.startsWith("charge.dispute.") && typeof disputeObject.id === "string" ? disputeObject.id.slice(0, 80) : null;
  const foundingCause = disputeId ?? outcome.chargeId ?? outcome.paymentIntent ?? "unknown";
  const fromStatus = restoring ? "disputed" : "paid";
  const toStatus = restoring ? "paid" : outcome.status;
  const willFlip = !outcome.partial && purchase !== null && purchase.status === fromStatus;
  const alertKey = outcome.chargeId ?? purchase?.stripe_session_id ?? outcome.paymentIntent ?? `${eventType}:unknown`;
  const purpose =
    outcome.status === "refunded"
      ? outcome.partial
        ? "refund:partial:internal"
        : "refund:internal"
      : outcome.status === "disputed"
        ? "dispute:internal"
        : outcome.status === "dispute_won"
          ? "dispute-won:internal"
          : "async-failed:internal";
  const label = outcome.status === "refunded" ? (outcome.partial ? "PARTIAL REFUND" : "REFUND") : outcome.status === "disputed" ? "DISPUTE" : outcome.status === "dispute_won" ? "DISPUTE WON" : "PAYMENT FAILED";
  await internalAlert(supabase, alertKey, purpose, `${label}: ${purchase?.kind ?? "purchase"} ${dollars(outcome.amountCents)} ${purchase?.email ?? ""}`.trim(), [
    `${label} on ${purchase?.kind ?? "an unmatched purchase"}: ${dollars(outcome.amountCents)}.`,
    `Buyer: ${purchase?.email ?? "unknown"}`,
    `Purchase key: ${purchase?.stripe_session_id ?? "not found"}`,
    outcome.chargeId ? `Charge: ${outcome.chargeId}` : "",
    outcome.reason ? `Reason: ${outcome.reason}` : "",
    outcome.evidenceDueBy ? `Evidence due: ${new Date(outcome.evidenceDueBy * 1000).toDateString()} (answer it in the Stripe dashboard)` : "",
    "",
    outcome.partial
      ? "Partial refund: the purchase stays paid. Nothing else changed."
      : willFlip
        ? restoring
          ? "The dispute closed in your favour; the purchase is marked paid again and account-based access is back."
          : `The purchase is now marked ${toStatus}. Course access and account-based kit access that key on it are off; a kit cookie or license key already issued keeps working until it expires.`
        : purchase
          ? `The purchase is marked ${purchase.status ?? "unknown"}, not ${fromStatus}, so nothing was changed.`
          : "No purchase row could be matched, so nothing was changed in the database.",
    await creditsAppliedLine(supabase, purchase?.stripe_session_id ?? null),
    await foundingAppliedLine(supabase, foundingKeys, outcome.partial, restoring, inquiry),
    "Purchases: https://www.theleadflowpro.com/admin/purchases",
  ].filter(Boolean));
  if (willFlip && purchase) {
    const updated = await supabase.from("purchases").update({ status: toStatus }).eq("stripe_session_id", purchase.stripe_session_id).eq("status", fromStatus).select("stripe_session_id");
    if (updated.error) throw new Error(`Purchase status flip failed: ${updated.error.code}`);
    if (!updated.data?.length) console.warn(`No ${fromStatus} purchase matched ${purchase.stripe_session_id} for ${toStatus}`);
    // A refund or dispute on either Chase Sheet plan locks the sheet; a dispute won reopens it.
    await applyChaseSheetMoneyBack(supabase, purchase, restoring);
    // A refunded or disputed credit pack takes its credits back; a dispute
    // won puts them back. Both idempotent on the session id.
    if (purchase.kind === TLFP_CREDITS.purchaseKind && purchase.email) {
      await creditPackReversed(supabase, { email: purchase.email, sessionId: purchase.stripe_session_id, restore: restoring });
    }
  }
  // Founding awards (seat bonus, partner month, rebate) ride on the money: a
  // full refund or a dispute takes them back, a dispute won puts back what
  // was taken. Each move is tagged with this event, so a retry moves nothing
  // twice and a later event (a refund after a dispute was won) still moves
  // the credits. Taking back runs on every full refund or dispute event;
  // putting back runs when the purchase flips back to paid, or already has
  // (a retry after the flip). The seat itself stays taken.
  if (!outcome.partial && !inquiry && (!restoring || willFlip || !purchase || purchase.status === "paid")) {
    await reverseFoundingCredits(supabase, {
      keys: foundingKeys,
      restore: restoring,
      eventTag: `${outcome.status}:${foundingCause}`,
      takenBy: restoring ? `disputed:${foundingCause}` : undefined,
    });
  }
  return true;
}

/** "This purchase carried N founding credits" for the money-back alert; "" when none. Stable across retries. */
async function foundingAppliedLine(supabase: SupabaseClient, keys: string[], partial: boolean, restoring: boolean, inquiry: boolean): Promise<string> {
  const awarded = await foundingAwardedOn(supabase, keys);
  if (awarded <= 0) return "";
  if (inquiry) return `This purchase carried ${awarded} founding credits (${TLFP_FOUNDING.name}). An inquiry moves no money, so they stay. If it becomes a chargeback, take them back at /admin/tlfp.`;
  if (partial) return `This purchase carried ${awarded} founding credits (${TLFP_FOUNDING.name}). A partial refund leaves them; take some back at /admin/tlfp if that is the deal.`;
  if (restoring) return `This purchase carried ${awarded} founding credits (${TLFP_FOUNDING.name}). Any taken back when it was disputed are put back automatically.`;
  return `This purchase carried ${awarded} founding credits (${TLFP_FOUNDING.name}). They are taken back automatically. The founding seat stays taken.`;
}

/** An agency retainer or Tool Studio menu ended or was set to end. The plugin's own handler runs first and claims its subscriptions. */
async function noteSubscriptionEnd(supabase: SupabaseClient, eventType: string, object: unknown) {
  if (eventType !== "customer.subscription.deleted" && eventType !== "customer.subscription.updated") return false;
  const sub = object && typeof object === "object" ? (object as Record<string, unknown>) : {};
  const metadata = (sub.metadata && typeof sub.metadata === "object" ? sub.metadata : {}) as Record<string, unknown>;
  const kind = typeof metadata.kind === "string" ? metadata.kind : "";
  if (kind !== AGENCY_PAYMENT.kind && kind !== "tool_monthly_menu") return false;
  const subId = typeof sub.id === "string" ? sub.id.slice(0, 200) : null;
  if (!subId) return false;
  const scheduled = eventType === "customer.subscription.updated" && sub.cancel_at_period_end === true;
  if (eventType === "customer.subscription.updated" && !scheduled) return true;
  const what = kind === AGENCY_PAYMENT.kind ? `Agency retainer: ${String(metadata.service_name ?? metadata.service ?? "service")}${metadata.reference ? ` (${String(metadata.reference)})` : ""}` : `Tool Studio monthly menu: ${String(metadata.monthly_ids ?? "menu")}`;
  const purpose = scheduled ? "subscription-cancel-scheduled:internal" : "subscription-cancelled:internal";
  await internalAlert(supabase, subId, purpose, `${scheduled ? "CANCEL SCHEDULED" : "CANCELLED"}: ${what}`, [
    scheduled ? `${what} is set to end at the close of the current period.` : `${what} has ended in Stripe.`,
    `Subscription: ${subId}`,
    `Customer: ${typeof sub.customer === "string" ? sub.customer : "-"}`,
    "",
    "Nothing was charged or sent. If the work should stop, stop it; if it should continue, reach out.",
  ]);
  if (kind === AGENCY_PAYMENT.kind) {
    // The subscription carries the lead id when the pay link did; that is
    // the only reliable key (the checkout metadata has no email).
    const linked = typeof metadata.lead_id === "string" && UUID_RE.test(metadata.lead_id) ? metadata.lead_id.toLowerCase() : null;
    const leadId = linked ?? (await findAgencyLeadByStripeCustomer(supabase, typeof sub.customer === "string" ? sub.customer : null));
    if (leadId) await markLeadActivity(supabase, leadId, `${scheduled ? "Agency retainer set to end" : "Agency retainer cancelled"} in Stripe. Subscription: ${subId}.`, "Agency cancel");
  }
  return true;
}

/** Without a lead id on the subscription, the Stripe customer's email (when the API key is set) finds the agency lead. */
async function findAgencyLeadByStripeCustomer(supabase: SupabaseClient, customerId: string | null): Promise<string | null> {
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!customerId || !stripeKey) return null;
  try {
    const r = await fetch(`https://api.stripe.com/v1/customers/${encodeURIComponent(customerId)}`, { headers: { Authorization: `Bearer ${stripeKey}` }, cache: "no-store" });
    if (!r.ok) return null;
    const customer = (await r.json().catch(() => null)) as { email?: unknown } | null;
    return findAgencyLeadByEmail(supabase, typeof customer?.email === "string" ? customer.email : null);
  } catch {
    return null;
  }
}

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

  // Capacity-controlled September checkouts are bound to a server reservation.
  // Process expiry as well as paid events; no generic purchase path may bypass
  // the five-slot ledger. This runs only after signature verification above.
  if (typeof event.type === "string" && event.type.startsWith("checkout.session.")) {
    try {
      const handled = await handleSpecialWebhook(
        createSupabaseClient(SUPABASE_URL, serviceKey), event.type,
        (event.data?.object ?? {}) as Stripe.Checkout.Session,
      );
      if (handled) return NextResponse.json({ received: true });
    } catch {
      console.error("September special webhook processing failed");
      return NextResponse.json({ error: "Special payment processing failed" }, { status: 500 });
    }
  }

  // The plugin subscription: a subscription checkout (which can complete
  // with no payment during the trial, so it must come before the paid-only
  // path below) and every customer.subscription.* lifecycle event.
  try {
    const handledByHq = await handleHqStripeEvent(
      createSupabaseClient(SUPABASE_URL, serviceKey),
      event,
      process.env.STRIPE_SECRET_KEY,
    );
    if (handledByHq) return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe plugin subscription webhook failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Subscription processing failed" }, { status: 500 });
  }

  // The Chase Sheet monthly plan: every customer.subscription.* event keeps
  // the account's status in step with Stripe. Paid checkouts for either plan
  // are recorded and fulfilled by the dispatch below like every other kind.
  try {
    if (await handleChaseSheetSubscription(createSupabaseClient(SUPABASE_URL, serviceKey), event)) {
      return NextResponse.json({ received: true });
    }
  } catch (error) {
    console.error("Stripe Chase Sheet subscription webhook failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Subscription processing failed" }, { status: 500 });
  }

  if (typeof event.type === "string" && INVOICE_EVENT_STATUS[event.type]) {
    try {
      const invoice = (event.data?.object ?? {}) as StripeInvoiceWebhook;
      const invoiceId = webhookString(invoice.id, 200);
      if (!invoiceId) throw new Error("Stripe invoice event has no invoice ID");
      const invoiceSupabase = createSupabaseClient(SUPABASE_URL, serviceKey);
      const classified = classifyStripeInvoice(invoice);

      // Subscription invoices (agency retainers, Tool Studio menus, plugin
      // months) are not Sales Desk invoices; record them and stop.
      if (await recordSubscriptionInvoice(invoiceSupabase, event.type, classified)) {
        return NextResponse.json({ received: true });
      }

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

      const result = await invoiceSupabase
        .from("sales_invoices")
        .update(updates)
        .eq("stripe_invoice_id", invoiceId)
        .select("lead_id, customer_email, invoice_number")
        .maybeSingle();
      if (result.error) throw new Error(`Invoice status sync failed: ${result.error.code}`);

      // A paid invoice finishes the sale, whether it came from the Sales Desk
      // or was raised by hand in the Stripe dashboard.
      if (event.type === "invoice.paid" && classified.amountPaidCents > 0) {
        await finishPaidInvoice(invoiceSupabase, classified, result.data ?? null);
      }
      return NextResponse.json({ received: true });
    } catch (error) {
      console.error(
        "Stripe invoice webhook failed:",
        error instanceof Error ? error.message : "unknown invoice error",
      );
      return NextResponse.json({ error: "Invoice processing failed" }, { status: 500 });
    }
  }

  // Money going back out, and agency or Tool Studio subscriptions ending.
  // Both alert the owner only; nothing here charges or contacts a buyer.
  if (typeof event.type === "string") {
    try {
      const moneySupabase = createSupabaseClient(SUPABASE_URL, serviceKey);
      if (await handleMoneyBack(moneySupabase, event.type, event.data?.object)) {
        return NextResponse.json({ received: true });
      }
      if (await noteSubscriptionEnd(moneySupabase, event.type, event.data?.object)) {
        return NextResponse.json({ received: true });
      }
    } catch (error) {
      console.error("Stripe refund or subscription webhook failed:", error instanceof Error ? error.message : "unknown");
      return NextResponse.json({ error: "Refund processing failed" }, { status: 500 });
    }
  }

  // A checkout that expired with TLFP Credits held on it gives them back.
  if (event.type === "checkout.session.expired") {
    const expired = (event.data?.object ?? {}) as StripeCheckoutSession;
    const ref = typeof expired.metadata?.tlfp_hold_ref === "string" ? expired.metadata.tlfp_hold_ref : "";
    if (ref) {
      try {
        await settleHold(createSupabaseClient(SUPABASE_URL, serviceKey), ref, "released", typeof expired.id === "string" ? expired.id : null);
      } catch (error) {
        console.error("TLFP hold release failed:", error instanceof Error ? error.message : "unknown");
        return NextResponse.json({ error: "Hold release failed" }, { status: 500 });
      }
    }
    return NextResponse.json({ received: true });
  }

  if (!isCheckoutPaymentEvent(event.type)) {
    return NextResponse.json({ received: true });
  }

  try {
    const session = (event.data?.object ?? {}) as StripeCheckoutSession;
    // A checkout fully covered by TLFP Credits is a no-cost order: Stripe
    // reports no_payment_required, collects no card, and still fires
    // checkout.session.completed. It is paid, in credits.
    const tlfpHoldRef = typeof session.metadata?.tlfp_hold_ref === "string" ? session.metadata.tlfp_hold_ref : "";
    const coveredByCredits = session.payment_status === "no_payment_required" && !!tlfpHoldRef;
    if (session.payment_status !== "paid" && !coveredByCredits) {
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
      throw new Error(`Unmapped paid ${usd(PRICES.websiteLaunchDeposit)} Stripe Payment Link`);
    }

    const websiteLaunch = isWebsiteLaunchDeposit(session, configuredPaymentLinkId);
    const customer = websiteLaunchCustomer(session);
    if (!customer.email) {
      if (websiteLaunch || ["event", "pro_tool", "pro_bundle", TLFP_CREDITS.purchaseKind].includes(String(session.metadata?.kind)) || isChaseSheetKind(String(session.metadata?.kind))) {
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
    if (["pro_tool", "pro_bundle"].includes(String(session.metadata?.kind)) && (!proKind || session.currency !== "usd")) {
      throw new Error("Paid Pro Kit checkout requires amount or currency review");
    }
    const kind = websiteLaunch
      ? WEBSITE_LAUNCH_PURCHASE_KIND
      : proKind ?? safeStripeKind(session);
    const supabase = createSupabaseClient(SUPABASE_URL, serviceKey);
    await recordPurchase(supabase, {
      email: customer.email,
      kind,
      amount_cents: amountCentsOf(session),
      stripe_session_id: session.id.slice(0, 200),
      status: "paid",
    });

    // Credits applied to this checkout are spent now (the hold becomes a
    // posted row). Must succeed: a 500 here makes Stripe retry, and the
    // settle is idempotent.
    if (tlfpHoldRef) {
      await settleHold(supabase, tlfpHoldRef, "posted", session.id.slice(0, 200));
    }

    // A referral code that rode in from /r/<code> pays the referrer on this
    // buyer's first paid checkout. Never blocks fulfilment: it is logged and
    // retried on the next event delivery only if the whole handler fails.
    if (typeof session.metadata?.tlfp_ref === "string" && session.metadata.tlfp_ref) {
      try {
        await awardReferralPurchase(supabase, {
          buyerEmail: customer.email,
          code: session.metadata.tlfp_ref,
          amountCents: amountCentsOf(session),
          sessionId: session.id.slice(0, 200),
          kind,
        });
      } catch (error) {
        console.error("TLFP referral award failed:", error instanceof Error ? error.message : "unknown");
      }
    }

    if (websiteLaunch) {
      await ensureWebsiteLaunchIntake(supabase, session);
    } else if (proKind) {
      await sendProKitReceipt(supabase, session.id, customer.email, proKind);
    } else if (kind === SELLERPROOF.kind) {
      await sendSellerProofReceipt(customer.email, session.id);
    } else if (isChaseSheetKind(kind)) {
      await ensureChaseSheetPaid(supabase, session);
    } else if (kind === "timeback_order") {
      await ensureTimebackOrderPaid(supabase, session);
    } else if (kind === "event") {
      await ensureEventSeatPaid(supabase, session);
    } else if (kind === LEAD_FOLLOW_UP.id) {
      await ensureLeadFollowUpPaid(supabase, session);
    } else if (kind === AGENCY_PAYMENT.kind) {
      await ensureAgencyPaymentPaid(supabase, session);
    } else if (findFreeBuildTier(kind)) {
      await ensureFreeBuildPaid(supabase, session, kind);
    } else if (kind === "tool_studio_order" || kind === "tool_monthly_menu") {
      await ensureToolStudioPaid(supabase, session, kind);
    } else if (kind === "system_map") {
      await ensureSystemMapPaid(supabase, session);
    } else if (kind === TLFP_CREDITS.purchaseKind) {
      await ensureCreditPackPaid(supabase, session);
    } else if (kind === "learn_it") {
      await sendPurchaseEmails(supabase, session.id, customer.email, kind);
    } else if (kind === CONTENT_ENGINE.purchaseKind) {
      await sendContentEnginePurchaseEmails(supabase, session.id, customer.email);
    } else if (kind === CHATGPT_OPERATOR.purchaseKind) {
      await sendAcademyPurchaseEmails(supabase, session.id, customer.email, CHATGPT_OPERATOR.shortTitle, "/training/chatgpt-operator");
    } else if (kind === OPERATOR_ACADEMY.allAccessPurchaseKind) {
      await sendAcademyPurchaseEmails(supabase, session.id, customer.email, OPERATOR_ACADEMY.title, "/training");
    } else {
      // Nothing above claimed this payment. Do NOT let it fall off the end in
      // silence: package_full, a package_deposit that is not the exact $500
      // Website Launch, and every build_deposit land here and get an alert
      // and a buyer acknowledgement.
      await notifyUnhandledPurchase(supabase, customer.email, kind, amountCentsOf(session), session.id);
    }

    // After fulfilment, so a founding problem can never hold up the order.
    // A subscription's first month is keyed on its first invoice, the id a
    // refund or dispute on that charge maps to; everything else on the
    // session. A Tool Studio build bought with a monthly menu qualifies on
    // the build's share of the cash actually paid (discounts included), not
    // the whole first charge.
    const sessionExtra = session as { invoice?: unknown; mode?: unknown };
    const subscriptionInvoice =
      sessionExtra.mode === "subscription" && typeof sessionExtra.invoice === "string" && sessionExtra.invoice ? sessionExtra.invoice : null;
    const bundledBuild = kind === "tool_monthly_menu" ? findToolBuild(String(session.metadata?.build_id ?? "")) : null;
    const paidCents = amountCentsOf(session) ?? 0;
    const monthlyCents = Math.max(0, Math.round(Number(session.metadata?.renews_monthly_usd ?? 0) * 100)) || 0;
    await foundingPerksOnPaid(supabase, {
      email: customer.email,
      kind,
      amountCents: amountCentsOf(session),
      key: (subscriptionInvoice ?? session.id).slice(0, 200),
      purchaseKey: session.id.slice(0, 200),
      billing: typeof session.metadata?.billing === "string" ? session.metadata.billing : null,
      ...(bundledBuild
        ? {
            tierKind: "tool_studio_order",
            tierCents: Math.floor((paidCents * bundledBuild.priceUsd * 100) / (bundledBuild.priceUsd * 100 + monthlyCents)),
          }
        : {}),
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(
      "Stripe webhook processing failed:",
      error instanceof Error ? error.message : "unknown processing error",
    );
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
