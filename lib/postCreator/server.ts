import "server-only";
import { NextResponse } from "next/server";
import { requestOrigin } from "../requestOrigin";
import { POST_CREATOR_COOKIE, identityFor, postCreatorCookieOptions, postCreatorSecrets, signIdentity } from "./access";
import { getEntitlement } from "./accessServer";
import * as db from "./db";
import type { Account, Allowance, ApiError, Entitlement, ErrorCode } from "./types";

// Shared plumbing for /api/post-creator/*. Every answer is private, no-store,
// and noindex; every mutation checks the request came from this site; every
// body is read with a hard byte limit; and every data route starts by proving
// who is asking and that they are still entitled.

export function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex",
      ...headers,
    },
  });
}

/** The one error shape every Post Creator route sends. */
export function apiError(code: ErrorCode, error: string, status: number, extra: { field?: string; allowance?: Allowance } = {}) {
  const body: ApiError = { ok: false, code, error };
  if (extra.field) body.field = extra.field;
  if (extra.allowance) body.allowance = extra.allowance;
  return json(body, status);
}

/** The Origin header is required and must be this site's own origin (see lib/requestOrigin.ts). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === requestOrigin(req);
  } catch {
    return false;
  }
}

/** A body that could not be read: 400 when it is not a JSON object, 413 when it is over the limit. */
export class BodyError extends Error {
  status: 400 | 413;

  constructor(status: 400 | 413, message: string) {
    super(message);
    this.name = "BodyError";
    this.status = status;
  }
}

const BAD_BODY = "Something in that request was off. Reload the page and try again.";
const TOO_LARGE = "That is more text than we can take in one go. Shorten it and try again.";

/**
 * The JSON object in the body, read with a hard limit on the stream itself
 * (Content-Length alone is not a trustworthy limit). An empty body is {}.
 * Throws BodyError.
 */
export async function readBody(req: Request, maxBytes: number): Promise<Record<string, unknown>> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new BodyError(413, TOO_LARGE);
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  const reader = req.body?.getReader();
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > maxBytes) {
          await reader.cancel().catch(() => undefined);
          throw new BodyError(413, TOO_LARGE);
        }
        chunks.push(value);
      }
    } catch (error) {
      throw error instanceof BodyError ? error : new BodyError(400, BAD_BODY);
    }
  }
  const joined = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let parsed: unknown;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(joined);
    if (!text.trim()) return {};
    parsed = JSON.parse(text);
  } catch {
    throw new BodyError(400, BAD_BODY);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new BodyError(400, BAD_BODY);
  return parsed as Record<string, unknown>;
}

/** The first x-forwarded-for address, for rate limits only. Never stored in the clear (see bucketFor). */
export function ipOf(req: Request): string {
  const first = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  return first ? first.slice(0, 64) : "unknown";
}

export type PostCreatorRequest = {
  client: db.Db;
  account: Account;
  email: string;
  entitlement: Entitlement;
};

/**
 * The account behind this request, or the response that says why not: 401
 * for a visitor or a signed-out device, 402 for a plan that is not active, 503
 * when accounts are not switched on. With `allowLapsed`, an account whose plan
 * ended still gets through (so a lapsed buyer can see their plan and reach
 * billing).
 */
export async function requirePostCreator(o: { allowLapsed?: boolean } = {}): Promise<PostCreatorRequest | NextResponse> {
  let entitlement: Entitlement;
  try {
    entitlement = await getEntitlement();
  } catch (error) {
    console.error("Post Creator access check failed:", error instanceof Error ? error.message : "unknown error");
    return apiError("server_error", "Something broke on our side. Try again in a minute.", 500);
  }
  if (entitlement.reason === "unconfigured") return apiError("unconfigured", "Post Creator accounts are not switched on yet.", 503);
  if (entitlement.reason === "signed_out") {
    return apiError("unauthorized", "You were signed out on this device. Open Post Creator again with your email and key.", 401);
  }
  if (!entitlement.email || !entitlement.account) {
    return apiError("unauthorized", "Open Post Creator with the email and key from your receipt.", 401);
  }
  if (!entitlement.entitled && !o.allowLapsed) {
    return apiError("lapsed", "Your plan is not active, so AI writing and your saved profile are off. The free idea machine still works.", 402);
  }
  const client = db.serviceDb();
  if (!client) return apiError("unconfigured", "Post Creator accounts are not switched on yet.", 503);
  return { client, account: entitlement.account, email: entitlement.email, entitlement };
}

export function isResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

/**
 * Signs this browser in as `email` at the account's current epoch. The
 * callers check for a signing secret first; with none this throws rather
 * than set an unsigned cookie.
 */
export function withIdentityCookie<T extends NextResponse>(res: T, email: string, epoch: number): T {
  const secret = postCreatorSecrets()[0];
  if (!secret) throw new Error("Post Creator has no signing secret");
  res.cookies.set(POST_CREATOR_COOKIE, signIdentity(identityFor(email, epoch), secret), postCreatorCookieOptions());
  return res;
}

/** Signs this browser out. Other devices stay signed in. */
export function withClearedCookie<T extends NextResponse>(res: T): T {
  res.cookies.set(POST_CREATOR_COOKIE, "", postCreatorCookieOptions(0));
  return res;
}
