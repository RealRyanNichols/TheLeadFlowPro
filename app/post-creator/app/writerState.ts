// The AI writer's state, as a pure reducer so the one rule that protects the
// buyer's allowance can be tested on its own:
//
//   A write whose answer never arrived (a dropped connection, the client
//   timeout, or a gateway's error page in place of the route's answer, all
//   "network" from api.ts) and a write the server says is still running
//   ("busy") keep their request id. The next Try again sends the same id, and
//   the server answers from its ledger instead of writing and counting a
//   second time. Every other failure is final for that id, so a retry gets a
//   new one.
//
// There is no automatic retry. Nothing here touches the network.

import type { ErrorCode, WriteSuccess } from "@/lib/postCreator/types";
import type { ApiResult } from "./api";

export type WriterState =
  | { phase: "idle" }
  | { phase: "writing"; requestId: string }
  | { phase: "done"; result: WriteSuccess }
  | { phase: "failed"; code: ErrorCode | "network"; message: string; retryable: boolean; keepRequestId: string | null };

/**
 * `response` names the request it answers, so a late answer to a request the
 * panel has moved on from is ignored.
 */
export type WriterEvent =
  | { type: "submit"; newId: string }
  | { type: "response"; requestId: string; result: ApiResult<WriteSuccess> }
  | { type: "retry"; newId: string }
  | { type: "reset" };

export const INITIAL_WRITER_STATE: WriterState = { phase: "idle" };

/** Failures whose request may still be running or finished on the server: retry with the same id. */
const SAME_ID: ReadonlySet<ErrorCode | "network"> = new Set<ErrorCode | "network">(["network", "busy"]);

/**
 * Failures where tapping Try again can help. Limits, a switched-off writer,
 * a refusal (change the idea or the note instead), and answers that need the
 * buyer to sign in again are not in the list.
 */
const RETRYABLE: ReadonlySet<ErrorCode | "network"> = new Set<ErrorCode | "network">([
  "network",
  "busy",
  "duplicate",
  "unusable",
  "provider_error",
  "rate_limited",
  "timeout",
  "server_error",
]);

export function isRetryable(code: ErrorCode | "network"): boolean {
  return RETRYABLE.has(code);
}

/** The id the next request should carry: the kept one after a dropped answer, else the fresh one. */
function idFor(s: WriterState, newId: string): string {
  return s.phase === "failed" && s.keepRequestId ? s.keepRequestId : newId;
}

export function writerReducer(s: WriterState, e: WriterEvent): WriterState {
  switch (e.type) {
    case "submit":
      // One write at a time. A submit after a dropped answer is the same write.
      if (s.phase === "writing") return s;
      return { phase: "writing", requestId: idFor(s, e.newId) };
    case "retry":
      if (s.phase !== "failed") return s;
      return { phase: "writing", requestId: idFor(s, e.newId) };
    case "response": {
      if (s.phase !== "writing" || s.requestId !== e.requestId) return s;
      const r = e.result;
      if (r.ok) return { phase: "done", result: r.data };
      return {
        phase: "failed",
        code: r.code,
        message: r.error,
        retryable: isRetryable(r.code),
        keepRequestId: SAME_ID.has(r.code) ? s.requestId : null,
      };
    }
    case "reset":
      return INITIAL_WRITER_STATE;
    default:
      return s;
  }
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** A fresh request id in the version 4 UUID form the write route accepts. */
export function newRequestId(): string {
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  try {
    if (c && typeof c.randomUUID === "function") {
      const id = c.randomUUID().toLowerCase();
      if (UUID_V4.test(id)) return id;
    }
  } catch {
    // randomUUID needs a secure context; fall through.
  }
  const bytes = new Uint8Array(16);
  try {
    if (c && typeof c.getRandomValues === "function") c.getRandomValues(bytes);
    else throw new Error("no crypto");
  } catch {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
