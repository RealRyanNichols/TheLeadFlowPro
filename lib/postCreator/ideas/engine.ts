// Post Creator idea engine: the free idea machine.
//
// A core idea is a topic paired with an angle that fits it. The cores for a
// set of settings are the trade's own topics, then the universal topics, then
// six topics for each service, each paired with every angle that fits its
// kind. A card is a core plus a remix: one of four first lines, one of two
// photo ideas, and a call to action (one of eight when the owner picked "Mix
// it up", else their own).
//
// The machine walks every core once in a shuffled order (permute.ts) before
// any core comes back, and each time a core comes back it has a different
// first line. The only state is a seed and a cursor per set of settings, so it
// fits in the browser's storage and a reload picks up where it left off.
//
// Counting is exact and honest: the page shows ideaSpace through ideaCountLine
// (product.ts), and tests/post-creator-ideas.test.ts pins the numbers.
// Pure, browser-safe, no network, no clock except the season.

import { cleanOwnerText } from "../copyRules";
import { CTA_IDS, isCtaChoice, isTradeId, isVoiceId, tradeLabel, type TradeId } from "../options";
import { POST_CREATOR } from "../product";
import { PROFILE_LIMITS } from "../profile";
import type { BrandProfile } from "../types";
import { ANGLES, angleById } from "./angles";
import { ctaLine } from "./ctas";
import { fill, seasonOf } from "./drafts";
import { fnv1a, permuteIndex } from "./permute";
import { SERVICE_TEMPLATES, TRADE_TOPICS, UNIVERSAL_TOPICS, topicId } from "./topics";
import type { CoreRef, EngineInput, IdeaCard, IdeaSpace, ShuffleState, Topic } from "./types";

export const DEFAULT_INPUT: EngineInput = { trade: "other", businessName: "", town: "", services: [], voice: "friendly", cta: "mix" };

const HOOKS = 4;
const SHOTS = 2;
/** Remixes per core: every hook, shot, and call to action when mixing, else hook and shot. */
const REMIX_MIX = HOOKS * SHOTS * CTA_IDS.length;
const REMIX_FIXED = HOOKS * SHOTS;
/** Coprime to both remix counts, so a core never repeats a remix within its first R laps. */
const LAP_STRIDE = 7;

/** How many sets of settings keep their place. The oldest is dropped first. */
export const MAX_SIGNATURES = 50;
const MAX_CURSOR = 1_000_000_000;
const MAX_SIGNATURE_CHARS = 1000;
/** Services read from a raw value before the limit check, so junk cannot run long. */
const MAX_RAW_SERVICES = 50;

export type InputProblem = { field: "businessName" | "town" | "services"; message: string };

