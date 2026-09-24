// Post Creator: the business profile a buyer saves, and the one place its
// fields are cleaned, clamped, and checked.
//
// parseProfile is lenient: it reads whatever the database or an old browser
// holds and always returns a usable profile. validateProfileInput is what the
// profile route runs on a save: it returns the first field that is too long
// or wrong, with the message the form shows under that field.
//
// Pure and browser-safe. The settings form reads PROFILE_LIMITS for its
// counters, so the form and the server can never disagree on a limit.

import { plain } from "../hq/copy";
import { cleanOwnerText } from "./copyRules";
import { isCtaId, isTradeId, isVoiceId } from "./options";
import type { BrandProfile } from "./types";

export const PROFILE_LIMITS = {
  businessName: 80,
  town: 60,
  tradeLabel: 40,
  services: 5,
  service: 60,
  difference: 300,
  facts: 300,
  wordsToUse: 120,
  wordsToAvoid: 120,
  audience: 120,
  ctaDetail: 100,
  samplePost: 600,
} as const;

export const EMPTY_PROFILE: BrandProfile = {
  businessName: "",
  town: "",
  trade: "other",
  tradeLabel: "",
  services: [],
  difference: "",
  facts: "",
  voice: "friendly",
  wordsToUse: "",
  wordsToAvoid: "",
  audience: "",
  cta: "message",
  ctaDetail: "",
  samplePost: "",
};

type TextField = Exclude<keyof BrandProfile, "trade" | "voice" | "cta" | "services">;

/** Fields that keep their line breaks. Everything else is one line. */
const MULTILINE: readonly TextField[] = ["difference", "facts", "samplePost"];

const TEXT_FIELDS: readonly TextField[] = [
  "businessName",
  "town",
  "tradeLabel",
  "difference",
  "facts",
  "wordsToUse",
  "wordsToAvoid",
  "audience",
  "ctaDetail",
  "samplePost",
];

// Longer than any body the profile route accepts, so cleaning never cuts and
// the length checks see the whole value.
const UNCLAMPED = 100_000;

function clamp(text: string, max: number): string {
  return text.slice(0, max).trim();
}

/** A single-line value: cleaned by cleanOwnerText, then any stray "<" or ">" removed. */
function oneLine(v: unknown): string {
  return cleanOwnerText(v, UNCLAMPED).replace(/[<>]/g, "").replace(/\s{2,}/g, " ").trim();
}

/**
 * One field as it will be stored, before the length clamp. Tags, control
 * characters, and stray angle brackets come out, long dashes become hyphens,
 * and single-line fields lose their line breaks.
 */
function cleaned(field: TextField, v: unknown): string {
  if (!MULTILINE.includes(field)) return oneLine(v);
  return plain(v, UNCLAMPED)
    .replace(/[\u2014\u2013]/g, "-")
    .replace(/[<>]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Services from a list, or from text with one per line: each cleaned and
 * clamped to `max`, blanks dropped, repeats (ignoring case) removed.
 */
function cleanedServices(v: unknown, max: number): string[] {
  const raw: unknown[] = Array.isArray(v) ? v : typeof v === "string" ? v.split("\n") : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const service = clamp(oneLine(item), max);
    const key = service.toLowerCase();
    if (!service || seen.has(key)) continue;
    seen.add(key);
    out.push(service);
  }
  return out;
}

function record(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
}

/** Any stored or posted value, as a clean profile. Never throws. */
export function parseProfile(raw: unknown): BrandProfile {
  const r = record(raw);
  if (!r) return { ...EMPTY_PROFILE, services: [] };
  const profile: BrandProfile = {
    ...EMPTY_PROFILE,
    trade: isTradeId(r.trade) ? r.trade : EMPTY_PROFILE.trade,
    voice: isVoiceId(r.voice) ? r.voice : EMPTY_PROFILE.voice,
    cta: isCtaId(r.cta) ? r.cta : EMPTY_PROFILE.cta,
    services: cleanedServices(r.services, PROFILE_LIMITS.service).slice(0, PROFILE_LIMITS.services),
  };
  for (const field of TEXT_FIELDS) profile[field] = clamp(cleaned(field, r[field]), PROFILE_LIMITS[field]);
  return profile;
}

export type ProfileValidation =
  | { ok: true; profile: BrandProfile }
  | { ok: false; field: keyof BrandProfile; error: string };

function tooLong(max: number): string {
  return `Keep it under ${max} characters.`;
}

/**
 * A profile the owner is saving. Returns the first problem, field by field in
 * form order, or the clean profile. A missing voice or call to action falls
 * back to the default; a trade that is sent must be one from the list.
 */
export function validateProfileInput(raw: unknown): ProfileValidation {
  const r = record(raw);
  if (!r) return { ok: false, field: "businessName", error: "Fill in your business profile, then save it again." };

  for (const field of ["businessName", "town"] as const) {
    if (cleaned(field, r[field]).length > PROFILE_LIMITS[field]) return { ok: false, field, error: tooLong(PROFILE_LIMITS[field]) };
  }
  if (r.trade !== undefined && !isTradeId(r.trade)) {
    return { ok: false, field: "trade", error: "Pick your trade from the list." };
  }
  if (cleaned("tradeLabel", r.tradeLabel).length > PROFILE_LIMITS.tradeLabel) {
    return { ok: false, field: "tradeLabel", error: tooLong(PROFILE_LIMITS.tradeLabel) };
  }
  const services = cleanedServices(r.services, UNCLAMPED);
  if (services.length > PROFILE_LIMITS.services) {
    return { ok: false, field: "services", error: `Up to ${PROFILE_LIMITS.services} services.` };
  }
  if (services.some((s) => s.length > PROFILE_LIMITS.service)) {
    return { ok: false, field: "services", error: tooLong(PROFILE_LIMITS.service) };
  }
  for (const field of ["difference", "facts", "wordsToUse", "wordsToAvoid", "audience", "ctaDetail", "samplePost"] as const) {
    if (cleaned(field, r[field]).length > PROFILE_LIMITS[field]) return { ok: false, field, error: tooLong(PROFILE_LIMITS[field]) };
  }
  return { ok: true, profile: parseProfile(r) };
}

/** The writer needs a business name and a trade (its own words for "Something else"). */
export function profileIsReady(p: BrandProfile): boolean {
  return p.businessName.trim() !== "" && (p.trade !== "other" || p.tradeLabel.trim() !== "");
}
