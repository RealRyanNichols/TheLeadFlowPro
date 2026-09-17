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

  /** The plugin's MCP endpoint, pasted into ChatGPT, Claude, Claude Code, Cursor. */
  mcpEndpoint: "https://www.theleadflowpro.com/api/mcp",
} as const;

export type ExternalLinkKey = keyof typeof EXTERNAL_LINKS;
