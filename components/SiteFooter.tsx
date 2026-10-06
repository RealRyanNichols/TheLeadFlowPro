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
  type NavLink,
} from "@/lib/site/navigation";
import { CALL_LABEL, TEXT_LABEL, smsHref } from "@/lib/site/textLinks";

// The one public footer, ink on every page. Columns, price labels, the
// contact address, and the DBA line all come from lib/site so a change lands
// everywhere at once.

function FooterLink({ link }: { link: NavLink }) {
  return link.href.startsWith("http") ? (
    <a href={link.href}>{link.label}</a>
  ) : (
    <Link href={link.href}>{link.label}</Link>
  );
}

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
            <nav aria-label="Contact The LeadFlow Pro" className="mt-6 flex flex-col items-start gap-2">
            <a href={`mailto:${BUSINESS.email.hello}`} className="cb-textlink">
              {BUSINESS.email.hello}
            </a>
            <a href={BUSINESS.phone.tel} className="cb-textlink" data-cta="call" data-cta-placement="footer">
              {CALL_LABEL}
            </a>
            <a href={smsHref("footer")} className="cb-textlink" data-cta="text" data-cta-placement="footer">
              {TEXT_LABEL}
            </a>
            </nav>
          </div>
          {FOOTER_COLUMNS.map((col) => {
            const featured = col.links.filter((link) => !col.featuredHrefs || col.featuredHrefs.includes(link.href));
            const more = col.featuredHrefs ? col.links.filter((link) => !col.featuredHrefs?.includes(link.href)) : [];
            return (
            <div key={col.heading} className="cb-footer-col">
              <h2>{col.heading}</h2>
              <nav aria-label={col.heading}>
                {featured.map((link) => <FooterLink key={link.href} link={link} />)}
              </nav>
              {more.length ? (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-bold leading-6">{col.moreLabel}</summary>
                  <nav aria-label={`${col.heading}: more options`} className="mt-3">
                    {more.map((link) => <FooterLink key={link.href} link={link} />)}
                  </nav>
                </details>
              ) : null}
            </div>
            );
          })}
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
