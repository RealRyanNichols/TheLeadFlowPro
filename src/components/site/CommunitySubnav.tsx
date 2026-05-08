import Link from "next/link";
import { HeartHandshake, Megaphone, Sparkles, Trophy } from "lucide-react";

const communityTabs = [
  {
    href: "/leaderboard",
    label: "Top 10",
    description: "Many paid local boards",
    Icon: Trophy,
    activePaths: ["/leaderboard"],
  },
  {
    href: "/voice",
    label: "Voice",
    description: "Yes/no money signal",
    Icon: Megaphone,
    activePaths: ["/voice"],
  },
  {
    href: "/leaderboard#boost",
    label: "Boost",
    description: "Paid shoutout ticker",
    Icon: Sparkles,
    activePaths: [],
  },
  {
    href: "/leaderboard#giveback",
    label: "Giveback",
    description: "70% local pool",
    Icon: HeartHandshake,
    activePaths: [],
  },
];

export function CommunitySubnav({ activePath }: { activePath?: string }) {
  return (
    <div className="border-b border-cyan-200/80 bg-gradient-to-r from-slate-950 via-brand-950 to-cyan-950 text-white">
      <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2">
        {communityTabs.map((tab) => {
          const active = tab.activePaths.some(
            (path) => activePath === path || activePath?.startsWith(`${path}/`)
          );
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`group flex min-w-[168px] items-center gap-3 rounded-2xl border px-3 py-2 text-left shadow-sm transition active:scale-[0.99] sm:min-w-[188px] ${
                active
                  ? "border-cyan-300 bg-cyan-200/[0.16] text-white shadow-cyan-950/20"
                  : "border-white/10 bg-white/[0.08] text-slate-200 hover:border-cyan-300/60 hover:bg-white/[0.12]"
              }`}
            >
              <span
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  active
                    ? "bg-cyan-300 text-slate-950"
                    : "bg-white/10 text-cyan-200 group-hover:bg-cyan-300/20"
                }`}
              >
                <tab.Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">{tab.label}</span>
                <span className="block truncate text-[11px] text-slate-300">
                  {tab.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
