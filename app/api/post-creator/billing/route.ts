import { POST_CREATOR } from "@/lib/postCreator/product";
import { apiError, isResponse, json, requirePostCreator, sameOrigin } from "@/lib/postCreator/server";
import { BUSINESS } from "@/lib/site/business";

// The Stripe customer portal for a monthly plan: update the card, cancel,
// see invoices. The customer id comes from the account row the webhook
// wrote; the browser never names one. A lapsed plan still gets through, since
// a buyer whose card failed needs this door most.

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError("forbidden", "Open Post Creator from theleadflowpro.com and try again.", 403);
  const pc = await requirePostCreator({ allowLapsed: true });
  if (isResponse(pc)) return pc;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return apiError("billing_unavailable", "Billing is not switched on yet.", 503);
  const customer = pc.account.stripeCustomerId;
  if (pc.account.plan !== "monthly" || !customer || !/^cus_[A-Za-z0-9]+$/.test(customer)) {
    return apiError("nothing_to_manage", "Nothing renews on this plan, so there is nothing to manage.", 400);
  }
  try {
    const r = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ customer, return_url: `${BUSINESS.siteUrl}${POST_CREATOR.appPath}` }).toString(),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const result = (await r.json().catch(() => ({}))) as { url?: unknown };
    if (!r.ok || typeof result.url !== "string" || !result.url.startsWith("https://")) {
      return apiError("billing_unavailable", "The billing portal is not available right now.", 502);
    }
    return json({ url: result.url });
  } catch {
    return apiError("billing_unavailable", "The billing portal is not available right now.", 502);
  }
}
