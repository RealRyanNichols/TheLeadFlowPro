// The buyer app's calls to /api/post-creator/*, and the few checks the
// browser makes before it sends anything.
//
// Every call is JSON over same-origin fetch, and every answer comes back as
// an ApiResult: the data, or the route's own error code and message (the
// words the server wrote), or "network" when no answer arrived at all. A call
// never throws, so a screen can always show something.
//
// No server-only imports: this runs in the browser. The signed cookie rides
// along with credentials "same-origin"; nothing here reads or stores it.

import type {
  Allowance,
  BillingOk,
  BrandProfile,
  ErrorCode,
  ProfileSaved,
  RestoreOk,
  SessionView,
  WriteRequestBody,
  WriteSuccess,
} from "@/lib/postCreator/types";
import { GENERIC_ERROR, NETWORK_ERROR, OFFLINE_ERROR } from "./copy";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; code: ErrorCode | "network"; error: string; field?: string; allowance?: Allowance };

export const API_PATHS = {
  session: "/api/post-creator/session",
  profile: "/api/post-creator/profile",
  write: "/api/post-creator/write",
  billing: "/api/post-creator/billing",
  restore: "/api/post-creator/restore",
} as const;

/**
 * How long the browser waits for a write. The server gives the model 100
 * seconds inside a 120 second function, so an answer after this is not
 * coming; the write is treated as a dropped connection and its retry reuses
 * the request id.
 */
export const WRITE_TIMEOUT_MS = 115_000;

// Every code a route can send, so an unknown one is never shown as if it were real.
const ERROR_CODES: Record<ErrorCode, true> = {
  bad_request: true,
  too_large: true,
  forbidden: true,
  unauthorized: true,
  lapsed: true,
  unconfigured: true,
  not_found: true,
  key_mismatch: true,
  too_many_tries: true,
  send_failed: true,
  billing_unavailable: true,
  nothing_to_manage: true,
  profile_needed: true,
  ai_off: true,
  spend_cap: true,
  account_cost_limit: true,
  daily_limit: true,
  monthly_limit: true,
  attempt_limit: true,
  busy: true,
  already_delivered: true,
  duplicate: true,
  refused: true,
  unusable: true,
  provider_error: true,
  rate_limited: true,
  timeout: true,
  server_error: true,
};

function isErrorCode(x: unknown): x is ErrorCode {
  return typeof x === "string" && Object.prototype.hasOwnProperty.call(ERROR_CODES, x);
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return Boolean(x) && typeof x === "object" && !Array.isArray(x);
}

function isAllowance(x: unknown): x is Allowance {
  return isRecord(x) && typeof x.leftThisMonth === "number" && typeof x.perMonth === "number" && typeof x.resetsMonthOn === "string";
}

type CallOptions = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  /** What to say when no answer arrived. */
  offline: string;
  /** Extra check on a 2xx body; a body that fails it is treated as a server error. */
  valid?: (data: Record<string, unknown>) => boolean;
};

async function call<T>(path: string, o: CallOptions): Promise<ApiResult<T>> {
  let r: Response;
  try {
    r = await fetch(path, {
      method: o.method,
      headers: o.body === undefined ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" },
      body: o.body === undefined ? undefined : JSON.stringify(o.body),
      credentials: "same-origin",
      cache: "no-store",
      signal: o.signal,
    });
  } catch {
    return { ok: false, status: 0, code: "network", error: o.offline };
  }
  let data: unknown = null;
  try {
    data = await r.json();
  } catch {
    // A proxy error page or a cut-off body: handled below as a server error.
  }
  if (r.ok && isRecord(data) && (!o.valid || o.valid(data))) return { ok: true, data: data as T };
  const body = isRecord(data) ? data : {};
  const failure: ApiResult<T> = {
    ok: false,
    status: r.status,
    code: isErrorCode(body.code) ? body.code : "server_error",
    error: typeof body.error === "string" && body.error.trim() ? body.error : GENERIC_ERROR,
  };
  if (typeof body.field === "string") failure.field = body.field;
  if (isAllowance(body.allowance)) failure.allowance = body.allowance;
  return failure;
}

