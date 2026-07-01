export type SiteNavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  description?: string;
  icon?: "map" | "market" | "source" | "profile" | "rate" | "score" | "guardrail" | "dashboard" | "admin" | "contact" | "home";
  activePaths?: string[];
};

export const SITE_PRIMARY_NAV: SiteNavItem[] = [
  {
    href: "/problem-intake",
    label: "Map Builder",
    shortLabel: "Build",
    description: "Build and save your preference map.",
    icon: "map",
    activePaths: ["/problem-intake"]
  },
  {
    href: "/data-marketplace",
    label: "Signal Shop",
    shortLabel: "Shop",
    description: "Buy scored demand and intent lists.",
    icon: "market",
    activePaths: ["/data-marketplace"]
  },
  { href: "/#data", label: "Signal Streams", shortLabel: "Streams", description: "See captured intake signals.", icon: "source" },
  { href: "/#profiles", label: "Intent Profiles", shortLabel: "Profiles", description: "Tags, fit scores, and profiles.", icon: "profile" },
  { href: "/#fair-rates", label: "Fair Pricing", shortLabel: "Pricing", description: "Buyer rates and data boundaries.", icon: "rate" },
  { href: "/#workflow", label: "Score Lab", shortLabel: "Scores", description: "Turn answers into usable intent.", icon: "score" },
];

export const SITE_MORE_NAV: SiteNavItem[] = [
  { href: "/#compliance", label: "Data Rules", shortLabel: "Rules", description: "Adult-only reviewed signal rules.", icon: "guardrail" },
  { href: "/dashboard", label: "Command Console", shortLabel: "Console", description: "Dashboard and request flow.", icon: "dashboard" },
  { href: "/admin", label: "Operator Login", shortLabel: "Admin", description: "Private operator access.", icon: "admin" },
  { href: "/contact", label: "Talk to Us", shortLabel: "Talk", description: "Lists, intake flows, partnerships.", icon: "contact" },
];

export const SITE_MOBILE_NAV: SiteNavItem[] = [
  { href: "/", label: "Home", description: "Live preference lab.", icon: "home" },
  ...SITE_PRIMARY_NAV,
  ...SITE_MORE_NAV,
];

export const SITE_FOOTER_NAV = {
  funnel: [
    { href: "/problem-intake", label: "Map builder" },
    { href: "/data-marketplace", label: "Signal shop" },
    { href: "/#data", label: "Signal streams" },
    { href: "/#profiles", label: "Intent profiles" },
    { href: "/#fair-rates", label: "Fair pricing" },
    { href: "/#workflow", label: "Score lab" },
  ],
  company: [
    { href: "/#compliance", label: "Data rules" },
    { href: "/admin", label: "Operator login" },
    { href: "/contact", label: "Talk to us" },
    { href: "/dashboard", label: "Command console" },
  ],
  tools: [
    { href: "/problem-intake", label: "Preference builder" },
    { href: "/data-marketplace", label: "Buyer request desk" },
    { href: "/#fair-rates", label: "Pricing desk" },
    { href: "/dashboard/data-requests", label: "Request dashboard" },
  ],
  legal: [
    { href: "/legal", label: "Legal overview" },
    { href: "/privacy-policy", label: "Privacy policy" },
    { href: "/terms", label: "Terms" },
    { href: "/refunds", label: "Refunds" },
  ],
};

export function isActiveNavItem(item: SiteNavItem, activePath?: string) {
  if (!activePath) return false;
  const paths = item.activePaths ?? [item.href];
  return paths.some((path) => activePath === path || activePath.startsWith(`${path}/`));
}
