import { NextResponse } from "next/server";
import { postCreatorSecrets, purchaseFromSession, type PostCreatorCheckoutSession } from "@/lib/postCreator/access";
import * as db from "@/lib/postCreator/db";
import { claimDecision } from "@/lib/postCreator/plan";
import { POST_CREATOR } from "@/lib/postCreator/product";
import { withIdentityCookie } from "@/lib/postCreator/server";
import { BUSINESS } from "@/lib/site/business";

// Where Stripe sends the buyer the second the card clears.
//
// The browser arrives with the Checkout Session id. This route asks Stripe
// whether that session is paid and what it bought, and writes the account if
// the webhook has not yet. It signs this browser in only when all of these
// hold: this checkout created the account (so a checkout on someone else's
// email, or a second purchase, never takes an account over), no browser has
// claimed it before (so a replayed or shared link opens nothing), and the
// checkout is less than a day old. Every other arrival lands on the app with
// a ?claim= note and no cookie, and opens it with the emailed key. The
// webhook does the durable work (receipt with the key) on its own clock.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ClaimNote = "existing" | "used" | "expired" | "missing" | "notfound" | "unpaid" | "unavailable";

function redirect(query: string) {
  return NextResponse.redirect(`${BUSINESS.siteUrl}${POST_CREATOR.appPath}?${query}`, {
    status: 303,
    headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex" },
  });
}

/** Every arrival that is not signed in goes through here, so none of them can carry a cookie. */
function note(code: ClaimNote) {
  return redirect(`claim=${code}`);
}

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id") ?? "";
  if (!/^cs_[A-Za-z0-9_]{8,200}$/.test(sessionId)) return note("missing");

  const key = process.env.STRIPE_SECRET_KEY?.trim();
  const secrets = postCreatorSecrets();
  const client = db.serviceDb();
  if (!key || secrets.length === 0 || !client) return note("unavailable");

  let session: PostCreatorCheckoutSession;
  try {
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return note("notfound");
    session = (await r.json()) as PostCreatorCheckoutSession;
  } catch {
    return note("unavailable");
  }
  if (!session || session.id !== sessionId) return note("notfound");
  if (session.payment_status !== "paid") return note("unpaid");

  const purchase = purchaseFromSession(session);
  if (!purchase) return note("notfound");

  const now = Math.floor(Date.now() / 1000);
  let recorded: Awaited<ReturnType<typeof db.recordPurchase>>;
  try {
    recorded = await db.recordPurchase(client, {
      email: purchase.email,
      plan: purchase.plan,
      sessionId: purchase.sessionId,
      customerId: purchase.customerId,
      subscriptionId: purchase.subscriptionId,
      eventAt: purchase.createdAt ?? now,
    });
  } catch (error) {
    console.error("Post Creator claim could not record the account:", error instanceof Error ? error.message : "unknown error");
    return note("unavailable");
  }

  const decision = claimDecision({
    createdByThisSession: recorded.createdByThisSession,
    firstClaimedAt: recorded.account.firstClaimedAt,
    sessionCreatedAt: purchase.createdAt,
    now,
  });
  if (decision !== "sign_in") return note(decision);

  // The database has the last word: exactly one arrival can move
  // first_claimed_at from empty, so two tabs racing the same link sign in once.
  let epoch: number | null;
  try {
    epoch = await db.claimFirstCookie(client, purchase.email, purchase.sessionId);
  } catch (error) {
    console.error("Post Creator claim could not mark the checkout claimed:", error instanceof Error ? error.message : "unknown error");
    return note("unavailable");
  }
  if (epoch === null) return note("used");
  return withIdentityCookie(redirect("welcome=1"), purchase.email, epoch);
}
