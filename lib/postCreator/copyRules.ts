// Post Creator: the copy rules every post passes before an owner sees it.
//
// copyProblems (lib/hq/copy.ts) is the house floor: no long dashes, no filler
// phrases, no promised results. A social post needs more than that, because it
// goes out under the owner's name. postCopyProblems adds the claims a local
// business most often cannot back up (licensed, insured, best, five star,
// years in business), numbers, phones, links, and emails. A claim, a number,
// a phone, or a link passes only when the owner wrote it in their own facts,
// note, or profile (`allowed.text`). The owner's own names (business, town,
// services) are masked first, so "Best Roofing" or "Five Star Cleaning" can
// still name itself.
//
// Pure and browser-safe. The free idea engine's safety tests and the AI
// writer's runtime filter (lib/postCreator/ai/filter.ts) both run through it.

import { copyProblems, line } from "../hq/copy";

/** What a post may repeat: the owner's own words (lowercased) and names to mask. */
export type AllowedFacts = { text: string; mask: string[] };

export const NO_FACTS: AllowedFacts = { text: "", mask: [] };

/** One line the owner typed, clamped, with any long dash turned into a hyphen. */
export function cleanOwnerText(v: unknown, max: number): string {
  return line(v, max).replace(/[\u2014\u2013]/g, "-");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Replace each owner name (2 characters or more) with "the business", ignoring
 * case. A term only matches as a whole word or phrase, with an optional plural
 * or possessive ending, so a short service like "AC" never hides part of
 * another word. Longest terms go first, so a full business name is masked
 * before one of its words is.
 */
export function maskOwnerNames(text: string, mask: string[]): string {
  const terms = (mask ?? [])
    .map((m) => (typeof m === "string" ? m.replace(/\s+/g, " ").trim() : ""))
    .filter((m) => m.length >= 2)
    .sort((a, b) => b.length - a.length);
  let out = text;
  for (const term of terms) {
    const body = term.split(" ").map(escapeRegExp).join("\\s+");
    const re = new RegExp(`(^|[^a-z0-9])${body}(?:'s|\u2019s|es|s)?(?![a-z0-9])`, "gi");
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

// Claims and pressure a post may carry only when the owner wrote the same
// words. "#1" sits outside the word boundaries: "#" is not a word character,
// so "\b#1" would never match after a space.
const CONDITIONAL =
  /\b(?:licensed|insured|bonded|certified|warrant(?:y|ies)|free estimates?|same[- ]day|24\/7|emergency|family[- ]owned|locally owned|veteran[- ]owned|years? of experience|years? in business|since (?:19|20)\d\d|best|number one|cheapest|lowest|fastest|five[- ]star|5[- ]star|award[- ]winning|award|voted|testimonial|act now|limited time|today only|hurry|don['\u2019]?t miss)\b|#1\b/gi;

const NUMBER = /\$?\d[\d,.:%\/]*/g;
const UNIT_AFTER = /^\s*(years?|yrs?|stars?|reviews?|customers?|jobs?|homes?|hours?|hrs?|minutes?|mins?|days?|weeks?|months?|percent)\b/i;
const PHONE = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
const WEB = /\bhttps?:\/\/\S+|\bwww\.\S+|\b[a-z0-9-]+\.(com|net|org|biz|info|co|us|io)\b/gi;

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

/**
 * Every reason `text` could not go out under the owner's name, or [] when it
 * is clean. Anything inside [square brackets] is a blank for the owner to
 * fill in, so only the house rules apply there.
 */
export function postCopyProblems(text: string, allowed: AllowedFacts = NO_FACTS): string[] {
  const masked = maskOwnerNames(text, allowed.mask);
  const problems = copyProblems(masked);
  const body = masked.replace(/\[[^\]\n]*\]/g, " ");

  const facts = (allowed.text ?? "").toLowerCase();
  const factsSpaced = spaced(facts);

  for (const rule of ALWAYS) if (rule.re.test(body)) problems.push(rule.problem);

  for (const m of body.matchAll(CONDITIONAL)) {
    if (!factsSpaced.includes(spaced(m[0]))) problems.push(`claim "${m[0]}" is not in the owner's facts`);
  }

  // Digit runs the owner wrote, whole and as formatted numbers and phones, so
  // "$1,500", "1500", and "903.555.0100" each match what the owner typed.
  const runs = new Set<string>(facts.match(/\d+/g) ?? []);
  for (const n of facts.match(NUMBER) ?? []) runs.add(n.replace(/\D/g, ""));
  const factPhones = new Set<string>((facts.match(PHONE) ?? []).map(phoneDigits));
  for (const p of factPhones) runs.add(p);

  for (const m of body.matchAll(NUMBER)) {
    const value = m[0].replace(/[.,:\/]+$/, "");
    const digits = value.replace(/\D/g, "");
    if (!digits || runs.has(digits)) continue;
    const after = body.slice((m.index ?? 0) + value.length);
    const small = /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 10;
    if (small && !after.startsWith("+") && !UNIT_AFTER.test(after)) continue;
    problems.push(`number "${value}" is not in the owner's facts`);
  }

  for (const m of body.matchAll(PHONE)) {
    if (facts.includes(m[0].toLowerCase()) || factPhones.has(phoneDigits(m[0]))) continue;
    problems.push(`phone "${m[0].trim()}" is not in the owner's facts`);
  }

  for (const m of body.matchAll(WEB)) {
    const link = trimTrailing(m[0].toLowerCase());
    if (link && facts.includes(link)) continue;
    problems.push(`link "${m[0]}" is not in the owner's facts`);
  }

  return problems;
}
