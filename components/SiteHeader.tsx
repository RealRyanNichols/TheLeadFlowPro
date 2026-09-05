"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu } from "lucide-react";

// Public navigation mirrors the approved LeadFlow Pro redesign. Existing
// offers, tools, events, training, and login routes remain available from the
// page content and footer without crowding the primary brand bar.
const NAV_LINKS: Array<[string, string]> = [
  ["/", "Home"],
  ["/services", "Build my business"],
  ["/operator-academy", "Learn"],
  ["https://workshop.theleadflowpro.com/", "Events"],
  ["/scoreboard", "Scoreboard"],
  ["/tools", "Tools"],
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
        <Link
          href="/"
          className="brand-lockup"
          aria-label="The LeadFlow Pro home"
        >
          <span className="brand-mark brand-mark-logo" aria-hidden="true">
            <Image src="/images/brand/leadflow-logo.png" alt="" width={96} height={96} sizes="64px" priority />
          </span>
          <span className="brand-words">
            THE LEAD FLOW<small>PRO / YOUR NEXT MOVE</small>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {NAV_LINKS.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={
                pathname === href ||
                (href !== "/" && pathname.startsWith(`${href}/`))
                  ? "page"
                  : undefined
              }
            >
              {label}
            </Link>
          ))}
          <Link
            href="/#qualify"
            className="header-cta"
            data-analytics="cta-free-website-header"
          >
            Find my next step
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </nav>
        <details className="mobile-nav">
          <summary aria-label="Open navigation menu">
            <Menu aria-hidden="true" className="h-5 w-5" />
          </summary>
          <div className="mobile-nav-panel">
            {NAV_LINKS.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                aria-current={
                  pathname === href ||
                  (href !== "/" && pathname.startsWith(`${href}/`))
                    ? "page"
                    : undefined
                }
              >
                {label}
              </Link>
            ))}
            <Link
              href="/#qualify"
              className="header-cta"
              data-analytics="cta-free-website-mobile"
            >
              Find my next step
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}
