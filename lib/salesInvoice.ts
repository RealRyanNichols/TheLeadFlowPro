export type SalesInvoiceLine = {
  description: string;
  quantity: number;
  unit_amount_cents: number;
};

export type ValidSalesInvoiceDraft = {
  lead_id: string;
  customer_name: string;
  due_date: string;
  due_date_unix: number;
  memo: string;
  idempotency_key: string;
  line_items: SalesInvoiceLine[];
  subtotal_cents: number;
};

type Result =
  | { ok: true; value: ValidSalesInvoiceDraft }
  | { ok: false; error: string };

export function validateSalesInvoiceDraft(body: unknown, now = new Date()): Result {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid invoice" };
  const input = body as Record<string, unknown>;
  if (input.confirmed !== true) return { ok: false, error: "Review and confirm the invoice before sending" };

  const lead_id = clean(input.lead_id, 80);
  const customer_name = clean(input.customer_name, 200);
  const due_date = clean(input.due_date, 10);
  const memo = clean(input.memo, 2000);
  const idempotency_key = clean(input.idempotency_key, 80);

  if (!/^[0-9a-f-]{36}$/i.test(lead_id)) return { ok: false, error: "Choose a lead" };
  if (!customer_name) return { ok: false, error: "Customer name is required" };
  if (!/^[a-z0-9-]{20,80}$/i.test(idempotency_key)) {
    return { ok: false, error: "Start a fresh invoice and try again" };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due_date)) return { ok: false, error: "Choose a valid due date" };

  const due = new Date(`${due_date}T12:00:00Z`);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12));
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (!Number.isFinite(due.getTime()) || days < 1 || days > 90) {
    return { ok: false, error: "Due date must be 1 to 90 days from today" };
  }

  if (!Array.isArray(input.line_items) || input.line_items.length < 1 || input.line_items.length > 12) {
    return { ok: false, error: "Add between 1 and 12 line items" };
  }

  const line_items: SalesInvoiceLine[] = [];
  for (const raw of input.line_items) {
    if (!raw || typeof raw !== "object") return { ok: false, error: "Invalid line item" };
    const item = raw as Record<string, unknown>;
    const description = clean(item.description, 200);
    const quantity = Number(item.quantity);
    const unit_amount_cents = Number(item.unit_amount_cents);
    if (!description) return { ok: false, error: "Every line item needs a description" };
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
      return { ok: false, error: "Line-item quantity must be a whole number from 1 to 1,000" };
    }
    if (!Number.isInteger(unit_amount_cents) || unit_amount_cents < 100 || unit_amount_cents > 10_000_000) {
      return { ok: false, error: "Each unit price must be between $1 and $100,000" };
    }
    line_items.push({ description, quantity, unit_amount_cents });
  }

  const subtotal_cents = line_items.reduce(
    (sum, item) => sum + item.quantity * item.unit_amount_cents,
    0,
  );
  if (subtotal_cents > 25_000_000) return { ok: false, error: "Invoice total cannot exceed $250,000" };

  return {
    ok: true,
    value: {
      lead_id,
      customer_name,
      due_date,
      due_date_unix: Math.floor(due.getTime() / 1000),
      memo,
      idempotency_key,
      line_items,
      subtotal_cents,
    },
  };
}

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
