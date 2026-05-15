import Link from "next/link";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { SITE_PRIMARY_NAV } from "@/lib/site-navigation";

export function Header() {
  return (
    // Solid bg on mobile (backdrop-blur is unreliable on iOS Safari and
    // some Android Chrome builds. Without it the 70%-opacity navy used to
    // bleed page content through the header on mobile).
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-950 md:bg-ink-950/70 md:backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-2">
        <div className="min-w-0 flex-shrink">
          <Logo />
        </div>
        <nav className="hidden md:flex items-center gap-5 text-sm text-ink-200">
          <Link href="/" className="hover:text-white font-semibold text-cyan-300">Home</Link>
          {SITE_PRIMARY_NAV.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/lead-leak-audit-197"
            className="inline-flex btn-accent text-sm py-2 px-3 sm:px-4 whitespace-nowrap"
          >
            Start audit
          </Link>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
