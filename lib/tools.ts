// Free tools registry. Every tool is free to use on our site. Embedding it on
// their own site requires giving us their info first (lead capture), and the
// embed is an iframe served from our domain: the code stays ours and every
// embed is a live backlink.

export type Tool = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  embedHeight: number;
};

export const TOOLS: Tool[] = [
  {
    slug: "missed-call-calculator",
    name: "Missed Call Money Calculator",
    tagline: "See what missed calls actually cost you",
    description:
      "Punch in how many calls you miss and what a customer is worth. See the real dollars walking to your competitors every month.",
    category: "Revenue",
    embedHeight: 620,
  },
  {
    slug: "google-review-link",
    name: "Google Review Link + QR Maker",
    tagline: "One tap to your review page",
    description:
      "Turn your Google Business Profile into a direct review link and a printable QR code. Put it on receipts, counters, and truck doors.",
    category: "Reputation",
    embedHeight: 700,
  },
  {
    slug: "rent-receipt",
    name: "The Rent Receipt",
    tagline: "Add up what you pay to exist online",
    description:
      "Website builder, email tool, booking app, CRM seats, review software. Stack them up and see the yearly number they never show you.",
    category: "Costs",
    embedHeight: 760,
  },
];

export function getTool(slug: string) {
  return TOOLS.find((t) => t.slug === slug);
}
