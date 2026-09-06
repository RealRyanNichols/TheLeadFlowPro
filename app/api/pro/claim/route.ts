import { NextResponse } from "next/server";
import { PRO_ACCESS_COOKIE, mergeProAccess, proAccessSecrets, proKindFromSession, proKindSlug, signProAccess } from "@/lib/proAccess";
import { proAccessCookieOptions, readProAccessCookie } from "@/lib/proAccessServer";
import { PRO_BUNDLE, proCatalog } from "@/lib/tools/pro";
import { createProPurchaseReceipt, PRO_PURCHASE_RECEIPT_COOKIE, proPurchasePath, proPurchaseReceiptCookieOptions, signProPurchaseReceipt } from "@/lib/proPurchaseReceipt";

// Where Stripe sends the buyer the second the card clears.
//
// The browser arrives with the Checkout Session id. This route asks Stripe
// whether that session is paid and what it bought, signs the access cookie,
// and sends the buyer straight into the unlocked kit. The webhook does the
// durable work (purchase row, receipt email with the key) on its own clock;
// this is the instant one, so a slow webhook never leaves a buyer staring at a
// locked page they just paid for.

const SITE = "https://www.theleadflowpro.com";

function redirect(path: string) {
  return NextResponse.redirect(`${SITE}${path}`, {
    status: 303,
    headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex" },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id") ?? "";
  if (!/^cs_[A-Za-z0-9_]{8,200}$/.test(sessionId)) {
    return redirect("/tools/pro/unlock?claim=missing");
  }

  const key = process.env.STRIPE_SECRET_KEY;
  const secrets = proAccessSecrets();
  if (!key || secrets.length === 0) {
    return redirect("/tools/pro/unlock?claim=unavailable");
  }

  let session: {
    id?: string;
    created?: number;
    currency?: string;
    payment_status?: string;
    amount_total?: number;
    amount_subtotal?: number;
    metadata?: Record<string, unknown>;
    customer_details?: { email?: string } | null;
    customer_email?: string | null;
  };
  try {
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!r.ok) return redirect("/tools/pro/unlock?claim=notfound");
    session = await r.json();
  } catch {
    return redirect("/tools/pro/unlock?claim=unavailable");
  }

  if (session.payment_status !== "paid") {
    return redirect("/tools/pro/unlock?claim=unpaid");
  }
  if (session.id !== sessionId || session.currency !== "usd" ||
    typeof session.amount_total !== "number" || !Number.isSafeInteger(session.amount_total) || session.amount_total < 0) {
    return redirect("/tools/pro/unlock?claim=notfound");
  }

  const kind = proKindFromSession(session, proCatalog());
  if (!kind) return redirect("/tools/pro/unlock?claim=notfound");

  const email = (session.customer_details?.email || session.customer_email || "").toString();
  const existing = await readProAccessCookie();
  const token = signProAccess(mergeProAccess(existing, email, [kind]), secrets[0]);

  const slug = proKindSlug(kind);
  const res = redirect(proPurchasePath(kind === PRO_BUNDLE.kind ? PRO_BUNDLE.kind : slug!));
  res.cookies.set(PRO_ACCESS_COOKIE, token, proAccessCookieOptions());
  const receipt = createProPurchaseReceipt(sessionId, session, proCatalog());
  if (receipt) {
    res.cookies.set(PRO_PURCHASE_RECEIPT_COOKIE, signProPurchaseReceipt(receipt, secrets[0]), proPurchaseReceiptCookieOptions());
  } else {
    // A free or historical claim must not consume an older pending purchase.
    res.cookies.set(PRO_PURCHASE_RECEIPT_COOKIE, "", { ...proPurchaseReceiptCookieOptions(), maxAge: 0 });
  }
  return res;
}
