import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "admin";
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-[var(--page)]/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-[var(--heading)]">
          The LeadFlow <span className="text-flow-400">Pro</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium">
          <Link href="/pricing" className="text-[var(--text)] hover:text-[var(--heading)]">
            Pricing
          </Link>
          <Link href="/portfolio" className="hidden text-[var(--text)] hover:text-[var(--heading)] sm:block">
            The Work
          </Link>
          <Link href="/showcase" className="hidden text-[var(--text)] hover:text-[var(--heading)] sm:block">
            Showcase
          </Link>
          <Link href="/events" className="hidden text-[var(--text)] hover:text-[var(--heading)] md:block">
            Events
          </Link>
          <Link href="/training" className="hidden text-[var(--text)] hover:text-[var(--heading)] md:block">
            Training
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className="text-[var(--text)] hover:text-[var(--heading)]">
                Dashboard
              </Link>
              {isAdmin && (
                <Link href="/admin" className="text-warn hover:text-[var(--heading)]">
                  Admin
                </Link>
              )}
            </>
          ) : (
            <Link href="/login" className="text-[var(--text)] hover:text-[var(--heading)]">
              Log in
            </Link>
          )}
          <Link href="/book" className="btn-primary !px-4 !py-2 text-sm">
            Book a Call
          </Link>
          {/* Mobile menu — no JS, pure details/summary */}
          <details className="relative md:hidden">
            <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg border border-[var(--line-strong)] bg-[var(--fill-2)] text-lg text-[var(--text)] [&::-webkit-details-marker]:hidden">
              ☰
            </summary>
            <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-[var(--line-strong)] bg-panel p-2 shadow-2xl">
              {[
                ["/pricing", "Pricing"],
                ["/portfolio", "The Work"],
                ["/showcase", "Showcase"],
                ["/demo", "Demo Build"],
                ["/events", "Events"],
                ["/training", "Training"],
                ["/contact", "Contact"],
              ].map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--text)] hover:bg-[var(--fill-2)] hover:text-[var(--heading)]"
                >
                  {label}
                </Link>
              ))}
              <Link
                href="/book"
                className="mt-1 block rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 px-3 py-2.5 text-center text-sm font-semibold text-[var(--heading)]"
              >
                Book a Call
              </Link>
            </div>
          </details>
        </nav>
      </div>
    </header>
  );
}
