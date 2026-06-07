export type ActionMenuKind =
  | "quick-look"
  | "decision-sprint"
  | "audit"
  | "leaderboard"
  | "boost"
  | "voice"
  | "blueprint"
  | "power-bundle"
  | "operator"
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
    label: "Fastest unlock",
    title: "$47 Growth Snapshot",
    price: "$47",
    speed: "Instant tool path",
    buyer: "Owner who wants the full ranked readout after the free machine snapshot shows the first leak.",
    result: "Full scorecard, top leak list, first-fix checklist, and copy-ready next-click angle.",
    mechanism: "Free preview first. Paid unlock when the missing report becomes the obvious next thing.",
    href: "/tools/growth-machine#unlock-47",
    primaryLabel: "Run the tool",
    secondaryHref: "/tools/growth-machine#tool",
    secondaryLabel: "Start free snapshot",
    badge: "Report unlock",
  },
  {
    kind: "decision-sprint",
    label: "Script pack",
    title: "$90 Follow-Up Kit",
    price: "$90",
    speed: "Document unlock",
    buyer: "Business with missed calls, slow texts, dead DMs, cold forms, or no-show appointments.",
    result: "SMS, DM, email, no-show, and first-24-hour follow-up scripts the business can copy into its tools.",
    mechanism: "The tool exposes the follow-up gap. The paid unlock gives the sequence that closes the gap.",
    href: "/tools/growth-machine#follow-up-kit",
    primaryLabel: "Open follow-up kit",
    secondaryHref: "/tools/growth-machine#tool",
    secondaryLabel: "Run free snapshot",
    badge: "Script unlock",
  },
  {
    kind: "audit",
    label: "Deep report",
    title: "$197 Lead Leak Report",
    price: "$197",
    speed: "Critical unlock",
    buyer: "Serious owner who needs the complete leak math, source trail, dashboard fields, and fix order.",
    result: "A deeper report that turns rough site, call, DM, ad, form, and follow-up data into a repair path.",
    mechanism: "Free snapshot shows the first signal. The paid report unlocks the full business document.",
    href: "/tools/growth-machine#lead-leak-report",
    primaryLabel: "Unlock report path",
    secondaryHref: "/lead-leak-audit-197",
    secondaryLabel: "Paid audit page",
    badge: "Report path",
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
    label: "Automation map",
    title: "Tool Blueprint Generator",
    price: "Free first",
    speed: "$250 build path",
    buyer: "Owner with a tool, dashboard, calculator, funnel, portal, or workflow they wish existed.",
    result: "A structured tool spec: inputs, outputs, account handoff, automation path, and first useful version.",
    mechanism: "The user describes the desired outcome. The system turns it into a blueprint and build checklist.",
    href: "/tools/growth-machine#automation-map",
    primaryLabel: "Open blueprint tool",
    secondaryHref: "/stump-ryan",
    secondaryLabel: "Use full blueprint form",
    badge: "Blueprint tool",
  },
  {
    kind: "power-bundle",
    label: "Content engine",
    title: "Pulse Content Machine",
    price: "$1,497/mo",
    speed: "System path",
    buyer: "Business that wants content, proof, clicks, UTMs, and site pulse data tied into one reporting loop.",
    result: "A monthly system path for content signals, lead-flow dashboards, public proof, and next-action reports.",
    mechanism: "Small tools capture signals. The monthly machine compounds the signals into repeatable operations.",
    href: "/tools/growth-machine#growth-os",
    primaryLabel: "Open system path",
    secondaryHref: "/offers/power-bundle",
    secondaryLabel: "See monthly option",
    badge: "Growth OS",
  },
  {
    kind: "operator",
    label: "Full machine",
    title: "Automated Growth OS",
    price: "$4,997/mo",
    speed: "Owned system",
    buyer: "Business that wants intake, scoring, follow-up, analytics, documents, automations, and reporting in one owned system.",
    result: "The bigger operating system path: data intake, tool logic, dashboards, paid unlocks, and business memory.",
    mechanism: "The site becomes the front-end machine. The Growth OS becomes the back-end brain for repeat use.",
    href: "/tools/growth-machine#growth-os",
    primaryLabel: "Open Growth OS",
    secondaryHref: "/offers/monthly-operator",
    secondaryLabel: "See full option",
    badge: "Macro system",
  },
  {
    kind: "message",
    label: "AI handoff",
    title: "Ask the Site Assistant",
    price: "Free",
    speed: "AI first",
    buyer: "Visitor who needs direction but should not require a human to explain the whole site.",
    result: "The assistant points to the right tool, report, unlock, or message path.",
    mechanism: "The website answers, routes, and captures context without forcing a call.",
    href: "/contact?source=action-menu",
    primaryLabel: "Ask the assistant",
    secondaryHref: "/contact",
    secondaryLabel: "Leave context",
    badge: "AI handoff",
  },
];
