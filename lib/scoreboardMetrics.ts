import {
  centralToday, SCOREBOARD_METRICS, shiftDay,
  type ScoreboardBusiness, type ScoreboardDay, type ScoreboardMetricKey,
} from "./scoreboard";

export type PublicMetricKey = Exclude<ScoreboardMetricKey, "sales">;
export type MetricGuide = {
  key: PublicMetricKey; slug: string; title: string; question: string;
  steps: readonly string[]; prompt: string;
  article: { slug: string; title: string };
  tool: { slug: string; title: string };
};

export const METRIC_GUIDES: readonly MetricGuide[] = [
  { key: "views", slug: "views", title: "Page views", question: "Are people finding a useful reason to visit?", steps: ["Choose one question customers ask before buying.", "Answer it on one clear page with a useful example.", "Share that page where the question comes up, then watch the daily counts."], prompt: "My business helps [customer] with [problem]. Draft one plain-English page that answers [real customer question]. Include an example and one next step. Use only the facts I provide: [facts].", article: { slug: "east-texas-business-website-guide", title: "What to know before paying for a website" }, tool: { slug: "google-business-profile-scorecard", title: "Check your Google Business Profile" } },
  { key: "clicks", slug: "clicks", title: "Recorded clicks", question: "Can a visitor see the next useful action?", steps: ["Choose one main action for each page.", "Name the button after the result: request a quote, call, or try the tool.", "Tap it on your phone and confirm it reaches the right destination."], prompt: "Review this page copy: [copy]. The visitor needs to [task]. Suggest three clear button labels and explain where each should lead. Keep one main action and avoid pressure or promises.", article: { slug: "website-traffic-but-no-customers", title: "Your website gets visitors. Why is nobody calling?" }, tool: { slug: "website-grader", title: "Check a website" } },
  { key: "leads", slug: "leads", title: "Lead records", question: "Does an inquiry have somewhere useful to go?", steps: ["Ask for the details needed to reply, including the customer’s preferred contact method.", "Explain what happens after they submit.", "Assign the inquiry to one person and record the next step."], prompt: "Create a simple inquiry form for [business]. We need to know [needed details]. Write clear field labels, a consent statement for the contact requested, and a confirmation that says [actual next step and response expectation].", article: { slug: "give-every-inquiry-an-owner-and-next-step", title: "Give every inquiry an owner and a next step" }, tool: { slug: "form-friction-calculator", title: "Check your form for friction" } },
  { key: "paid_leads", slug: "paid-leads", title: "Ad-attributed leads", question: "Can you connect the inquiry to the ad that brought it?", steps: ["Give each campaign a consistent source and campaign tag.", "Check that the form stores those tags with the inquiry.", "Review qualified inquiries and purchases separately from raw lead counts."], prompt: "Build a campaign tracking checklist for [offer]. Include source, medium, campaign, landing page, form test, inquiry owner, and outcome. Do not estimate results or recommend a budget without evidence.", article: { slug: "website-traffic-but-no-customers", title: "Turn website visits into a clear next step" }, tool: { slug: "form-friction-calculator", title: "Review the landing-page form" } },
  { key: "unpaid_leads", slug: "other-leads", title: "Other lead records", question: "Where are the inquiries without an ad tag coming from?", steps: ["Offer a useful answer or free tool on your own site.", "Record source details when they are available.", "Keep unknown sources labeled unknown; compare the actual inquiries."], prompt: "List five useful website resources for [customer] trying to [task]. For each, give the question it answers and a natural next step. Suggest how to record the source without claiming every untagged inquiry is free.", article: { slug: "facebook-page-is-not-a-website", title: "A Facebook page is not a website" }, tool: { slug: "google-review-link", title: "Create a Google review link" } },
  { key: "visitors", slug: "daily-visitors", title: "Daily visitors, summed", question: "Is your site earning visits over time?", steps: ["Make the first screen say who the page helps.", "Link related answers so someone can keep learning.", "Compare the same calendar windows and remember returning visitors can count again."], prompt: "Read this page introduction: [copy]. Make it clear who it is for, what problem it solves, and what the reader can do next. Suggest two related pages that would help, using only these existing pages: [list].", article: { slug: "website-text-too-small-on-mobile", title: "Make your website easier to read on mobile" }, tool: { slug: "website-grader", title: "Review the visitor experience" } },
  { key: "calls", slug: "calls", title: "Recorded calls", question: "What happens when a customer calls?", steps: ["Make the call button easy to find on mobile.", "Set an honest response expectation when you cannot answer.", "Record the callback owner and next action for each inquiry."], prompt: "Write a short missed-call response for [business] that says [actual hours and callback expectation]. Then give me a callback checklist: customer need, urgency, owner, next step, and permission to follow up.", article: { slug: "missed-calls-cost-customers", title: "What missed calls cost your business" }, tool: { slug: "missed-call-calculator", title: "Explore the cost of missed calls" } },
  { key: "forms", slug: "forms", title: "Form and signup activity", question: "Is the form easy to finish and the next step clear?", steps: ["Remove fields you do not need to take the next step.", "Test required fields, consent, errors, and confirmation on a phone.", "Verify the submission reaches the person responsible for replying."], prompt: "Audit this form: [fields and confirmation]. The next step is [actual next step]. Identify unnecessary fields, unclear labels, missing error messages, and how to confirm that the inquiry reached the right person.", article: { slug: "give-every-inquiry-an-owner-and-next-step", title: "Give each inquiry an owner" }, tool: { slug: "form-friction-calculator", title: "Find friction in your form" } },
];

