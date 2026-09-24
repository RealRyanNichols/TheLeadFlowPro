import { canManageBilling } from "@/lib/postCreator/plan";
import { POST_CREATOR } from "@/lib/postCreator/product";
import { apiError, isResponse, json, requirePostCreator, sameOrigin } from "@/lib/postCreator/server";
import { BUSINESS } from "@/lib/site/business";

// The Stripe customer portal for a monthly plan: update the card, cancel,
// see invoices. The customer id comes from the account row the webhook
// wrote; the browser never names one. A past-due plan still gets through,
// since a buyer whose card failed needs this door most. A plan that ended,
// or that a refund or a dispute closed, has nothing left to manage there
// (canManageBilling in lib/postCreator/plan.ts, the same test the Settings
// button uses).

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError("forbidden", "Open Post Creator from theleadflowpro.com and try again.", 403);
  const pc = await requirePostCreator({ allowLapsed: true });
  if (isResponse(pc)) return pc;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return apiError("billing_unavailable", "Billing is not switched on yet.", 503);
  const customer = pc.account.stripeCustomerId;
  if (!customer || !canManageBilling(pc.account)) {
    const ended = pc.account.plan === "monthly" && (pc.account.status === "canceled" || Boolean(pc.account.moneyBackAt));
    return apiError(
      "nothing_to_manage",
      ended
        ? `This plan has ended, so there is nothing to manage. Email ${BUSINESS.email.hello} with any billing question.`
        : "Nothing renews on this plan, so there is nothing to manage.",
      400,
    );
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
