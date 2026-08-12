"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The footer is ink on every page, light or dark, so the site always lands on
// the same anchor. Add-Ons and Free Tools live here now that the primary nav is
// organised around buyer intent. Every route below is live and unchanged.
const COLUMNS: Array<{ heading: string; links: Array<[string, string]> }> = [
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
      ["/portfolio", "The Work"],
      ["/articles", "Articles"],
      ["/about", "About Ryan"],
    ],
  },
  {
    heading: "Work together",
    links: [
      ["/free-build", "Free Build Offer"],
      ["/pricing", "Packages"],
      ["/deposit", "Make a Down Payment"],
      ["/start", "Map My Company"],
      ["/contact", "Contact"],
      ["/login", "Log in"],
    ],
  },
];

export default function SiteFooter() {
  const pathname = usePathname();
  if (pathname === "/start") return null;
  return (
    <footer className="site-footer cb-footer">
      <div className="cb-shell">
        <div className="cb-footer-top">
          <div>
            <Link href="/" className="brand-lockup" aria-label="The LeadFlow Pro home">
              The LeadFlow<span>Pro</span>
            </Link>
            <p className="cb-footer-pitch">
              The Company Builder. We build the website, the system behind it, and the
              back office that runs it, in accounts you control.
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
