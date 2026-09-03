"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The footer is ink on every page, light or dark, so the site always lands on
// the same anchor. Add-Ons and Free Tools live here now that the primary nav is
// organised around buyer intent.
const COLUMNS: Array<{ heading: string; links: Array<[string, string]> }> = [
  {
    heading: "What we build",
    links: [
      ["/#what-we-build", "The four parts"],
      ["/add-ons", "Add-On Menu"],
      ["/tools", "Free Tools"],
      ["/tools/pro", "Pro Kits | $10 to $29"],
      ["/#how-it-works", "How it works"],
    ],
  },
  {
    heading: "Proof",
    links: [
      ["/premier-system", "Premier System"],
      ["/proof-floor", "Proof Floor"],
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
      ["/free-build", "Free Website | $0 Build Fee"],
      ["/start", "Map My Company"],
      [
        "/diagnostic?utm_source=website&utm_medium=footer&utm_campaign=business_diagnostic",
        "Business Growth Diagnostic",
      ],
      ["/contact", "Contact"],
      ["/login", "Log in"],
    ],
  },
];

export default function SiteFooter() {
  const pathname = usePathname();
  const isWorkspace = ["/admin", "/sales", "/dashboard"].some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
  if (pathname === "/start" || isWorkspace) return null;
  return (
    <footer className="site-footer cb-footer">
      <div className="cb-shell">
        <div className="cb-footer-top">
          <div>
            <Link href="/" className="brand-lockup" aria-label="The LeadFlow Pro home">
              The LeadFlow<span>Pro</span>
            </Link>
            <p className="cb-footer-pitch">
              More attention. More leads. More revenue. We connect the website, follow-up,
              sales tools, and operating system in accounts you control.
            </p>
            <a href="mailto:hello@theleadflowpro.com" className="cb-textlink mt-6 inline-flex">
              hello@theleadflowpro.com
            </a>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.heading} className="cb-footer-col">
              <h2>{col.heading}</h2>
              <nav aria-label={col.heading}>
                {col.links.map(([href, label]) => (
                  <Link key={href} href={href}>
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>
        <div className="cb-footer-bottom">
          <span>
            &copy; {new Date().getFullYear()} The LeadFlow Pro. A DBA of Longview Training
            Center, LLC.
          </span>
          <nav aria-label="Legal">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
