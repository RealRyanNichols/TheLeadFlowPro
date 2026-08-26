// One source of truth for the primary nav and the footer. SiteHeader and
// SiteFooter render from these arrays; add or move a link here, never in the
// components, so the two can never drift apart.
//
// Primary navigation is ordered by buyer intent, not by sitemap. Add-Ons and
// Free Tools live in the footer.

export const NAV_LINKS: Array<[string, string]> = [
  ["/#what-we-build", "What We Build"],
  ["/portfolio", "The Work"],
  ["/premier-system", "Premier System"],
  ["/hold-the-line", "Hold The Line"],
  ["/#how-it-works", "How It Works"],
  ["/packages", "Packages"],
  ["/events", "Events"],
  ["/about", "About Ryan"],
  ["/articles", "Articles"],
];

export const FOOTER_COLUMNS: Array<{
  heading: string;
  links: Array<[string, string]>;
}> = [
  {
    heading: "What we build",
    links: [
      ["/#what-we-build", "The four parts"],
      ["/add-ons", "Add-On Menu"],
      ["/tools", "Free Tools"],
      ["/#how-it-works", "How it works"],
    ],
  },
  {
    heading: "Proof",
    links: [
      ["/premier-system", "Premier System"],
      ["/live", "Live Proof"],
      ["/portfolio", "The Work"],
      ["/articles", "Articles"],
      ["/about", "About Ryan"],
    ],
  },
  {
    heading: "Work together",
    links: [
      ["/packages", "Packages"],
      ["/events", "Events & Workshops"],
      ["/go/lead-follow-up", "Follow-Up Campaign | $197"],
      ["/packages/launch", "Website Launch | $1,000"],
      ["/hold-the-line", "Hold The Line"],
      ["/start", "Map My Company"],
      ["/contact", "Contact"],
      ["/login", "Log in"],
    ],
  },
];

// Routes where the marketing chrome (header and footer) stays hidden.
export function isChromeHiddenPath(pathname: string) {
  if (pathname === "/start") return true;
  return ["/admin", "/sales", "/dashboard"].some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
}
