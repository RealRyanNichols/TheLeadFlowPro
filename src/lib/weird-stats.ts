export type WeirdStatFormulaType =
  | "linear_estimate"
  | "daily_reset"
  | "cumulative_since_epoch"
  | "oscillating"
  | "manual";

export type WeirdStatSourceType =
  | "live_api"
  | "formula_estimate"
  | "community_requested"
  | "experimental"
  | "low_confidence"
  | "verified_source";

export type WeirdStat = {
  id?: string;
  slug: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  category: string;
  unitLabel: string;
  baseValue: number;
  ratePerSecond: number;
  varianceFactor?: number;
  formulaType: WeirdStatFormulaType;
  formulaNotes: string;
  sourceType: WeirdStatSourceType;
  sourceNotes: string;
  confidenceScore: number;
  isPremium?: boolean;
  isActive?: boolean;
  sponsorName?: string | null;
  sponsorUrl?: string | null;
  whyItMatters: string;
};

export type WeirdBoard = {
  key: string;
  title: string;
  description: string;
  accent: string;
  statSlugs: string[];
  lockedCount: number;
};

export type WeirdPurchaseProduct = {
  key: string;
  label: string;
  amount: number;
  body: string;
  checkoutLabel: string;
};

export const WEIRD_STAT_CATEGORIES = [
  "Internet",
  "Money",
  "Work",
  "AI",
  "Consumer Habits",
  "Time Wasters",
  "Relationships",
  "Business Waste",
] as const;

export const WEIRD_PURCHASE_PRODUCTS: WeirdPurchaseProduct[] = [
  {
    key: "boost_stat_100",
    label: "$1 Boost a Stat",
    amount: 100,
    body: "Move a requested stat higher on the public queue.",
    checkoutLabel: "Boost this stat for $1",
  },
  {
    key: "submit_weird_stat_300",
    label: "$3 Submit a Weird Stat",
    amount: 300,
    body: "Add your question to the public request queue.",
    checkoutLabel: "Submit this weird stat for $3",
  },
  {
    key: "priority_request_900",
    label: "$9 Priority Request",
    amount: 900,
    body: "Get faster review and public listing consideration.",
    checkoutLabel: "Make this priority for $9",
  },
  {
    key: "private_research_1900",
    label: "$19 Private Research Pull",
    amount: 1900,
    body: "Get a short private answer by email when the request should not be public.",
    checkoutLabel: "Request private research for $19",
  },
  {
    key: "custom_stat_page_4900",
    label: "$49 Custom Stat Page",
    amount: 4900,
    body: "Get a dedicated shareable stat page with formula notes and source labels.",
    checkoutLabel: "Build my custom stat page for $49",
  },
  {
    key: "sponsor_board_9900",
    label: "$99 Sponsor a Board",
    amount: 9900,
    body: "Put a sponsor label on a weird category board when it fits the audience.",
    checkoutLabel: "Sponsor a board for $99",
  },
  {
    key: "premium_board_unlock_500",
    label: "$5 Premium Board Unlock",
    amount: 500,
    body: "Unlock deeper stat cards on a premium weird board.",
    checkoutLabel: "Unlock premium board for $5",
  },
];

export function weirdProductByKey(key: string | null | undefined) {
  return WEIRD_PURCHASE_PRODUCTS.find((product) => product.key === key) ?? null;
}

