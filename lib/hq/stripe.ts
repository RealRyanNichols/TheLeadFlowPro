import { HQ_PLAN, type Workspace } from "./types";

// Stripe for the plugin, plain REST like the rest of the site. One
// recurring price created on the fly per checkout (the same approach the
// Tool Studio menu uses), a 14 day trial, and the workspace id in the
// metadata so the webhook knows which business just started.

const SITE = "https://www.theleadflowpro.com";

export async function createSubscriptionCheckout(input: { workspace: Workspace; email: string | null }): Promise<{ url: string } | { error: string }> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return { error: "Billing is not switched on yet." };
  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", "usd");
  params.set("line_items[0][price_data][unit_amount]", String(HQ_PLAN.priceUsd * 100));
  params.set("line_items[0][price_data][recurring][interval]", "month");
  params.set("line_items[0][price_data][product_data][name]", `${HQ_PLAN.name} | ${input.workspace.name}`);
  params.set("line_items[0][price_data][product_data][description]", "Autopilot for your leads, follow-ups, and weekly content, inside ChatGPT and Claude. Cancel any time.");
  // One trial per business. A restart after a cancel pays from day one.
  if (!input.workspace.trial_used_at && !input.workspace.stripe_customer_id) {
    params.set("subscription_data[trial_period_days]", String(HQ_PLAN.trialDays));
  }
  params.set("subscription_data[metadata][kind]", HQ_PLAN.kind);
  params.set("subscription_data[metadata][workspace_id]", input.workspace.id);
  params.set("metadata[kind]", HQ_PLAN.kind);
  params.set("metadata[workspace_id]", input.workspace.id);
  params.set("allow_promotion_codes", "true");
  params.set("billing_address_collection", "auto");
  params.set("success_url", `${SITE}/hq?welcome=1&session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${SITE}/hq/billing?cancelled=1`);
  if (input.workspace.stripe_customer_id) params.set("customer", input.workspace.stripe_customer_id);
  else if (input.email) params.set("customer_email", input.email);

  try {
    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const j = (await r.json().catch(() => ({}))) as { url?: string; error?: { message?: string } };
    if (!r.ok || !j.url) {
      console.error("HQ checkout failed:", j.error?.message);
      return { error: "Could not start checkout. Try again in a minute." };
    }
    return { url: j.url };
  } catch {
    return { error: "Could not reach billing." };
  }
}

export async function createBillingPortal(customerId: string): Promise<{ url: string } | { error: string }> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return { error: "Billing is not switched on yet." };
  if (!/^cus_[A-Za-z0-9]+$/.test(customerId)) return { error: "No billing account." };
  const params = new URLSearchParams({ customer: customerId, return_url: `${SITE}/hq/billing` });
  try {
    const r = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const j = (await r.json().catch(() => ({}))) as { url?: string };
    if (!r.ok || !j.url) return { error: "The billing portal is not available right now." };
    return { url: j.url };
  } catch {
    return { error: "Could not reach billing." };
  }
}

export type StripeSubscriptionLike = {
  id?: string;
  customer?: string | { id?: string };
  status?: string;
  trial_end?: number | null;
  current_period_end?: number | null;
  cancel_at_period_end?: boolean;
  metadata?: Record<string, unknown>;
};

/** Stripe's subscription status folded into the workspace plan. */
export function planFromSubscription(sub: StripeSubscriptionLike): { plan: Workspace["plan"]; subscription_status: string; trial_ends_at: string | null; current_period_end: string | null } {
  const status = String(sub.status ?? "");
  const iso = (n: number | null | undefined) => (typeof n === "number" && n > 0 ? new Date(n * 1000).toISOString() : null);
  let plan: Workspace["plan"];
  if (status === "trialing") plan = "trial";
  else if (status === "active") plan = "active";
  else if (status === "past_due" || status === "unpaid") plan = "past_due";
  else if (status === "canceled" || status === "incomplete_expired") plan = "canceled";
  else if (status === "incomplete" || status === "paused") plan = "none";
  else plan = "none";
  return { plan, subscription_status: status, trial_ends_at: iso(sub.trial_end), current_period_end: iso(sub.current_period_end) };
}

export function customerIdOf(sub: { customer?: string | { id?: string } }): string | null {
  if (typeof sub.customer === "string") return sub.customer;
  if (sub.customer && typeof sub.customer.id === "string") return sub.customer.id;
  return null;
}
