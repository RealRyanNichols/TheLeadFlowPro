// The public per-business Scoreboard (/scoreboard).
//
// One board per business The LeadFlow Pro runs or built. Every number comes from a
// `scoreboard_public_daily(days_back)` Postgres function that returns aggregate counts
// per day and nothing else: no names, no emails, no phone numbers, no dollar amounts.
// The LeadFlow Pro reads its own function through the service client. A client
// business exposes the same function on its own Supabase project and the board
// reads it with that project's publishable key (the same key its public website
// already ships to every browser). No secrets, no shared credentials.
//
// Rules, from the project instructions: real numbers or nothing. A feed that
// cannot be read renders as unavailable. Never sample, estimate, or fill with zeros.


export type ScoreboardDay = {
  day: string; // YYYY-MM-DD in America/Chicago
  views: number;
  visitors: number;
  clicks: number;
  leads: number;
  paid_leads: number;
  unpaid_leads: number;
  calls: number;
  forms: number;
  sales: number;
};

export type ScoreboardFeed =
  | { kind: "local" }
  | { kind: "supabase"; url: string; publishableKey: string };

export type ScoreboardBusiness = {
  slug: string;
  name: string;
  shortName: string;
  url: string;
  town: string;
  what: string;
  built: string;
  feed: ScoreboardFeed;
  /** Show the sales count tile. Off by default; dollar figures are never shown. */
  showSales: boolean;
  /** Short list of the LeadFlow Pro services this business runs on. */
  runsOn: string[];
};

export const SCOREBOARD_BUSINESSES: readonly ScoreboardBusiness[] = [
  {
    slug: "the-leadflow-pro",
    name: "The LeadFlow Pro",
    shortName: "LeadFlow Pro",
    url: "https://www.theleadflowpro.com",
    town: "Longview, Texas",
    what: "The company that builds the boards. Website, 86 free tools, articles, courses, lead capture, follow-up, and the operating system behind it.",
    built: "Runs on the same owned stack it sells: Next.js on Vercel, Supabase, GitHub, Stripe, Resend, Quo.",
    feed: { kind: "local" },
    showSales: false,
    runsOn: ["Website", "Free tools", "Articles", "Courses", "Follow-up", "Ads"],
  },
  {
    slug: "premier-dental-academy-of-longview",
    name: "Premier Dental Academy of Longview",
    shortName: "Premier Dental Academy",
    url: "https://premierdentalacademyoflongview.com",
    town: "Longview, Texas",
    what: "A dental assistant school. Enrollment engine, student portal, free study tools, practice exams, blog, and a business line that logs every call.",
    built: "Built and run on the owned stack: Next.js on Vercel, Supabase, Square, Quo, Resend.",
    feed: {
      kind: "supabase",
      url: "https://lmbsuwslsycukynzpzik.supabase.co",
      publishableKey: "sb_publishable_vzuQZbkmj-UsYZVs5Zqw9w_c8PiOfbh",
    },
    showSales: false,
    runsOn: ["Website", "Free tools", "Blog", "Enrollment forms", "Calls and texts", "Ads"],
  },
  {
    slug: "realryannichols",
    name: "RealRyanNichols.com",
    shortName: "RealRyanNichols",
    url: "https://www.realryannichols.com",
    town: "Longview, Texas",
    what: "An independent media site and publishing system: long-form articles, searchable public records, book sales, an AI assistant, and email and text signups. Includes contact and signup records.",
    built: "Built and run on the owned stack: Next.js on Vercel, Supabase, Stripe. The LeadFlow Pro sells the book through it, which is the case study.",
    feed: {
      kind: "supabase",
      url: "https://rpchhzncxigczfojfdtc.supabase.co",
      publishableKey: "sb_publishable_gCe1EEWAe4-5MkhmOpNbcg_raWHUDIa",
    },
    // Ryan's own company. The sales count (book orders, store orders, donations)
    // is the point of the case study; it is a count, never dollars.
    showSales: true,
    runsOn: ["Website", "Articles", "Archive", "Book store", "AI assistant", "Email and text list"],
  },
];

export function scoreboardBusiness(slug: string) {
  return SCOREBOARD_BUSINESSES.find((business) => business.slug === slug) ?? null;
}

export const SCOREBOARD_WINDOWS = [
  { key: "today", label: "Today", days: 1 },
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
] as const;

export type ScoreboardWindowKey = (typeof SCOREBOARD_WINDOWS)[number]["key"];

export type ScoreboardMetricKey = keyof Omit<ScoreboardDay, "day">;

export type ScoreboardTotals = Record<ScoreboardMetricKey, number>;

export type ScoreboardWindow = {
  key: ScoreboardWindowKey;
  label: string;
  days: number;
  totals: ScoreboardTotals;
};

const METRIC_KEYS: ScoreboardMetricKey[] = [
  "views",
  "visitors",
  "clicks",
  "leads",
  "paid_leads",
  "unpaid_leads",
  "calls",
  "forms",
  "sales",
];

