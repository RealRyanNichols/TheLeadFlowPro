"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu } from "lucide-react";

// Primary navigation is ordered by buyer intent, not by sitemap. Add-Ons and
// Free Tools live in the footer. Product Studio now has a real index at
// /packages; the retired route redirects there for old inbound links.
const NAV_LINKS: Array<[string, string]> = [
  ["/free-build", "Free Build"],
  ["/#what-we-build", "What We Build"],
  ["/portfolio", "The Work"],
  ["/premier-system", "Premier System"],
  ["/#how-it-works", "How It Works"],
  ["/packages", "Packages"],
  ["/events", "Events"],
  ["/about", "About Ryan"],
  ["/articles", "Articles"],
];

function isWorkspacePath(pathname: string) {
  return ["/admin", "/sales", "/dashboard"].some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
}

export default function SiteHeader() {
  const pathname = usePathname();
  if (pathname === "/start" || isWorkspacePath(pathname)) return null;
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand-lockup" aria-label="The LeadFlow Pro home">
          The LeadFlow<span>Pro</span>
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {NAV_LINKS.map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
          <Link href="/login">Log in</Link>
          <Link href="/packages/launch" className="header-cta" data-analytics="cta-start-project-header">
            Website Launch | $500
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </nav>
        <details className="mobile-nav">
          <summary aria-label="Open navigation menu">
            <Menu aria-hidden="true" className="h-5 w-5" />
          </summary>
          <div className="mobile-nav-panel">
            {NAV_LINKS.map(([href, label]) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
            <Link href="/login">Log in</Link>
            <Link href="/packages/launch" className="header-cta" data-analytics="cta-start-project-mobile">
              Website Launch | $500
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}
