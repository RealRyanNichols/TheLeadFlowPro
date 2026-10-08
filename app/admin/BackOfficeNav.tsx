"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, ChevronDown, Menu, X } from "lucide-react";
import SignOutButton from "@/components/SignOutButton";
import {
  BAR_LINKS,
  CALL_SHEET_HREF,
  MENU_GROUPS,
  MENU_ID,
  currentHref,
  type BackOfficeGroup,
  type BackOfficeLink,
} from "./backOfficeNav.ts";

/**
 * The Back Office header nav. One row: Today's calls, the four daily pages
 * (from sm up), then Menu and Sign out. Menu is a plain <details> that holds
 * every page under six headings, each link with one line saying what it is
 * for. On a phone the six groups fold to one row each, the first open, so
 * the menu opens short; from sm up the groups sit side by side, all open.
 *
 * It opens and closes without JavaScript. The only script here reads the
 * address to mark the page you are on; AdminMenuCloser (in the layout)
 * closes the menu after a tap on a link, outside it, or on Escape.
 */

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]";
/** A bar link: a 44px pill, painted when it is the page you are on. */
const PILL = `inline-flex min-h-[44px] items-center rounded-lg px-3 text-sm font-bold text-[var(--text)] hover:bg-[var(--fill-2)] hover:text-[var(--heading)] aria-[current=page]:bg-[var(--accent-tint)] aria-[current=page]:text-[var(--blue)] ${FOCUS}`;
/** Menu and Sign out: 44px, bordered. */
const BUTTON = `inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[var(--line-strong)] px-3 text-sm font-bold text-[var(--text)] hover:border-[var(--accent-line)] hover:text-[var(--heading)] ${FOCUS}`;
/** A Menu row: the label, then one plain line, the whole row a 44px target. */
const ROW = `flex min-h-[44px] flex-col justify-center rounded-lg px-3 py-1.5 hover:bg-[var(--accent-tint)] aria-[current=page]:bg-[var(--accent-tint)] ${FOCUS}`;
const SUMMARY = `flex cursor-pointer list-none items-center [&::-webkit-details-marker]:hidden ${FOCUS}`;

function Anchor({
  link,
  className,
  current,
  children,
}: {
  link: BackOfficeLink;
  className: string;
  current: boolean;
  children: React.ReactNode;
}) {
  return link.external ? (
    <a href={link.href} target="_blank" rel="noreferrer" className={className}>
      {children}
    </a>
  ) : (
    <Link href={link.href} className={className} aria-current={current ? "page" : undefined}>
      {children}
    </Link>
  );
}

function Group({ group, openOnPhone, current }: { group: BackOfficeGroup; openOnPhone: boolean; current: string | null }) {
  return (
    <div className="min-w-0">
      {/* From sm up the title is a heading and the links always show. */}
      <div className="max-sm:hidden">
        <h2 className="text-[15px] font-black text-[var(--heading)]">{group.title}</h2>
        <p className="mt-0.5 text-xs text-[var(--muted)]">{group.subtitle}</p>
      </div>
      {/* Below sm the title is a row that opens the group; peer-open shows the list under it. */}
      <details className="group/section peer sm:hidden" open={openOnPhone || undefined}>
        <summary className={`${SUMMARY} min-h-[44px] gap-3 rounded-lg px-3 py-2`}>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-black text-[var(--heading)]">{group.title}</span>
            <span className="block text-xs text-[var(--muted)]">{group.subtitle}</span>
          </span>
          <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--muted)] transition-transform group-open/section:rotate-180" />
        </summary>
      </details>
      <ul className="mt-1 space-y-0.5 max-sm:hidden peer-open:block sm:mt-2">
        {group.links.map((link) => (
          <li key={link.href}>
            <Anchor link={link} className={ROW} current={link.href === current}>
              <span className="flex items-center gap-1 text-sm font-bold text-[var(--text)]">
                {link.label}
                {link.external ? <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" /> : null}
              </span>
              <span className="text-xs leading-5 text-[var(--muted)]">{link.description}</span>
            </Anchor>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function BackOfficeNav() {
  const current = currentHref(usePathname());

  return (
    <nav aria-label="Back Office" className="flex min-w-0 flex-1 flex-wrap items-center gap-1 sm:gap-2">
      <Link
        href={CALL_SHEET_HREF}
        className={`${PILL} font-black`}
        aria-current={current === CALL_SHEET_HREF ? "page" : undefined}
      >
        Today&apos;s calls
      </Link>
      {/* From sm up: the four daily pages. display: contents keeps each a direct item of the row. */}
      <div className="contents max-sm:hidden">
        {BAR_LINKS.map((link) => (
          <Anchor key={link.href} link={link} className={PILL} current={link.href === current}>
            {link.label}
          </Anchor>
        ))}
      </div>
      <details id={MENU_ID} className="group ml-auto">
        <summary className={`${BUTTON} ${SUMMARY}`}>
          <Menu aria-hidden="true" className="h-4 w-4 shrink-0 group-open:hidden" />
          <X aria-hidden="true" className="hidden h-4 w-4 shrink-0 group-open:block" />
          <span className="sm:hidden">Menu</span>
          <span className="max-sm:hidden">All pages</span>
        </summary>
        <div className="absolute inset-x-0 top-full z-40 mt-2 max-h-[80vh] overflow-y-auto rounded-xl border border-[var(--line-strong)] bg-[var(--panel)] p-2 shadow-lg sm:p-5">
          <div className="grid gap-y-1 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-6 lg:grid-cols-3">
            {MENU_GROUPS.map((group, index) => (
              <Group key={group.title} group={group} openOnPhone={index === 0} current={current} />
            ))}
          </div>
          {/* Below sm, Sign out is the last row of the menu; from sm up it sits in the bar. */}
          <div className="mt-2 border-t border-[var(--line)] pt-2 sm:hidden">
            <SignOutButton className={`${BUTTON} w-full justify-center`} />
          </div>
        </div>
      </details>
      <div className="max-sm:hidden">
        <SignOutButton className={BUTTON} />
      </div>
    </nav>
  );
}
