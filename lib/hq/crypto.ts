import crypto from "node:crypto";

// Secrets, tokens, and hashes for the plugin.
//
// The signing/encryption key chain is the same shape as the pro kits use:
// a dedicated secret first, then the older ones, so rotating adds a key
// without invalidating anything still in the wild. Encryption always uses
// the first secret; decryption tries each in turn.

export function hqSecrets(env: NodeJS.ProcessEnv = process.env): string[] {
  const out: string[] = [];
  for (const name of ["HQ_SECRET", "PRO_TOOLS_SECRET", "UNSUBSCRIBE_SECRET", "SUPABASE_SERVICE_ROLE_KEY"]) {
    const v = env[name]?.trim();
    if (v && v.length >= 16 && !out.includes(v)) out.push(v);
  }
  return out;
}

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

export function timingSafeEqualStrings(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** Lowercase, unambiguous, URL safe. 32 chars carries about 158 bits. */
export function randomToken(length = 32): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

function keyFor(secret: string): Buffer {
  return crypto.createHash("sha256").update(`hq-aes:${secret}`, "utf8").digest();
}

/**
 * AES-256-GCM. Output is `v1.<iv>.<tag>.<ciphertext>` in base64url so it
 * stores as plain text and a stray copy reads as obviously encrypted.
 */
export function encryptSecret(plaintext: string, secrets: string[] = hqSecrets()): string {
  if (secrets.length === 0) throw new Error("No encryption secret is configured");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyFor(secrets[0]), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), enc.toString("base64url")].join(".");
}

export function decryptSecret(ciphertext: string | null | undefined, secrets: string[] = hqSecrets()): string | null {
  if (!ciphertext) return null;
  const parts = ciphertext.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return null;
  const [, ivB64, tagB64, dataB64] = parts;
  for (const secret of secrets) {
    try {
      const decipher = crypto.createDecipheriv("aes-256-gcm", keyFor(secret), Buffer.from(ivB64, "base64url"));
      decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
      const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64url")), decipher.final()]);
      return dec.toString("utf8");
    } catch {
      // Try the next secret in the chain.
    }
  }
  return null;
}

/** HMAC over a payload with the first secret; verify against any secret. */
export function signPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload, "utf8").digest("base64url");
}

export function verifyPayload(payload: string, signature: string, secrets: string[]): boolean {
  for (const secret of secrets) {
    if (timingSafeEqualStrings(signPayload(payload, secret), signature)) return true;
  }
  return false;
}
