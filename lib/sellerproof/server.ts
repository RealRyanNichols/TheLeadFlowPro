import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  ACCESS_SECONDS,
  accessFromSession,
  accessSecrets,
  verifyAccess,
  type Access,
  type CheckoutSession,
} from "./access";

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
export function sameOrigin(req: Request): boolean {
  try {
    const origin = new URL(req.headers.get("origin") || "");
    const target = new URL(req.url);
    // Next may normalize the local request URL to localhost while preserving
    // the browser's 127.0.0.1 Host. Compare the actual request host as well.
    return (
      origin.protocol === target.protocol &&
      origin.host === (req.headers.get("host") || target.host)
    );
  } catch {
    return false;
  }
}
export async function readBody(req: Request): Promise<Record<string, unknown>> {
  // Bound the stream itself; Content-Length alone is not a trustworthy limit.
  const reader = req.body?.getReader();
  if (!reader) throw new Error("Invalid request.");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 280000) {
        await reader.cancel();
        throw new Error("Packet is too large.");
      }
      chunks.push(value);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error();
    return body;
  } catch {
    throw new Error("Use a valid packet under 280 KB.");
  }
}
export function configured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY && accessSecrets().length > 0;
}
export async function paidAccess(sessionId: string): Promise<Access | null> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Payments unavailable.");
  const r = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=payment_intent.latest_charge`,
    {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    },
  );
  if (r.status === 404) return null;
  if (!r.ok)
    throw new Error("Payment verification is temporarily unavailable.");
  return accessFromSession(
    (await r.json()) as CheckoutSession,
    /^(?:sk|rk)_live_/.test(key),
  );
}
export async function cookieAccess() {
  return verifyAccess(
    (await cookies()).get(ACCESS_COOKIE)?.value,
    accessSecrets(),
  );
}
export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/api/sellerproof",
    maxAge: ACCESS_SECONDS,
  };
}
