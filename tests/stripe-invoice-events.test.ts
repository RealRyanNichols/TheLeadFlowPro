import assert from "node:assert/strict";
import test from "node:test";
import { classifyStripeInvoice, dollars, renewalAction } from "../lib/stripeInvoiceEvents.ts";
import { HQ_PLAN } from "../lib/hq/types.ts";

const LEAD = "12345678-1234-4234-8234-123456789012";

test("a Sales Desk invoice classifies by its metadata and carries the lead id", () => {
  const c = classifyStripeInvoice({
    id: "in_1",
    number: "LFP-0001",
    amount_paid: 149700,
    customer_email: "Owner@Example.com",
    billing_reason: "manual",
    hosted_invoice_url: "https://invoice.stripe.com/i/abc",
    metadata: { leadflow_lead_id: LEAD, leadflow_source: "sales_desk" },
  });
  assert.equal(c.family, "sales_desk");
  assert.equal(c.leadId, LEAD);
  assert.equal(c.email, "owner@example.com");
  assert.equal(c.amountPaidCents, 149700);
  assert.equal(c.number, "LFP-0001");
  assert.equal(c.subscriptionId, null);
  assert.equal(renewalAction(c, "invoice.paid"), "ignore");
});

test("a dashboard invoice with no metadata is unknown and a non-uuid lead id is dropped", () => {
  const c = classifyStripeInvoice({ id: "in_2", amount_paid: 5000, customer_email: "x@example.com" });
  assert.equal(c.family, "unknown");
  assert.equal(c.leadId, null);
  const bad = classifyStripeInvoice({ id: "in_3", metadata: { leadflow_lead_id: "not-a-uuid" } });
  assert.equal(bad.leadId, null);
  assert.equal(bad.family, "unknown");
  assert.equal(bad.amountPaidCents, 0);
  assert.equal(classifyStripeInvoice(null).invoiceId, null);
});

test("agency and Tool Studio renewals are read from the subscription metadata in any of Stripe's three shapes", () => {
  const meta = { kind: "agency_payment", service: "meta-ads", service_name: "Meta ads management", reference: "Acme", billing: "monthly" };
  const shapes = [
    { id: "in_a", amount_paid: 90000, subscription: "sub_1", subscription_details: { metadata: meta } },
    { id: "in_b", amount_paid: 90000, parent: { subscription_details: { subscription: "sub_1", metadata: meta } } },
    { id: "in_c", amount_paid: 90000, subscription: { id: "sub_1" }, lines: { data: [{ metadata: meta }] } },
  ];
  for (const shape of shapes) {
    const c = classifyStripeInvoice(shape);
    assert.equal(c.family, "agency_payment", shape.id);
    assert.equal(c.subscriptionId, "sub_1", shape.id);
    assert.equal(c.subscriptionMetadata.reference, "Acme", shape.id);
  }
  const first = classifyStripeInvoice({ ...shapes[0], billing_reason: "subscription_create" });
  assert.equal(renewalAction(first, "invoice.paid"), "skip_first_invoice");
  const cycle = classifyStripeInvoice({ ...shapes[0], billing_reason: "subscription_cycle" });
  assert.equal(renewalAction(cycle, "invoice.paid"), "record_paid");
  assert.equal(renewalAction(cycle, "invoice.payment_failed"), "record_failed");
  assert.equal(renewalAction(cycle, "invoice.finalized"), "ignore");
  const tool = classifyStripeInvoice({ id: "in_t", amount_paid: 9700, subscription_details: { metadata: { kind: "tool_monthly_menu", monthly_ids: "tool_care" } } });
  assert.equal(tool.family, "tool_monthly_menu");
  assert.equal(renewalAction(tool, "invoice.paid"), "record_paid");
});

test("every paid plugin month is recorded, the first one included, and a zero-dollar trial invoice is not", () => {
  const paid = classifyStripeInvoice({ id: "in_p", amount_paid: 4900, billing_reason: "subscription_create", subscription: "sub_p", subscription_details: { metadata: { kind: HQ_PLAN.kind, workspace_id: "ws-1" } } });
  assert.equal(paid.family, "hq_subscription");
  assert.equal(renewalAction(paid, "invoice.paid"), "record_paid");
  const trial = classifyStripeInvoice({ id: "in_0", amount_paid: 0, billing_reason: "subscription_create", subscription_details: { metadata: { workspace_id: "ws-1" } } });
  assert.equal(trial.family, "hq_subscription");
  assert.equal(renewalAction(trial, "invoice.paid"), "ignore");
  assert.equal(renewalAction(trial, "invoice.payment_failed"), "record_failed");
  assert.equal(dollars(4900), "$49.00");
  assert.equal(dollars(149700), "$1,497.00");
});
