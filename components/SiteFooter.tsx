"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SiteFooter() {
  const pathname = usePathname();
  if (pathname === "/start") return null;
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div>
          <Link href="/" className="brand-lockup" aria-label="The LeadFlow Pro home">
            The LeadFlow<span>Pro</span>
          </Link>
          <p>A DBA of Longview Training Center, LLC</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/pricing">Packages</Link>
          <Link href="/portfolio">The Work</Link>
          <Link href="/articles">Articles</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/start">Map My System</Link>
        </nav>
        <a href="mailto:hello@theleadflowpro.com" className="footer-email">
          hello@theleadflowpro.com
        </a>
      </div>
    </footer>
  );
}
