import { NextResponse } from "next/server";
import { handleManage } from "@/lib/hq/manage";
import { getHqSession } from "@/lib/hq/session";
import { createBillingPortal, createSubscriptionCheckout } from "@/lib/hq/stripe";

// The management API behind the HQ pages. One POST, one action field.
// Only a signed-in member of the workspace gets past the first line.

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let session;
  try {
    session = await getHqSession();
  } catch (e) {
    console.error("HQ session failed:", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ ok: false, error: "HQ is not configured on this server." }, { status: 500 });
  }
  if (!session) return NextResponse.json({ ok: false, error: "Sign in first." }, { status: 401 });

  const raw = await request.text().catch(() => "");
  if (raw.length > 100_000) return NextResponse.json({ ok: false, error: "Request too large." }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(raw || "{}");
  } catch {
    return NextResponse.json({ ok: false, error: "Bad JSON." }, { status: 400 });
  }

  try {
    const result = await handleManage(body, {
      db: session.db,
      user: session.user,
      workspace: session.workspace,
      now: new Date(),
      createCheckout: createSubscriptionCheckout,
      createPortal: createBillingPortal,
    });
    return NextResponse.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("HQ action failed:", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ ok: false, error: "Something went wrong. Try again." }, { status: 500 });
  }
}