function record(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

/** Owner text on one line, unclamped: tags, control characters, and angle brackets out, long dashes to hyphens. */
function ownerLine(v: unknown): string {
  return cleanOwnerText(v, 100_000).replace(/[<>]/g, "").replace(/\s{2,}/g, " ").trim();
}

function clamp(text: string, max: number): string {
  return text.slice(0, max).trim();
}

function tooLong(max: number): string {
  return `Keep it under ${max} characters.`;
}

/**
 * Settings from the setup form, the browser's storage, or anywhere else, as
 * clean engine input plus the problems the form shows under each field. Owner
 * text is cleaned and clamped; bad choices fall back to the defaults.
 * Services can be a list or text with one per line; blanks and repeats
 * (ignoring case) are dropped, and at most five are kept.
 */
export function normalizeInput(raw: unknown): { input: EngineInput; problems: InputProblem[] } {
  const r = record(raw);
  const problems: InputProblem[] = [];

  const text = (field: "businessName" | "town"): string => {
    const max = PROFILE_LIMITS[field];
    const value = ownerLine(r[field]);
    if (value.length > max) problems.push({ field, message: tooLong(max) });
    return clamp(value, max);
  };
  const businessName = text("businessName");
  const town = text("town");

  const list: unknown[] = Array.isArray(r.services) ? r.services : typeof r.services === "string" ? r.services.split("\n") : [];
  const services: string[] = [];
  const seen = new Set<string>();
  let longService = false;
  for (const item of list.slice(0, MAX_RAW_SERVICES)) {
    // A service sits mid-sentence in every template, so a trailing period or comma would double up.
    const value = ownerLine(item).replace(/[\s.,;:!?]+$/, "");
    if (value.length > PROFILE_LIMITS.service) longService = true;
    const service = clamp(value, PROFILE_LIMITS.service);
    const key = service.toLowerCase();
    if (!service || seen.has(key)) continue;
    seen.add(key);
    services.push(service);
  }
  if (services.length > POST_CREATOR.maxServices) {
    problems.push({ field: "services", message: `Up to ${POST_CREATOR.maxServices} services.` });
  } else if (longService) {
    problems.push({ field: "services", message: tooLong(PROFILE_LIMITS.service) });
  }

  return {
    input: {
      trade: isTradeId(r.trade) ? r.trade : DEFAULT_INPUT.trade,
      businessName,
      town,
      services: services.slice(0, POST_CREATOR.maxServices),
      voice: isVoiceId(r.voice) ? r.voice : DEFAULT_INPUT.voice,
      cta: isCtaChoice(r.cta) ? r.cta : DEFAULT_INPUT.cta,
    },
    problems,
  };
}

/** A buyer's saved profile as idea machine settings. The profile's call to action is fixed, not mixed. */
export function inputFromProfile(p: BrandProfile): EngineInput {
  return normalizeInput({
    trade: p.trade,
    businessName: p.businessName,
    town: p.town,
    services: p.services,
    voice: p.voice,
    cta: p.cta,
  }).input;
}

/** "your business" for Something else, else the trade label in lowercase ("heating and air"). */
export function tradeWords(trade: TradeId): string {
  return trade === "other" ? "your business" : tradeLabel(trade).toLowerCase();
}

/** Services in one fixed order (by lowercase), so the same settings always give the same core list. */
function sortedServices(services: readonly string[]): string[] {
  return services
    .map((s) => ({ s, k: s.toLowerCase() }))
    .sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : 0))
    .map((x) => x.s);
}

function signatureOf(input: EngineInput): string {
  return `${input.trade}|${input.services.map((s) => s.toLowerCase()).sort().join(",")}`;
}

/** The settings that decide the core list: the trade and the services, ignoring case and order. */
export function inputSignature(input: EngineInput): string {
  return signatureOf(normalizeInput(input).input);
}

// A few recent core lists, so drawing idea after idea does not rebuild the
// list each time. Keyed by the exact service text, which the topics show.
const CORE_CACHE = new Map<string, readonly CoreRef[]>();
const CORE_CACHE_SIZE = 8;

function coresFor(input: EngineInput): readonly CoreRef[] {
  const services = sortedServices(input.services);
  const cacheKey = `${input.trade}\n${services.join("\n")}`;
  const hit = CORE_CACHE.get(cacheKey);
  if (hit) return hit;

  const cores: CoreRef[] = [];
  const add = (topic: Topic, source: CoreRef["source"], base: string) => {
    for (const a of ANGLES) {
      if (a.kinds.includes(topic.kind)) cores.push({ key: `${base}|${a.id}`, topic, source, angle: a.id });
    }
  };
  if (input.trade !== "other") {
    for (const topic of TRADE_TOPICS[input.trade]) add(topic, "trade", `t:${input.trade}:${topic.id}`);
  }
  for (const topic of UNIVERSAL_TOPICS) add(topic, "universal", `u:${topic.id}`);
  for (const service of services) {
    const hash = fnv1a(service.toLowerCase()).toString(36);
    SERVICE_TEMPLATES.forEach((t, idx) => {
      const noun = t.template.replace("{s}", () => service);
      add({ id: topicId(noun), kind: t.kind, noun }, "service", `s:${hash}:${idx}`);
    });
  }

  CORE_CACHE.set(cacheKey, cores);
  if (CORE_CACHE.size > CORE_CACHE_SIZE) {
    const oldest = CORE_CACHE.keys().next().value;
    if (oldest !== undefined) CORE_CACHE.delete(oldest);
  }
  return cores;
}

