// src/components/site/LightHeader.tsx
// Shared public header used on every public marketing page.
// Sticky, shared public header. Mobile gets real touch targets above the fold.

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BarChart3, ChevronDown, LogIn, Sparkles, Zap } from "lucide-react";
import {
  isActiveNavItem,
  SITE_FOOTER_NAV,
  SITE_MOBILE_NAV,
  SITE_MORE_NAV,
  SITE_PRIMARY_NAV,
} from "@/lib/site-navigation";
import { LightMobileMenu } from "./LightMobileMenu";
import { FunnelMark } from "./Logo";

type HeaderAction = {
  href: string;
  label: string;
  eventName?: string;
  ctaText?: string;
  sourcePage?: string;
  mobileDescription?: string;
  Icon?: LucideIcon;
  muted?: boolean;
};

export function LightHeader({
  activePath,
  primaryAction,
  secondaryAction,
  hideFreeAuditLink,
}: {
  activePath?: string;
  primaryAction?: HeaderAction;
  secondaryAction?: HeaderAction;
  hideFreeAuditLink?: boolean;
}) {
  function cls(item: (typeof SITE_PRIMARY_NAV)[number], base: string) {
    return isActiveNavItem(item, activePath)
      ? `rounded-full border border-cyan-300/55 bg-cyan-300/15 px-2.5 py-1 font-semibold text-cyan-100 shadow-sm shadow-cyan-900/20 hover:text-white ${base}`
      : `rounded-full px-2.5 py-1 text-slate-300 hover:bg-white/10 hover:text-white ${base}`;
  }

  const moreActive = SITE_MORE_NAV.some((item) => isActiveNavItem(item, activePath));
  const primary = primaryAction ?? {
    href: "/tools",
    label: "Open Tools",
    mobileDescription: "Run a LeadFlow tool, scorecard, quiz, or intake path.",
    Icon: Sparkles,
  };
  const secondary = secondaryAction ?? {
    href: "/marketplace",
    label: "Browse Signals",
    mobileDescription: "Search source-backed lead signal products and samples.",
    Icon: BarChart3,
  };

  return (
    <header className="sticky top-0 z-50 border-b border-cyan-300/20 bg-slate-950/95 text-white shadow-[0_18px_44px_-28px_rgba(8,47,73,0.95)] backdrop-blur">
      <div
        aria-hidden
        className="h-1 w-full bg-gradient-to-r from-cyan-400 via-accent-500 to-cyan-200"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-24 h-36 w-36 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute -right-16 -top-24 h-36 w-36 rounded-full bg-accent-500/18 blur-3xl" />
      </div>
      <div className="relative mx-auto flex max-w-[92rem] items-center justify-between gap-3 px-4 py-2">
        <Link
          href="/"
          className="group flex min-w-0 flex-1 items-center gap-2 truncate font-bold text-white xl:flex-none"
        >
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center">
            <FunnelMark className="h-8 w-8" />
          </span>
          <span className="truncate leading-tight">
            <span className="block bg-gradient-to-r from-cyan-100 via-cyan-300 to-accent-300 bg-clip-text text-sm text-transparent sm:text-base">
              The LeadFlow Pro
            </span>
            <span className="hidden text-[0.62rem] font-black uppercase tracking-[0.18em] text-slate-500 sm:block">
              Signal. Proof. Score. Route.
            </span>
          </span>
        </Link>
        <nav className="hidden min-w-0 items-center gap-1 rounded-full border border-cyan-300/15 bg-white/[0.055] px-1.5 py-0.5 text-sm shadow-sm shadow-cyan-900/5 backdrop-blur xl:flex">
          {SITE_PRIMARY_NAV.map((item) => (
            <Link key={item.href} href={item.href} className={cls(item, "")}>
              {item.label}
            </Link>
          ))}
          <div className="group relative">
            <button
              type="button"
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium text-slate-300 hover:bg-white/10 hover:text-white ${
                moreActive ? "border border-cyan-300/55 bg-cyan-300/15 text-cyan-100 shadow-sm shadow-cyan-900/20" : ""
              }`}
              aria-haspopup="true"
            >
              More <ChevronDown className="h-3.5 w-3.5 transition group-hover:rotate-180 group-focus-within:rotate-180" />
            </button>
            <div className="invisible absolute right-0 top-full z-50 mt-3 w-64 translate-y-1 rounded-2xl border border-cyan-300/15 bg-slate-950 p-2 text-sm text-slate-200 opacity-0 shadow-2xl shadow-slate-950/40 transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
              <div className="px-3 pb-2 pt-1 text-[0.65rem] font-black uppercase tracking-[0.22em] text-slate-500">
                More options
              </div>
              <div className="grid gap-1">
                {SITE_MORE_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-xl px-3 py-2 font-semibold hover:bg-white/10 hover:text-white ${
                      isActiveNavItem(item, activePath) ? "bg-cyan-300/15 text-cyan-100" : ""
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
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-cyan-300/25 bg-white/[0.06] px-3 text-sm font-black text-white shadow-sm shadow-cyan-900/20 hover:border-cyan-300/45 hover:bg-white/10"
          >
            <LogIn className="h-4 w-4 text-cyan-200" />
            Client vault
          </Link>
          <Link
            href={primary.href}
            data-conversion-event={primary.eventName}
            data-conversion-cta={primary.ctaText ?? primary.label}
            data-conversion-source-page={primary.sourcePage}
            className="hidden items-center gap-1.5 rounded-lg bg-accent-500 px-3 py-1.5 text-sm font-semibold text-slate-950 shadow-lg shadow-accent-500/20 hover:bg-accent-400 sm:inline-flex sm:px-4"
          >
            {primary.label} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href={secondary.href}
            data-conversion-event={secondary.eventName}
            data-conversion-cta={secondary.ctaText ?? secondary.label}
            data-conversion-source-page={secondary.sourcePage}
            className={`hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold shadow-lg sm:inline-flex sm:px-4 ${
              secondary.muted
                ? "border border-cyan-300/25 bg-white/[0.06] text-white shadow-cyan-900/20 hover:border-cyan-300/45 hover:bg-white/10"
                : "border border-cyan-300/25 bg-cyan-300/10 text-cyan-50 shadow-cyan-900/20 hover:bg-cyan-300/15"
            }`}
          >
            {secondary.label} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <LightMobileMenu
            nav={SITE_MOBILE_NAV}
            activePath={activePath}
            primaryAction={{
              href: primary.href,
              label: primary.label,
              description: primary.mobileDescription ?? primary.label,
              eventName: primary.eventName,
              ctaText: primary.ctaText,
              sourcePage: primary.sourcePage,
            }}
            secondaryAction={{
              href: secondary.href,
              label: secondary.label,
              description: secondary.mobileDescription ?? secondary.label,
              eventName: secondary.eventName,
              ctaText: secondary.ctaText,
              sourcePage: secondary.sourcePage,
            }}
            hideFreeAuditLink={hideFreeAuditLink}
          />
        </div>
      </div>
      <div className="border-t border-cyan-300/15 bg-slate-950/94 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2 px-4 py-2">
          <MobileAction action={primary} primary />
          <MobileAction action={secondary} />
        </div>
      </div>
    </header>
  );
}

function MobileAction({
  action,
  primary,
}: {
  action: HeaderAction;
  primary?: boolean;
}) {
  const Icon = action.Icon ?? (primary ? Sparkles : Zap);
  return (
    <Link
      href={action.href}
      data-conversion-event={action.eventName}
      data-conversion-cta={action.ctaText ?? action.label}
      data-conversion-source-page={action.sourcePage}
      className={`inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2 text-sm font-semibold shadow-sm active:scale-[0.98] ${
        primary
          ? "border-accent-400 bg-accent-500 text-slate-950"
          : "border-cyan-300/25 bg-white/[0.06] text-white"
      }`}
    >
      <Icon className={`h-4 w-4 ${primary ? "text-slate-950" : "text-cyan-200"}`} />
      <span className="min-w-0 text-center leading-tight">{action.label}</span>
    </Link>
  );
}

export function LightFooter({ hideFreeAuditLink }: { hideFreeAuditLink?: boolean }) {
  const funnelItems = hideFreeAuditLink
    ? SITE_FOOTER_NAV.funnel.filter((item) => item.href !== "/lead-leak-audit")
    : SITE_FOOTER_NAV.funnel;

  return (
    <footer className="border-t border-cyan-300/15 bg-slate-950 text-slate-400">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-xs lg:grid-cols-[1.25fr_2fr]">
        <div>
          <div className="font-semibold text-white">The LeadFlow Pro</div>
          <div className="mt-1">Source-backed lead signals, tools, marketplace products, and review-gated buyer routing.</div>
          <div className="mt-3 max-w-xl">
            LeadFlow Pro uses public, submitted, permissioned, or consented signal data.
            Access is review-gated, suppression-aware, and source-backed. We do not
            guarantee revenue, sales, lead volume, ROAS, conversion rate, or cost per lead.
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <FooterGroup title="Funnel" items={funnelItems} />
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
      <div className="font-semibold uppercase tracking-widest text-cyan-200/70">{title}</div>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="font-medium text-slate-300 hover:text-white">
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
