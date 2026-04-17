"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Inbox, Bot, Megaphone, Target, Users,
  Sparkles, FilmIcon, Settings, Lightbulb, Workflow, IdCard
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

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-white/5 bg-ink-950/80 backdrop-blur-xl">
      <div className="p-5 border-b border-white/5">
        <Logo />
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition",
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
      <div className="p-4 border-t border-white/5">
        <div className="glass rounded-xl p-3 text-xs text-ink-300">
          <p className="font-semibold text-white mb-1">Growth plan</p>
          <p>Unlimited AI insights · 5,000 leads/mo</p>
          <Link href="/dashboard/settings" className="text-cyan-400 hover:underline mt-2 inline-block">
            Manage plan →
          </Link>
        </div>
      </div>
    </aside>
  );
}
