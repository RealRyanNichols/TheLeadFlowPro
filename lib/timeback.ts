// Every price on the Time Back funnel (/go/time-back) lives here and ONLY
// here. The page reads this file to render, and /api/checkout reads it to
// charge, so the browser can never invent its own total. Change a number
// here, deploy, and both the page and the charge move together.
//
// Pricing approved by Ryan 2026-08-20: 3 posts/day is the floor, and
// 3/day x 7 days = $297 sets the entry per-post rate (~$14/post). The rate
// falls with volume down to ~$5.30/post at the 90-day, 10/day corner.

export const CONTENT_DAYS = [7, 14, 30, 60, 90] as const;
export const CONTENT_PER_DAY = [3, 5, 7, 10] as const;

export type ContentDays = (typeof CONTENT_DAYS)[number];
export type ContentPerDay = (typeof CONTENT_PER_DAY)[number];

// PRICE_GRID[perDay][days] in whole dollars. Every cell ends in 97.
export const PRICE_GRID: Record<number, Record<number, number>> = {
  3: { 7: 297, 14: 497, 30: 897, 60: 1497, 90: 1997 },
  5: { 7: 397, 14: 697, 30: 1297, 60: 2197, 90: 2897 },
  7: { 7: 497, 14: 897, 30: 1697, 60: 2797, 90: 3697 },
  10: { 7: 697, 14: 1197, 30: 2197, 60: 3597, 90: 4797 },
};

// Launch platforms. TikTok is out on purpose (phone-bound publishing),
// YouTube is a different production economics conversation.
export const PLATFORMS = [
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "x", label: "X (Twitter)" },
] as const;

// One email series max per order (radio, not checkbox).
export const EMAIL_SERIES = [
  { id: "email_7", days: 7, price: 297, label: "7-day email follow-up series" },
  { id: "email_14", days: 14, price: 497, label: "14-day email follow-up series" },
  { id: "email_30", days: 30, price: 797, label: "30-day email follow-up series" },
  { id: "email_60", days: 60, price: 1197, label: "60-day email follow-up series" },
  { id: "email_90", days: 90, price: 1497, label: "90-day email follow-up series" },
] as const;

export const EXTRAS = [
  {
    id: "textback",
    price: 297,
    label: "Missed-call text-back automation",
    desc: "Someone calls, nobody answers, they get a text from your number in seconds.",
  },
  {
    id: "reviews",
    price: 197,
    label: "Review request automation",
    desc: "Every finished job triggers a review ask with your direct Google review link.",
  },
  {
    id: "leadform",
    price: 197,
    label: "Lead form + instant alert wiring",
    desc: "A capture form on your site that texts and emails you the second a lead lands.",
  },
] as const;

// First email series discount when bought WITH a content package.
// Ryan's trust-builder: get them on one, they buy more. 0.5 = 50% off.
export const FIRST_EMAIL_DISCOUNT = 0.5;

// The one-time exit offer. Same promise, smaller bite.
export const DOWNSELL = {
  days: 3,
  perDay: 3,
  price: 97,
  label: "3 days, 3 posts a day. Feel a week off from posting.",
};

// REAL capacity, not theater. Ryan sets how many builds the shop can open in
// a week; the page shows it honestly. Update it when capacity changes.
export const WEEKLY_BUILD_SLOTS = 5;

export function priceContent(days: number, perDay: number): number | null {
  const row = PRICE_GRID[perDay];
  const price = row ? row[days] : undefined;
  return typeof price === "number" ? price : null;
}

export type TimebackSelection = {
  downsell?: boolean;
  days?: number;
  perDay?: number;
  emailSeries?: string | null;
  extras?: string[];
};

export type PricedLine = { label: string; amount: number };

// The single source of truth for what an order costs. Returns null when the
// selection is not a sellable combination.
export function priceOrder(sel: TimebackSelection): { total: number; lines: PricedLine[] } | null {
  const lines: PricedLine[] = [];
  let hasContent = false;

  if (sel.downsell) {
    lines.push({ label: `Starter: ${DOWNSELL.days} days x ${DOWNSELL.perDay} posts/day`, amount: DOWNSELL.price });
    hasContent = true;
  } else if (sel.days && sel.perDay) {
    const base = priceContent(sel.days, sel.perDay);
    if (base === null) return null;
    lines.push({
      label: `Content Engine: ${sel.days} days x ${sel.perDay} posts/day (${sel.days * sel.perDay} posts)`,
      amount: base,
    });
    hasContent = true;
  }

  if (sel.emailSeries) {
    const series = EMAIL_SERIES.find((s) => s.id === sel.emailSeries);
    if (!series) return null;
    const discounted = hasContent && !sel.downsell;
    const amount = discounted
      ? Math.round(series.price * (1 - FIRST_EMAIL_DISCOUNT))
      : series.price;
    lines.push({
      label: discounted
        ? `${series.label} (first-series ${Math.round(FIRST_EMAIL_DISCOUNT * 100)}% off)`
        : series.label,
      amount,
    });
  }

  for (const id of sel.extras ?? []) {
    const extra = EXTRAS.find((e) => e.id === id);
    if (!extra) return null;
    lines.push({ label: extra.label, amount: extra.price });
  }

  if (!lines.length) return null;
  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  return { total, lines };
}
