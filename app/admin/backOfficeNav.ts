// The Back Office header, as data: the short bar of daily pages, and the Menu
// that lists every page under six plain headings with one line saying what
// each page is for. BackOfficeNav.tsx draws it; the tests read it.
//
// Rules the list follows:
// - Today's calls is first in the bar and appears nowhere else in the header.
// - Every page stays reachable: a page can move between groups, never out.
// - Labels are plain words a person would say. Where a page's own heading is
//   a product name, the description carries it, so the row and the page agree.
// - Descriptions say what you do there, in at most nine words, no dashes.

export type BackOfficeLink = {
  href: string;
  label: string;
  /** One plain line under the label in the Menu. */
  description: string;
  /** Opens in a new tab: a separate site, not a back office page. */
  external?: boolean;
};

export type BackOfficeGroup = {
  /** One to three plain words. */
  title: string;
  /** How often it comes up, and what the group is for. */
  subtitle: string;
  links: readonly BackOfficeLink[];
};

/** The id the Menu's <details> carries, so AdminMenuCloser can find it. */
export const MENU_ID = "back-office-menu";

export const CALL_SHEET_HREF = "/admin/call-sheet";

/**
 * The bar from sm up: Today's calls, then the four pages that come up every
 * day. On a phone only Today's calls shows; the rest wait behind Menu.
 */
export const BAR_LINKS: readonly BackOfficeLink[] = [
  { href: "/admin", label: "Leads", description: "Leads from every source, with status and history" },
  { href: "/admin/sales", label: "Sales desk", description: "Ranked calls and texts, pipeline, delivery, invoices" },
  { href: "/admin/messages", label: "Messages", description: "Client chats and website contact form messages" },
  { href: "/admin/purchases", label: "Purchases", description: "Every Stripe payment and whether the receipt went out" },
];

/**
 * Every page after Today's calls, once each, in the order a person reads
 * them: the groups that come up most sit first.
 */
export const MENU_GROUPS: readonly BackOfficeGroup[] = [
  {
    title: "Calls and leads",
    subtitle: "Between calls: who to call and everyone who came in.",
    links: [
      // Under /admin/sales so Pat (sales) opens it too.
      { href: "/admin/sales/uncalled", label: "Uncalled", description: "Leads nobody has called yet, oldest first" },
      BAR_LINKS[0],
      BAR_LINKS[1],
      { href: "/admin/sales/follow-ups", label: "Follow-ups", description: "Next steps you promised: overdue, today, upcoming" },
    ],
  },
  {
    title: "Money",
    subtitle: "Once a day: what came in and what to send.",
    links: [
      BAR_LINKS[3],
      { href: "/admin/sales/invoices", label: "Invoices", description: "Build and send a Stripe invoice to a lead" },
      { href: "/admin/tlfp", label: "Store credits", description: "TLFP Credits: balances, grants, Founding 100 seats" },
      { href: "/admin/time-back", label: "Time Back orders", description: "Who ordered the Time Back package and who paid" },
      // The owner dashboard on the DigitalOcean server, signed in with this login.
      { href: "/admin/business", label: "Money dashboard", description: "Deposits, invoices and forecast, on the server dashboard" },
    ],
  },
  {
    title: "Marketing",
    subtitle: "Most days: posts, videos, and who saw them.",
    links: [
      { href: "/admin/social", label: "Facebook posts", description: "Write, approve and schedule Facebook Page posts" },
      { href: "/admin/content-command", label: "Post queue", description: "Content Command: approve the day's posts, platform by platform" },
      { href: "/admin/videos", label: "Videos", description: "Type a script, get a talking-head video made" },
      { href: "/admin/analytics", label: "Website traffic", description: "Who visited the site, from where, what they did" },
      { href: "/admin/content-engine", label: "Sample posts", description: "Ten sample posts from one day. Preview only" },
      { href: "https://sites.theleadflowpro.com", label: "Sites", description: "The website audit request page, on its own site", external: true },
    ],
  },
  {
    title: "Clients",
    subtitle: "A few times a week: accounts, builds, and their messages.",
    links: [
      BAR_LINKS[2],
      { href: "/admin/clients", label: "Clients", description: "Every account, their projects, and a Message button" },
      { href: "/admin/projects", label: "Projects", description: "Each client build and its milestone steps" },
      { href: "/admin/events", label: "Workshops", description: "Set up live workshops and see who paid" },
      { href: "/admin/training", label: "Student work", description: "Approve or send back Operator Academy homework" },
      // /dashboard has no view-as mode: it opens the signed-in account's own portal.
      { href: "/dashboard", label: "Client view", description: "The member portal, opened as your own account" },
    ],
  },
  {
    title: "Scoreboards and AI",
    subtitle: "A glance a day: how things are going.",
    links: [
      { href: "/admin/command-center", label: "Overview", description: "The whole business at a glance, read only" },
      { href: "/admin/operator", label: "OperatorOS", description: "AI helpers suggest work from your records; you approve" },
      { href: "/admin/idea-lab", label: "Idea Lab", description: "Reviewed ideas, experiments, and the next build to pick" },
      // The live RN-1 trading desk on its own server. The Overview page frames it too.
      { href: "https://trading.theleadflowpro.com/", label: "RN-1 Desk", description: "The trading robot's live page, on its own site", external: true },
    ],
  },
  {
    title: "Setup",
    subtitle: "Rarely: tracking IDs and lead feeds.",
    links: [
      { href: "/admin/settings", label: "Settings", description: "Ad tracking IDs, booking link, public dashboard switches" },
      { href: "/admin/connections", label: "Lead feeds", description: "Are Facebook, website, text and call feeds still working?" },
      { href: "/admin/service-areas", label: "Territories", description: "The towns you serve, for the managed plans" },
    ],
  },
];

/** Every Menu link, in reading order. */
export const MENU_LINKS: readonly BackOfficeLink[] = MENU_GROUPS.flatMap((group) => group.links);

/**
 * Which header link the current page belongs to, so it can be marked. The
 * longest matching href wins, so /admin/sales/uncalled is Uncalled and not
 * Sales desk. /admin itself is the Leads list, and a lead's own record
 * (/admin/leads/...) belongs to it too; nothing else under /admin does.
 */
export function currentHref(pathname: string | null | undefined): string | null {
  if (!pathname) return null;
  const path = pathname.replace(/\/+$/, "") || "/";
  const hrefs = [CALL_SHEET_HREF, ...MENU_LINKS.filter((l) => !l.external).map((l) => l.href)];
  let best: string | null = null;
  for (const href of hrefs) {
    const matches =
      href === "/admin"
        ? path === "/admin" || path.startsWith("/admin/leads/")
        : path === href || path.startsWith(`${href}/`);
    if (matches && (best === null || href.length > best.length)) best = href;
  }
  return best;
}