export const STARTER_WEIRD_STATS: WeirdStat[] = [
  {
    slug: "unused-subscriptions-today",
    title: "Dollars Spent on Unused Subscriptions Today",
    shortDescription: "The money leaking out of accounts while nobody opens the app.",
    longDescription:
      "A formula estimate of consumer subscription spend that is unlikely to create value today.",
    category: "Money",
    unitLabel: "dollars",
    baseValue: 1840000,
    ratePerSecond: 69.8,
    varianceFactor: 0.018,
    formulaType: "linear_estimate",
    formulaNotes: "Base daily estimate plus a steady per-second spend curve.",
    sourceType: "formula_estimate",
    sourceNotes: "Built from public subscription-economy assumptions and usage decay estimates.",
    confidenceScore: 45,
    whyItMatters: "Small forgotten charges become real money when you watch them move all day.",
  },
  {
    slug: "abandoned-carts-today",
    title: "Online Shopping Carts Abandoned Today",
    shortDescription: "Carts full of intent that never became orders.",
    longDescription:
      "A directional estimate of online carts that were created and then abandoned before checkout.",
    category: "Business Waste",
    unitLabel: "carts",
    baseValue: 9200000,
    ratePerSecond: 382,
    varianceFactor: 0.026,
    formulaType: "linear_estimate",
    formulaNotes: "Daily cart estimate with an ecommerce abandonment-rate assumption.",
    sourceType: "formula_estimate",
    sourceNotes: "Modeled from common ecommerce abandonment benchmarks.",
    confidenceScore: 50,
    whyItMatters: "A cart is not a sale. Friction still eats demand after the buyer says yes.",
  },
  {
    slug: "meetings-that-could-have-been-emails",
    title: "Meetings That Could Have Been Emails Today",
    shortDescription: "Calendar blocks where the recap was probably the whole meeting.",
    longDescription:
      "An experimental estimate of low-output meetings across the workday.",
    category: "Work",
    unitLabel: "meetings",
    baseValue: 620000,
    ratePerSecond: 31,
    varianceFactor: 0.04,
    formulaType: "linear_estimate",
    formulaNotes: "Workday-weighted meeting estimate with a low-output multiplier.",
    sourceType: "experimental",
    sourceNotes: "Modeled from workplace meeting-load reports and practical operator assumptions.",
    confidenceScore: 35,
    whyItMatters: "Time waste becomes obvious when it has a counter instead of a complaint.",
  },
  {
    slug: "ai-images-generated-today",
    title: "AI Images Generated Today",
    shortDescription: "Prompted pictures pouring out of the internet.",
    longDescription:
      "A directional clock for synthetic image creation across consumer and business tools.",
    category: "AI",
    unitLabel: "images",
    baseValue: 48000000,
    ratePerSecond: 1785,
    varianceFactor: 0.025,
    formulaType: "linear_estimate",
    formulaNotes: "Large-scale global estimate based on public AI usage signals.",
    sourceType: "formula_estimate",
    sourceNotes: "Not live provider data. Directional model only.",
    confidenceScore: 40,
    whyItMatters: "Creative supply is exploding faster than most teams can review it.",
  },
  {
    slug: "forgotten-tabs-open",
    title: "Forgotten Browser Tabs Currently Open",
    shortDescription: "The tab pile everybody pretends is research.",
    longDescription:
      "An oscillating estimate of tabs open in browsers with no realistic plan to revisit them.",
    category: "Internet",
    unitLabel: "tabs",
    baseValue: 2150000000,
    ratePerSecond: 1400,
    varianceFactor: 0.07,
    formulaType: "oscillating",
    formulaNotes: "Base value plus a small day-cycle wave and growth drift.",
    sourceType: "experimental",
    sourceNotes: "Behavioral model, not browser telemetry.",
    confidenceScore: 30,
    whyItMatters: "Digital clutter feels invisible until the number starts staring back.",
  },
  {
    slug: "password-resets-today",
    title: "Password Reset Attempts Today",
    shortDescription: "People locked out of their own accounts.",
    longDescription:
      "A formula estimate of password reset attempts triggered across apps, stores, banks, and work tools.",
    category: "Internet",
    unitLabel: "resets",
    baseValue: 11800000,
    ratePerSecond: 455,
    varianceFactor: 0.02,
    formulaType: "linear_estimate",
    formulaNotes: "Global reset activity estimate distributed across the day.",
    sourceType: "formula_estimate",
    sourceNotes: "Directional model based on large-scale login and support assumptions.",
    confidenceScore: 50,
    whyItMatters: "Login friction is one of the quietest ways customers disappear.",
  },
  {
    slug: "unread-notifications-created",
    title: "Unread Notifications Created Today",
    shortDescription: "Tiny red dots breeding across phones.",
    longDescription:
      "An experimental estimate of notifications created that will not be read today.",
    category: "Time Wasters",
    unitLabel: "notifications",
    baseValue: 7900000000,
    ratePerSecond: 311000,
    varianceFactor: 0.035,
    formulaType: "linear_estimate",
    formulaNotes: "Notification volume estimate with an unread-rate multiplier.",
    sourceType: "experimental",
    sourceNotes: "Not platform telemetry. Entertainment and directional insight only.",
    confidenceScore: 30,
    whyItMatters: "Attention has a landfill. This is one way to picture it.",
  },
  {
    slug: "spam-emails-sent-today",
    title: "Spam Emails Sent Today",
    shortDescription: "The junk drawer of the internet refilling in real time.",
    longDescription:
      "A directional clock for spam messages sent globally during the current day.",
    category: "Internet",
    unitLabel: "emails",
    baseValue: 34500000000,
    ratePerSecond: 1260000,
    varianceFactor: 0.018,
    formulaType: "linear_estimate",
    formulaNotes: "Daily spam-volume estimate divided across the day.",
    sourceType: "formula_estimate",
    sourceNotes: "Modeled from public email-volume reporting.",
    confidenceScore: 55,
    whyItMatters: "Inbox trust is not free. Junk volume creates a tax on every real message.",
  },
  {
    slug: "drive-thru-minutes-burned",
    title: "Fast Food Drive-Thru Minutes Burned Today",
    shortDescription: "Cars idling while dinner gets negotiated through a speaker.",
    longDescription:
      "An estimate of human minutes spent in fast food drive-thru lines today.",
    category: "Time Wasters",
    unitLabel: "minutes",
    baseValue: 38000000,
    ratePerSecond: 1880,
    varianceFactor: 0.045,
    formulaType: "daily_reset",
    formulaNotes: "Daily reset model with restaurant-traffic weighting.",
    sourceType: "experimental",
    sourceNotes: "Public traffic assumptions and queue-time estimates.",
    confidenceScore: 38,
    whyItMatters: "Convenience still has a line item. We just rarely total it.",
  },
  {
    slug: "streaming-decision-minutes",
    title: "Streaming Minutes Watched While Deciding What to Watch",
    shortDescription: "The preview-scroll tax of modern entertainment.",
    longDescription:
      "A formula estimate of time spent browsing streaming menus before a show starts.",
    category: "Consumer Habits",
    unitLabel: "minutes",
    baseValue: 64000000,
    ratePerSecond: 2450,
    varianceFactor: 0.035,
    formulaType: "daily_reset",
    formulaNotes: "Estimated streaming users multiplied by browsing-delay assumptions.",
    sourceType: "formula_estimate",
    sourceNotes: "Consumer behavior model, not platform data.",
    confidenceScore: 42,
    whyItMatters: "Choice overload is easier to understand when it has a meter.",
  },
  {
    slug: "online-forms-abandoned",
    title: "Online Forms Abandoned Today",
    shortDescription: "Almost-customers who quit before submit.",
    longDescription:
      "A directional estimate of form starts that ended before a successful submission.",
    category: "Business Waste",
    unitLabel: "forms",
    baseValue: 25000000,
    ratePerSecond: 980,
    varianceFactor: 0.026,
    formulaType: "linear_estimate",
    formulaNotes: "Traffic and form friction model using abandonment assumptions.",
    sourceType: "formula_estimate",
    sourceNotes: "Built from common conversion and form analytics benchmarks.",
    confidenceScore: 48,
    whyItMatters: "Lead capture does not fail loudly. It fails one unfinished field at a time.",
  },
  {
    slug: "coffee-cups-in-meetings",
    title: "Coffee Cups Consumed During Meetings Today",
    shortDescription: "Caffeine burned while people wait for the point.",
    longDescription:
      "An absurd but plausible estimate of coffee consumed during work meetings.",
    category: "Work",
    unitLabel: "cups",
    baseValue: 18000000,
    ratePerSecond: 820,
    varianceFactor: 0.05,
    formulaType: "daily_reset",
    formulaNotes: "Meeting volume estimate multiplied by coffee habit assumptions.",
    sourceType: "experimental",
    sourceNotes: "Entertainment estimate.",
    confidenceScore: 28,
    whyItMatters: "It is funny because every office knows exactly what this means.",
  },
  {
    slug: "dating-app-swipes-today",
    title: "Dating App Swipes Today",
    shortDescription: "Tiny decisions in the relationship economy.",
    longDescription:
      "A directional estimate of swipe-style decisions made across dating platforms today.",
    category: "Relationships",
    unitLabel: "swipes",
    baseValue: 1150000000,
    ratePerSecond: 45000,
    varianceFactor: 0.055,
    formulaType: "linear_estimate",
    formulaNotes: "User activity estimate with daily usage curves.",
    sourceType: "formula_estimate",
    sourceNotes: "Public platform-scale assumptions. Not live dating-app data.",
    confidenceScore: 37,
    whyItMatters: "Modern relationship markets move like attention markets.",
  },
  {
    slug: "unused-gym-memberships-today",
    title: "Gym Memberships Unused Today",
    shortDescription: "Paid discipline with no check-in.",
    longDescription:
      "A model for paid gym memberships that are unlikely to be used during the current day.",
    category: "Consumer Habits",
    unitLabel: "memberships",
    baseValue: 42000000,
    ratePerSecond: 350,
    varianceFactor: 0.022,
    formulaType: "oscillating",
    formulaNotes: "Oscillating daily estimate based on check-in behavior assumptions.",
    sourceType: "formula_estimate",
    sourceNotes: "Consumer habit estimate.",
    confidenceScore: 44,
    whyItMatters: "A subscription can be both motivational and invisible waste.",
  },
  {
    slug: "return-packages-created",
    title: "Return Packages Created Today",
    shortDescription: "Buyer's remorse getting taped back into boxes.",
    longDescription:
      "A directional estimate of ecommerce return packages started today.",
    category: "Consumer Habits",
    unitLabel: "returns",
    baseValue: 7800000,
    ratePerSecond: 315,
    varianceFactor: 0.025,
    formulaType: "linear_estimate",
    formulaNotes: "Estimated order volume multiplied by return-rate assumptions.",
    sourceType: "formula_estimate",
    sourceNotes: "Retail and ecommerce model.",
    confidenceScore: 49,
    whyItMatters: "Returns are the shadow cost of frictionless buying.",
  },
  {
    slug: "missed-business-calls-today",
    title: "Business Calls Missed Today",
    shortDescription: "Money ringing while nobody answers.",
    longDescription:
      "A directional estimate of business calls that go unanswered during the day.",
    category: "Business Waste",
    unitLabel: "calls",
    baseValue: 5100000,
    ratePerSecond: 235,
    varianceFactor: 0.03,
    formulaType: "daily_reset",
    formulaNotes: "Business call volume estimate with missed-call multiplier.",
    sourceType: "formula_estimate",
    sourceNotes: "Lead-flow model. Directional only.",
    confidenceScore: 46,
    whyItMatters: "A missed call is a lost chance before the CRM ever sees it.",
  },
  {
    slug: "dm-replies-left-hanging",
    title: "DM Replies Left Hanging Today",
    shortDescription: "Conversations that started warm and went cold.",
    longDescription:
      "An experimental clock for social messages that were not answered fast enough to keep momentum.",
    category: "Business Waste",
    unitLabel: "DMs",
    baseValue: 14800000,
    ratePerSecond: 610,
    varianceFactor: 0.04,
    formulaType: "linear_estimate",
    formulaNotes: "Social message volume with a delayed-reply assumption.",
    sourceType: "experimental",
    sourceNotes: "Modeled from common social commerce behavior.",
    confidenceScore: 34,
    whyItMatters: "Social intent expires quickly when nobody owns the next reply.",
  },
  {
    slug: "creator-posts-without-cta",
    title: "Creator Posts Published Without a Next Click Today",
    shortDescription: "Attention with nowhere to go.",
    longDescription:
      "A model for posts that earn some attention but do not give a viewer a clear next action.",
    category: "Business Waste",
    unitLabel: "posts",
    baseValue: 22000000,
    ratePerSecond: 880,
    varianceFactor: 0.032,
    formulaType: "linear_estimate",
    formulaNotes: "Creator post estimate with a missing-CTA multiplier.",
    sourceType: "experimental",
    sourceNotes: "Content operations model.",
    confidenceScore: 31,
    whyItMatters: "Attention without a path is just a scoreboard nobody cashes.",
  },
  {
    slug: "ai-prompts-rewritten",
    title: "AI Prompts Rewritten Today",
    shortDescription: "Humans negotiating with the robot until it gets the point.",
    longDescription:
      "A playful estimate of prompt revisions across AI tools today.",
    category: "AI",
    unitLabel: "rewrites",
    baseValue: 310000000,
    ratePerSecond: 13200,
    varianceFactor: 0.05,
    formulaType: "linear_estimate",
    formulaNotes: "Estimated AI sessions multiplied by prompt-revision assumptions.",
    sourceType: "experimental",
    sourceNotes: "Not provider telemetry.",
    confidenceScore: 33,
    whyItMatters: "The hidden labor of AI is often the part before the useful answer.",
  },
  {
    slug: "screenshots-never-reopened",
    title: "Screenshots Taken and Never Reopened Today",
    shortDescription: "Digital memory that becomes a camera roll graveyard.",
    longDescription:
      "An estimate of screenshots captured for later that probably will not get reopened.",
    category: "Consumer Habits",
    unitLabel: "screenshots",
    baseValue: 760000000,
    ratePerSecond: 31500,
    varianceFactor: 0.05,
    formulaType: "linear_estimate",
    formulaNotes: "Phone usage estimate with screenshot behavior assumptions.",
    sourceType: "experimental",
    sourceNotes: "Entertainment estimate.",
    confidenceScore: 27,
    whyItMatters: "Screenshots are the junk drawer of intention.",
  },
  {
    slug: "calendar-invites-ignored",
    title: "Calendar Invites Ignored Today",
    shortDescription: "Pending maybes haunting the workday.",
    longDescription:
      "A workplace estimate of calendar invites that sit unanswered for hours.",
    category: "Work",
    unitLabel: "invites",
    baseValue: 8200000,
    ratePerSecond: 350,
    varianceFactor: 0.032,
    formulaType: "daily_reset",
    formulaNotes: "Work calendar activity estimate with ignored-invite assumption.",
    sourceType: "experimental",
    sourceNotes: "Work behavior model.",
    confidenceScore: 36,
    whyItMatters: "Operational drag often looks like small unanswered decisions.",
  },
  {
    slug: "unsubscribe-links-clicked",
    title: "Unsubscribe Links Clicked Today",
    shortDescription: "Tiny breakups between brands and inboxes.",
    longDescription:
      "A directional estimate of unsubscribe clicks across marketing email today.",
    category: "Internet",
    unitLabel: "clicks",
    baseValue: 16800000,
    ratePerSecond: 640,
    varianceFactor: 0.025,
    formulaType: "linear_estimate",
    formulaNotes: "Marketing email volume with an unsubscribe-rate assumption.",
    sourceType: "formula_estimate",
    sourceNotes: "Modeled from email marketing benchmarks.",
    confidenceScore: 43,
    whyItMatters: "Bad attention compounds too. People vote with unsubscribe links.",
  },
  {
    slug: "receipts-lost-before-expense-report",
    title: "Receipts Lost Before Expense Reports Today",
    shortDescription: "The paper trail disappearing before reimbursement.",
    longDescription:
      "A work-life estimate of receipts lost before they make it into expense systems.",
    category: "Work",
    unitLabel: "receipts",
    baseValue: 3100000,
    ratePerSecond: 128,
    varianceFactor: 0.036,
    formulaType: "daily_reset",
    formulaNotes: "Business travel and purchase estimate with a lost-receipt multiplier.",
    sourceType: "experimental",
    sourceNotes: "Directional work friction model.",
    confidenceScore: 32,
    whyItMatters: "Small admin failures turn into real money and messy books.",
  },
  {
    slug: "headline-clicks-from-curiosity",
    title: "Headline Clicks From Pure Curiosity Today",
    shortDescription: "Clicks powered by the need to know what that means.",
    longDescription:
      "A broad estimate of web clicks caused mostly by unresolved curiosity.",
    category: "Internet",
    unitLabel: "clicks",
    baseValue: 980000000,
    ratePerSecond: 40500,
    varianceFactor: 0.06,
    formulaType: "oscillating",
    formulaNotes: "Traffic estimate with a curiosity-click multiplier and day-cycle wave.",
    sourceType: "experimental",
    sourceNotes: "Attention model, not publisher telemetry.",
    confidenceScore: 29,
    whyItMatters: "Curiosity is one of the most reliable engines online.",
  },
];

