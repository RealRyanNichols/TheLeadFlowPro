// src/components/site/LightHeader.tsx
// Shared light-theme header used on every public marketing page.
// Sticky, shared public header. Mobile gets real touch targets above the fold.

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Gauge, Route } from "lucide-react";
import { LightMobileMenu } from "./LightMobileMenu";

export function LightHeader({ activePath }: { activePath?: string }) {
  function cls(path: string, base: string) {
    return path === activePath
      ? `font-semibold text-cyan-700 hover:text-cyan-800 ${base}`
      : `hover:text-slate-950 ${base}`;
  }

  const nav = [
    { href: "/", label: "Home" },
    { href: "/services", label: "Social Media" },
    { href: "/services/consulting", label: "Consulting" },
    { href: "/tiers", label: "Pricing" },
    { href: "/story", label: "Story" },
    { href: "/availability", label: "Availability" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-2.5 lg:py-3">
        <Link href="/" className="min-w-0 truncate font-bold text-slate-950 hover:text-brand-700">
          The LeadFlow Pro
        </Link>
        <nav className="hidden lg:flex items-center gap-5 text-sm text-slate-700">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className={cls(item.href, "")}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-brand-500 hover:text-brand-700"
          >
            Log in
          </Link>
          <Link
            href="/start"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            Pick my service <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/book"
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-500 px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-600"
          >
            Book call <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <LightMobileMenu nav={nav} activePath={activePath} />
        </div>
      </div>
      <div className="lg:hidden border-t border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2 px-4 py-2">
          <MobileAction href="/start" label="Pick my service" Icon={Route} primary />
          <MobileAction href="/availability" label="Check capacity" Icon={Gauge} />
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
          ? "border-slate-900 bg-slate-950 text-white"
          : "border-slate-200 bg-white text-slate-900"
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
          <Link href="/start" className="hover:text-slate-900">Start here</Link>
          <Link href="/book" className="hover:text-slate-900">Book a call</Link>
          <Link href="/contact" className="hover:text-slate-900">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
