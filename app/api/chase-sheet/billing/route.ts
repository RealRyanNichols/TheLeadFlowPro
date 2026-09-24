import { CHASE_SHEET } from "@/lib/chaseSheet/product";
import { isResponse, json, requireSheet, sameOrigin } from "@/lib/chaseSheet/server";
import { BUSINESS } from "@/lib/site/business";

// The Stripe customer portal for a monthly plan: update the card, cancel,
// see invoices. The customer id comes from the account row the webhook
// wrote; the browser never names one.

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Forbidden" }, 403);
  const sheet = await requireSheet();
  if (isResponse(sheet)) return sheet;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  const customer = sheet.account.stripeCustomerId;
  if (!key) return json({ error: "Billing is not switched on yet." }, 503);
  if (sheet.account.plan !== "monthly" || !customer || !/^cus_[A-Za-z0-9]+$/.test(customer)) {
    return json({ error: "Nothing renews on this plan, so there is nothing to manage." }, 400);
  }
  try {
    const r = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ customer, return_url: `${BUSINESS.siteUrl}${CHASE_SHEET.appPath}` }).toString(),
      signal: AbortSignal.timeout(8000),
    });
    const result = (await r.json().catch(() => ({}))) as { url?: string };
    if (!r.ok || !result.url) return json({ error: "The billing portal is not available right now." }, 502);
    return json({ url: result.url });
  } catch {
    return json({ error: "Could not reach billing." }, 502);
  }
}