/**
 * Every core idea for these settings: the trade's topics in listed order,
 * each with its fitting angles in ANGLE_IDS order, then the universal topics,
 * then each service (sorted, ignoring case) through each template.
 */
export function buildCores(input: EngineInput): CoreRef[] {
  return coresFor(normalizeInput(input).input).slice();
}

function remixCount(input: EngineInput): number {
  return input.cta === "mix" ? REMIX_MIX : REMIX_FIXED;
}

/** How many ideas and cards these settings have, and how long they last at three posts a week. */
export function ideaSpace(input: EngineInput): IdeaSpace {
  const n = normalizeInput(input).input;
  const coreCount = coresFor(n).length;
  const remix = remixCount(n);
  return {
    signature: signatureOf(n),
    coreCount,
    remixCount: remix,
    cardCount: coreCount * remix,
    // C / 3 / 52 * 12 in whole months, in integers so no float can round it down.
    monthsAtThreeAWeek: Math.floor((coreCount * 12) / (3 * 52)),
  };
}

export function newShuffleState(seed: number): ShuffleState {
  return { v: 1, seed: seed >>> 0, cursors: {} };
}

/**
 * A saved shuffle state (the object or its JSON), or null when it is not one.
 * Cursors that are not whole numbers are dropped, and only the newest
 * MAX_SIGNATURES are kept.
 */
export function parseShuffleState(raw: unknown): ShuffleState | null {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const r = value as Record<string, unknown>;
  if (r.v !== 1) return null;
  const seed = r.seed;
  if (typeof seed !== "number" || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) return null;
  const c = r.cursors;
  if (!c || typeof c !== "object" || Array.isArray(c)) return null;
  const kept = Object.entries(c as Record<string, unknown>).filter(
    ([k, n]) =>
      /^[a-z]+\|/.test(k) && k.length <= MAX_SIGNATURE_CHARS && typeof n === "number" && Number.isSafeInteger(n) && n >= 0 && n <= MAX_CURSOR,
  );
  const cursors: Record<string, number> = {};
  for (const [k, n] of kept.slice(-MAX_SIGNATURES)) cursors[k] = n as number;
  return { v: 1, seed, cursors };
}

function cardKey(coreKey: string, hookIdx: number, shotIdx: number, ctaIdx: number): string {
  return `${coreKey}#h${hookIdx}s${shotIdx}c${ctaIdx}`;
}

function wrap(n: number, size: number): number {
  const i = Math.trunc(Number.isFinite(n) ? n : 0) % size;
  return i < 0 ? i + size : i;
}

/**
 * One core as a card with the given remix. `now` picks the season for the
 * seasonal angle. drawNext uses this; the tests use it to render every core.
 */
export function makeCard(
  core: CoreRef,
  input: EngineInput,
  remix: { hookIdx: number; shotIdx: number; ctaIdx: number },
  place: { lap: number; position: number } = { lap: 0, position: 1 },
  now: Date = new Date(),
): IdeaCard {
  const a = angleById(core.angle);
  const vars = { topic: core.topic.noun, season: seasonOf(now) };
  const hookIdx = wrap(remix.hookIdx, HOOKS);
  const shotIdx = wrap(remix.shotIdx, SHOTS);
  const ctaIdx = wrap(remix.ctaIdx, CTA_IDS.length);
  const cta = CTA_IDS[ctaIdx];
  return {
    key: cardKey(core.key, hookIdx, shotIdx, ctaIdx),
    coreKey: core.key,
    angle: a.id,
    angleLabel: a.label,
    topic: core.topic.noun,
    title: fill(a.title, vars),
    hook: fill(a.hooks[hookIdx], vars),
    shot: fill(a.shots[shotIdx], vars),
    cta,
    ctaLine: ctaLine(cta, input.voice),
    hookIdx,
    shotIdx,
    ctaIdx,
    lap: place.lap,
    position: place.position,
  };
}

