"use client";

import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Calendar,
  Gauge,
  Home,
  LogIn,
  Mail,
  Menu,
  Megaphone,
  Package,
  Trophy,
  Wrench,
  X,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
};

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  "/": Home,
  "/services": Package,
  "/services/consulting": BriefcaseBusiness,
  "/tiers": Package,
  "/leaderboard": Trophy,
  "/voice": Megaphone,
  "/story": BookOpen,
  "/availability": Gauge,
  "/contact": Mail,
};

export function LightMobileMenu({
  nav,
  activePath,
}: {
  nav: NavItem[];
  activePath?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open site menu"
        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-cyan-300/40 bg-gradient-to-r from-slate-950 via-brand-950 to-cyan-950 px-3 text-sm font-semibold text-white shadow-lg shadow-cyan-900/15 active:scale-[0.98] lg:hidden"
      >
        <Menu className="h-4 w-4" />
        Menu
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button
            type="button"
            aria-label="Close menu backdrop"
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-3 top-3 max-h-[calc(100dvh-24px)] overflow-y-auto rounded-3xl border border-cyan-200/70 bg-[linear-gradient(135deg,#fff8f1_0%,#eef9ff_58%,#fff1df_100%)] shadow-2xl shadow-slate-950/25">
            <div className="h-1 bg-gradient-to-r from-brand-700 via-cyan-400 to-accent-500" />
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-cyan-200/70 bg-white/70 px-4 py-3 backdrop-blur">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="font-bold"
              >
                <span className="bg-gradient-to-r from-brand-800 via-cyan-600 to-accent-500 bg-clip-text text-transparent">
                  The LeadFlow Pro
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200 bg-white/80 text-slate-900 shadow-sm active:scale-[0.98]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/challenge"
                  onClick={() => setOpen(false)}
                  className="rounded-2xl bg-gradient-to-br from-slate-950 via-brand-950 to-cyan-950 p-4 text-white shadow-lg shadow-slate-950/20 active:scale-[0.98]"
                >
                  <Wrench className="h-5 w-5 text-cyan-300" />
                  <div className="mt-3 text-sm font-semibold">Stump Ryan</div>
                  <div className="mt-1 text-xs leading-relaxed text-slate-300">
                    Challenge him with the tool you need.
                  </div>
                </Link>
                <Link
                  href="/book"
                  onClick={() => setOpen(false)}
                  className="rounded-2xl bg-accent-500 p-4 text-white shadow-lg shadow-accent-500/25 active:scale-[0.98]"
                >
                  <Calendar className="h-5 w-5" />
                  <div className="mt-3 text-sm font-semibold">Book 10-min call</div>
                  <div className="mt-1 text-xs leading-relaxed text-white/85">
                    Serious buyers only.
                  </div>
                </Link>
              </div>

              <nav className="mt-4 grid gap-2">
                {nav.map((item) => {
                  const Icon = ICONS[item.href] ?? ArrowRight;
                  const active = item.href === activePath;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex min-h-14 items-center justify-between rounded-2xl border px-4 text-base font-semibold active:scale-[0.99] ${
                        active
                          ? "border-cyan-300 bg-cyan-100/80 text-cyan-950 shadow-sm"
                          : "border-white/80 bg-white/70 text-slate-900 shadow-sm hover:border-cyan-200"
                      }`}
                    >
                      <span className="inline-flex items-center gap-3">
                        <Icon className="h-5 w-5 text-cyan-700" />
                        {item.label}
                      </span>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-cyan-200 bg-white/80 text-sm font-semibold text-slate-900 shadow-sm active:scale-[0.98]"
                >
                  <LogIn className="h-4 w-4 text-slate-600" />
                  Log in
                </Link>
                <Link
                  href="/contact"
                  onClick={() => setOpen(false)}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-accent-200 bg-accent-100/80 text-sm font-semibold text-slate-950 shadow-sm active:scale-[0.98]"
                >
                  <Mail className="h-4 w-4" />
                  Contact
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
