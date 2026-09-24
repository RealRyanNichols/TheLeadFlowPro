// Post Creator: the fixed choices every screen, the idea engine, and the AI
// writer share. Platforms, trades, voices, calls to action, and the angles a
// post can take.
//
// Leaf module: no imports, safe in client components, route handlers, and
// tests. Ids are stored in profiles and sent to the write route, so an id
// here never changes once it ships; a label can.

export const PLATFORMS = [
  { id: "facebook", label: "Facebook", limit: null, cap: 2000, hashtags: 1 },
  { id: "instagram", label: "Instagram", limit: 2200, cap: 2200, hashtags: 2 },
  { id: "google", label: "Google Business Profile", limit: 1500, cap: 1500, hashtags: 0 },
  { id: "nextdoor", label: "Nextdoor", limit: null, cap: 2000, hashtags: 0 },
  { id: "video", label: "Short video", limit: null, cap: 150, hashtags: 2 },
] as const; // limits are our own display caps; only Google and Instagram show "of {limit}"

export type PlatformId = (typeof PLATFORMS)[number]["id"];

export const PLATFORM_IDS: readonly PlatformId[] = PLATFORMS.map((p) => p.id);

export function isPlatformId(x: unknown): x is PlatformId {
  return typeof x === "string" && (PLATFORM_IDS as readonly string[]).includes(x);
}