function shuffleKey(signature: string, seed: number): number {
  return (fnv1a(signature) ^ seed) >>> 0;
}

function cursorOf(state: ShuffleState, signature: string): number {
  const i = Object.prototype.hasOwnProperty.call(state.cursors, signature) ? state.cursors[signature] : 0;
  return typeof i === "number" && Number.isSafeInteger(i) && i >= 0 ? i : 0;
}

/**
 * The card at a cursor position, without moving the cursor. Position i is
 * lap floor(i / C), place i mod C. Use it to show an earlier card again.
 */
export function cardAt(input: EngineInput, state: ShuffleState, index: number, now: Date = new Date()): IdeaCard {
  const n = normalizeInput(input).input;
  const cores = coresFor(n);
  const size = cores.length;
  const key = shuffleKey(signatureOf(n), state.seed);
  const i = Math.max(0, Math.floor(Number.isFinite(index) ? index : 0));
  const lap = Math.floor(i / size);
  const p = i % size;
  const core = cores[permuteIndex(p, size, key)];
  const remix = remixCount(n);
  const h = (fnv1a(core.key) ^ key) >>> 0;
  const r = ((h % remix) + LAP_STRIDE * (lap % remix)) % remix;
  const ctaIdx = n.cta === "mix" ? Math.floor(r / REMIX_FIXED) : CTA_IDS.indexOf(n.cta);
  return makeCard(core, n, { hookIdx: r % HOOKS, shotIdx: Math.floor(r / HOOKS) % SHOTS, ctaIdx }, { lap, position: p + 1 }, now);
}

/**
 * The next card for these settings and the state after it. `wrapped` is true
 * on the first card of every lap after the first, when every core has been
 * shown and they start coming back with new first lines.
 */
export function drawNext(input: EngineInput, state: ShuffleState, now: Date = new Date()): { card: IdeaCard; state: ShuffleState; wrapped: boolean } {
  const n = normalizeInput(input).input;
  const signature = signatureOf(n);
  const i = cursorOf(state, signature);
  const card = cardAt(n, state, i, now);

  const cursors: Record<string, number> = { ...state.cursors, [signature]: Math.min(i + 1, MAX_CURSOR) };
  const keys = Object.keys(cursors);
  for (let k = 0; k < keys.length - MAX_SIGNATURES; k++) delete cursors[keys[k]];

  return { card, state: { v: 1, seed: state.seed >>> 0, cursors }, wrapped: card.position === 1 && card.lap > 0 };
}

/**
 * The same idea with the next first line, photo idea, or call to action.
 * Each part cycles through all of its options and comes back around.
 */
export function remixCard(card: IdeaCard, input: EngineInput, part: "hook" | "shot" | "cta", now: Date = new Date()): IdeaCard {
  const a = angleById(card.angle);
  const vars = { topic: card.topic, season: seasonOf(now) };
  const hookIdx = part === "hook" ? wrap(card.hookIdx + 1, HOOKS) : card.hookIdx;
  const shotIdx = part === "shot" ? wrap(card.shotIdx + 1, SHOTS) : card.shotIdx;
  const ctaIdx = part === "cta" ? wrap(card.ctaIdx + 1, CTA_IDS.length) : card.ctaIdx;
  const next: IdeaCard = { ...card, key: cardKey(card.coreKey, hookIdx, shotIdx, ctaIdx), hookIdx, shotIdx, ctaIdx };
  if (part === "hook") next.hook = fill(a.hooks[hookIdx], vars);
  if (part === "shot") next.shot = fill(a.shots[shotIdx], vars);
  if (part === "cta") {
    next.cta = CTA_IDS[ctaIdx];
    next.ctaLine = ctaLine(next.cta, normalizeInput(input).input.voice);
  }
  return next;
}
