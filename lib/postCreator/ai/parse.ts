// Post Creator AI writing: reading what comes in and what comes back.
//
// validateWriteRequest checks the buyer's request before anything is
// reserved or sent. classifyMessage sorts the model's answer by its stop
// reason before a word of it is read: a refusal is never parsed, and neither
// is an answer cut off at max_tokens. parseWriteOutput turns a finished answer
// into drafts, running every line through ./filter.ts.
//
// Pure.

import { cleanOwnerText, type AllowedFacts } from "../copyRules";
import { isAngleId, isPlatformId, type PlatformId } from "../options";
import { POST_CREATOR } from "../product";
import type { DraftView, ParsedWriteRequest } from "../types";
import { cleanDraft, cleanLine } from "./filter";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TITLE_MAX = 120;
const LINE_MAX = 200;
/** Never cut before measuring: longer than any body the route accepts. */
const UNCLAMPED = 100_000;

const BAD_REQUEST = "Something in that request was off. Reload the page and try again.";

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** An optional line: missing is "", anything but a string is null (bad). */
function optionalLine(v: unknown): string | null {
  if (v === undefined || v === null) return "";
  return typeof v === "string" ? cleanOwnerText(v, UNCLAMPED) : null;
}

export type WriteRequestCheck = { ok: true; value: ParsedWriteRequest } | { ok: false; error: string; field?: string };

/** The body of POST /api/post-creator/write, checked field by field. */
export function validateWriteRequest(body: unknown): WriteRequestCheck {
  const b = record(body);
  if (!b) return { ok: false, error: BAD_REQUEST };

  if (typeof b.requestId !== "string" || !UUID_V4.test(b.requestId)) return { ok: false, error: BAD_REQUEST, field: "requestId" };
  const requestId = b.requestId.toLowerCase();

  const idea = record(b.idea);
  if (!idea) return { ok: false, error: BAD_REQUEST, field: "idea" };
  const title = typeof idea.title === "string" ? cleanOwnerText(idea.title, UNCLAMPED) : "";
  if (!title || title.length > TITLE_MAX) return { ok: false, error: BAD_REQUEST, field: "idea" };
  if (idea.angle !== undefined && idea.angle !== null && !isAngleId(idea.angle)) return { ok: false, error: BAD_REQUEST, field: "idea" };
  const angle = isAngleId(idea.angle) ? idea.angle : null;
  const hook = optionalLine(idea.hook);
  const shot = optionalLine(idea.shot);
  if (hook === null || shot === null || hook.length > LINE_MAX || shot.length > LINE_MAX) {
    return { ok: false, error: BAD_REQUEST, field: "idea" };
  }

  const rawPlatforms = b.platforms;
  if (!Array.isArray(rawPlatforms) || rawPlatforms.length < 1 || rawPlatforms.length > POST_CREATOR.ai.maxPlatformsPerWrite) {
    return { ok: false, error: BAD_REQUEST, field: "platforms" };
  }
  const platforms: PlatformId[] = [];
  for (const p of rawPlatforms) {
    if (!isPlatformId(p) || platforms.includes(p)) return { ok: false, error: BAD_REQUEST, field: "platforms" };
    platforms.push(p);
  }

  let note = "";
  if (b.note !== undefined && b.note !== null) {
    if (typeof b.note !== "string") return { ok: false, error: BAD_REQUEST, field: "note" };
    if (b.note.length > POST_CREATOR.ai.noteMaxChars) {
      return { ok: false, error: `Keep your note under ${POST_CREATOR.ai.noteMaxChars} characters.`, field: "note" };
    }
    note = cleanOwnerText(b.note, POST_CREATOR.ai.noteMaxChars);
  }

  return { ok: true, value: { requestId, idea: { title, angle, hook, shot }, platforms, note } };
}

/** What kind of answer came back, decided from the stop reason first. */
export type Outcome =
  | { kind: "refused"; category: string | null }
  | { kind: "max_tokens" }
  | { kind: "empty" }
  | { kind: "ok"; text: string }
  | { kind: "other_stop"; stopReason: string | null };

/** A model message as far as classifyMessage reads it. The SDK's BetaMessage fits it. */
export type MessageLike = {
  stop_reason: string | null;
  stop_details?: { category?: string | null } | null;
  content: readonly { type: string; text?: unknown }[];
};

/**
 * Sorts an answer by stop reason. A refusal returns before `content` is
 * touched; with fallbacks on, a refusal on the final message means every
 * model in the chain declined. A finished answer is the text after the last
 * fallback marker (anything before it came from a model that declined),
 * with thinking and other blocks ignored.
 */
export function classifyMessage(msg: MessageLike): Outcome {
  if (msg.stop_reason === "refusal") return { kind: "refused", category: msg.stop_details?.category ?? null };
  if (msg.stop_reason === "max_tokens") return { kind: "max_tokens" };
  if (msg.stop_reason !== "end_turn") return { kind: "other_stop", stopReason: msg.stop_reason ?? null };
  const blocks = Array.isArray(msg.content) ? msg.content : [];
  let start = 0;
  blocks.forEach((block, i) => {
    if (block?.type === "fallback") start = i + 1;
  });
  const text = blocks
    .slice(start)
    .map((block) => (block?.type === "text" && typeof block.text === "string" ? block.text : ""))
    .join("");
  return text.trim() ? { kind: "ok", text } : { kind: "empty" };
}

export type WriteOutput = { ok: true; drafts: DraftView[]; altHooks: string[]; photoIdea: string; trimmed: number } | { ok: false };

/**
 * The drafts in a finished answer: the requested platforms only, in the
 * requested order, the first draft for each, every one cleaned. Up to two
 * alternate first lines and one photo idea, cleaned the same way. Not ok when
 * the JSON is broken or no draft survives.
 */
export function parseWriteOutput(text: string, req: Pick<ParsedWriteRequest, "platforms">, allowed: AllowedFacts): WriteOutput {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false };
  }
  const out = record(data);
  if (!out) return { ok: false };

  const raw = Array.isArray(out.drafts) ? out.drafts : [];
  const drafts: DraftView[] = [];
  let trimmed = 0;
  for (const platform of req.platforms) {
    const found = raw.find((d) => record(d)?.platform === platform);
    if (found === undefined) continue;
    const cleaned = cleanDraft(found, platform, allowed);
    trimmed += cleaned.trimmed;
    if (cleaned.draft) drafts.push(cleaned.draft);
  }
  if (drafts.length === 0) return { ok: false };

  const altHooks: string[] = [];
  for (const hook of (Array.isArray(out.alt_hooks) ? out.alt_hooks : []).slice(0, 2)) {
    const cleaned = cleanLine(hook, LINE_MAX, allowed);
    trimmed += cleaned.trimmed;
    if (cleaned.text) altHooks.push(cleaned.text);
  }
  const photo = cleanLine(out.photo_idea, LINE_MAX, allowed);
  trimmed += photo.trimmed;

  return { ok: true, drafts, altHooks, photoIdea: photo.text ?? "", trimmed };
}
