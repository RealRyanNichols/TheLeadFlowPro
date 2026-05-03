import Link from "next/link";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";

export function Header() {
  return (
    // Solid bg on mobile (backdrop-blur is unreliable on iOS Safari and
    // some Android Chrome builds — without it the 70%-opacity navy used to
    // bleed page content through the header on mobile).
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-950 md:bg-ink-950/70 md:backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-2">
        <div className="min-w-0 flex-shrink">
          <Logo />
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-ink-200">
          <Link href="/services" className="hover:text-white">Services</Link>
          <Link href="/services/consulting" className="hover:text-white">Consulting</Link>
          <Link href="#features" className="hover:text-white">Features</Link>
          <Link href="/tools/seo-grader" className="hover:text-white">Free SEO Grader</Link>
          <Link href="#pricing" className="hover:text-white">Pricing</Link>
          <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
        </nav>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href="/login" className="hidden sm:inline-flex btn-ghost text-sm py-2 px-4">
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex btn-accent text-sm py-2 px-3 sm:px-4 whitespace-nowrap"
          >
            Start free
          </Link>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
