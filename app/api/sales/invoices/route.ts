import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_URL } from "@/lib/config";
import { validateSalesInvoiceDraft } from "@/lib/salesInvoice";

const STRIPE_VERSION = "2026-06-24.dahlia";

type StripeObject = Record<string, unknown>;

class StripeRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function stripeRequest(
  key: string,
  path: string,
  method: "GET" | "POST",
  params: URLSearchParams,
  idempotencyKey?: string,
) {
  const url = method === "GET" && params.size ? `https://api.stripe.com${path}?${params}` : `https://api.stripe.com${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Stripe-Version": STRIPE_VERSION,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: method === "POST" ? params.toString() : undefined,
    cache: "no-store",
  });
  const json = (await response.json().catch(() => ({}))) as StripeObject;
  if (!response.ok) {
    const error = json.error as Record<string, unknown> | undefined;
    const message = typeof error?.message === "string" ? error.message.slice(0, 300) : "Stripe rejected the request";
    throw new StripeRequestError(message, response.status);
  }
  return json;
}

function text(value: unknown, max = 300) {
  return typeof value === "string" ? value.slice(0, max) : null;
}

export async function POST(request: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!stripeKey || !serviceKey) {
    return NextResponse.json({ error: "Stripe invoicing is not configured" }, { status: 501 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin" && profile?.role !== "sales") {
    return NextResponse.json({ error: "Sales access required" }, { status: 403 });
  }

  const validation = validateSalesInvoiceDraft(await request.json().catch(() => null));
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });
  const draft = validation.value;

  const { data: lead } = await supabase
    .from("leads")
    .select("id, full_name, business_name, email, deleted_at, is_test")
    .eq("id", draft.lead_id)
    .single();
  if (!lead || lead.deleted_at || lead.is_test) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  const email = String(lead.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "The selected lead has no valid email address" }, { status: 400 });
  }

  const admin = createSupabaseAdmin(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let customerId: string | null = null;
  let createdInvoice: StripeObject | null = null;

  try {
    const customers = await stripeRequest(
      stripeKey,
      "/v1/customers",
      "GET",
      new URLSearchParams({ email, limit: "10" }),
    );
    const candidates = Array.isArray(customers.data) ? (customers.data as StripeObject[]) : [];
    const matched = candidates.find((candidate) => {
      const metadata = candidate.metadata as Record<string, unknown> | undefined;
      return metadata?.leadflow_lead_id === lead.id;
    }) ?? candidates[0];
    customerId = text(matched?.id, 100);

    if (!customerId) {
      const customerParams = new URLSearchParams({
        email,
        name: draft.customer_name,
        description: `LeadFlow Pro client: ${lead.business_name || lead.full_name}`,
        "metadata[leadflow_lead_id]": lead.id,
      });
      const customer = await stripeRequest(
        stripeKey,
        "/v1/customers",
        "POST",
        customerParams,
        `leadflow-customer-${draft.idempotency_key}`,
      );
      customerId = text(customer.id, 100);
    }
    if (!customerId) throw new StripeRequestError("Stripe did not return a customer", 502);

    const invoiceParams = new URLSearchParams({
      customer: customerId,
      currency: "usd",
      collection_method: "send_invoice",
      due_date: String(draft.due_date_unix),
      auto_advance: "false",
      description: draft.memo || "Custom services from The LeadFlow Pro",
      footer: "The LeadFlow Pro | Questions: hello@theleadflowpro.com",
      "automatic_tax[enabled]": "false",
      "metadata[leadflow_lead_id]": lead.id,
      "metadata[leadflow_created_by]": user.id,
      "metadata[leadflow_source]": "sales_desk",
    });
    createdInvoice = await stripeRequest(
      stripeKey,
      "/v1/invoices",
      "POST",
      invoiceParams,
      `leadflow-invoice-${draft.idempotency_key}`,
    );
    const invoiceId = text(createdInvoice.id, 100);
    if (!invoiceId) throw new StripeRequestError("Stripe did not return an invoice", 502);

    for (let index = 0; index < draft.line_items.length; index += 1) {
      const item = draft.line_items[index];
      await stripeRequest(
        stripeKey,
        "/v1/invoiceitems",
        "POST",
        new URLSearchParams({
          customer: customerId,
          invoice: invoiceId,
          currency: "usd",
          description: item.description,
          unit_amount_decimal: String(item.unit_amount_cents),
          quantity: String(item.quantity),
        }),
        `leadflow-item-${draft.idempotency_key}-${index}`,
      );
    }

    const finalized = await stripeRequest(
      stripeKey,
      `/v1/invoices/${encodeURIComponent(invoiceId)}/finalize`,
      "POST",
      new URLSearchParams({ auto_advance: "false" }),
      `leadflow-finalize-${draft.idempotency_key}`,
    );
    const sent = await stripeRequest(
      stripeKey,
      `/v1/invoices/${encodeURIComponent(invoiceId)}/send`,
      "POST",
      new URLSearchParams(),
      `leadflow-send-${draft.idempotency_key}`,
    );
    const invoice = { ...finalized, ...sent };

    const record = {
      lead_id: lead.id,
      stripe_customer_id: customerId,
      stripe_invoice_id: invoiceId,
      invoice_number: text(invoice.number, 100),
      status: text(invoice.status, 40) || "open",
      currency: "usd",
      subtotal_cents: draft.subtotal_cents,
      due_date: draft.due_date,
      memo: draft.memo || null,
      line_items: draft.line_items,
      customer_name: draft.customer_name,
      customer_email: email,
      hosted_invoice_url: text(invoice.hosted_invoice_url, 1000),
      invoice_pdf: text(invoice.invoice_pdf, 1000),
      created_by: user.id,
      created_by_name: profile.full_name || user.email || "Sales Desk",
      sent_at: new Date().toISOString(),
      last_error: null,
    };
    const { data: audit, error: auditError } = await admin
      .from("sales_invoices")
      .upsert(record, { onConflict: "stripe_invoice_id" })
      .select()
      .single();
    if (auditError) throw new Error(`Audit record failed: ${auditError.code}`);

    await admin.from("lead_activity").insert({
      lead_id: lead.id,
      kind: "invoice",
      detail: `Stripe invoice ${record.invoice_number || invoiceId} sent for $${(draft.subtotal_cents / 100).toFixed(2)} by ${record.created_by_name}`,
    });

    return NextResponse.json({ invoice: audit });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : "Invoice could not be sent";
    const invoiceId = text(createdInvoice?.id, 100);
    if (invoiceId) {
      await admin.from("sales_invoices").upsert({
        lead_id: lead.id,
        stripe_customer_id: customerId,
        stripe_invoice_id: invoiceId,
        invoice_number: text(createdInvoice?.number, 100),
        status: "send_failed",
        currency: "usd",
        subtotal_cents: draft.subtotal_cents,
        due_date: draft.due_date,
        memo: draft.memo || null,
        line_items: draft.line_items,
        customer_name: draft.customer_name,
        customer_email: email,
        hosted_invoice_url: text(createdInvoice?.hosted_invoice_url, 1000),
        invoice_pdf: text(createdInvoice?.invoice_pdf, 1000),
        created_by: user.id,
        created_by_name: profile.full_name || user.email || "Sales Desk",
        last_error: message,
      }, { onConflict: "stripe_invoice_id" });
    }
    console.error("Stripe invoice send failed:", message);
    return NextResponse.json({ error: message }, { status: error instanceof StripeRequestError ? error.status : 502 });
  }
}
