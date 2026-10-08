"use client";

import Link from "next/link";
import BrandLockup from "@/components/BrandLockup";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronDown, Menu, LogIn, MessageSquareText } from "lucide-react";
import { useRef } from "react";
import { HEADER_CTA, HEADER_PORTAL, NAV_GROUPS, hidesSiteChrome } from "@/lib/site/navigation";
import { smsHref } from "@/lib/site/textLinks";
import styles from "./SiteChrome.module.css";

export default function SiteHeader() {
  const pathname = usePathname();
  const mobileMenu = useRef<HTMLDetailsElement>(null);
  const header = useRef<HTMLElement>(null);
  if (hidesSiteChrome(pathname)) return null;
  const current = (href: string) => pathname === href ? "page" : undefined;
  const closeMenus = () => header.current?.querySelectorAll<HTMLDetailsElement>("details[open]").forEach((menu) => { menu.open = false; });
  return (
    <header data-public-site="leadflow" ref={header} key={pathname} className={styles.header} onKeyDown={(event) => {
      if (event.key !== "Escape") return;
      const menu = (event.target as Element).closest<HTMLDetailsElement>("details[open]");
      if (menu) { menu.open = false; menu.querySelector("summary")?.focus(); event.preventDefault(); }
    }} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) closeMenus();
    }}>
      <div className={styles.headerInner}>
        <BrandLockup />
        {/* header-text-mobile stays outside the collapsed navigation. */}
        <a href={smsHref("header_mobile")} className={styles.mobileText} aria-label="Text Ryan" data-cta="text" data-cta-placement="header_mobile"><MessageSquareText size={20} aria-hidden="true" /></a>
        <nav className={styles.desktopNav} aria-label="Primary navigation" onClick={(event) => { if ((event.target as Element).closest("a")) closeMenus(); }}>
          {NAV_GROUPS.map((group) => (
            <details className={styles.dropdown} key={group.href} onToggle={(event) => {
              if (event.currentTarget.open) header.current?.querySelectorAll<HTMLDetailsElement>("details[open]").forEach((other) => { if (other !== event.currentTarget) other.open = false; });
            }}>
              <summary>{group.label}<ChevronDown size={14} aria-hidden="true" /></summary>
              <div className={styles.dropdownPanel}>
                <p>{group.label}</p>
                {group.links.map((link) => <Link key={link.href} href={link.href} aria-current={current(link.href)}>{link.label}<ArrowRight size={15} aria-hidden="true" /></Link>)}
              </div>
            </details>
          ))}
          <Link href={HEADER_PORTAL.href} className={styles.portal} aria-label="Member and staff portal"><LogIn size={16} aria-hidden="true" />{HEADER_PORTAL.label}</Link>
          <Link href={HEADER_CTA.href} className={styles.cta} data-cta="consultation_cta" data-cta-placement="header">{HEADER_CTA.label}<ArrowRight size={17} aria-hidden="true" /></Link>
        </nav>
        <details ref={mobileMenu} className={styles.mobileNav}>
          <summary aria-label="Navigation menu"><Menu size={23} aria-hidden="true" /></summary>
          <nav className={styles.mobilePanel} aria-label="Primary navigation" onClick={(event) => { if ((event.target as Element).closest("a")) { closeMenus(); mobileMenu.current?.querySelector("summary")?.focus(); } }}>
            {NAV_GROUPS.map((group) => <div className={styles.mobileGroup} key={group.href}><p>{group.label}</p>{group.links.map((link) => <Link key={link.href} href={link.href} aria-current={current(link.href)}>{link.label}</Link>)}</div>)}
            <Link href={HEADER_PORTAL.href} className={styles.portal}>Member & staff portal<LogIn size={16} aria-hidden="true" /></Link>
            <Link href={HEADER_CTA.href} className={styles.cta} data-cta="consultation_cta" data-cta-placement="header_mobile">{HEADER_CTA.label}<ArrowRight size={17} aria-hidden="true" /></Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
