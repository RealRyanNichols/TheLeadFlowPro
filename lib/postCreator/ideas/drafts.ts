// Post Creator idea engine: a card turned into a free draft for one platform.
//
// A free draft is the card's first line, the angle's body lines with their
// [blanks], and the call to action, laid out the way each platform reads:
// a greeting and a sign-off on Facebook, short paragraphs on Instagram, the
// title first on Google, "Hi neighbors" on Nextdoor, and a caption plus a shot
// list for a short video. Hashtags come only from the town and the trade.
//
// The engine never writes a phone number, a link, an email, a price, or a
// claim. What only the owner knows stays in [brackets] for them to fill in.
// Pure, browser-safe.

import { cleanOwnerText } from "../copyRules";
import { TRADES, platformById, type PlatformId, type TradeId } from "../options";
import { PROFILE_LIMITS } from "../profile";
import type { DraftView } from "../types";
import { angleById } from "./angles";
import type { EngineInput, IdeaCard, Season } from "./types";

const PLACEHOLDER = /\{(topic|Topic|season|Season)\}/g;
const BLANK = /\[[^\]\n]{1,60}\]/g;
const HASHTAG = /^#[A-Za-z0-9]{2,40}$/;

/** Instagram shows about this much of a caption before "more". */
const INSTAGRAM_HOOK_MAX = 125;

export const VIDEO_SHOTS: readonly string[] = [
  "Shot: Say the first line to the camera",
  "Shot: Show [the answer or the fix]",
  "Shot: End on your sign, your truck, or your logo",
];

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * A template with its placeholders filled. One pass, so a topic the owner
 * typed with braces in it is never filled a second time.
 */
export function fill(template: string, vars: { topic: string; season: Season }): string {
  return template.replace(PLACEHOLDER, (_match, name: string) => {
    if (name === "topic") return vars.topic;
    if (name === "Topic") return capitalize(vars.topic);
    if (name === "season") return vars.season;
    return capitalize(vars.season);
  });
}

/** Month 1 to 12. December to February is winter, March to May spring, June to August summer, September to November fall. */
export function seasonForMonth(month: number): Season {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "fall";
  return "winter";
}

/** The season on the owner's own calendar (local time). */
export function seasonOf(now: Date): Season {
  return seasonForMonth(now.getMonth() + 1);
}

/** Every [blank] in the text, in order. */
export function findBlanks(text: string): string[] {
  return text.match(BLANK) ?? [];
}

/** What "Copy post" puts on the clipboard: the text, then hashtags, then the shot list. */
export function draftCopyText(d: DraftView): string {
  const tags = d.hashtags.length ? `\n\n${d.hashtags.join(" ")}` : "";
  const shots = d.shotList.length ? `\n\n${d.shotList.join("\n")}` : "";
  return d.text + tags + shots;
}

/**
 * `text` at most `max` characters long, cut at a word and never through the
 * middle of a [blank]. `mark` ("...") is added after a cut and counts toward
 * the length.
 */
export function cutAtWord(text: string, max: number, mark = ""): string {
  if (text.length <= max) return text;
  const room = Math.max(0, max - mark.length);
  let cut = text.slice(0, room);
  if (!/\s/.test(text.charAt(room))) {
    const space = cut.search(/\s\S*$/);
    if (space > 0) cut = cut.slice(0, space);
  }
  const open = cut.lastIndexOf("[");
  if (open > cut.lastIndexOf("]")) cut = cut.slice(0, open);
  cut = mark ? cut.replace(/[\s,;:.!?-]+$/, "") : cut.replace(/[\s,;:-]+$/, "");
  if (!cut) return text.slice(0, room) + mark;
  return cut + mark;
}

/** "fort worth" as "FortWorth": accents dropped, letters and digits only. */
function pascal(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map(capitalize)
    .join("");
}

function hashtagsFor(platform: PlatformId, trade: TradeId, town: string): string[] {
  const max = platformById(platform).hashtags;
  if (max === 0) return [];
  const tag = pascal(TRADES.find((t) => t.id === trade)?.tag ?? "");
  const place = pascal(town);
  const local = place && tag ? `#${place}${tag}` : "";
  const tips = tag ? `#${tag}Tips` : "";
  const wanted = platform === "facebook" ? [local] : [local, tips];
  return wanted.filter((h) => HASHTAG.test(h)).slice(0, max);
}

/**
 * The first line and the call to action, within the video caption cap. A long
 * first line is cut so the call to action stays whole.
 */
function videoCaption(hook: string, cta: string, cap: number): string {
  const full = `${hook} ${cta}`;
  if (full.length <= cap) return full;
  const room = cap - cta.length - 1;
  if (room >= 20) return `${cutAtWord(hook, room, "...")} ${cta}`;
  return cutAtWord(full, cap);
}

/**
 * A card as a free draft for one platform. `now` picks the season for any
 * seasonal wording in the body.
 */
export function renderDraft(card: IdeaCard, input: EngineInput, platform: PlatformId, now: Date = new Date()): DraftView {
  const meta = platformById(platform);
  const season = seasonOf(now);
  const body = angleById(card.angle).body.map((line) => fill(line, { topic: card.topic, season }));
  const name = cleanOwnerText(input.businessName, PROFILE_LIMITS.businessName);
  const town = cleanOwnerText(input.town, PROFILE_LIMITS.town);
  const hook = card.hook;
  const cta = card.ctaLine;

  let text: string;
  let shotList: string[] = [];
  if (platform === "facebook") {
    const greeting = input.voice === "friendly" ? "Hey everyone. " : "";
    const signature = [name, town].filter(Boolean).join(", ");
    text = `${greeting}${hook}\n\n${body.join("\n")}\n\n${cta}${signature ? `\n\n${signature}` : ""}`;
  } else if (platform === "instagram") {
    text = `${cutAtWord(hook, INSTAGRAM_HOOK_MAX, "...")}\n\n${body.join("\n\n")}\n\n${cta}`;
  } else if (platform === "google") {
    text = `${card.title}.\n\n${body[0] ?? ""}\n\n${cta}`;
  } else if (platform === "nextdoor") {
    text = `Hi neighbors. ${hook}\n\n${body.join("\n")}\n\n${cta}`;
  } else {
    text = videoCaption(hook, cta, meta.cap);
    shotList = [`Shot: ${card.shot}`, ...VIDEO_SHOTS];
  }
  text = cutAtWord(text, meta.cap);

  return {
    platform,
    text,
    hashtags: hashtagsFor(platform, input.trade, town),
    shotList,
    chars: text.length,
    limit: meta.limit,
    blanks: findBlanks(`${text}\n${shotList.join("\n")}`),
  };
}
