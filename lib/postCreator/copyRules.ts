// Post Creator: the copy rules every post passes before an owner sees it.
//
// copyProblems (lib/hq/copy.ts) is the house floor: no em or en dashes, no
// filler phrases, no promised results; hasLongDash here adds every other long
// dash look-alike and "--". A social post needs more than that, because it
// goes out under the owner's name. postCopyProblems adds the claims a local
// business most often cannot back up (licensed, insured, best, five stars, top
// rated, years in business, free offers, discounts, money back, how many
// customers), numbers (in digits, or spelled out with a unit after them),
// phones, links, and emails. A claim, a number, a phone, or a link passes only
// when the owner wrote it in their own facts, note, or profile
// (`allowed.text`); an email never does (the Settings help says so). The
// owner's own names (business, town, services) are masked first, so "Best
// Roofing" or "Five Star Cleaning" can still name itself.
//
// These rules catch the common claims, not every possible one, which is why
// every draft still says to read it before posting.
//
// Pure and browser-safe. The free idea engine's safety tests and the AI
// writer's runtime filter (lib/postCreator/ai/filter.ts) both run through it.

import { copyProblems, line } from "../hq/copy";

/** What a post may repeat: the owner's own words (lowercased) and names to mask. */
export type AllowedFacts = { text: string; mask: string[] };

export const NO_FACTS: AllowedFacts = { text: "", mask: [] };

/**
 * The one shape of a blank for the owner to fill in: 1 to 60 characters inside
 * square brackets, on one line. Only a span of this shape skips the claim
 * checks. The drafts, the AI filter, and the screen that highlights blanks
 * build their patterns from this same source.
 */
export const BLANK_SOURCE = "\\[[^\\]\\n]{1,60}\\]";

/** A fresh global regex for blanks (see BLANK_SOURCE). */
export function blankPattern(): RegExp {
  return new RegExp(BLANK_SOURCE, "g");
}

/**
 * Every character that reads as a long dash: figure dash, en dash, em dash,
 * horizontal bar, minus sign, two and three em dashes, the vertical em and en
 * dash forms, and the small em dash. copyProblems (the house floor) only knows
 * the em and en dash; these rules know them all.
 */
export const LONG_DASH_CHARS = "\u2012-\u2015\u2212\u2E3A\u2E3B\uFE31\uFE32\uFE58";
const LONG_DASH = new RegExp(`[${LONG_DASH_CHARS}]`);
/** Characters that read as a plain hyphen: hyphen, non-breaking hyphen, small and full width hyphen-minus. */
export const HYPHEN_LIKE_CHARS = "\u2010\u2011\uFE63\uFF0D";
const ANY_DASH = new RegExp(`[${LONG_DASH_CHARS}${HYPHEN_LIKE_CHARS}]`, "g");

/** Whether any long dash is in `text`, counting two or more hyphens standing in for one ("--"). */
export function hasLongDash(text: string): boolean {
  return LONG_DASH.test(text) || /-{2,}/.test(text);
}

/** Owner text with every dash look-alike, and every run of hyphens, as one plain hyphen. */
export function hyphenateDashes(text: string): string {
  return text.replace(ANY_DASH, "-").replace(/-{2,}/g, "-");
}

