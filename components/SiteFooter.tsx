"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FOOTER_COLUMNS, isChromeHiddenPath } from "@/lib/site-navigation";

// The footer is ink on every page, light or dark, so the site always lands on
// the same anchor. Add-Ons and Free Tools live here now that the primary nav is
// organised around buyer intent. The columns themselves live in
// lib/site-navigation.ts, one source of truth shared with the header.

export default function SiteFooter() {
  const pathname = usePathname();
  if (isChromeHiddenPath(pathname)) return null;
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
          {FOOTER_COLUMNS.map((col) => (
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
