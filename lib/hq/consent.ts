import { hqSecrets, signPayload, verifyPayload } from "./crypto";

// The consent form's proof that the person who approved is the person who
// saw the page: an HMAC over the signed-in user, the client, the redirect,
// the PKCE challenge, and the scope, with a ten minute expiry.

export type ConsentBinding = { userId: string; clientId: string; redirectUri: string; codeChallenge: string; scope: string };

const TTL_MS = 10 * 60_000;

function payload(b: ConsentBinding, exp: number): string {
  return [b.userId, b.clientId, b.redirectUri, b.codeChallenge, b.scope, String(exp)].join("\n");
}

export function consentNonce(b: ConsentBinding, now = Date.now(), secrets = hqSecrets()): string {
  const exp = now + TTL_MS;
  if (secrets.length === 0) throw new Error("No signing secret is configured");
  return `${exp}.${signPayload(payload(b, exp), secrets[0])}`;
}

export function verifyConsentNonce(nonce: string, b: ConsentBinding, now = Date.now(), secrets = hqSecrets()): boolean {
  const dot = nonce.indexOf(".");
  if (dot <= 0) return false;
  const exp = Number(nonce.slice(0, dot));
  const sig = nonce.slice(dot + 1);
  if (!Number.isFinite(exp) || exp < now || exp > now + TTL_MS + 60_000) return false;
  return verifyPayload(payload(b, exp), sig, secrets);
}
