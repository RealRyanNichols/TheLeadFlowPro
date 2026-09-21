"use client";

import Link from "next/link";
import BrandLockup from "@/components/BrandLockup";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, LogIn, MessageSquareText } from "lucide-react";
import { useRef } from "react";
import {
  HEADER_CTA,
  HEADER_PORTAL,
  NAV_LINKS,
  hidesSiteChrome,
} from "@/lib/site/navigation";
import { smsHref } from "@/lib/site/textLinks";

// The one public header. Links come from lib/site/navigation.ts; nothing
// here defines a destination. The Portal link is always present so signed-in
// members and staff can reach the workspace from any public page.

export default function SiteHeader() {
  const pathname = usePathname();
  const mobileMenu = useRef<HTMLDetailsElement>(null);
  if (hidesSiteChrome(pathname)) return null;
  const current = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)) ? "page" : undefined;
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <BrandLockup />
        <nav className="desktop-nav" aria-label="Primary navigation">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} aria-current={current(link.href)}>
              {link.label}
            </Link>
          ))}
          <Link
            href={HEADER_PORTAL.href}
            className="header-portal inline-flex items-center gap-1.5"
            aria-label="Member and staff portal"
          >
            <LogIn aria-hidden="true" className="h-4 w-4" /> {HEADER_PORTAL.label}
          </Link>
          <Link
            href={HEADER_CTA.href}
            className="header-cta"
            data-cta="consultation_cta"
            data-cta-placement="header"
          >
            {HEADER_CTA.label}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </nav>
        {/* On a phone the menu hides every link; the one-tap text stays outside it. */}
        <a
          href={smsHref("header_mobile")}
          className="header-text-mobile"
          aria-label="Text Ryan"
          data-cta="text"
          data-cta-placement="header_mobile"
        >
          <MessageSquareText aria-hidden="true" className="h-5 w-5" />
        </a>
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
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} aria-current={current(link.href)}>
                {link.label}
              </Link>
            ))}
            <Link href={HEADER_PORTAL.href}>
              Member & staff portal <LogIn aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link
              href={HEADER_CTA.href}
              className="header-cta"
              data-cta="consultation_cta"
              data-cta-placement="header_mobile"
            >
              {HEADER_CTA.label}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}
