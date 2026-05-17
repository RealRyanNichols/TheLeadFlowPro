// src/components/site/LightHeader.tsx
// Shared light-theme header used on every public marketing page.
// Sticky, shared public header. Mobile gets real touch targets above the fold.

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, ChevronDown, ClipboardCheck, Sparkles } from "lucide-react";
import {
  isActiveNavItem,
  SITE_FOOTER_NAV,
  SITE_MOBILE_NAV,
  SITE_MORE_NAV,
  SITE_PRIMARY_NAV,
} from "@/lib/site-navigation";
import { HeaderAuthActions } from "@/components/auth/HeaderAuthActions";
import { LightMobileMenu } from "./LightMobileMenu";

export function LightHeader({ activePath }: { activePath?: string }) {
  function cls(item: (typeof SITE_PRIMARY_NAV)[number], base: string) {
    return isActiveNavItem(item, activePath)
      ? `rounded-full border border-cyan-300/60 bg-cyan-100/80 px-2.5 py-1 font-semibold text-cyan-800 shadow-sm shadow-cyan-900/5 hover:text-cyan-900 ${base}`
      : `rounded-full px-2.5 py-1 hover:bg-white/70 hover:text-slate-950 ${base}`;
  }

  const moreActive = SITE_MORE_NAV.some((item) => isActiveNavItem(item, activePath));

  return (
    <header className="sticky top-0 z-50 border-b border-cyan-400/80 bg-[linear-gradient(135deg,rgba(204,239,255,0.99)_0%,rgba(167,226,247,0.97)_34%,rgba(255,233,177,0.98)_68%,rgba(255,197,111,0.97)_100%)] shadow-[0_14px_36px_-28px_rgba(15,23,42,0.82)] backdrop-blur">
      <div
        aria-hidden
        className="h-1 w-full bg-gradient-to-r from-slate-950 via-cyan-500 to-accent-500"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-24 h-36 w-36 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute -right-16 -top-24 h-36 w-36 rounded-full bg-accent-500/20 blur-3xl" />
      </div>
      <div className="relative mx-auto flex max-w-[92rem] items-center justify-between gap-3 px-4 py-2">
        <Link
          href="/"
          className="group flex min-w-0 flex-1 items-center gap-2 truncate font-bold text-slate-950 xl:flex-none"
        >
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-300/70 bg-slate-950 text-xs font-black text-cyan-200 shadow-lg shadow-cyan-900/15">
            LF
          </span>
          <span className="truncate">
            <span className="hidden text-slate-950 sm:inline">The </span>
            <span className="bg-gradient-to-r from-brand-800 via-cyan-600 to-accent-500 bg-clip-text text-transparent">
              LeadFlow Pro
            </span>
          </span>
        </Link>
        <nav className="hidden min-w-0 items-center gap-1 rounded-full border border-cyan-200/80 bg-white/45 px-1.5 py-0.5 text-sm text-slate-800 shadow-sm shadow-cyan-900/5 backdrop-blur xl:flex">
          {SITE_PRIMARY_NAV.map((item) => (
            <Link key={item.href} href={item.href} className={cls(item, "")}>
              {item.label}
            </Link>
          ))}
          <div className="group relative">
            <button
              type="button"
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium hover:bg-white/70 hover:text-slate-950 ${
                moreActive ? "border border-cyan-300/60 bg-cyan-100/80 text-cyan-800 shadow-sm shadow-cyan-900/5" : ""
              }`}
              aria-haspopup="true"
            >
              More <ChevronDown className="h-3.5 w-3.5 transition group-hover:rotate-180 group-focus-within:rotate-180" />
            </button>
            <div className="invisible absolute right-0 top-full z-50 mt-3 w-64 translate-y-1 rounded-2xl border border-cyan-100 bg-white p-2 text-sm text-slate-800 opacity-0 shadow-2xl shadow-slate-950/10 transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
              <div className="px-3 pb-2 pt-1 text-[0.65rem] font-black uppercase tracking-[0.22em] text-slate-400">
                More paths
              </div>
              <div className="grid gap-1">
                {SITE_MORE_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-xl px-3 py-2 font-semibold hover:bg-cyan-50 hover:text-slate-950 ${
                      isActiveNavItem(item, activePath) ? "bg-cyan-50 text-cyan-800" : ""
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <HeaderAuthActions />
          <Link
            href="/lead-leak-audit-197"
            className="hidden items-center gap-1.5 rounded-lg bg-gradient-to-r from-slate-950 via-brand-950 to-slate-900 px-3 py-1.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 hover:from-brand-950 hover:to-slate-950 sm:inline-flex sm:px-4"
          >
            Start audit <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/book"
            className="hidden items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent-500 to-accent-400 px-3 py-1.5 text-sm font-semibold text-white shadow-lg shadow-accent-500/20 hover:from-accent-600 hover:to-accent-500 sm:inline-flex sm:px-4"
          >
            Book call <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <LightMobileMenu nav={SITE_MOBILE_NAV} activePath={activePath} />
        </div>
      </div>
      <div className="border-t border-cyan-200/70 bg-gradient-to-r from-cyan-100/80 via-white/70 to-accent-100/75 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2 px-4 py-2">
          <MobileAction href="/lead-leak-audit-197" label="$197 Audit" Icon={ClipboardCheck} primary />
          <MobileAction href="/book" label="Book Call" Icon={Sparkles} />
        </div>
      </div>
    </header>
  );
}

function MobileAction({
  href,
  label,
  Icon,
  primary,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2 text-sm font-semibold shadow-sm active:scale-[0.98] ${
        primary
          ? "border-slate-900 bg-gradient-to-r from-slate-950 via-brand-950 to-slate-900 text-white"
          : "border-cyan-200 bg-white/80 text-slate-900"
      }`}
    >
      <Icon className={`h-4 w-4 ${primary ? "text-cyan-300" : "text-cyan-700"}`} />
      {label}
    </Link>
  );
}

export function LightFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-xs text-slate-500 lg:grid-cols-[1.25fr_2fr]">
        <div>
          <div className="font-semibold text-slate-700">The LeadFlow Pro</div>
          <div className="mt-1">A Real Ryan Nichols LLC company - Texas</div>
          <div className="mt-3 max-w-xl">
            We do not guarantee specific follower-count, lead-volume, conversion-rate, or
            revenue outcomes. Paid-ad budgets are paid by clients directly to Meta, Google, or
            other ad platforms, never invoiced through us.
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <FooterGroup title="Funnel" items={SITE_FOOTER_NAV.funnel} />
          <FooterGroup title="Company" items={SITE_FOOTER_NAV.company} />
          <FooterGroup title="Tools" items={SITE_FOOTER_NAV.tools} />
          <FooterGroup title="Legal" items={SITE_FOOTER_NAV.legal} />
        </div>
      </div>
    </footer>
  );
}

function FooterGroup({ title, items }: { title: string; items: Array<{ href: string; label: string }> }) {
  return (
    <div>
      <div className="font-semibold uppercase tracking-widest text-slate-400">{title}</div>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="font-medium text-slate-600 hover:text-slate-950">
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
