import { STRIPE_PAYMENT_LINKS } from "@/lib/stripe-links";

export type ActionMenuKind =
  | "quick-look"
  | "decision-sprint"
  | "audit"
  | "leaderboard"
  | "boost"
  | "voice"
  | "blueprint"
  | "message";

export type ActionMenuItem = {
  kind: ActionMenuKind;
  label: string;
  title: string;
  price: string;
  speed: string;
  buyer: string;
  result: string;
  mechanism: string;
  href: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  badge: string;
};

export const ACTION_MENU_ITEMS: ActionMenuItem[] = [
  {
    kind: "quick-look",
    label: "Fastest micro-purchase",
    title: "$47 Quick-Look Video",
    price: "$47",
    speed: "24-hour target",
    buyer: "Owner who wants Ryan's eyes on a site, offer, or social profile without a big call.",
    result: "A short direct video readout with what Ryan would fix first and where the next move is.",
    mechanism: "Low-friction purchase. Small enough to buy now, useful enough to prove Ryan can see the leak.",
    href: STRIPE_PAYMENT_LINKS["quick-look"] || "/offers/quick-look",
    primaryLabel: "Buy the $47 Quick-Look",
    secondaryHref: "/offers/quick-look",
    secondaryLabel: "Read details first",
    badge: "Micro buy",
  },
  {
    kind: "decision-sprint",
    label: "Paid clarity call",
    title: "$90 Decision Sprint",
    price: "$90",
    speed: "90 minutes",
    buyer: "Business owner stuck on one decision, one offer, one campaign, or one next move.",
    result: "A focused working session and action worksheet instead of another vague discovery call.",
    mechanism: "Turns interest into paid time with Ryan before a bigger build or retainer is discussed.",
    href: STRIPE_PAYMENT_LINKS["decision-sprint"] || "/offers/decision-sprint",
    primaryLabel: "Buy the $90 Sprint",
    secondaryHref: "/offers/decision-sprint",
    secondaryLabel: "See sprint page",
    badge: "Working session",
  },
  {
    kind: "audit",
    label: "Paid traffic offer",
    title: "$197 Lead Leak Audit",
    price: "$197",
    speed: "Fit check first",
    buyer: "Serious owner who thinks calls, texts, DMs, forms, ads, booking, or follow-up are leaking.",
    result: "Ryan reviews the path and identifies the top leaks before more money goes into traffic.",
    mechanism: "Application first, payment link second. Filters tire kickers while keeping the paid path clear.",
    href: "/lead-leak-audit-197#audit-application",
    primaryLabel: "Apply for the $197 Audit",
    secondaryHref: "/lead-leak-audit-197",
    secondaryLabel: "Read audit page",
    badge: "Best ad path",
  },
  {
    kind: "leaderboard",
    label: "Public game loop",
    title: "East TX Top 10 Vote",
    price: "$1+",
    speed: "Live rank movement",
    buyer: "Local business, customer, fan, or community member who wants to move a name up the board.",
    result: "Visible points, live rank changes, shareable profile pages, and a local giveback pool.",
    mechanism: "Turns attention into a public scoreboard people can share, revisit, and compete around.",
    href: "/leaderboard#vote",
    primaryLabel: "Move a rank",
    secondaryHref: "/leaderboard",
    secondaryLabel: "View boards",
    badge: "Game loop",
  },
  {
    kind: "boost",
    label: "Paid attention",
    title: "Ticker Boost Message",
    price: "$5+",
    speed: "1 to 24 hours",
    buyer: "Business that wants a visible shoutout, offer, or event message moving through the live ticker.",
    result: "A paid message slot on the leaderboard ticker with duration based on spend.",
    mechanism: "Tiny paid placement that creates a reason to share the page and watch it live.",
    href: "/leaderboard#boost",
    primaryLabel: "Boost the ticker",
    secondaryHref: "/leaderboard#boost",
    secondaryLabel: "See boost options",
    badge: "Attention slot",
  },
  {
    kind: "voice",
    label: "Conversation loop",
    title: "East TX Voice Vote",
    price: "$1+",
    speed: "7-day topics",
    buyer: "Person with an opinion on an East Texas topic who wants their YES or NO to carry weight.",
    result: "Money-weighted public sentiment with no wager, no payout, and a topic page people can revisit.",
    mechanism: "Creates repeat attention around local questions, arguments, and public signal.",
    href: "/voice",
    primaryLabel: "Pick a topic",
    secondaryHref: "/voice",
    secondaryLabel: "Submit a topic",
    badge: "Sentiment market",
  },
  {
    kind: "blueprint",
    label: "Custom build lead",
    title: "Stump Ryan Blueprint",
    price: "Free first",
    speed: "$250 continuation",
    buyer: "Owner with a tool, dashboard, calculator, funnel, portal, or workflow they wish existed.",
    result: "A free build blueprint first. If it makes sense, the continuation deposit starts the first build block.",
    mechanism: "Captures dream-tool intent before asking for a bigger build commitment.",
    href: "/stump-ryan",
    primaryLabel: "Get free blueprint",
    secondaryHref: "/proof",
    secondaryLabel: "See shipped builds",
    badge: "Build path",
  },
  {
    kind: "message",
    label: "Message handoff",
    title: "Leave a Message",
    price: "Free",
    speed: "AI first",
    buyer: "Serious buyer who has context, links, or a question that should not wait on Ryan's calendar.",
    result: "The site assistant routes the next step. Ryan can review the message later if it needs a human response.",
    mechanism: "Keeps the site automated while still giving qualified buyers a place to leave useful context.",
    href: "/contact?source=action-menu",
    primaryLabel: "Leave a message",
    secondaryHref: "/contact",
    secondaryLabel: "Open contact",
    badge: "AI handoff",
  },
];
