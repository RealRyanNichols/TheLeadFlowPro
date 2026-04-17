import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-white/5 mt-32">
      <div className="container py-12 grid gap-8 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="text-ink-300 text-sm mt-4 max-w-sm">
            Turn attention into conversations. Automate follow-up. Close more sales.
          </p>
          <p className="text-ink-400 text-xs mt-2">
            theleadflowpro.com — built for businesses that get calls, texts, and online leads.
          </p>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-ink-100 uppercase tracking-wider mb-3">
            Product
          </h4>
          <ul className="space-y-2 text-sm text-ink-300">
            <li><Link href="#features" className="hover:text-white">Features</Link></li>
            <li><Link href="#pricing" className="hover:text-white">Pricing</Link></li>
            <li><Link href="/dashboard" className="hover:text-white">Dashboard</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-ink-100 uppercase tracking-wider mb-3">
            Company
          </h4>
          <ul className="space-y-2 text-sm text-ink-300">
            <li><Link href="/login" className="hover:text-white">Log in</Link></li>
            <li><Link href="/signup" className="hover:text-white">Start free</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="container py-6 text-xs text-ink-400 flex justify-between">
          <span>© {new Date().getFullYear()} The LeadFlow Pro</span>
          <span>Built with care.</span>
        </div>
      </div>
    </footer>
  );
}
