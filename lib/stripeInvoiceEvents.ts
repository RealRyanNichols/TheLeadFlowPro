// What a Stripe invoice event is about, decided from the payload alone.
//
// Four kinds of invoice reach the webhook: a Sales Desk invoice Ryan raised
// from a lead (metadata.leadflow_source = "sales_desk"), month two onward
// of an agency retainer or a Tool Studio monthly menu (the subscription
// carries metadata.kind from /api/checkout), a plugin month (the
// subscription carries kind hq_subscription and a workspace_id), and
// anything raised by hand in the Stripe dashboard (no metadata at all).
// Until 2026-09-21 only the first flipped a status; the other three were
// invisible to the owner. Leaf module: no network, no Next.js.

import { AGENCY_PAYMENT } from "@/lib/agencyPayment";
import { CHASE_SHEET } from "@/lib/chaseSheet/product";
import { HQ_PLAN } from "@/lib/hq/types";
import { POST_CREATOR } from "@/lib/postCreator/product";

export type InvoiceFamily = "sales_desk" | "agency_payment" | "tool_monthly_menu" | "hq_subscription" | "chase_sheet" | "post_creator" | "unknown";

export type ClassifiedInvoice = {
  invoiceId: string | null;
  number: string | null;
  amountPaidCents: number;
  email: string | null;
  billingReason: string | null;
  hostedUrl: string | null;
  /** From metadata.leadflow_lead_id when it is a uuid. */
  leadId: string | null;
  family: InvoiceFamily;
  subscriptionId: string | null;
  /** The subscription's metadata (service, reference, monthly_ids ...), when the payload carried it. */
  subscriptionMetadata: Record<string, string>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function str(value: unknown, max = 200): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringMap(value: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(record(value))) if (typeof v === "string") out[k] = v.slice(0, 500);
  return out;
}

function subscriptionIdOf(invoice: Record<string, unknown>): string | null {
  const direct = invoice.subscription;
  if (typeof direct === "string") return direct.slice(0, 200);
  const nested = record(direct).id;
  if (typeof nested === "string") return nested.slice(0, 200);
  const parent = record(record(invoice.parent).subscription_details).subscription;
  if (typeof parent === "string") return parent.slice(0, 200);
  return null;
}

/** Subscription metadata is delivered in three shapes depending on the Stripe API version. */
function subscriptionMetadataOf(invoice: Record<string, unknown>): Record<string, string> {
  const candidates = [
    record(invoice.subscription_details).metadata,
    record(record(invoice.parent).subscription_details).metadata,
    record(record(record(invoice.lines).data)?.[0 as unknown as keyof object]).metadata,
  ];
  const lines = record(invoice.lines).data;
  if (Array.isArray(lines) && lines.length) candidates.push(record(lines[0]).metadata);
  for (const c of candidates) {
    const map = stringMap(c);
    if (Object.keys(map).length) return map;
  }
  return {};
}

export function classifyStripeInvoice(input: unknown): ClassifiedInvoice {
  const invoice = record(input);
  const metadata = stringMap(invoice.metadata);
  const subscriptionMetadata = subscriptionMetadataOf(invoice);
  const subscriptionId = subscriptionIdOf(invoice);
  const leadRaw = str(metadata.leadflow_lead_id, 64);
  const leadId = leadRaw && UUID.test(leadRaw) ? leadRaw.toLowerCase() : null;
  const amount = Number(invoice.amount_paid);

  let family: InvoiceFamily = "unknown";
  const kind = subscriptionMetadata.kind ?? "";
  if (kind === HQ_PLAN.kind || typeof subscriptionMetadata.workspace_id === "string") family = "hq_subscription";
  else if (kind === AGENCY_PAYMENT.kind) family = "agency_payment";
  else if (kind === "tool_monthly_menu") family = "tool_monthly_menu";
  else if (kind === CHASE_SHEET.monthlyKind) family = "chase_sheet";
  else if (kind === POST_CREATOR.monthlyKind) family = "post_creator";
  else if (metadata.leadflow_source === "sales_desk" || leadId) family = "sales_desk";

  return {
    invoiceId: str(invoice.id),
    number: str(invoice.number, 100),
    amountPaidCents: Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0,
    email: str(invoice.customer_email, 200)?.toLowerCase() ?? null,
    billingReason: str(invoice.billing_reason, 60),
    hostedUrl: str(invoice.hosted_invoice_url, 1000),
    leadId,
    family,
    subscriptionId,
    subscriptionMetadata,
  };
}

export type RenewalAction = "skip_first_invoice" | "record_paid" | "record_failed" | "ignore";

/**
 * What to do with a subscription invoice. The first invoice of an agency or
 * Tool Studio subscription was already recorded from the checkout session,
 * so it is skipped; the plugin's checkout never wrote a purchase, so every
 * paid plugin invoice is recorded. Sales Desk and unknown invoices are not
 * renewals and are handled by the invoice branch itself.
 */
export function renewalAction(invoice: Pick<ClassifiedInvoice, "family" | "billingReason" | "amountPaidCents">, eventType: string): RenewalAction {
  if (invoice.family === "sales_desk" || invoice.family === "unknown") return "ignore";
  if (eventType === "invoice.payment_failed") return "record_failed";
  if (eventType !== "invoice.paid") return "ignore";
  if (invoice.amountPaidCents <= 0) return "ignore";
  if (invoice.family !== "hq_subscription" && invoice.billingReason === "subscription_create") return "skip_first_invoice";
  return "record_paid";
}

/** Plain dollars for an alert line. */
export function dollars(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}
