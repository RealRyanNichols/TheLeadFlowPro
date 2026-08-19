import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateSalesInvoiceDraft } from "../lib/salesInvoice.ts";

const now = new Date("2026-08-19T12:00:00Z");
const valid = {
  confirmed: true,
  lead_id: "4c7c94cc-7e3e-4f8d-89b7-45036f3c20a3",
  customer_name: "O-L Guy Farms",
  due_date: "2026-08-26",
  memo: "Approved scope",
  idempotency_key: "60ef7424-f538-47e2-81f4-bf01920891c2",
  line_items: [
    { description: "Website launch", quantity: 1, unit_amount_cents: 50000 },
    { description: "Lead engine setup", quantity: 2, unit_amount_cents: 75000 },
  ],
};

describe("sales invoice validation", () => {
  it("normalizes a confirmed custom invoice and calculates the total", () => {
    const result = validateSalesInvoiceDraft(valid, now);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.subtotal_cents, 200000);
  });

  it("requires explicit confirmation before a money-moving action", () => {
    const result = validateSalesInvoiceDraft({ ...valid, confirmed: false }, now);
    assert.deepEqual(result, { ok: false, error: "Review and confirm the invoice before sending" });
  });

  it("rejects dates outside the 90-day window", () => {
    const result = validateSalesInvoiceDraft({ ...valid, due_date: "2026-12-31" }, now);
    assert.equal(result.ok, false);
  });

  it("rejects unsafe totals", () => {
    const result = validateSalesInvoiceDraft({
      ...valid,
      line_items: [{ description: "Oversized scope", quantity: 3, unit_amount_cents: 10_000_000 }],
    }, now);
    assert.deepEqual(result, { ok: false, error: "Invoice total cannot exceed $250,000" });
  });
});
