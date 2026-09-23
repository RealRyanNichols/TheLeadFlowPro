import { NextResponse } from "next/server";
import { CHASE_COOKIE, chaseCookieOptions, chaseSecrets, identityFor, purchaseFromSession, signIdentity } from "@/lib/chaseSheet/access";
import * as db from "@/lib/chaseSheet/db";
import { CHASE_SHEET } from "@/lib/chaseSheet/product";
import { BUSINESS } from "@/lib/site/business";

// Where Stripe sends the buyer the second the card clears.
//
// The browser arrives with the Checkout Session id. This route asks Stripe
// whether that session is paid and what it bought, writes the account row if
// the webhook has not yet, signs the identity cookie, and sends the buyer
// straight into the sheet. The webhook does the durable work (purchase row,
// receipt with the key) on its own clock.

export const runtime = "nodejs";

function redirect(path: string) {
  return NextResponse.redirect(`${BUSINESS.siteUrl}${path}`, {
    status: 303,
    headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex" },
  });
}

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id") ?? "";
  if (!/^cs_[A-Za-z0-9_]{8,200}$/.test(sessionId)) return redirect(`${CHASE_SHEET.appPath}?claim=missing`);

  const key = process.env.STRIPE_SECRET_KEY?.trim();
  const secrets = chaseSecrets();
  const client = db.serviceDb();
  if (!key || secrets.length === 0 || !client) return redirect(`${CHASE_SHEET.appPath}?claim=unavailable`);

  let session: Parameters<typeof purchaseFromSession>[0] & { created?: number };
  try {
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return redirect(`${CHASE_SHEET.appPath}?claim=notfound`);
    session = await r.json();
  } catch {
    return redirect(`${CHASE_SHEET.appPath}?claim=unavailable`);
  }
  if (session.id !== sessionId) return redirect(`${CHASE_SHEET.appPath}?claim=notfound`);
  if (session.payment_status !== "paid") return redirect(`${CHASE_SHEET.appPath}?claim=unpaid`);

  const purchase = purchaseFromSession(session);
  if (!purchase) return redirect(`${CHASE_SHEET.appPath}?claim=notfound`);

  try {
    await db.recordPurchase(client, {
      email: purchase.email,
      plan: purchase.plan,
      sessionId: purchase.sessionId,
      customerId: purchase.customerId,
      subscriptionId: purchase.subscriptionId,
      eventAt: typeof session.created === "number" ? session.created : Math.floor(Date.now() / 1000),
    });
  } catch (error) {
    console.error("Chase Sheet claim could not record the account:", error instanceof Error ? error.message : error);
    return redirect(`${CHASE_SHEET.appPath}?claim=unavailable`);
  }

  const res = redirect(`${CHASE_SHEET.appPath}?welcome=1`);
  res.cookies.set(CHASE_COOKIE, signIdentity(identityFor(purchase.email), secrets[0]), chaseCookieOptions());
  return res;
}
