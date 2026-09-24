// Post Creator AI writing: who the model provider is told made a request.
//
// Every write sends metadata.user_id so Anthropic can tell buyers apart for
// abuse checks. It must never be the email, and it must not be a plain hash
// of the email either: a hash with no key can be matched by anyone who hashes
// a list of guessed emails the same way. So it is an HMAC keyed with the
// server's Post Creator secret, which never leaves the server. Without that
// secret, a guessed email cannot be checked against it.
//
// Pure: the secret is passed in. The route reads it.

import { createHmac } from "node:crypto";

/** The HMAC domain, so this value can never match a cookie or key signed with the same secret. */
const DOMAIN = "post-creator:anthropic-user:v1:";

/** 32 hex characters (128 bits) of HMAC-SHA256 over the email. Throws without a secret rather than send a guessable value. */
export function anthropicUserId(email: string, secret: string): string {
  if (!secret) throw new Error("A secret is needed to hash the buyer for the model provider.");
  return createHmac("sha256", secret).update(`${DOMAIN}${email}`, "utf8").digest("hex").slice(0, 32);
}
