"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LayoutDashboard, LogIn, LogOut } from "lucide-react";

// Session-aware header actions for the public LightHeader.
// - Signed out: single "Sign in" link.
// - Signed in: "Dashboard" link + "Sign out" button.
// Status:"loading" renders a placeholder so the header doesn't flash.
export function HeaderAuthActions() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <span
        aria-hidden
        className="hidden h-8 w-20 animate-pulse rounded-lg bg-white/50 sm:inline-block"
      />
    );
  }

  if (session?.user) {
    return (
      <>
        <Link
          href="/dashboard"
          className="hidden items-center gap-1.5 rounded-lg border border-cyan-300 bg-white/85 px-3 py-1.5 text-sm font-semibold text-cyan-800 hover:border-cyan-500 hover:text-cyan-900 sm:inline-flex sm:px-4"
        >
          <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
        </Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="hidden items-center gap-1.5 rounded-lg border border-slate-300 bg-white/85 px-3 py-1.5 text-sm font-semibold text-slate-800 hover:border-rose-400 hover:text-rose-700 sm:inline-flex sm:px-4"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </>
    );
  }

  return (
    <Link
      href="/login"
      className="hidden items-center gap-1.5 rounded-lg border border-slate-300 bg-white/85 px-3 py-1.5 text-sm font-semibold text-slate-800 hover:border-cyan-400 hover:text-slate-950 sm:inline-flex sm:px-4"
    >
      <LogIn className="h-3.5 w-3.5" /> Sign in
    </Link>
  );
}
