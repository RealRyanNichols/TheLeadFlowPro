// Post Creator idea engine: the shapes the free idea machine works with.
//
// A core idea is a topic paired with an angle that fits it. A card is a core
// plus a remix: which of the angle's four first lines, which of its two photo
// ideas, and which call to action. Topics, angles, and calls to action are a
// fixed library (angles.ts, topics.ts, ctas.ts); the owner's services add
// topics of their own.
//
// Leaf module: types only, safe in client components.

import type { AngleId, CtaChoice, CtaId, TradeId, VoiceId } from "../options";

/** What a topic is about. Each angle fits some kinds and not others. */
export type TopicKind = "problem" | "howto" | "decision" | "work" | "team" | "story" | "local";

export type Season = "winter" | "spring" | "summer" | "fall";

/**
 * What else is true of a topic, so an angle lands only where it reads right:
 *
 * - visible: a change you can photograph before and after (Before and after).
 * - gear: a tool, a truck, or equipment (Tool talk).
 * - visit: a step the customer goes through (What to expect, for a look at the work).
 * - choice: two options side by side (This or that).
 * - early: a problem that shows signs before it gets worse (Warning signs).
 * - self: the owner, who does not thank themselves (Thank you).
 * - trade: assumes a service trade, so "Something else" leaves it out.
 */
export type TopicTag = "visible" | "gear" | "visit" | "choice" | "early" | "self" | "trade";

/**
 * A thing a post can be about. `id` is the noun as a slug, unique within its
 * list. `seasons` are the times of year the topic is worth a seasonal
 * heads-up; a topic without them never gets one.
 */
export type Topic = { id: string; kind: TopicKind; noun: string; tags?: readonly TopicTag[]; seasons?: readonly Season[] };

/** What a topic of one kind must carry for an angle to fit it: a tag, or seasons. */
export type AngleNeed = TopicTag | "seasons";

/**
 * A way to frame a post. Templates use only {topic}, {Topic}, {season}, and
 * {Season}. Body lines leave [blanks] for what only the owner knows.
 *
 * An angle fits a topic when the topic's kind is in `kinds`, the topic carries
 * what `needs` asks of that kind, and it carries none of `avoid`. `ctas` are
 * the calls to action that read right after it ("Save this post" follows a
 * tip, not a thank you). `clip` is the middle shot of the short video.
 */
export type Angle = {
  id: AngleId;
  label: string;
  kinds: readonly TopicKind[];
  needs?: Partial<Record<TopicKind, AngleNeed>>;
  avoid?: readonly TopicTag[];
  ctas: readonly CtaId[];
  title: string;
  hooks: readonly [string, string, string, string];
  shots: readonly [string, string];
  body: readonly string[];
  clip: string;
};

/** The settings the idea machine runs on. Owner text is cleaned by normalizeInput. */
export type EngineInput = {
  trade: TradeId;
  businessName: string;
  town: string;
  services: string[];
  voice: VoiceId;
  cta: CtaChoice;
};

/** One core idea: a topic and a fitting angle, with a key that never changes. */
export type CoreRef = { key: string; topic: Topic; source: "trade" | "universal" | "service"; angle: AngleId };

/** One idea as the machine shows it. The indexes say which remix it is. */
export type IdeaCard = {
  /** The core and the remix together. Unique per card. */
  key: string;
  coreKey: string;
  angle: AngleId;
  angleLabel: string;
  topic: string;
  title: string;
  hook: string;
  shot: string;
  cta: CtaId;
  ctaLine: string;
  hookIdx: number;
  shotIdx: number;
  ctaIdx: number;
  /** The season the wording uses: the topic's own for a seasonal heads-up, else the date's. */
  season: Season;
  /** 0 on the first pass through every core, 1 on the second, and so on. */
  lap: number;
  /** 1-based place within the current lap. */
  position: number;
};

/**
 * How many ideas and cards a set of settings has. `cardCount` adds up every
 * core's remixes: four first lines, two photo ideas, and, on "Mix it up",
 * each call to action that fits the core's angle.
 */
export type IdeaSpace = { signature: string; coreCount: number; cardCount: number; monthsAtThreeAWeek: number };

/**
 * Where the shuffle is, per set of settings. Saved in the browser, so a
 * reload picks up where it left off.
 */
export type ShuffleState = { v: 1; seed: number; cursors: Record<string, number> };

/** Every day, Monday to Friday, or Monday, Wednesday, and Friday. */
export type PlanCadence = "daily" | "weekdays" | "three";

/** One planned post: a YYYY-MM-DD date and its idea. */
export type PlanDay = { date: string; card: IdeaCard };