/** One line the owner typed, clamped, with any long dash turned into a hyphen. */
export function cleanOwnerText(v: unknown, max: number): string {
  return hyphenateDashes(line(v, max));
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Curly quotes read as straight ones, so "Mike\u2019s" and "Mike's" compare equal. */
function straightQuotes(s: string): string {
  return s.replace(/[\u2018\u2019\u02bc]/g, "'");
}

/**
 * Replace each owner name (2 characters or more) with "the business", ignoring
 * case and the curl of an apostrophe. A term only matches as a whole word or
 * phrase, with an optional plural or possessive ending, so a short service
 * like "AC" never hides part of another word. Longest terms go first, so a
 * full business name is masked before one of its words is.
 */
export function maskOwnerNames(text: string, mask: string[]): string {
  const terms = (mask ?? [])
    .map((m) => (typeof m === "string" ? straightQuotes(m).replace(/\s+/g, " ").trim() : ""))
    .filter((m) => m.length >= 2)
    .sort((a, b) => b.length - a.length);
  let out = straightQuotes(text);
  for (const term of terms) {
    const body = term.split(" ").map(escapeRegExp).join("\\s+");
    const re = new RegExp(`(^|[^a-z0-9])${body}(?:'s|es|s)?(?![a-z0-9])`, "gi");
    out = out.replace(re, (_match, lead: string) => `${lead}the business`);
  }
  return out;
}

// Always a problem, whatever the owner wrote.
const ALWAYS: readonly { re: RegExp; problem: string }[] = [
  { re: /^\s*are you struggling/im, problem: 'opens with "Are you struggling"' },
  { re: /\b(roi|roas)\b/i, problem: "mentions ROI or ROAS" },
  { re: /%\s*increase/i, problem: "promises a percent increase" },
  { re: /[^\s@]+@[^\s@]+\.[a-z]{2,}/i, problem: "contains an email address" },
];

// Everyday phrases that carry a claim word without making a claim: advice
// ("the best way to", "best of all") and safety steps ("call the gas company
// emergency line"). They are taken out before the claim check only.
const PLAIN_PHRASES =
  /\b(?:best of all|(?:the |a )?best (?:way|ways|time|times|thing to do)|do (?:your|their|our|its|my) best|works? best|at best|best practices?|in (?:an|case of(?: an)?) emergency|emergency (?:lines?|numbers?|shut[- ]?offs?|shut[- ]?off valves?|rooms?|kits?|funds?|exits?|contacts?|services? (?:line|number)))\b/gi;

// Claims and pressure a post may carry only when the owner wrote the same
// words. "#1" sits outside the word boundaries: "#" is not a word character,
// so "\b#1" would never match after a space. "free" counts only as an offer:
// not "hands-free", not "feel free to", not "free up space".
const CONDITIONAL = new RegExp(
  [
    "\\b(?:licensed|insured|bonded|certified|warrant(?:y|ies)|same[- ]day|24\\/7|emergency|family[- ]owned|locally owned|veteran[- ]owned",
    "years? of experience|years? in business|years? serving|since (?:19|20)\\d\\d|decades|generations",
    "(?:for|over|nearly|almost|about) (?:a|one|two|three|four|five|six) decades?",
    "best|number one|number 1|no\\. ?1|cheapest|lowest|fastest|five[- ]stars?|5[- ]stars?|(?:top|highest|best)[- ]rated",
    "award[- ]winning|awards?|voted|testimonials?|premier|unbeatable|unmatched|second to none|most trusted|trusted by",
    "(?:industry|market)[- ]leading|leading (?:provider|company|contractor|expert|business|name)s?",
    "hundreds|thousands|dozens|millions",
    "free estimates?|half[- ]off|half price|discount(?:s|ed)?|coupons?|promo codes?|rebates?|on sale|specials|special (?:offer|price|pricing|deal|rate)s?",
    "bogo|buy one,? get one|money[- ]back|promise[sd]?|pledge",
    "said (?:we|our|us|they)|(?:customers?|clients?|neighbors?|homeowners?|reviews?) (?:say|said|rave|love)",
    "act now|limited time|today only|hurry|don['\\u2019]?t miss)\\b",
    "(?<![-\\w])free\\b(?!\\s+(?:to|up|time)\\b)",
    "#1\\b",
  ].join("|"),
  "gi",
);

// A claim wording family: a fact in one wording backs a draft in another.
const YEARS_FAMILY = ["year of experience", "years of experience", "year in business", "years in business", "years serving", "year serving"];

// What makes a small number a claim instead of a count: a unit after it.
const UNITS =
  "years?|yrs?|decades?|generations?|stars?|reviews?|ratings?|points?|awards?|customers?|clients?|homeowners?|households?|families|family|neighbors?|people|members?|jobs?|projects?|installs?|installations?|repairs?|calls?|visits?|homes?|trucks?|vans?|vehicles?|techs?|technicians?|crews?|teams?|employees?|staff|locations?|offices?|branches?|stores?|shops?|towns?|cities|counties|hours?|hrs?|minutes?|mins?|days?|weeks?|months?|times?|percent|dollars?|bucks|cents?";
const UNIT_AFTER = new RegExp(`^\\s*(?:(?:${UNITS})\\b|out of\\b|x\\b|a\\.?m\\b\\.?|p\\.?m\\b\\.?|o'clock\\b|(?:to|until|till|through|thru|-)\\s*\\d)`, "i");
// What makes a small number a claim from the words before it: "rated 5", "#1", "No. 1".
const CLAIM_BEFORE = /(?:\brated|\brating|\bscored?|\branked|\brank|\bvoted|\bno\.|#)\s*$/i;

const NUMBER = /\$?\d[\d,.:%\/]*/g;
const SPELLED_WORD =
  "two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|dozen|million";
// A number written out ("fifteen years", "ninety nine dollars") with a unit
// after it is the same claim as the digits. "One" alone is left out: "one
// day" and "one time" are how people talk.
const SPELLED = new RegExp(
  `\\b(?:(?:one|a|${SPELLED_WORD})[\\s-]+(?:and\\s+)?)*(?:${SPELLED_WORD})(?:[\\s-]+(?:and\\s+)?(?:one|${SPELLED_WORD}))*\\s+(?:${UNITS})\\b`,
  "gi",
);
const PHONE = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
const WEB = /\bhttps?:\/\/\S+|\bwww\.\S+|\b[a-z0-9-]+\.(com|net|org|biz|info|co|us|io)\b\S*/gi;
const EMAIL = /[a-z0-9._%+'-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi;
// A shot list line may open with its timing ("0 to 3 seconds:"). That is
// direction for the owner filming it, not a claim.
const SHOT_TIMING = /^(\s*(?:shot\s*:?\s*)?)\d{1,3}\s*(?:to|-)\s*\d{1,3}\s*(?:seconds?|secs?|s)\b\s*:?/gim;

/** "same-day" and "same day" compare equal. */
function spaced(s: string): string {
  return s.toLowerCase().replace(/[-\s]+/g, " ");
}

/** The last ten digits, so "+1 (903) 555-0100" and "903.555.0100" compare equal. */
function phoneDigits(s: string): string {
  return s.replace(/\D/g, "").slice(-10);
}

function trimTrailing(s: string): string {
  return s.replace(/[.,:;!?)'"\u2019\/]+$/, "");
}

/** A link without its scheme or "www.", so "https://www.site.com/book" and "site.com/book" compare equal. */
function bareLink(s: string): string {
  return s.toLowerCase().replace(/\bhttps?:\/\//g, "").replace(/\bwww\./g, "");
}

/**
 * Every reason `text` could not go out under the owner's name, or [] when it
 * is clean. A blank for the owner to fill in (BLANK_SOURCE: up to 60
 * characters in square brackets) skips the claim checks; only the house rules
 * apply there. A longer bracketed span is checked like any other text.
 */
export function postCopyProblems(text: string, allowed: AllowedFacts = NO_FACTS): string[] {
  const masked = maskOwnerNames(text, allowed.mask);
  const problems = copyProblems(masked);
  // The em and en dash are already in copyProblems; every other look-alike and "--" is caught here.
  if (hasLongDash(masked.replace(/[\u2013\u2014]/g, " "))) problems.push("contains a long dash");
  const body = masked.replace(blankPattern(), " ").replace(SHOT_TIMING, "$1 ");

  const facts = straightQuotes(allowed.text ?? "").toLowerCase();
  const factsSpaced = spaced(facts);
  const factLinks = bareLink(facts);

  for (const rule of ALWAYS) if (rule.re.test(body)) problems.push(rule.problem);

  const claimBody = body.replace(PLAIN_PHRASES, " ");
  const yearsBacked = YEARS_FAMILY.some((w) => factsSpaced.includes(w));
  for (const m of claimBody.matchAll(CONDITIONAL)) {
    const said = spaced(m[0]);
    if (factsSpaced.includes(said)) continue;
    if (yearsBacked && YEARS_FAMILY.includes(said)) continue;
    problems.push(`claim "${m[0]}" is not in the owner's facts`);
  }

  for (const m of body.matchAll(SPELLED)) {
    if (factsSpaced.includes(spaced(m[0]))) continue;
    problems.push(`number "${m[0]}" is not in the owner's facts`);
  }

  // Phones, links, and emails are checked whole below, so their digits are
  // taken out of both sides before numbers are compared: the owner's phone
  // never lets "555" through as a number, and an allowed phone is never
  // flagged digit by digit.
  const contact = (s: string) => s.replace(EMAIL, " ").replace(WEB, " ").replace(PHONE, " ");
  const factsNumbers = contact(facts);
  const runs = new Set<string>(factsNumbers.match(/\d+/g) ?? []);
  for (const n of factsNumbers.match(NUMBER) ?? []) runs.add(n.replace(/\D/g, ""));
  const factPhones = new Set<string>((facts.match(PHONE) ?? []).map(phoneDigits));

  const numberBody = contact(body);
  for (const m of numberBody.matchAll(NUMBER)) {
    const value = m[0].replace(/[.,:\/]+$/, "");
    const digits = value.replace(/\D/g, "");
    if (!digits || runs.has(digits)) continue;
    const at = m.index ?? 0;
    const after = numberBody.slice(at + value.length);
    const before = numberBody.slice(0, at);
    const small = /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 10;
    if (small && !after.startsWith("+") && !UNIT_AFTER.test(after) && !CLAIM_BEFORE.test(before)) continue;
    problems.push(`number "${value}" is not in the owner's facts`);
  }

  for (const m of body.matchAll(PHONE)) {
    if (facts.includes(m[0].toLowerCase()) || factPhones.has(phoneDigits(m[0]))) continue;
    problems.push(`phone "${m[0].trim()}" is not in the owner's facts`);
  }

  for (const m of body.replace(EMAIL, " ").matchAll(WEB)) {
    const link = trimTrailing(bareLink(m[0]));
    if (link && factLinks.includes(link)) continue;
    problems.push(`link "${m[0]}" is not in the owner's facts`);
  }

  return problems;
}
