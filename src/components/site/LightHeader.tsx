// src/components/site/LightHeader.tsx
// Shared light-theme header used on every public marketing page.
// Sticky, shared public header. Mobile gets real touch targets above the fold.

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Calendar, Gauge, Route } from "lucide-react";

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
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <Link href="/" className="font-bold text-slate-950 hover:text-brand-700">
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
            Find my next move <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/book"
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-500 px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-600"
          >
            Book call <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
      <div className="lg:hidden border-t border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl grid-cols-3 gap-2 px-4 py-2">
          <MobileAction href="/start" label="Start" Icon={Route} />
          <MobileAction href="/book" label="Book" Icon={Calendar} />
          <MobileAction href="/availability" label="Capacity" Icon={Gauge} />
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cls(item.href, "py-1")}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/login" className="hover:text-slate-950 font-semibold py-1">Log in</Link>
        </div>
      </div>
    </header>
  );
}

function MobileAction({
  href,
  label,
  Icon,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-900 shadow-sm active:scale-[0.98]"
    >
      <Icon className="h-4 w-4 text-cyan-700" />
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
