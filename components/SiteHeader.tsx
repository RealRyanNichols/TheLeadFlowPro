"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu } from "lucide-react";

// Public navigation mirrors the approved LeadFlow Pro redesign. Existing
// offers, tools, events, training, and login routes remain available from the
// page content and footer without crowding the primary brand bar.
const NAV_LINKS: Array<[string, string]> = [
  ["/", "Home"],
  ["/services", "Services"],
  ["/results", "Results"],
  ["/about", "About"],
  ["/articles", "Blog"],
  ["/contact", "Contact"],
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
          <Link href="/free-build" className="header-cta" data-analytics="cta-free-website-header">
            Free Website
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
            <Link href="/free-build" className="header-cta" data-analytics="cta-free-website-mobile">
              Free Website
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}