export const WEIRD_BOARDS: WeirdBoard[] = [
  {
    key: "internet-weirdness",
    title: "Internet Weirdness",
    description: "Tabs, spam, resets, screenshots, curiosity clicks, and other invisible internet weather.",
    accent: "from-cyan-300 to-blue-500",
    statSlugs: [
      "forgotten-tabs-open",
      "spam-emails-sent-today",
      "password-resets-today",
      "unread-notifications-created",
      "screenshots-never-reopened",
      "headline-clicks-from-curiosity",
    ],
    lockedCount: 7,
  },
  {
    key: "business-waste",
    title: "Business Waste",
    description: "The places attention, leads, carts, calls, DMs, forms, and posts quietly leak.",
    accent: "from-amber-300 to-rose-500",
    statSlugs: [
      "abandoned-carts-today",
      "online-forms-abandoned",
      "missed-business-calls-today",
      "dm-replies-left-hanging",
      "creator-posts-without-cta",
      "unsubscribe-links-clicked",
    ],
    lockedCount: 10,
  },
  {
    key: "ai-explosion",
    title: "AI Explosion",
    description: "Prompts, images, rewrites, and the new machine-made creative flood.",
    accent: "from-fuchsia-300 to-cyan-400",
    statSlugs: [
      "ai-images-generated-today",
      "ai-prompts-rewritten",
      "forgotten-tabs-open",
      "headline-clicks-from-curiosity",
      "online-forms-abandoned",
      "unread-notifications-created",
    ],
    lockedCount: 8,
  },
  {
    key: "daily-time-wasters",
    title: "Daily Time Wasters",
    description: "Meetings, queues, browsing, notifications, and small delays that turn into a whole day.",
    accent: "from-sky-200 to-cyan-400",
    statSlugs: [
      "meetings-that-could-have-been-emails",
      "drive-thru-minutes-burned",
      "streaming-decision-minutes",
      "calendar-invites-ignored",
      "unread-notifications-created",
      "forgotten-tabs-open",
    ],
    lockedCount: 6,
  },
  {
    key: "relationship-economy",
    title: "Relationship Economy",
    description: "Swipes, ignored replies, attention loops, and the stats behind tiny social decisions.",
    accent: "from-pink-300 to-orange-400",
    statSlugs: [
      "dating-app-swipes-today",
      "dm-replies-left-hanging",
      "unread-notifications-created",
      "screenshots-never-reopened",
      "headline-clicks-from-curiosity",
      "streaming-decision-minutes",
    ],
    lockedCount: 5,
  },
];

