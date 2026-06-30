"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { SITE_MOBILE_NAV } from "@/lib/site-navigation";

// Public marketing nav only. The client office is not promoted to cold traffic.

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  // lock scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Visible-by-default hamburger: explicit border + background so it
          reads as a tappable target even when backdrop-blur fails. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="xl:hidden h-10 w-10 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 active:bg-white/15 flex items-center justify-center text-white shrink-0"
      >
        <Menu className="h-5 w-5" strokeWidth={2.25} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] xl:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-72 max-w-[85vw] bg-ink-950 border-l border-white/10 p-5 flex flex-col animate-fade-up shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between mb-6">
              <Logo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="h-10 w-10 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 flex items-center justify-center text-white shrink-0"
              >
                <X className="h-5 w-5" strokeWidth={2.25} />
              </button>
            </div>
            <nav className="flex flex-col gap-1 overflow-y-auto -mx-1 px-1">
              {SITE_MOBILE_NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="px-3 py-3 rounded-lg text-base text-ink-100 hover:bg-white/5 hover:text-white"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto pt-4 space-y-2">
              <Link
                href="/problem-intake"
                onClick={() => setOpen(false)}
                className="btn-accent w-full text-sm py-2.5 justify-center"
              >
                Find signal
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