export function platformById(id: PlatformId): (typeof PLATFORMS)[number] {
  const found = PLATFORMS.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown Post Creator platform: ${id}`);
  return found;
}

export type TradeId =
  | "roofing"
  | "hvac"
  | "plumbing"
  | "electrical"
  | "lawn"
  | "cleaning"
  | "pest"
  | "painting"
  | "remodeling"
  | "handyman"
  | "auto"
  | "salon"
  | "other";

/**
 * The twelve named trades, in the order the picker shows them, then "Something
 * else". `tag` is the hashtag stem (PascalCase, letters only); "other" has none.
 */
export const TRADES: readonly { id: TradeId; label: string; tag: string }[] = [
  { id: "roofing", label: "Roofing", tag: "Roofing" },
  { id: "hvac", label: "Heating and air", tag: "HVAC" },
  { id: "plumbing", label: "Plumbing", tag: "Plumbing" },
  { id: "electrical", label: "Electrical", tag: "Electrician" },
  { id: "lawn", label: "Lawn and landscaping", tag: "LawnCare" },
  { id: "cleaning", label: "House cleaning", tag: "HouseCleaning" },
  { id: "pest", label: "Pest control", tag: "PestControl" },
  { id: "painting", label: "Painting", tag: "Painting" },
  { id: "remodeling", label: "Remodeling", tag: "Remodeling" },
  { id: "handyman", label: "Handyman", tag: "Handyman" },
  { id: "auto", label: "Auto repair", tag: "AutoRepair" },
  { id: "salon", label: "Salon and barber", tag: "Salon" },
  { id: "other", label: "Something else", tag: "" },
];

export const TRADE_IDS: readonly TradeId[] = TRADES.map((t) => t.id);

export function isTradeId(x: unknown): x is TradeId {
  return typeof x === "string" && (TRADE_IDS as readonly string[]).includes(x);
}

export function tradeLabel(id: TradeId): string {
  return TRADES.find((t) => t.id === id)?.label ?? "Something else";
}

export const VOICES = [
  { id: "friendly", label: "Friendly", hint: "Warm and neighborly" },
  { id: "direct", label: "Direct", hint: "Short and to the point" },
  { id: "professional", label: "Professional", hint: "Polished and calm" },
  { id: "playful", label: "Playful", hint: "Light and fun" },
] as const;

export type VoiceId = (typeof VOICES)[number]["id"];

export function isVoiceId(x: unknown): x is VoiceId {
  return typeof x === "string" && VOICES.some((v) => v.id === x);
}

export const CTAS = [
  { id: "call", label: "Call us" },
  { id: "text", label: "Text us" },
  { id: "book", label: "Book online" },
  { id: "message", label: "Message us" },
  { id: "visit", label: "Stop by" },
  { id: "save", label: "Save this post" },
  { id: "share", label: "Share with a neighbor" },
  { id: "comment", label: "Ask for comments" },
] as const;

export type CtaId = (typeof CTAS)[number]["id"];

export const CTA_IDS: readonly CtaId[] = CTAS.map((c) => c.id);

export function isCtaId(x: unknown): x is CtaId {
  return typeof x === "string" && (CTA_IDS as readonly string[]).includes(x);
}

/** A fixed call to action, or "mix" to let the idea machine rotate all of them. */
export type CtaChoice = CtaId | "mix";

export function isCtaChoice(x: unknown): x is CtaChoice {
  return x === "mix" || isCtaId(x);
}

export type AngleId =
  | "quick-tip"
  | "myth-fact"
  | "people-ask"
  | "behind-scenes"
  | "before-after"
  | "mistake"
  | "checklist"
  | "this-or-that"
  | "day-on-job"
  | "meet-team"
  | "our-story"
  | "local-love"
  | "heads-up"
  | "what-to-expect"
  | "tool-talk"
  | "warning-signs"
  | "cost-factors"
  | "thank-you"
  | "your-turn"
  | "three-steps";

/**
 * The ways a post can frame a topic. The label is what a card shows; the brief
 * is the one-line instruction the AI writer gets for that angle. The idea
 * engine's templates (lib/postCreator/ideas/angles.ts) follow this order.
 */
export const ANGLE_META: readonly { id: AngleId; label: string; brief: string }[] = [
  { id: "quick-tip", label: "Quick tip", brief: "Share one small, safe, practical tip." },
  { id: "myth-fact", label: "Myth vs fact", brief: "Bust one common myth, then give the plain truth." },
  { id: "people-ask", label: "People ask", brief: "Answer one question people commonly ask, plainly." },
  { id: "behind-scenes", label: "Behind the scenes", brief: "Show a part of the work or the team people rarely see." },
  { id: "before-after", label: "Before and after", brief: "Show a change from before to after, with the customer's OK." },
  { id: "mistake", label: "Mistake to avoid", brief: "Name one easy mistake and the better way." },
  { id: "checklist", label: "Checklist", brief: "Give a short checklist the reader can save." },
  { id: "this-or-that", label: "This or that", brief: "Compare two options and when each makes sense." },
  { id: "day-on-job", label: "A day on the job", brief: "Show a slice of a normal workday." },
  { id: "meet-team", label: "Meet the team", brief: "Introduce a person on the team, with their OK." },
  { id: "our-story", label: "Our story", brief: "Tell one short, true piece of the business's story." },
  { id: "local-love", label: "Local love", brief: "Give a genuine shout out to something local." },
  { id: "heads-up", label: "Seasonal heads-up", brief: "Tie the topic to the season the idea names, calmly, even when it is not the current one." },
  { id: "what-to-expect", label: "What to expect", brief: "Walk through what happens, so there are no surprises." },
  { id: "tool-talk", label: "Tool talk", brief: "Show a tool or piece of gear and what it does." },
  { id: "warning-signs", label: "Warning signs", brief: "Help people spot a problem early, calmly." },
  { id: "cost-factors", label: "What affects the cost", brief: "Explain what changes the price, with no numbers." },
  { id: "thank-you", label: "Thank you", brief: "Say a genuine thank you." },
  { id: "your-turn", label: "Your turn", brief: "Ask the audience a friendly question to start a conversation." },
  { id: "three-steps", label: "Three steps", brief: "Break the topic into three simple, safe steps." },
];

export const ANGLE_IDS: readonly AngleId[] = ANGLE_META.map((a) => a.id);

export function isAngleId(x: unknown): x is AngleId {
  return typeof x === "string" && (ANGLE_IDS as readonly string[]).includes(x);
}
