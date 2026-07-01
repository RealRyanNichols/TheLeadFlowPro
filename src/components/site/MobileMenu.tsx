"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  BadgeCheck,
  CircleDollarSign,
  DatabaseZap,
  Home,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  Map,
  Menu,
  Route,
  ShieldCheck,
  Sparkles,
  Store,
  X,
  type LucideIcon
} from "lucide-react";
import { Logo } from "./Logo";
import { SITE_MOBILE_NAV, type SiteNavItem } from "@/lib/site-navigation";

// Public drawer with buyer, intake, command, and operator routes surfaced as clear actions.

const mobileIcons: Record<NonNullable<SiteNavItem["icon"]>, LucideIcon> = {
  admin: LockKeyhole,
  contact: Mail,
  dashboard: LayoutDashboard,
  guardrail: ShieldCheck,
  home: Home,
  map: Map,
  market: Store,
  profile: BadgeCheck,
  rate: CircleDollarSign,
  score: Route,
  source: DatabaseZap
};

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  // lock scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const drawer = open ? (
    <div className="fixed inset-0 z-[80] h-dvh xl:hidden">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={() => setOpen(false)}
      />
      <div className="mobile-menu-shell">
        <div className="mb-5 flex items-center justify-between">
          <Logo />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="menu-trigger"
          >
            <X className="h-5 w-5" strokeWidth={2.25} />
          </button>
        </div>
        <div className="mobile-menu-kicker">
          <Sparkles className="h-4 w-4" />
          Choose the next signal
        </div>
        <nav className="-mx-1 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-1 pb-3">
          {SITE_MOBILE_NAV.map((item) => {
            const Icon = item.icon ? mobileIcons[item.icon] : Sparkles;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="mobile-menu-link"
              >
                <span className="mobile-menu-icon">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <strong>{item.label}</strong>
                  {item.description ? <span>{item.description}</span> : null}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 pt-3">
          <Link
            href="/problem-intake"
            onClick={() => setOpen(false)}
            className="btn-accent w-full justify-center py-2.5 text-sm"
          >
            <Sparkles className="h-4 w-4" />
            Start my map
          </Link>
          <Link
            href="/data-marketplace"
            onClick={() => setOpen(false)}
            className="btn-ghost w-full justify-center py-2.5 text-sm"
          >
            Open signal shop
          </Link>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="menu-trigger xl:hidden"
      >
        <Menu className="h-5 w-5" strokeWidth={2.25} />
      </button>

      {drawer ? createPortal(drawer, document.body) : null}
    </>
  );
}
