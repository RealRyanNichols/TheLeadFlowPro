import { after } from "next/server";
import {
  bucketFor,
  isPlausibleEmail,
  normalizeEmail,
  normalizeLicenseKey,
  postCreatorLicenseKey,
  postCreatorSecrets,
  verifyPostCreatorLicenseKey,
} from "@/lib/postCreator/access";
import * as db from "@/lib/postCreator/db";
import { keyResendEmail } from "@/lib/postCreator/emails";
import { POST_CREATOR } from "@/lib/postCreator/product";
import { BodyError, apiError, ipOf, json, readBody, sameOrigin, withIdentityCookie } from "@/lib/postCreator/server";
import { BUSINESS } from "@/lib/site/business";

// Open Post Creator on another device.
//
//   { email, key }  -> the key is checked by HMAC math against the email and
//                      the account's key_version; a match on an existing
//                      account signs this browser in at the account's current
//                      epoch.
//   { email }       -> if an account exists, the key is emailed again. The
//                      answer is the same either way, so this cannot be used
//                      to learn which emails have bought: the account lookup
//                      and the send both run after the answer has gone out
//                      (next/server after()), so neither the status, the
//                      body, nor the time taken depends on the account, and a
//                      failed send is logged, never answered.
//
// Both paths are rate limited in the database (post_creator_hit), so the
// limits hold across every server instance. A limit that cannot be checked
// fails closed.

export const runtime = "nodejs";

const HOUR = 3600;
/** Key tries per connection per hour. */
const KEY_TRIES_PER_IP = 30;
/** Key emails per address per hour. */
const EMAILS_PER_ADDRESS = 3;
/** Key emails per connection per hour. */
const EMAILS_PER_IP = 10;

const RESTORE_OFF = `Opening Post Creator on another device is not switched on yet. Email ${BUSINESS.email.hello} and we will open it by hand.`;
const LIMIT_DOWN = "Could not check that right now. Try again in a minute.";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError("forbidden", "Open Post Creator from theleadflowpro.com and try again.", 403);
  let body: Record<string, unknown>;
  try {
    body = await readBody(request, 4000);
  } catch (error) {
    const status = error instanceof BodyError ? error.status : 400;
    const message = error instanceof BodyError ? error.message : "Something in that request was off. Reload the page and try again.";
    return apiError(status === 413 ? "too_large" : "bad_request", message, status);
  }

  const email = normalizeEmail(body.email);
  if (!isPlausibleEmail(email)) return apiError("bad_request", "Enter the email you used at checkout.", 400, { field: "email" });

  const secrets = postCreatorSecrets();
  if (secrets.length === 0) return apiError("unconfigured", RESTORE_OFF, 503);

  const rawKey = body.key;
  const keyGiven = typeof rawKey === "string" ? rawKey.trim() !== "" : rawKey !== undefined && rawKey !== null;
  const key = normalizeLicenseKey(rawKey);
  if (keyGiven && !key) {
    return apiError("bad_request", "That does not look like a key. It reads LFP-XXXX-XXXX-XXXX-XXXX.", 400, { field: "key" });
  }

  const client = db.serviceDb();
  const ip = ipOf(request);

  if (key) {
    // The rate limit lives in the database, so without one there is nothing
    // to count tries against and the key is not checked at all.
    if (!client) return apiError("unconfigured", RESTORE_OFF, 503);
    let allowed: boolean;
    try {
      allowed = await db.hitRateLimit(client, bucketFor("restore-ip", ip), HOUR, KEY_TRIES_PER_IP);
    } catch (error) {
      console.error("Post Creator restore limit failed:", error instanceof Error ? error.message : "unknown error");
      return apiError("server_error", LIMIT_DOWN, 503);
    }
    if (!allowed) return apiError("too_many_tries", "Too many tries from this connection. Wait an hour and try again.", 429);
    // The account's key_version decides which key opens it, so a revoked key
    // stops matching. With no account, the key is checked at version 0, the
    // same answer as before any key was revoked.
    let account: Awaited<ReturnType<typeof db.getAccount>>;
    try {
      account = await db.getAccount(client, email);
    } catch (error) {
      console.error("Post Creator restore could not read the account:", error instanceof Error ? error.message : "unknown error");
      return apiError("server_error", LIMIT_DOWN, 503);
    }
    if (!verifyPostCreatorLicenseKey(email, key, secrets, account ? account.keyVersion : 0)) {
      return apiError("key_mismatch", "That key does not match this email. Check both, or ask for the key to be sent again.", 403);
    }
    if (!account) return apiError("not_found", "We could not find a Post Creator for this email.", 404);
    return withIdentityCookie(json({ ok: true, next: POST_CREATOR.appPath }), account.email, account.accessEpoch);
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!client || !resendKey) {
    return apiError(
      "unconfigured",
      `Sending the key by email is not switched on yet. Email ${BUSINESS.email.hello} from the address you paid with.`,
      503,
    );
  }
  let allowed: boolean;
  try {
    allowed =
      (await db.hitRateLimit(client, bucketFor("resend-email", email), HOUR, EMAILS_PER_ADDRESS)) &&
      (await db.hitRateLimit(client, bucketFor("resend-ip", ip), HOUR, EMAILS_PER_IP));
  } catch (error) {
    console.error("Post Creator key email limit failed:", error instanceof Error ? error.message : "unknown error");
    return apiError("server_error", LIMIT_DOWN, 503);
  }
  // Over a limit answers exactly like a send, so the limit reveals nothing.
  if (!allowed) return json({ ok: true, sent: true });

  after(async () => {
    try {
      const account = await db.getAccount(client, email);
      if (!account) return;
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(keyResendEmail({ email: account.email, key: postCreatorLicenseKey(account.email, secrets[0], account.keyVersion) })),
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) throw new Error(`Resend ${r.status}`);
    } catch (error) {
      console.error("Post Creator key email failed:", error instanceof Error ? error.message : "unknown error");
    }
  });
  return json({ ok: true, sent: true });
}
