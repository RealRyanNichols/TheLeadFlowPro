// src/components/site/Footer.tsx
import Link from "next/link";
import { FunnelMark } from "./Logo";

export function Footer() {
  return (
    <footer className="relative border-t border-white/10 bg-black/40">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <FunnelMark className="h-8 w-8" />
              <span className="font-bold text-lg">
                The <span className="funnel-text">LeadFlow</span> Pro
              </span>
            </div>
            <p className="text-ink-300 text-sm leading-relaxed">
              Turn attention into conversations. Automate follow-up. Close more sales.
            </p>
            <p className="mt-3 text-ink-300 text-xs">
              theleadflowpro.com — built for businesses that get calls, texts, and online leads.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-ink-300 mb-3">
              Product
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/#features" className="text-ink-100 hover:text-white">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-ink-100 hover:text-white">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/tools/seo-grader" className="text-ink-100 hover:text-white">
                  Free SEO Grader
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-ink-100 hover:text-white">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Plans */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-ink-300 mb-3">Plans</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/pricing/starter" className="text-ink-100 hover:text-white">
                  Starter — $5
                </Link>
              </li>
              <li>
                <Link href="/pricing/growth" className="text-ink-100 hover:text-white">
                  Growth — $15
                </Link>
              </li>
              <li>
                <Link href="/pricing/pro" className="text-ink-100 hover:text-white">
                  Pro — $35
                </Link>
              </li>
              <li>
                <Link href="/pricing/agency" className="text-ink-100 hover:text-white">
                  Agency — $95
                </Link>
              </li>
            </ul>
          </div>

          {/* Company + Legal */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-ink-300 mb-3">
              Company
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/login" className="text-ink-100 hover:text-white">
                  Log in
                </Link>
              </li>
              <li>
                <Link href="/signup" className="text-ink-100 hover:text-white">
                  Start free
                </Link>
              </li>
              <li>
                <Link href="/legal" className="text-ink-100 hover:text-white">
                  Legal · Terms · Privacy
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@theleadflowpro.com"
                  className="text-ink-100 hover:text-white"
                >
                  Contact support
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 md:mt-14 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between gap-3 text-xs text-ink-300">
          <span>© {new Date().getFullYear()} REAL RYAN NICHOLS LLC · The LeadFlow Pro</span>
          <span>
            Built with care ·{" "}
            <Link href="/legal#refund" className="hover:text-white">
              14-day money-back guarantee
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
