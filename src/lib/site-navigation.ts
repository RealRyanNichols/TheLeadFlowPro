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
    href: "/buy-leads",
    label: "Buy Signals",
    shortLabel: "Buy",
    description: "Source-backed signal products.",
    icon: "market",
    activePaths: ["/buy-leads"]
  },
  {
    href: "/build-my-system",
    label: "Build Machine",
    shortLabel: "Build",
    description: "Website, AI, forms, follow-up, and routing.",
    icon: "score",
    activePaths: ["/build-my-system", "/problem-intake"]
  },
  {
    href: "/submit-source",
    label: "Submit Source",
    shortLabel: "Source",
    description: "Send a source, list, tool, or audience for review.",
    icon: "source",
    activePaths: ["/submit-source"]
  },
  {
    href: "/data-marketplace",
    label: "Marketplace",
    shortLabel: "Market",
    description: "Review scored demand and intent lists.",
    icon: "market",
    activePaths: ["/data-marketplace"]
  },
  { href: "/#data", label: "Signal Proof", shortLabel: "Proof", description: "See captured intake signals.", icon: "profile" },
  { href: "/#workflow", label: "Scoring", shortLabel: "Scores", description: "Turn answers into usable intent.", icon: "score" },
];

export const SITE_MORE_NAV: SiteNavItem[] = [
  {
    href: "/problem-intake",
    label: "Problem Intake",
    shortLabel: "Intake",
    description: "Build and save a preference map.",
    icon: "map",
    activePaths: ["/problem-intake"]
  },
  { href: "/#profiles", label: "Intent Profiles", shortLabel: "Profiles", description: "Tags, fit scores, and profiles.", icon: "profile" },
  { href: "/#fair-rates", label: "Fair Pricing", shortLabel: "Pricing", description: "Buyer rates and data boundaries.", icon: "rate" },
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
    { href: "/buy-leads", label: "Buy signals" },
    { href: "/build-my-system", label: "Build machine" },
    { href: "/submit-source", label: "Submit source" },
    { href: "/data-marketplace", label: "Marketplace" },
    { href: "/#data", label: "Signal proof" },
    { href: "/#profiles", label: "Intent profiles" },
    { href: "/#fair-rates", label: "Fair pricing" },
    { href: "/#workflow", label: "Scoring" },
  ],
  company: [
    { href: "/#compliance", label: "Data rules" },
    { href: "/privacy-center", label: "Privacy center" },
    { href: "/admin", label: "Operator login" },
    { href: "/contact", label: "Talk to us" },
    { href: "/dashboard", label: "Command console" },
  ],
  tools: [
    { href: "/problem-intake", label: "Problem intake" },
    { href: "/buy-leads", label: "Buyer signal lane" },
    { href: "/build-my-system", label: "Lead machine lane" },
    { href: "/submit-source", label: "Source review lane" },
    { href: "/data-marketplace", label: "Buyer request desk" },
    { href: "/#fair-rates", label: "Pricing desk" },
    { href: "/dashboard/data-requests", label: "Request dashboard" },
  ],
  legal: [
    { href: "/legal", label: "Legal overview" },
    { href: "/privacy-policy", label: "Privacy policy" },
    { href: "/privacy-center", label: "Privacy center" },
    { href: "/terms", label: "Terms" },
    { href: "/refunds", label: "Refunds" },
  ],
};

export function isActiveNavItem(item: SiteNavItem, activePath?: string) {
  if (!activePath) return false;
  const paths = item.activePaths ?? [item.href];
  return paths.some((path) => activePath === path || activePath.startsWith(`${path}/`));
}
