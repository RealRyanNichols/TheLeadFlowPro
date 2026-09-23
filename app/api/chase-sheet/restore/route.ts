import { NextResponse } from "next/server";
import {
  CHASE_COOKIE,
  chaseCookieOptions,
  chaseLicenseKey,
  chaseSecrets,
  identityFor,
  isPlausibleEmail,
  normalizeEmail,
  normalizeLicenseKey,
  signIdentity,
  verifyChaseLicenseKey,
} from "@/lib/chaseSheet/access";
import * as db from "@/lib/chaseSheet/db";
import { CHASE_SHEET } from "@/lib/chaseSheet/product";
import { json, readBody, sameOrigin } from "@/lib/chaseSheet/server";
import { BUSINESS } from "@/lib/site/business";

// Open the sheet on another device.
//
//   { email, key }  -> the key is checked by HMAC math; a match becomes the
//                      identity cookie. No database needed.
//   { email }       -> if an account exists, the key is emailed again. The
//                      answer is the same either way, so this cannot be used
//                      to learn which emails have bought.

export const runtime = "nodejs";

const RESEND_WINDOW_MS = 60 * 60 * 1000;
const RESEND_MAX = 3;
const resendLog = new Map<string, number[]>();

function resendAllowed(key: string, now = Date.now()): boolean {
  const past = (resendLog.get(key) ?? []).filter((t) => now - t < RESEND_WINDOW_MS);
  if (past.length >= RESEND_MAX) {
    resendLog.set(key, past);
    return false;
  }
  past.push(now);
  resendLog.set(key, past);
  if (resendLog.size > 5000) for (const k of [...resendLog.keys()].slice(0, 1000)) resendLog.delete(k);
  return true;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Open the sheet from theleadflowpro.com." }, 403);
  let body: Record<string, unknown>;
  try {
    body = await readBody(request, 4000);
  } catch {
    return json({ error: "Bad request" }, 400);
  }
  const email = normalizeEmail(body.email);
  if (!isPlausibleEmail(email)) return json({ error: "Enter the email you used at checkout." }, 400);
  const secrets = chaseSecrets();
  if (secrets.length === 0) return json({ error: `Access restore is not configured yet. Email ${BUSINESS.email.hello} and we will open it by hand.` }, 503);

  const key = normalizeLicenseKey(body.key);
  if (typeof body.key === "string" && body.key.trim() && !key) {
    return json({ error: "That does not look like a key. It reads LFP-XXXX-XXXX-XXXX-XXXX." }, 400);
  }

  if (key) {
    if (!verifyChaseLicenseKey(email, key, secrets)) {
      return json({ error: "That key does not match this email. Check both, or ask for the key to be sent again." }, 403);
    }
    const res = NextResponse.json({ ok: true, next: CHASE_SHEET.appPath }, { headers: { "Cache-Control": "private, no-store" } });
    res.cookies.set(CHASE_COOKIE, signIdentity(identityFor(email), secrets[0]), chaseCookieOptions());
    return res;
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 64) || "unknown";
  if (!resendAllowed(`e:${email}`) || !resendAllowed(`ip:${ip}`)) return json({ ok: true, sent: true });

  const client = db.serviceDb();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!client || !resendKey) {
    return json({ error: `Key recovery by email is not switched on yet. Email ${BUSINESS.email.hello} with the email you paid with.` }, 503);
  }
  try {
    const account = await db.getAccount(client, email);
    if (account) {
      const k = chaseLicenseKey(email, secrets[0]);
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `${BUSINESS.name} <${BUSINESS.email.hello}>`,
          to: [email],
          reply_to: BUSINESS.email.hello,
          subject: `Your ${CHASE_SHEET.name} key`,
          text: [
            `Here is the key for the ${CHASE_SHEET.name} bought with this email.`,
            "",
            `Key: ${k}`,
            `Open on this device: ${BUSINESS.siteUrl}${CHASE_SHEET.appPath}?email=${encodeURIComponent(email)}&key=${encodeURIComponent(k)}`,
            "",
            "Paste the key with this email on any device and the sheet opens there too.",
            "",
            "Ryan Nichols",
            BUSINESS.name,
          ].join("\n"),
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) throw new Error(`Resend ${r.status}`);
    }
  } catch (error) {
    console.error("Chase Sheet key re-send failed:", error instanceof Error ? error.message : "unknown");
    return json({ error: "Could not send right now. Try again in a minute." }, 502);
  }
  return json({ ok: true, sent: true });
}
