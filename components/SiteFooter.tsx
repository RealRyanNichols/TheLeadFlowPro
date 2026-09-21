"use client";

import Link from "next/link";
import BrandLockup from "@/components/BrandLockup";
import { usePathname } from "next/navigation";
import { BUSINESS } from "@/lib/site/business";
import {
  FOOTER_COLUMNS,
  FOOTER_PITCH,
  LEGAL_LINKS,
  hidesSiteChrome,
} from "@/lib/site/navigation";
import { CALL_LABEL, TEXT_LABEL, smsHref } from "@/lib/site/textLinks";

// The one public footer, ink on every page. Columns, price labels, the
// contact address, and the DBA line all come from lib/site so a change lands
// everywhere at once.

export default function SiteFooter() {
  const pathname = usePathname();
  if (hidesSiteChrome(pathname)) return null;
  return (
    <footer className="site-footer cb-footer">
      <div className="cb-shell">
        <div className="cb-footer-top">
          <div>
            <BrandLockup />
            <p className="cb-footer-pitch">{FOOTER_PITCH}</p>
            <a href={`mailto:${BUSINESS.email.hello}`} className="cb-textlink mt-6 inline-flex">
              {BUSINESS.email.hello}
            </a>
            <a href={BUSINESS.phone.tel} className="cb-textlink mt-2 inline-flex" data-cta="call" data-cta-placement="footer">
              {CALL_LABEL}
            </a>
            <a href={smsHref("footer")} className="cb-textlink mt-2 inline-flex" data-cta="text" data-cta-placement="footer">
              {TEXT_LABEL}
            </a>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.heading} className="cb-footer-col">
              <h2>{col.heading}</h2>
              <nav aria-label={col.heading}>
                {col.links.map((link) =>
                  link.href.startsWith("http") ? (
                    <a key={link.href} href={link.href}>
                      {link.label}
                    </a>
                  ) : (
                    <Link key={link.href} href={link.href}>
                      {link.label}
                    </Link>
                  ),
                )}
              </nav>
            </div>
          ))}
        </div>
        <div className="cb-footer-bottom">
          <span>
            &copy; {new Date().getFullYear()} {BUSINESS.name}. A DBA of {BUSINESS.legalName}.
          </span>
          <nav aria-label="Legal">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
