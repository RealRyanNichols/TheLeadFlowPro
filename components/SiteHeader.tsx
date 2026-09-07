"use client";

import Link from "next/link";
import BrandLockup from "@/components/BrandLockup";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, LogIn } from "lucide-react";
import { useRef } from "react";

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
  const mobileMenu = useRef<HTMLDetailsElement>(null);
  if (pathname === "/start" || isWorkspacePath(pathname)) return null;
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <BrandLockup />
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
            href="/login"
            className="header-portal inline-flex items-center gap-1.5"
            aria-label="Member and staff portal"
          >
            <LogIn aria-hidden="true" className="h-4 w-4" /> Portal
          </Link>
          <Link
            href="/#qualify"
            className="header-cta"
            data-analytics="cta-free-website-header"
          >
            Find my next step
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </nav>
        <details
          key={pathname}
          ref={mobileMenu}
          className="mobile-nav"
          onKeyDown={(event) => {
            if (event.key !== "Escape" || !mobileMenu.current?.open) return;
            mobileMenu.current.open = false;
            mobileMenu.current.querySelector("summary")?.focus();
            event.preventDefault();
          }}
        >
          <summary aria-label="Open navigation menu">
            <Menu aria-hidden="true" className="h-5 w-5" />
          </summary>
          <div
            className="mobile-nav-panel"
            onClick={(event) => {
              if (
                event.target instanceof Element &&
                event.target.closest("a") &&
                mobileMenu.current
              ) {
                mobileMenu.current.open = false;
              }
            }}
          >
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
            <Link href="/login">
              Member & staff portal{" "}
              <LogIn aria-hidden="true" className="h-4 w-4" />
            </Link>
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