export const PUBLIC_REQUEST_SEEDS = [
  {
    id: "req_1",
    question: "How many small businesses miss a paid lead because nobody answers the first text?",
    category: "Business Waste",
    votes: 42,
    boosts: 8,
    status: "Formula Building",
  },
  {
    id: "req_2",
    question: "How many people open the fridge twice before deciding they are not hungry?",
    category: "Time Wasters",
    votes: 31,
    boosts: 5,
    status: "Under Review",
  },
  {
    id: "req_3",
    question: "How many AI outputs get copied into docs without anyone reading them twice?",
    category: "AI",
    votes: 27,
    boosts: 3,
    status: "New",
  },
  {
    id: "req_4",
    question: "How many abandoned notes apps contain a business idea that never shipped?",
    category: "Consumer Habits",
    votes: 63,
    boosts: 11,
    status: "Published",
  },
];

function secondsSinceStartOfDay(currentTime: Date) {
  const start = new Date(currentTime);
  start.setHours(0, 0, 0, 0);
  return Math.max(0, (currentTime.getTime() - start.getTime()) / 1000);
}

function stableSlugSeed(slug: string) {
  return slug.split("").reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 7), 0);
}

export function calculateStatValue(stat: WeirdStat, currentTime = new Date()) {
  const secondsToday = secondsSinceStartOfDay(currentTime);
  const secondsEpoch = Math.floor(currentTime.getTime() / 1000);
  const variance = stat.varianceFactor ?? 0;
  const seed = stableSlugSeed(stat.slug);
  const wave = Math.sin(secondsToday / (180 + (seed % 420))) * variance;
  const microWave = Math.sin((secondsToday + seed) / 23) * variance * 0.35;

  let value = stat.baseValue;
  if (stat.formulaType === "linear_estimate" || stat.formulaType === "daily_reset") {
    value = stat.baseValue + stat.ratePerSecond * secondsToday;
  } else if (stat.formulaType === "cumulative_since_epoch") {
    value = stat.baseValue + stat.ratePerSecond * secondsEpoch;
  } else if (stat.formulaType === "oscillating") {
    value = stat.baseValue + stat.ratePerSecond * secondsToday + stat.baseValue * (wave + microWave);
  } else if (stat.formulaType === "manual") {
    value = stat.baseValue;
  }

  return Math.max(0, Math.round(value));
}

export function formatStatValue(stat: WeirdStat, value: number) {
  if (stat.unitLabel === "dollars") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export function sourceLabel(sourceType: WeirdStatSourceType) {
  const labels: Record<WeirdStatSourceType, string> = {
    live_api: "Live API",
    formula_estimate: "Formula Estimate",
    community_requested: "Community Requested",
    experimental: "Experimental",
    low_confidence: "Low Confidence",
    verified_source: "Verified Source",
  };
  return labels[sourceType];
}

export function getWeirdStatBySlug(slug: string) {
  return STARTER_WEIRD_STATS.find((stat) => stat.slug === slug) ?? null;
}

export function relatedWeirdStats(stat: WeirdStat) {
  return STARTER_WEIRD_STATS.filter((item) => item.category === stat.category && item.slug !== stat.slug).slice(0, 4);
}
