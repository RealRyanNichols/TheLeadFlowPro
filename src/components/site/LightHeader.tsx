// src/components/site/LightHeader.tsx
// Shared light-theme header used on every public marketing page.
// Static (not sticky), wraps on mobile (no horizontal scroll).

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function LightHeader({ activePath }: { activePath?: string }) {
  function cls(path: string, base: string) {
    return path === activePath
      ? `font-semibold text-cyan-700 hover:text-cyan-800 ${base}`
      : `hover:text-slate-950 ${base}`;
  }
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <Link href="/" className="font-bold text-slate-950 hover:text-brand-700">
          The LeadFlow Pro
        </Link>
        <nav className="hidden lg:flex items-center gap-5 text-sm text-slate-700">
          <Link href="/" className={cls("/", "")}>Home</Link>
          <Link href="/services" className={cls("/services", "")}>Social Media</Link>
          <Link href="/services/consulting" className={cls("/services/consulting", "")}>Consulting</Link>
          <Link href="/tiers" className={cls("/tiers", "")}>Pricing</Link>
          <Link href="/demo" className={cls("/demo", "")}>Demo</Link>
          <Link href="/contact" className={cls("/contact", "")}>Contact</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-brand-500 hover:text-brand-700"
          >
            Log in
          </Link>
          <Link
            href="/book"
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-500 px-3 sm:px-4 py-1.5 sm:py-2 text-sm font-semibold text-white hover:bg-accent-600"
          >
            Book the 10-min call <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
      <div className="lg:hidden border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
          <Link href="/services" className="hover:text-slate-950 py-1">Social Media</Link>
          <Link href="/services/consulting" className="hover:text-slate-950 py-1">Consulting</Link>
          <Link href="/tiers" className="hover:text-slate-950 py-1">Pricing</Link>
          <Link href="/demo" className="hover:text-slate-950 py-1">Demo</Link>
          <Link href="/contact" className="hover:text-slate-950 py-1">Contact</Link>
          <Link href="/login" className="hover:text-slate-950 font-semibold py-1">Log in</Link>
        </div>
      </div>
    </header>
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
          <Link href="/book" className="hover:text-slate-900">Book a call</Link>
          <Link href="/contact" className="hover:text-slate-900">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
