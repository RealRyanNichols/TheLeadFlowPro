// Post Creator AI writing: the rules every AI draft passes before a buyer
// sees it.
//
// The prompt asks the model to stay honest; this file makes sure. Long
// dashes of every kind (and "--") become commas, inline hashtags come out,
// and each sentence goes through postCopyProblems (../copyRules.ts): a
// claim, a number, a phone, or a link survives only when the owner wrote it
// in their facts, note, or profile. A sentence that fails is dropped and
// counted, so the buyer can be
// told how many were removed. A draft that loses more than half its sentences,
// or is left too short to post, is thrown out whole.
//
// Pure. The server runs it on every AI answer; the tests run it on fixtures.

import { plain } from "../../hq/copy";
import { HYPHEN_LIKE_CHARS, LONG_DASH_CHARS, blankPattern, hasLongDash, postCopyProblems, type AllowedFacts } from "../copyRules";
import { platformById, type PlatformId } from "../options";
import type { BrandProfile, DraftView, ParsedWriteRequest } from "../types";

/** A [fill-in] the owner completes before posting (BLANK_SOURCE, the shape the free drafts use). */
const BLANK = blankPattern();

/** A hashtag in running text. It needs a letter, so "#1" stays in and meets the claim rules. */
const INLINE_HASHTAG = /(^|\s)#(?=[A-Za-z0-9_]*[A-Za-z])[A-Za-z0-9_]+/g;

const TAG_BODY = /^[A-Za-z0-9_]{2,40}$/;

const MAX_SHOTS = 5;
const SHOT_MAX_CHARS = 120;

/** Shortest text worth posting. A video caption can be shorter. */
function minChars(platform: PlatformId): number {
  return platform === "video" ? 20 : 40;
}

/** A long dash (LONG_DASH_CHARS, ../copyRules.ts), or two or more hyphens standing in for one ("--", "---"). */
const LONG_DASH_RUN = new RegExp(`[${LONG_DASH_CHARS}]|-{2,}`, "g");
const HYPHEN_LIKE = new RegExp(`[${HYPHEN_LIKE_CHARS}]`, "g");

/**
 * Long dashes out, the way a person would write it. Hyphen look-alikes become
 * a plain hyphen, and so does a figure dash between digits ("903-555-0100")
 * or a minus sign on a number ("-5"). Every other long dash, and "--" with or
 * without spaces, is then handled as one: a number range becomes "3 to 5", a
 * dash that opens or closes a line (a bullet) goes, and any other becomes a
 * comma. A comma left right before other punctuation is dropped. Line breaks
 * stay where they were.
 */
export function normalizeDashes(text: string): string {
  return text
    .replace(HYPHEN_LIKE, "-")
    .replace(/(\d)\u2012(?=\d)/g, "$1-")
    .replace(/\u2212(?=\d)/g, "-")
    .replace(LONG_DASH_RUN, "\u2014")
    .replace(/(\d)[^\S\n]*\u2014+[^\S\n]*(\d)/g, "$1 to $2")
    .replace(/^[^\S\n]*\u2014+[^\S\n]*/gm, "")
    .replace(/[^\S\n]*\u2014+[^\S\n]*$/gm, "")
    .replace(/[^\S\n]*\u2014+[^\S\n]*/g, ", ")
    .replace(/,[^\S\n]*([,.!?])/g, "$1")
    .replace(/[^\S\n]{2,}/g, " ");
}

/** Whether any long dash is left. normalizeDashes leaves none; the draft checks hold it to that. */
export { hasLongDash };

/**
 * What a draft may repeat: the owner's facts, difference, contact detail,
 * sample post, words to use, and note (lowercased), and the owner's own names
 * to mask (business, town, trade in their words, services).
 */
export function allowedFactsFor(profile: BrandProfile, req: Pick<ParsedWriteRequest, "note">): AllowedFacts {
  const text = [profile.facts, profile.difference, profile.ctaDetail, profile.samplePost, profile.wordsToUse, req.note]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
  const mask = [profile.businessName, profile.town, profile.tradeLabel, ...profile.services]
    .map((m) => (typeof m === "string" ? m.trim() : ""))
    .filter((m) => m.length >= 2);
  return { text, mask };
}

function stripInlineHashtags(text: string): string {
  return text.replace(INLINE_HASHTAG, "$1");
}