/** The whole app state: plan, profile, allowance, and whether AI writing is on. */
export function fetchSession(): Promise<ApiResult<SessionView>> {
  return call<SessionView>(API_PATHS.session, {
    method: "GET",
    offline: OFFLINE_ERROR,
    valid: (d) => isRecord(d.account) && isRecord(d.profile),
  });
}

/** Replace the saved business profile. A bad field comes back with `field` set. */
export function saveProfile(p: BrandProfile): Promise<ApiResult<ProfileSaved>> {
  return call<ProfileSaved>(API_PATHS.profile, {
    method: "PUT",
    body: { profile: p },
    offline: OFFLINE_ERROR,
    valid: (d) => d.ok === true && isRecord(d.profile),
  });
}

/**
 * One AI write. Sends exactly the WriteRequestBody fields, nothing else, and
 * gives up after WRITE_TIMEOUT_MS (or when `signal` aborts) with a "network"
 * result.
 */
export async function write(body: WriteRequestBody, signal?: AbortSignal): Promise<ApiResult<WriteSuccess>> {
  const payload: WriteRequestBody = {
    requestId: body.requestId,
    idea: { title: body.idea.title, angle: body.idea.angle, hook: body.idea.hook, shot: body.idea.shot },
    platforms: [...body.platforms],
  };
  if (typeof body.note === "string") payload.note = body.note;

  const controller = new AbortController();
  const stop = () => controller.abort();
  const timer = setTimeout(stop, WRITE_TIMEOUT_MS);
  if (signal) {
    if (signal.aborted) stop();
    else signal.addEventListener("abort", stop);
  }
  try {
    return await call<WriteSuccess>(API_PATHS.write, {
      method: "POST",
      body: payload,
      signal: controller.signal,
      offline: NETWORK_ERROR,
      valid: (d) => d.ok === true && Array.isArray(d.drafts),
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", stop);
  }
}

/** A Stripe billing portal link for a monthly plan. */
export function openBilling(): Promise<ApiResult<BillingOk>> {
  return call<BillingOk>(API_PATHS.billing, {
    method: "POST",
    body: {},
    offline: OFFLINE_ERROR,
    valid: (d) => typeof d.url === "string" && d.url.startsWith("https://"),
  });
}

/** Sign this device out. Other devices stay signed in. */
export function signOut(): Promise<ApiResult<{ ok: true }>> {
  return call<{ ok: true }>(API_PATHS.session, { method: "DELETE", offline: OFFLINE_ERROR });
}

/** With a key, sign this device in. With only an email, ask for the key to be emailed again. */
export function restore(email: string, key?: string): Promise<ApiResult<RestoreOk>> {
  return call<RestoreOk>(API_PATHS.restore, {
    method: "POST",
    body: key === undefined ? { email } : { email, key },
    offline: OFFLINE_ERROR,
    valid: (d) => d.ok === true,
  });
}

/* --------------------------- checks before sending --------------------------- */

/** The same shape the restore route accepts (lib/proAccess.ts isPlausibleEmail), after trimming and lowercasing. */
export function looksLikeEmail(raw: string): boolean {
  const email = raw.trim().toLowerCase();
  return email.length >= 3 && email.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * A key the restore route can read: sixteen letters and digits after an
 * optional LFP, with any spacing or dashes (lib/proAccess.ts
 * normalizeLicenseKey). Whether it matches the email is the server's call.
 */
export function looksLikeKey(raw: string): boolean {
  const compact = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = compact.startsWith("LFP") ? compact.slice(3) : compact;
  return body.length === 16;
}

/**
 * Take the email and key out of the address bar once the form has them, so
 * the key does not sit in the browser history or a screenshot.
 */
export function forgetKeyInUrl(): void {
  try {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("key") && !url.searchParams.has("email")) return;
    url.searchParams.delete("key");
    url.searchParams.delete("email");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // The address bar keeps the key; nothing else depends on this.
  }
}
