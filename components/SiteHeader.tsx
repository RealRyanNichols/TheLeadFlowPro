"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu } from "lucide-react";

const NAV_LINKS: Array<[string, string]> = [
  ["/#systems", "The System"],
  ["/add-ons", "Add-Ons"],
  ["/pricing", "Packages"],
  ["/portfolio", "The Work"],
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
          {NAV_LINKS.map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
          <Link href="/login">Log in</Link>
          <Link href="/start" className="header-cta">
            Map My System
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
            <Link href="/start" className="header-cta">
              Map My System
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}
