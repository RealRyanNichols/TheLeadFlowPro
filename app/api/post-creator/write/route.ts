import { createHash } from "node:crypto";
import { aiWritingStatus } from "@/lib/postCreator/ai/config";
import { callAnthropic } from "@/lib/postCreator/ai/anthropic";
import { WRITE_ERROR_STATUS, writeErrorMessage } from "@/lib/postCreator/ai/messages";
import { validateWriteRequest } from "@/lib/postCreator/ai/parse";
import { runWrite } from "@/lib/postCreator/ai/writer";
import * as db from "@/lib/postCreator/db";
import { profileIsReady } from "@/lib/postCreator/profile";
import { BodyError, apiError, isResponse, json, readBody, requirePostCreator, sameOrigin } from "@/lib/postCreator/server";
import type { ErrorCode, PostCreatorPlan } from "@/lib/postCreator/types";

// AI writing: one idea, written in the buyer's voice for up to three
// platforms. Checked in order: the request came from this site, the buyer is
// signed in and entitled, AI writing is switched on (so the SDK is never
// touched while it is off), the body is small and well formed, and the
// profile has what the writer needs. The writer then reserves the cost,
// calls the model once, and settles. Nothing is posted anywhere; the drafts
// come back to the buyer's screen and are not stored on the server.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The model call times out at 100 seconds; this leaves room to settle.
export const maxDuration = 120;

/** Largest body this route reads. A full request with a 300 character note is well under it. */
const MAX_BODY_BYTES = 8000;

function fail(code: ErrorCode, plan: PostCreatorPlan, field?: string) {
  return apiError(code, writeErrorMessage(code, { allowance: null, plan }), WRITE_ERROR_STATUS[code], field ? { field } : {});
}

/** What metadata.user_id carries: a hash, so Anthropic can spot abuse without ever seeing the email. */
function userHashFor(email: string): string {
  return createHash("sha256").update(`post-creator:${email}`, "utf8").digest("hex").slice(0, 32);
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("forbidden", "monthly");
  const pc = await requirePostCreator();
  if (isResponse(pc)) return pc;
  const plan = pc.account.plan;

  const ai = aiWritingStatus(process.env);
  if (!ai.on) return fail("ai_off", plan);

  let body: Record<string, unknown>;
  try {
    body = await readBody(request, MAX_BODY_BYTES);
  } catch (error) {
    return fail(error instanceof BodyError && error.status === 413 ? "too_large" : "bad_request", plan);
  }
  const checked = validateWriteRequest(body);
  if (!checked.ok) return apiError("bad_request", checked.error, WRITE_ERROR_STATUS.bad_request, checked.field ? { field: checked.field } : {});

  const profile = pc.account.profile;
  if (!profileIsReady(profile)) return fail("profile_needed", plan);

  const client = pc.client;
  const email = pc.email;
  const result = await runWrite(
    { email, userHash: userHashFor(email), plan, profile, request: checked.value, ai, now: new Date() },
    {
      reserve: (i) => db.reserveGeneration(client, i),
      settle: (i) => db.settleGeneration(client, i),
      usage: () => db.usageCounts(client, email),
      callModel: callAnthropic,
      log: (message) => console.error(message),
    },
  );
  return json(result.body, result.status);
}
