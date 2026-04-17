"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, Inbox, Bot, Megaphone, Target, Users,
  Sparkles, FilmIcon, Settings, Lightbulb, Workflow, IdCard, Menu, X
} from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard",            label: "Overview",        icon: LayoutDashboard },
  { href: "/dashboard/leads",      label: "Lead Inbox",      icon: Inbox },
  { href: "/dashboard/chatbot",    label: "AI Chatbot",      icon: Bot },
  { href: "/dashboard/automations",label: "Automations",     icon: Workflow },
  { href: "/dashboard/media",      label: "Video & GIFs",    icon: FilmIcon },
  { href: "/dashboard/card",       label: "FlowCard",        icon: IdCard },
  { href: "/dashboard/social",     label: "Social Accounts", icon: Users },
  { href: "/dashboard/insights",   label: "AI Insights",     icon: Sparkles },
  { href: "/dashboard/audience",   label: "Target Audience", icon: Target },
  { href: "/dashboard/ad-copy",    label: "Ad Copy",         icon: Megaphone },
  { href: "/dashboard/requests",   label: "Request a Tool",  icon: Lightbulb },
  { href: "/dashboard/settings",   label: "Settings",        icon: Settings }
];

function NavList({ pathname, onItemClick }: { pathname: string; onItemClick?: () => void }) {
  return (
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      {NAV.map((item) => {
        const active = pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition",
              active
                ? "bg-gradient-to-r from-cyan-500/15 to-brand-500/10 text-white border border-cyan-500/20"
                : "text-ink-300 hover:text-white hover:bg-white/5"
            )}
          >
            <item.icon className={cn("h-4 w-4", active && "text-cyan-400")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function PlanFooter() {
  return (
    <div className="p-4 border-t border-white/5">
      <div className="glass rounded-xl p-3 text-xs text-ink-300">
        <p className="font-semibold text-white mb-1">Growth plan</p>
        <p>Unlimited AI insights · 5,000 leads/mo</p>
        <Link href="/dashboard/settings" className="text-cyan-400 hover:underline mt-2 inline-block">
          Manage plan →
        </Link>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-white/5 bg-ink-950/80 backdrop-blur-xl">
      <div className="p-5 border-b border-white/5">
        <Logo />
      </div>
      <NavList pathname={pathname} />
      <PlanFooter />
    </aside>
  );
}

export function MobileSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="lg:hidden h-9 w-9 rounded-lg hover:bg-white/5 flex items-center justify-center text-ink-100"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-ink-950 border-r border-white/10 flex flex-col animate-fade-up">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <Logo />
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="h-9 w-9 rounded-lg hover:bg-white/5 flex items-center justify-center text-ink-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavList pathname={pathname} onItemClick={() => setOpen(false)} />
            <PlanFooter />
          </aside>
        </div>
      )}
    </>
  );
}
