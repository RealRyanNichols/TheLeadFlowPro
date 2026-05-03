"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";

const NAV = [
  { href: "/services",             label: "Social Growth Services" },
  { href: "/services/consulting",  label: "Business Consulting" },
  { href: "/dashboard",            label: "Dashboard" },
  { href: "/dashboard/playbooks",  label: "Playbooks" },
  { href: "/dashboard/leads",      label: "Lead inbox" },
  { href: "/dashboard/chatbot",    label: "AI chatbot" },
  { href: "/dashboard/automations",label: "Automations" },
  { href: "/dashboard/insights",   label: "AI insights" },
  { href: "/dashboard/audience",   label: "Target audience" },
  { href: "/dashboard/ad-copy",    label: "Ad copy" },
  { href: "/dashboard/social",     label: "Social accounts" },
  { href: "/dashboard/media",      label: "Video + GIFs" },
  { href: "/dashboard/card",       label: "FlowCard" },
  { href: "/dashboard/requests",   label: "Request a tool" },
  { href: "/tools/seo-grader",     label: "Free SEO Grader" },
  { href: "#features",             label: "Features overview" },
  { href: "#pricing",              label: "Pricing" }
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
      {/* Visible-by-default hamburger: explicit border + background so it
          reads as a tappable target even when backdrop-blur fails. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="md:hidden h-10 w-10 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 active:bg-white/15 flex items-center justify-center text-white shrink-0"
      >
        <Menu className="h-5 w-5" strokeWidth={2.25} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] md:hidden">
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
            <div className="mt-auto pt-4 space-y-2">
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="btn-accent w-full text-sm py-2.5 justify-center"
              >
                Start free
              </Link>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="btn-ghost w-full text-sm py-2.5 justify-center"
              >
                Log in
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