export function metricGuide(slug: string) {
  return METRIC_GUIDES.find((guide) => guide.slug === slug) ?? null;
}
export function metricPath(key: ScoreboardMetricKey) {
  const guide = METRIC_GUIDES.find((item) => item.key === key);
  return guide ? `/scoreboard/metrics/${guide.slug}` : null;
}
export function metricDefinition(key: PublicMetricKey) {
  return SCOREBOARD_METRICS.find((metric) => metric.key === key)!;
}

/** RRN's public RPC explicitly returns zero constants for these unmeasured fields. */
export function tracksMetric(business: ScoreboardBusiness, key: ScoreboardMetricKey) {
  return !(business.slug === "realryannichols" && (key === "calls" || key === "paid_leads"));
}

export type MetricFeed = { business: ScoreboardBusiness; result:
  | { ok: true; days: ScoreboardDay[]; fetchedAt: string | null }
  | { ok: false; reason: string } };
export type MetricPoint = { day: string; value: number | null };

/** Exclude unavailable or incomplete feeds, rather than inventing missing days. */
export function aggregateMetric(feeds: readonly MetricFeed[], key: PublicMetricKey, count = 30, today = centralToday()) {
  const dates = Array.from({ length: count }, (_, i) => shiftDay(today, i - count + 1));
  const expected = feeds.filter(({ business }) => tracksMetric(business, key));
  const contributors = expected.flatMap(({ business, result }) => {
    if (!result.ok) return [];
    const rows = new Map(result.days.map((row) => [row.day, row]));
    if (dates.some((day) => !rows.has(day))) return [];
    return [{ business, rows, fetchedAt: result.fetchedAt }];
  });
  const series: MetricPoint[] = dates.map((day) => ({
    day, value: contributors.length ? contributors.reduce((sum, feed) => sum + feed.rows.get(day)![key], 0) : null,
  }));
  return {
    total: contributors.length ? series.reduce((sum, point) => sum + point.value!, 0) : null,
    series, reporting: contributors.length, expected: expected.length,
    unsupported: feeds.length - expected.length,
    complete: expected.length > 0 && contributors.length === expected.length,
    sources: contributors.map(({ business, rows, fetchedAt }) => ({
      business, total: dates.reduce((sum, day) => sum + rows.get(day)![key], 0), fetchedAt,
    })),
  };
}

export function feedObservationLabel(observedAt: string | null) {
  if (!observedAt) return "Observation time unavailable";
  return `Observed ${new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(observedAt))}`;
}

export const SOURCE_NOTES: Record<string, Record<PublicMetricKey, string>> = {
  "the-leadflow-pro": {
    views: "Page-view analytics events marked non-internal. Repeat page loads count again.", visitors: "Distinct visitor IDs on page-view events per Central day; summed across days.", clicks: "Named CTA, outbound, phone, text, email, tool-start, download, booking-start and checkout-start events. This is a selected action set, not every click.", leads: "Lead records excluding soft-deleted and test records.", paid_leads: "Lead records with a recognized Meta lead-ad source or a paid/cpc/ppc/paid-social medium.", unpaid_leads: "Eligible lead records minus those with a recognized paid-ad source or medium; unknown sources remain included.", calls: "Eligible lead records whose source is quo_call; a phone-button click alone is not a call record.", forms: "Non-internal analytics form_submit events. These need not equal the number of lead rows.",
  },
  "premier-dental-academy-of-longview": {
    views: "Page-visit records whose page marker begins pv:. The public feed does not apply LeadFlow’s internal-traffic filter.", visitors: "Distinct visitor hashes on pv: records per Central day; summed across days.", clicks: "Page-visit records whose marker begins click:. This event set differs from LeadFlow’s selected actions.", leads: "All lead rows returned by the school's aggregate feed. Its current query does not apply a test/deleted filter.", paid_leads: "Lead rows with a recognized Meta lead-ad source or a paid/cpc/ppc/paid-social medium.", unpaid_leads: "Lead rows minus those with a recognized advertising source or paid medium.", calls: "Lead records whose source is quo_call. Repeat callers can produce multiple records.", forms: "Lead rows whose source is neither Quo call/text nor a recognized Meta lead-ad source. This is a source-based category, not a universal form-submit counter.",
  },
  realryannichols: {
    views: "Rows in the site's page-view feed. The public query does not apply LeadFlow’s internal-traffic filter.", visitors: "Distinct visitor hashes per Central day; summed across days. A visitor can count again on another day or site.", clicks: "All page events marked click. This broader event set is not directly comparable with LeadFlow’s selected actions.", leads: "Combined book email signups, notification signups, poll unlocks, and chat escalations with contact information. These are records, not deduplicated people.", paid_leads: "Not tracked in this public feed. Its zero placeholder is excluded from the combined advertising metric.", unpaid_leads: "All included contact/signup records. This feed does not classify paid attribution, so these records have unknown advertising status.", calls: "Not tracked in this public feed. Its zero placeholder is excluded from the combined call metric.", forms: "The same combined contact/signup records as its lead count, including eligible chat escalations. It is not a standalone form-submit event counter.",
  },
};

export function hasCompleteWindow(days: ScoreboardDay[], count: number, today = centralToday()) {
  const dates = new Set(days.map((row) => row.day));
  return Array.from({ length: count }, (_, i) => shiftDay(today, -i)).every((day) => dates.has(day));
}
