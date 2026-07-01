import Link from "next/link";
import {
  BadgeCheck,
  CircleDollarSign,
  DatabaseZap,
  LayoutDashboard,
  LogIn,
  Map,
  Route,
  ShieldCheck,
  Sparkles,
  Store,
  type LucideIcon
} from "lucide-react";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { SITE_PRIMARY_NAV, type SiteNavItem } from "@/lib/site-navigation";

const navIcons: Record<NonNullable<SiteNavItem["icon"]>, LucideIcon> = {
  admin: ShieldCheck,
  contact: Sparkles,
  dashboard: LayoutDashboard,
  guardrail: ShieldCheck,
  home: Sparkles,
  map: Map,
  market: Store,
  profile: BadgeCheck,
  rate: CircleDollarSign,
  score: Route,
  source: DatabaseZap
};

export function Header() {
  return (
    <header className="site-header sticky top-0 z-40">
      <div className="container flex h-16 min-w-0 items-center justify-between gap-3">
        <Logo className="min-w-0" />
        <nav className="lead-nav hidden xl:flex" aria-label="Main navigation">
          {SITE_PRIMARY_NAV.map((item) => {
            const Icon = item.icon ? navIcons[item.icon] : Sparkles;
            return (
              <Link key={item.href} href={item.href} className="lead-nav-link">
                <span className="lead-nav-icon">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span>{item.shortLabel ?? item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="header-utility-btn hidden sm:inline-flex">
            <LogIn className="h-4 w-4" />
            Client vault
          </Link>
          <Link href="/tools" className="btn-accent header-primary-btn hidden sm:inline-flex">
            <Sparkles className="h-4 w-4" />
            Open tools
          </Link>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
