"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu } from "lucide-react";

// Primary navigation is ordered by buyer intent, not by sitemap. Add-Ons and
// Free Tools live in the footer: their routes are unchanged, so no inbound link
// breaks and no redirect is needed.
//
// Free Build leads. It is the lead magnet with the ad campaign behind it: the
// build happens first and a down payment moves it forward. Lowest friction way
// in, so it gets the first slot and its own accent.
const NAV_LINKS: Array<[string, string]> = [
  ["/#what-we-build", "What We Build"],
  ["/portfolio", "The Work"],
  ["/live", "Live Proof"],
  ["/#how-it-works", "How It Works"],
  ["/pricing", "Packages"],
  ["/about", "About Ryan"],
  ["/articles", "Articles"],
];

export default function SiteHeader() {
  const pathname = usePathname();
  if (pathname === "/start") return null;
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand-lockup" aria-label="The LeadFlow Pro home">
          The LeadFlow<span>Pro</span>
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <Link href="/free-build" className="nav-free">
            Free Build
          </Link>
          {NAV_LINKS.map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
          <Link href="/login">Log in</Link>
          <Link href="/start" className="header-cta" data-analytics="cta-map-my-company-header">
            Map My Company
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </nav>
        <details className="mobile-nav">
          <summary aria-label="Open navigation menu">
            <Menu aria-hidden="true" className="h-5 w-5" />
          </summary>
          <div className="mobile-nav-panel">
            <Link href="/free-build" className="nav-free">
              Free Build
            </Link>
            {NAV_LINKS.map(([href, label]) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
            <Link href="/login">Log in</Link>
            <Link href="/start" className="header-cta" data-analytics="cta-map-my-company-mobile">
              Map My Company
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}
