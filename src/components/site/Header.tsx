import Link from "next/link";
import { Logo } from "./Logo";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-ink-950/70 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Logo />
        <nav className="hidden md:flex items-center gap-7 text-sm text-ink-200">
          <Link href="#features" className="hover:text-white">Features</Link>
          <Link href="#automations" className="hover:text-white">Automations</Link>
          <Link href="#requests" className="hover:text-white">Request a tool</Link>
          <Link href="#pricing" className="hover:text-white">Pricing</Link>
          <Link href="/dashboard" className="hover:text-white">Dashboard</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden sm:inline-flex btn-ghost text-sm py-2 px-4">
            Log in
          </Link>
          <Link href="/signup" className="btn-accent text-sm py-2 px-4">
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}
