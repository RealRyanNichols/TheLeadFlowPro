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

/** A thing a post can be about. `id` is the noun as a slug, unique within its list. */
export type Topic = { id: string; kind: TopicKind; noun: string };

/**
 * A way to frame a post. Templates use only {topic}, {Topic}, {season}, and
 * {Season}. Body lines leave [blanks] for what only the owner knows.
 */
export type Angle = {
  id: AngleId;
  label: string;
  kinds: readonly TopicKind[];
  title: string;
  hooks: readonly [string, string, string, string];
  shots: readonly [string, string];
  body: readonly string[];
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
  /** 0 on the first pass through every core, 1 on the second, and so on. */
  lap: number;
  /** 1-based place within the current lap. */
  position: number;
};

/** How many ideas and cards a set of settings has. */
export type IdeaSpace = { signature: string; coreCount: number; remixCount: number; cardCount: number; monthsAtThreeAWeek: number };

/**
 * Where the shuffle is, per set of settings. Saved in the browser, so a
 * reload picks up where it left off.
 */
export type ShuffleState = { v: 1; seed: number; cursors: Record<string, number> };

/** Every day, Monday to Friday, or Monday, Wednesday, and Friday. */
export type PlanCadence = "daily" | "weekdays" | "three";

/** One planned post: a YYYY-MM-DD date and its idea. */
export type PlanDay = { date: string; card: IdeaCard };
