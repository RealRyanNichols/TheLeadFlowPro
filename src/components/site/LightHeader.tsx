// src/components/site/LightHeader.tsx
// Shared light-theme header used on every public marketing page.
// Sticky, shared public header. Mobile gets real touch targets above the fold.

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BriefcaseBusiness, Package } from "lucide-react";
import { LightMobileMenu } from "./LightMobileMenu";

export function LightHeader({ activePath }: { activePath?: string }) {
  function cls(path: string, base: string) {
    return path === activePath
      ? `rounded-full border border-cyan-300/60 bg-cyan-100/80 px-3 py-1.5 font-semibold text-cyan-800 shadow-sm shadow-cyan-900/5 hover:text-cyan-900 ${base}`
      : `rounded-full px-3 py-1.5 hover:bg-white/70 hover:text-slate-950 ${base}`;
  }

  const nav = [
    { href: "/", label: "Home" },
    { href: "/services", label: "Social Media" },
    { href: "/services/consulting", label: "Consulting" },
    { href: "/tiers", label: "Pricing" },
    { href: "/leaderboard", label: "Top 10" },
    { href: "/voice", label: "Voice" },
    { href: "/story", label: "Story" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <header className="sticky top-0 z-50 overflow-visible border-b border-cyan-300/70 bg-[linear-gradient(135deg,rgba(234,246,255,0.99)_0%,rgba(213,244,255,0.96)_34%,rgba(255,247,225,0.98)_68%,rgba(255,229,190,0.96)_100%)] shadow-[0_14px_36px_-28px_rgba(15,23,42,0.75)] backdrop-blur">
      <div
        aria-hidden
        className="h-1.5 w-full bg-gradient-to-r from-slate-950 via-cyan-500 to-accent-500"
      />
      <div className="pointer-events-none absolute -left-20 -top-24 h-40 w-40 rounded-full bg-cyan-300/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 -top-24 h-40 w-40 rounded-full bg-accent-300/25 blur-3xl" />
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-2.5 lg:py-3">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-2 truncate font-bold text-slate-950"
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/70 bg-slate-950 text-sm font-black text-cyan-200 shadow-lg shadow-cyan-900/15">
            LF
          </span>
          <span className="truncate">
            <span className="hidden text-slate-950 sm:inline">The </span>
            <span className="bg-gradient-to-r from-brand-800 via-cyan-600 to-accent-500 bg-clip-text text-transparent">
              LeadFlow Pro
            </span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 rounded-full border border-cyan-200/80 bg-white/45 px-1.5 py-1 text-sm text-slate-800 shadow-sm shadow-cyan-900/5 backdrop-blur lg:flex">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className={cls(item.href, "")}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden items-center rounded-xl border border-cyan-200/80 bg-white/75 px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur hover:border-brand-500 hover:text-brand-700 sm:inline-flex"
          >
            Log in
          </Link>
          <Link
            href="/challenge"
            className="hidden items-center gap-1.5 rounded-xl bg-gradient-to-r from-slate-950 via-brand-950 to-slate-900 px-3 py-1.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 hover:from-brand-950 hover:to-slate-950 sm:inline-flex sm:px-4 sm:py-2"
          >
            Stump me <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/book"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-accent-500 to-accent-400 px-3 py-1.5 text-sm font-semibold text-white shadow-lg shadow-accent-500/20 hover:from-accent-600 hover:to-accent-500 sm:px-4 sm:py-2"
          >
            Book call <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <LightMobileMenu nav={nav} activePath={activePath} />
        </div>
      </div>
      <div className="border-t border-cyan-200/70 bg-gradient-to-r from-cyan-100/80 via-white/70 to-accent-100/75 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2 px-4 py-2">
          <MobileAction href="/services" label="Social Media" Icon={Package} primary />
          <MobileAction href="/services/consulting" label="Consulting" Icon={BriefcaseBusiness} />
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
      className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-2 text-sm font-semibold shadow-sm active:scale-[0.98] ${
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
      <div className="mx-auto max-w-7xl px-4 py-10 text-xs text-slate-500 grid gap-6 md:grid-cols-2">
        <div>
          <div className="font-semibold text-slate-700">The LeadFlow Pro</div>
          <div className="mt-1">A Real Ryan Nichols LLC company · Texas</div>
          <div className="mt-3 max-w-xl">
            We do not guarantee specific follower-count, lead-volume, conversion-rate, or
            revenue outcomes. Paid-ad budgets are paid by clients directly to Meta, Google, or
            other ad platforms — never invoiced through us.
          </div>
        </div>
        <div className="md:text-right space-x-4">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <Link href="/services" className="hover:text-slate-900">Social Media</Link>
          <Link href="/services/consulting" className="hover:text-slate-900">Consulting</Link>
          <Link href="/tiers" className="hover:text-slate-900">Pricing</Link>
          <Link href="/leaderboard" className="hover:text-slate-900">Top 10</Link>
          <Link href="/voice" className="hover:text-slate-900">Voice</Link>
          <Link href="/start" className="hover:text-slate-900">Start here</Link>
          <Link href="/challenge" className="hover:text-slate-900">Tool challenge</Link>
          <Link href="/tools/ad-account-autopsy" className="hover:text-slate-900">Ad autopsy</Link>
          <Link href="/pulse" className="hover:text-slate-900">Live pulse</Link>
          <Link href="/community" className="hover:text-slate-900">Community</Link>
          <Link href="/support" className="hover:text-slate-900">Support</Link>
          <Link href="/rewards" className="hover:text-slate-900">Rewards</Link>
          <Link href="/book" className="hover:text-slate-900">Book a call</Link>
          <Link href="/contact" className="hover:text-slate-900">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
