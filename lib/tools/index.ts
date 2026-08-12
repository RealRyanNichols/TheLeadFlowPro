import type { Category, Tool } from "./types";
import { MONEY_TOOLS } from "./money";
import { LEAD_TOOLS } from "./leads";
import { OPERATIONS_TOOLS } from "./operations";
import { GROWTH_TOOLS } from "./growth";
import { GENERATOR_TOOLS } from "./generators";

export * from "./types";

export const TOOLS: Tool[] = [
  ...LEAD_TOOLS,
  ...MONEY_TOOLS,
  ...OPERATIONS_TOOLS,
  ...GROWTH_TOOLS,
  ...GENERATOR_TOOLS,
];

export const TOOL_COUNT = TOOLS.length;

export function getTool(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

/** Each category gets its own color identity so no two tools look the same. */
export const CATEGORY_META: Record<
  Category,
  { emoji: string; blurb: string; from: string; to: string; ring: string; text: string }
> = {
  Leads: {
    emoji: "🎯",
    blurb: "Find the calls, quotes and customers you are already losing.",
    from: "#2eb9ff",
    to: "#2f6fff",
    ring: "rgba(46,185,255,0.45)",
    text: "#8bdfff",
  },
  Money: {
    emoji: "💰",
    blurb: "Price it right, know your margin, keep what you earn.",
    from: "#2ed6a3",
    to: "#16a34a",
    ring: "rgba(46,214,163,0.45)",
    text: "#7ff0cb",
  },
  Costs: {
    emoji: "🩸",
    blurb: "Find the money leaving quietly every single month.",
    from: "#ff6b6b",
    to: "#c02626",
    ring: "rgba(255,107,107,0.45)",
    text: "#ffb3b3",
  },
  Ads: {
    emoji: "📣",
    blurb: "Know whether the money you spend is coming back.",
    from: "#a78bfa",
    to: "#6d28d9",
    ring: "rgba(167,139,250,0.45)",
    text: "#d3c4ff",
  },
  Reputation: {
    emoji: "⭐",
    blurb: "Reviews, ratings, and what people find when they look you up.",
    from: "#fbbf24",
    to: "#d97706",
    ring: "rgba(251,191,36,0.45)",
    text: "#ffdf9e",
  },
  Time: {
    emoji: "⏳",
    blurb: "The hours going into work that does not pay you.",
    from: "#fb923c",
    to: "#ea580c",
    ring: "rgba(251,146,60,0.45)",
    text: "#ffd0ac",
  },
  Website: {
    emoji: "🌐",
    blurb: "What your site is doing, and what it should be doing.",
    from: "#67d8ff",
    to: "#0ea5e9",
    ring: "rgba(103,216,255,0.45)",
    text: "#b3ecff",
  },
  Generators: {
    emoji: "🛠️",
    blurb: "Put your details in, get something you can use today.",
    from: "#f472b6",
    to: "#be185d",
    ring: "rgba(244,114,182,0.45)",
    text: "#ffc4e2",
  },
};

export const CATEGORIES = Object.keys(CATEGORY_META) as Category[];

export function toolsByCategory(cat: Category) {
  return TOOLS.filter((t) => t.category === cat);
}

/** Deterministic hue shift per slug so two tools in one category never look identical. */
export function toolHash(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) % 360;
  return h;
}

/** The gradient art behind each tool's emoji. Unique per tool, consistent per category. */
export function toolArt(tool: Tool) {
  const meta = CATEGORY_META[tool.category];
  const h = toolHash(tool.slug);
  const angle = 110 + (h % 140);
  const x = 20 + (h % 60);
  const y = 15 + ((h * 7) % 55);
  return {
    background: `radial-gradient(circle at ${x}% ${y}%, ${meta.from}55, transparent 60%), linear-gradient(${angle}deg, ${meta.from}2e, ${meta.to}1f 55%, #0b1526 100%)`,
    border: `1px solid ${meta.ring}`,
    ...meta,
  };
}

export function relatedTools(tool: Tool, n = 4) {
  const same = TOOLS.filter((t) => t.category === tool.category && t.slug !== tool.slug);
  const rest = TOOLS.filter((t) => t.category !== tool.category && t.slug !== tool.slug);
  const h = toolHash(tool.slug);
  const picked = [...same, ...rest.slice(h % Math.max(1, rest.length - n))];
  return picked.slice(0, n);
}

export const FEATURED_TOOLS = TOOLS.filter((t) => t.featured);