/** A line split after each ".", "!", or "?" that is followed by a space. */
function sentences(line: string): string[] {
  return line
    .replace(/([.!?])\s+/g, "$1\u0000")
    .split("\u0000")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * `text` at most `max` characters: cut after the last sentence end that fits,
 * else at the last space, and never through the middle of a [blank].
 */
function cutToFit(text: string, max: number): string {
  if (text.length <= max) return text;
  const room = text.slice(0, max);
  let cut = "";
  // A sentence end is judged by the character that really follows it, so
  // "3." cut out of "3.5" is not mistaken for one.
  const ends = [...text.slice(0, max + 1).matchAll(/[.!?](?=\s|$)/g)].filter((m) => (m.index ?? max) < max);
  const lastEnd = ends.length ? (ends[ends.length - 1].index ?? -1) : -1;
  if (lastEnd > 0) cut = room.slice(0, lastEnd + 1);
  else {
    const space = room.search(/\s\S*$/);
    cut = space > 0 ? room.slice(0, space) : room;
  }
  const open = cut.lastIndexOf("[");
  if (open > cut.lastIndexOf("]")) cut = cut.slice(0, open);
  return cut.replace(/[\s,;:-]+$/, "").trim();
}

function blanksIn(text: string): string[] {
  return text.match(BLANK) ?? [];
}

function hasProblems(text: string, allowed: AllowedFacts): boolean {
  return hasLongDash(text) || postCopyProblems(text, allowed).length > 0;
}

/**
 * One line (an alternate first line, a photo idea, a shot) cleaned, with any
 * sentence that fails the rules dropped and counted. The text is null when
 * nothing clean is left.
 */
export function cleanLine(raw: unknown, max: number, allowed: AllowedFacts): { text: string | null; trimmed: number } {
  const flat = stripInlineHashtags(normalizeDashes(plain(raw, 2000).replace(/\s*\n\s*/g, " ")))
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!flat) return { text: null, trimmed: 0 };
  const all = sentences(flat);
  const kept = all.filter((s) => !hasProblems(s, allowed));
  const trimmed = all.length - kept.length;
  const text = cutToFit(kept.join(" "), max);
  if (!text || hasProblems(text, allowed)) return { text: null, trimmed: Math.max(trimmed, 1) };
  return { text, trimmed };
}

/**
 * Hashtags the model offered, as "#Word": letters, digits, and underscores, 2
 * to 40 of them, no repeats. A tag is also checked with its words split
 * apart, so "#BestPlumber" meets the same rule as "#Best Plumber". At most the
 * platform's number are kept (none for Google and Nextdoor).
 */
export function cleanHashtags(raw: unknown, platform: PlatformId, allowed: AllowedFacts): string[] {
  const max = platformById(platform).hashtags;
  if (max === 0 || !Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (out.length >= max) break;
    if (typeof item !== "string") continue;
    const body = item.trim().replace(/^#+/, "");
    if (!TAG_BODY.test(body)) continue;
    const key = body.toLowerCase();
    if (seen.has(key)) continue;
    const words = body
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/([A-Za-z])(\d)/g, "$1 $2")
      .replace(/(\d)([A-Za-z])/g, "$1 $2")
      .replace(/_/g, " ");
    if (hasProblems(`#${body}`, allowed) || hasProblems(`#${words}`, allowed)) continue;
    seen.add(key);
    out.push(`#${body}`);
  }
  return out;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/**
 * One AI draft for one platform, cleaned. `trimmed` counts the sentences that
 * were dropped. The draft is null when it is too short to post, when more than
 * half of it was dropped, or when the whole still fails the rules.
 */
export function cleanDraft(raw: unknown, platform: PlatformId, allowed: AllowedFacts): { draft: DraftView | null; trimmed: number } {
  const r = record(raw) ?? {};
  const meta = platformById(platform);
  const source = stripInlineHashtags(normalizeDashes(plain(r.text, 4000)));

  let total = 0;
  let dropped = 0;
  const lines = source.split("\n").map((line) => {
    const all = sentences(line.replace(/[^\S\n]{2,}/g, " "));
    const kept = all.filter((s) => !hasProblems(s, allowed));
    total += all.length;
    dropped += all.length - kept.length;
    return kept.join(" ");
  });
  const joined = lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const text = cutToFit(joined, meta.cap);

  // A shot list is for video only; any other platform's is ignored.
  const shotList: string[] = [];
  let shotTrimmed = 0;
  if (platform === "video" && Array.isArray(r.shot_list)) {
    for (const shot of r.shot_list.slice(0, MAX_SHOTS)) {
      const bare = typeof shot === "string" ? shot.replace(/^\s*shot\s*\d*\s*[:.)-]\s*/i, "") : shot;
      const line = cleanLine(bare, SHOT_MAX_CHARS, allowed);
      shotTrimmed += line.trimmed;
      if (line.text) shotList.push(`Shot: ${line.text}`);
    }
  }
  const trimmed = dropped + shotTrimmed;

  if (text.length < minChars(platform) || dropped * 2 > total || hasProblems(text, allowed)) {
    return { draft: null, trimmed };
  }
  return {
    draft: {
      platform,
      text,
      hashtags: cleanHashtags(r.hashtags, platform, allowed),
      shotList,
      chars: text.length,
      limit: meta.limit,
      blanks: blanksIn(`${text}\n${shotList.join("\n")}`),
    },
    trimmed,
  };
}
