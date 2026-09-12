"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Megaphone, Plug, Settings, Sun, Users } from "lucide-react";

// The six places in HQ. The current one is marked for screen readers as well
// as painted, and the row scrolls sideways on a phone instead of wrapping
// into a block that pushes the page down.

const LINKS = [
  { href: "/hq", label: "Today", icon: Sun },
  { href: "/hq/leads", label: "Leads", icon: Users },
  { href: "/hq/content", label: "Content", icon: Megaphone },
  { href: "/hq/plugin", label: "Plugin", icon: Plug },
  { href: "/hq/settings", label: "Settings", icon: Settings },
  { href: "/hq/billing", label: "Billing", icon: CreditCard },
];

export default function HqNav() {
  const pathname = usePathname() ?? "/hq";
  return (
    <nav aria-label="Your HQ" className="hq-nav">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const current = href === "/hq" ? pathname === "/hq" : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} className="hq-nav-link" aria-current={current ? "page" : undefined}>
            <Icon aria-hidden="true" className="h-4 w-4 text-[var(--blue)]" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
