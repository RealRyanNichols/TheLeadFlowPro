import Link from "next/link";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-ink-950/70 backdrop-blur-xl">
      <div className="container flex h-16 min-w-0 items-center justify-between gap-3">
        <Logo className="min-w-0" />
        <nav className="hidden xl:flex items-center gap-7 text-sm text-ink-200">
          <Link href="/problem-intake" className="hover:text-white">Find Signal</Link>
          <Link href="/data-marketplace" className="hover:text-white">Marketplace</Link>
          <Link href="#data" className="hover:text-white">Data</Link>
          <Link href="#profiles" className="hover:text-white">Profiles</Link>
          <Link href="#workflow" className="hover:text-white">Workflow</Link>
          <Link href="#compliance" className="hover:text-white">Compliance</Link>
          <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden sm:inline-flex btn-ghost text-sm py-2 px-4">
            Log in
          </Link>
          <Link href="/problem-intake" className="hidden sm:inline-flex btn-accent text-sm py-2 px-4">
            Find signal
          </Link>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
