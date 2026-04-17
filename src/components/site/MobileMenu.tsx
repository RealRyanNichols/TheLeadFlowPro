"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";

const NAV = [
  { href: "#features",    label: "Features" },
  { href: "#automations", label: "Automations" },
  { href: "#requests",    label: "Request a tool" },
  { href: "#pricing",     label: "Pricing" },
  { href: "/dashboard",   label: "Dashboard" }
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  // lock scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="md:hidden h-9 w-9 rounded-lg hover:bg-white/5 flex items-center justify-center text-ink-100"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-72 max-w-[85vw] bg-ink-950 border-l border-white/10 p-5 flex flex-col animate-fade-up">
            <div className="flex items-center justify-between mb-6">
              <Logo />
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="h-9 w-9 rounded-lg hover:bg-white/5 flex items-center justify-center text-ink-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {NAV.map((n) => (
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
            <div className="mt-auto space-y-2">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="btn-ghost w-full text-sm py-2.5"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="btn-accent w-full text-sm py-2.5"
              >
                Start free
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
