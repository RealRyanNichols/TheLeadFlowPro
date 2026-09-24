// Every off-site address the public pages link to. Leaf module.
//
// The Stripe Payment Link for the Website Launch deposit lives here because a
// hosted link is an address, not a secret. Server-created checkouts (plugin,
// Pro Kits, SellerProof, events) never appear here; they are minted per
// session by the API routes.

export const EXTERNAL_LINKS = {
  /** The standalone workshop funnel. A separate deployment, not this repo. */
  workshopSite: "https://workshop.theleadflowpro.com/",
  /** The Build Workspace host (same app, workspace-only routes). */
  workspaceHost: "https://go.theleadflowpro.com",

  /** Ryan's own publishing platform. Separate repo; do not edit from here. */
  realRyanNichols: "https://realryannichols.com",
  /** Separately operated business under common ownership. Attributed example only. */
  premierDentalAcademy: "https://www.premierdentalacademyoflongview.com",
  /** Client site. */
  loneStarTotalWash: "https://www.lonestartotalwash.com",
  loneStarJobs: "https://www.lonestartotalwash.com/jobs",

  youtube: "https://www.youtube.com/@TheLeadFlowProVids",
  facebook: "https://www.facebook.com/profile.php?id=61586176300453",

  /** Hosted Stripe Payment Link: $500 Website Launch deposit. */
  stripeWebsiteLaunchDeposit: "https://book.stripe.com/cNi6oG52y1kockE5oq5AQ0a",

  /**
   * Hosted Stripe Payment Links for Chase Sheet, created 2026-09-24 in the
   * live account (product prod_VJgdpQoFYS70Re). Both carry the same kind and
   * plan metadata as the page checkout and redirect to the claim route, so a
   * sale through a link is fulfilled exactly like a sale through the page.
   * For pasting into a text, a post, or an email; the page buttons use
   * /api/checkout and do not need these.
   */
  stripeChaseSheetMonthly: "https://buy.stripe.com/aFa3cu8eK9QUesMdUW5AQ0d",
  stripeChaseSheetLifetime: "https://buy.stripe.com/28EcN4bqWbZ2esM4km5AQ0e",

  /** The plugin's MCP endpoint, pasted into ChatGPT, Claude, Claude Code, Cursor. */
  mcpEndpoint: "https://www.theleadflowpro.com/api/mcp",

  /**
   * Ryan's self-serve booking page. Set 2026-09-23 to the Calendly event
   * "Straight Answer Call (20 min)": twenty minutes, Ryan calls the invitee,
   * Mon to Sat 9:00 AM to 6:30 PM Central. The welcome email, the text-back,
   * and every Rent Receipt series email link here. Clear it to "" and every
   * consumer hides the line again: bookingPage() returns null.
   */
  bookingPage: "https://calendly.com/ryan-realryannichols/straight-answer-call-20-min" as string,

  /**
   * The Google Business Profile listing (the "share" address of the profile).
   * Empty until the listing is verified. While empty, structured data and
   * the contact page leave it out; nothing links to an unverified profile.
   */
  googleBusinessProfile: "" as string,
} as const;

export type ExternalLinkKey = keyof typeof EXTERNAL_LINKS;

/** The booking page when Ryan has set one, otherwise null. Consumers hide the line on null. */
export function bookingPage(): string | null {
  return optionalLink(EXTERNAL_LINKS.bookingPage);
}

/** The Google Business Profile address when set, otherwise null. */
export function googleBusinessProfile(): string | null {
  return optionalLink(EXTERNAL_LINKS.googleBusinessProfile);
}

/** An optional address counts only when it is a real https URL. Anything else reads as unset. */
export function optionalLink(value: string): string | null {
  const trimmed = value.trim();
  return /^https:\/\/[^\s]+$/.test(trimmed) ? trimmed : null;
}
