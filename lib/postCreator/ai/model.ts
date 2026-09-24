// Post Creator AI writing: the one seam between the writer and the model.
//
// The writer never imports the SDK. It gets a CallModel, which always
// resolves: either the message, or a failure already sorted into what the
// writer needs to know (was it billed? should the buyer try again?). The real
// CallModel lives in ./anthropic.ts, the only file that loads the SDK at run
// time; the tests pass fakes. The imports below are types only.

import type { BetaMessage, MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/beta/messages/messages";

/**
 * Why a call produced no message. `billedUnknown` is true when the request may
 * have run and been billed (a timeout or a dropped connection), so the
 * reservation is charged in full.
 */
export type ProviderFailure = {
  kind: "timeout" | "connection" | "rate_limited" | "api" | "config" | "unknown";
  status: number | null;
  billedUnknown: boolean;
};

export type ModelResult = { kind: "message"; message: BetaMessage } | { kind: "error"; error: ProviderFailure };

export type CallModel = (p: MessageCreateParamsNonStreaming) => Promise<ModelResult>;
