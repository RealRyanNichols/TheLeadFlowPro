import { randomToken, sha256Hex } from "./crypto";

// Every credential the plugin hands out has a recognizable prefix, so a key
// pasted in the wrong place is obvious, and a hash in the database says
// what kind of thing it was without ever revealing it.
//
//   lfp_live_...   API key (Claude Code, Cursor, Zapier, curl)
//   lfpat_...      OAuth access token (ChatGPT, Claude connectors)
//   lfprt_...      OAuth refresh token
//   lfpc_...       OAuth authorization code
//   lfpin_...      Inbound webhook token (in the URL of a lead endpoint)

export const KEY_PREFIX = {
  api: "lfp_live_",
  access: "lfpat_",
  refresh: "lfprt_",
  code: "lfpc_",
  inbound: "lfpin_",
} as const;

export type KeyKind = keyof typeof KEY_PREFIX;

export function mintKey(kind: KeyKind): { plaintext: string; hash: string; hint: string } {
  const plaintext = `${KEY_PREFIX[kind]}${randomToken(32)}`;
  return { plaintext, hash: hashKey(plaintext), hint: keyHint(plaintext) };
}

export function hashKey(plaintext: string): string {
  return sha256Hex(`hq-key:${plaintext}`);
}

/** Enough to recognize a key in a list, never enough to use it. */
export function keyHint(plaintext: string): string {
  const prefix = Object.values(KEY_PREFIX).find((p) => plaintext.startsWith(p)) ?? "";
  const body = plaintext.slice(prefix.length);
  return `${prefix}${body.slice(0, 4)}...${body.slice(-4)}`;
}

export function keyKind(plaintext: string): KeyKind | null {
  for (const [kind, prefix] of Object.entries(KEY_PREFIX) as [KeyKind, string][]) {
    if (plaintext.startsWith(prefix)) return kind;
  }
  return null;
}

const TOKEN_SHAPE = new RegExp(`^(?:${Object.values(KEY_PREFIX).join("|")})[a-z0-9]{32}$`);

/** A key is either exactly our shape or it is not worth a database lookup. */
export function looksLikeKey(value: unknown): value is string {
  return typeof value === "string" && TOKEN_SHAPE.test(value);
}

/** Pull a bearer credential out of an Authorization header. */
export function bearerFrom(header: string | null | undefined): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!m) return null;
  const token = m[1].trim();
  return looksLikeKey(token) ? token : null;
}