export const SCOREBOARD_METRICS: Array<{
  key: ScoreboardMetricKey;
  label: string;
  headline: boolean;
  what: string;
  move: { label: string; href: string };
}> = [
  {
    key: "views",
    label: "Views",
    headline: true,
    what: "Tracked page loads after the feed’s internal-traffic filters. Repeat page loads count again; analytics cannot identify every bot.",
    move: { label: "Articles and a blog that get found", href: "/add-ons" },
  },
  {
    key: "clicks",
    label: "Clicks",
    headline: true,
    what: "A tap that moves toward business: a call button, a text button, a tool, a download, a checkout.",
    move: { label: "Free tools people actually use", href: "/go/tools" },
  },
  {
    key: "leads",
    label: "Leads",
    headline: true,
    what: "Non-test contact records logged by the business. These may include forms, calls, and manually entered contacts. Records are not necessarily unique people or completed purchases.",
    move: { label: "A website built to capture leads", href: "/free-build" },
  },
  {
    key: "paid_leads",
    label: "Ad-attributed leads",
    headline: true,
    what: "Records with an advertising source or paid campaign tag. This means advertising attribution, not that the contact bought something.",
    move: { label: "Local ads run with guardrails", href: "/diagnostic" },
  },
  {
    key: "unpaid_leads",
    label: "Other lead records",
    headline: true,
    what: "Records without paid-ad attribution. This includes organic, referral, direct, manual, and unknown sources; it does not prove zero acquisition cost.",
    move: { label: "Owned attention: articles, tools, indexing", href: "/add-ons" },
  },
  {
    key: "visitors",
    label: "Daily visitors, summed",
    headline: false,
    what: "Each day’s distinct tracked visitors, added across the selected window. A returning visitor can count on multiple days; this is not a unique-person total for the whole window.",
    move: { label: "Get indexed and found", href: "/add-ons" },
  },
  {
    key: "calls",
    label: "Calls",
    headline: false,
    what: "Call records included in the business’s lead feed. Repeat callers may appear more than once.",
    move: { label: "A business line that logs every call", href: "/add-ons" },
  },
  {
    key: "forms",
    label: "Form leads",
    headline: false,
    what: "Tracked website form submissions. This is an activity count, not necessarily unique contacts.",
    move: { label: "Forms that route to the right person", href: "/go/lead-follow-up" },
  },
  {
    key: "sales",
    label: "Sales",
    headline: false,
    what: "A completed payment recorded by the business. Count only. Dollar figures are never published here.",
    move: { label: "Checkout wired into the site", href: "/add-ons" },
  },
];

export function emptyTotals(): ScoreboardTotals {
  return {
    views: 0,
    visitors: 0,
    clicks: 0,
    leads: 0,
    paid_leads: 0,
    unpaid_leads: 0,
    calls: 0,
    forms: 0,
    sales: 0,
  };
}

function toNumber(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}

export function normalizeDays(rows: unknown): ScoreboardDay[] {
  if (!Array.isArray(rows)) return [];
  const out: ScoreboardDay[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const day = typeof r.day === "string" ? r.day.slice(0, 10) : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    const values = METRIC_KEYS.map(key => toNumber(r[key]));
    if (values.some(value => value === null)) continue;
    if (out.some(existing => existing.day === day)) continue;
    out.push({ day, ...Object.fromEntries(METRIC_KEYS.map((key, index) => [key, values[index]])) } as ScoreboardDay);
  }
  return out.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
}

/** Today's date in America/Chicago as YYYY-MM-DD. */
export function centralToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Sum the last `days` calendar days ending today (Central). */
export function summarizeWindow(days: ScoreboardDay[], windowDays: number, today = centralToday()): ScoreboardTotals {
  const totals = emptyTotals();
  const start = shiftDay(today, -(windowDays - 1));
  for (const row of days) {
    if (row.day < start || row.day > today) continue;
    for (const key of METRIC_KEYS) totals[key] += row[key];
  }
  return totals;
}

export function buildWindows(days: ScoreboardDay[], today = centralToday()): ScoreboardWindow[] {
  return SCOREBOARD_WINDOWS.map((window) => ({
    key: window.key,
    label: window.label,
    days: window.days,
    totals: summarizeWindow(days, window.days, today),
  }));
}

/** The last `n` days as a dense series ending today, missing days as zero rows. */
export function recentSeries(days: ScoreboardDay[], n: number, today = centralToday()): ScoreboardDay[] {
  const byDay = new Map(days.map((row) => [row.day, row]));
  const series: ScoreboardDay[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const day = shiftDay(today, -i);
    series.push(byDay.get(day) ?? { day, ...emptyTotals() });
  }
  return series;
}

export function shiftDay(day: string, delta: number) {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + delta));
  return date.toISOString().slice(0, 10);
}

export function formatCount(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}
