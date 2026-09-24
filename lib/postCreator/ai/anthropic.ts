import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { AI_TIMEOUT_MS } from "./config";
import type { CallModel, ModelResult, ProviderFailure } from "./model";

// Post Creator AI writing: the only place the Anthropic SDK is loaded at run
// time. Everything else reaches the model through CallModel (./model.ts).
//
// The client is built with every setting pinned, because the SDK otherwise
// reads ANTHROPIC_AUTH_TOKEN and ANTHROPIC_BASE_URL from the environment: the
// dedicated Post Creator key, no bearer token, the public API host, a 100
// second timeout, and no retries (a retry would be a second bill the
// reservation did not cover). The key is read when the call is made and the
// client is kept per key, so rotating the key needs no redeploy.

const clients = new Map<string, Anthropic>();

function clientFor(apiKey: string): Anthropic {
  const cached = clients.get(apiKey);
  if (cached) return cached;
  const client = new Anthropic({ apiKey, authToken: null, baseURL: "https://api.anthropic.com", timeout: AI_TIMEOUT_MS, maxRetries: 0 });
  // One key is in use at a time; drop a rotated one instead of keeping it.
  clients.clear();
  clients.set(apiKey, client);
  return client;
}

/**
 * Error codes that mean the connection never opened, so not one byte of the
 * request reached the API: the host name did not resolve, the connection was
 * refused or had no route, or the TLS certificate was rejected (the request
 * is written only after the handshake). A reset, a broken pipe, or a socket
 * closed mid-request is not here: the request may have been read and billed.
 */
const NEVER_SENT_CODES = new Set([
  "ENOTFOUND",
  "EAI_AGAIN",
  "EAI_FAIL",
  "EAI_NONAME",
  "EAI_NODATA",
  "ECONNREFUSED",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ENETDOWN",
  "EHOSTDOWN",
  "EADDRNOTAVAIL",
  "UND_ERR_CONNECT_TIMEOUT",
  "CERT_HAS_EXPIRED",
  "CERT_NOT_YET_VALID",
  "CERT_REVOKED",
  "CERT_UNTRUSTED",
  "CERT_REJECTED",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "UNABLE_TO_GET_ISSUER_CERT",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "ERR_TLS_CERT_ALTNAME_INVALID",
]);

/**
 * Whether a connection error is known to have failed before anything was
 * sent. The SDK wraps fetch's "fetch failed" TypeError, whose cause (or an
 * AggregateError's errors, one per address tried) carries the system code.
 * True only when at least one code is found and every code found is in
 * NEVER_SENT_CODES; anything unrecognized may have been billed.
 */
export function neverSent(error: unknown): boolean {
  const codes: string[] = [];
  const seen = new Set<unknown>();
  const visit = (e: unknown, depth: number): void => {
    if (!e || typeof e !== "object" || depth > 6 || seen.has(e)) return;
    seen.add(e);
    const { code, errors, cause } = e as { code?: unknown; errors?: unknown; cause?: unknown };
    if (typeof code === "string") codes.push(code);
    if (Array.isArray(errors)) for (const inner of errors) visit(inner, depth + 1);
    visit(cause, depth + 1);
  };
  visit(error, 0);
  return codes.length > 0 && codes.every((c) => NEVER_SENT_CODES.has(c));
}

/**
 * What a thrown SDK error means for the writer, checked most specific first.
 * A timeout or a dropped connection may still have been billed; a connection
 * that never opened, or a rejection with a status, was not.
 */
export function providerFailure(error: unknown): ProviderFailure {
  if (error instanceof Anthropic.APIConnectionTimeoutError) return { kind: "timeout", status: null, billedUnknown: true };
  if (error instanceof Anthropic.APIConnectionError) return { kind: "connection", status: null, billedUnknown: !neverSent(error) };
  if (error instanceof Anthropic.RateLimitError || (error instanceof Anthropic.APIError && error.status === 529)) {
    return { kind: "rate_limited", status: typeof error.status === "number" ? error.status : null, billedUnknown: false };
  }
  if (error instanceof Anthropic.APIError) {
    const status = typeof error.status === "number" ? error.status : null;
    console.error("Post Creator provider rejected the request:", status);
    return { kind: "api", status, billedUnknown: false };
  }
  return { kind: "unknown", status: null, billedUnknown: true };
}

/** One call to the model. Always resolves: the message, or the failure sorted by providerFailure. */
export const callAnthropic: CallModel = async (params: MessageCreateParamsNonStreaming): Promise<ModelResult> => {
  const apiKey = process.env.POST_CREATOR_ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return { kind: "error", error: { kind: "config", status: null, billedUnknown: false } };
  try {
    const message = await clientFor(apiKey).beta.messages.create(params);
    return { kind: "message", message };
  } catch (error) {
    return { kind: "error", error: providerFailure(error) };
  }
};
