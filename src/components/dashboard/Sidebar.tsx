"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Inbox,
  Settings,
  Menu,
  X,
  ShieldCheck,
  DatabaseZap,
  ShoppingCart,
  UploadCloud,
  FileCheck2,
  LockKeyhole,
  Download,
  Activity,
  ClipboardList,
  Gauge,
  GitBranch,
} from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { cn } from "@/lib/utils";

// Plan labels mirror /lib/tiers.ts; change there if pricing copy changes.
const PLAN_LABELS: Record<string, { name: string; tagline: string }> = {
  free:    { name: "Free command",    tagline: "Start capturing demand signals" },
  starter: { name: "Starter command", tagline: "Build scored starter lists" },
  growth:  { name: "Growth command",  tagline: "More sources, scoring, and volume" },
  pro:     { name: "Pro command",     tagline: "Buyer-ready packages and review" },
  agency:  { name: "Agency command",  tagline: "Multi-client data operations" },
};

const NAV = [
  { href: "/dashboard#overview", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard#lead-profiles", label: "Lead Profiles", icon: Inbox },
  { href: "/dashboard#marketplace-listings", label: "Marketplace Listings", icon: ShoppingCart },
  { href: "/dashboard#submitted-sources", label: "Submitted Sources", icon: UploadCloud },
  { href: "/dashboard#buyer-requests", label: "Buyer Requests", icon: ClipboardList },
  { href: "/dashboard#source-proof", label: "Source Proof", icon: FileCheck2 },
  { href: "/dashboard#suppression", label: "Suppression", icon: LockKeyhole },
  { href: "/dashboard/exports", label: "Exports", icon: Download },
  { href: "/dashboard/segments", label: "Segments", icon: GitBranch },
  { href: "/dashboard/predictive", label: "Predictive Engine", icon: Gauge },
  { href: "/dashboard/analytics", label: "Funnel Analytics", icon: Activity },
  { href: "/dashboard#events", label: "Events", icon: Activity },
  { href: "/dashboard#settings", label: "Settings", icon: Settings },
  { href: "/dashboard/source-submissions", label: "Source Review Queue", icon: DatabaseZap },
];

function NavList({ pathname, onItemClick }: { pathname: string; onItemClick?: () => void }) {
  return (
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      {NAV.map((item) => {
        const itemPath = item.href.split("#")[0];
        const isAnchor = item.href.includes("#");
        const active = isAnchor
          ? pathname === itemPath && item.href.endsWith("#overview")
          : pathname === itemPath || (itemPath !== "/dashboard" && pathname.startsWith(itemPath));
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
  const { data: session } = useSession();
  // Plan source of truth eventually moves to a billing query; until then we
  // read off the session user object if present, falling back to "free".
  const planRaw = ((session?.user as { plan?: string } | undefined)?.plan || "free").toLowerCase();
  const plan = PLAN_LABELS[planRaw] || PLAN_LABELS.free;
  const cta = planRaw === "free" ? "Upgrade list volume" : "Manage plan";
  return (
    <div className="p-4 border-t border-white/5">
      <div className="glass rounded-xl p-3 text-xs text-ink-300">
        <p className="font-semibold text-white mb-1">{plan.name}</p>
        <p>{plan.tagline}</p>
        {(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin ? (
          <Link href="/admin" className="mt-3 inline-flex items-center gap-1 text-accent-300 hover:underline">
            <ShieldCheck className="h-3.5 w-3.5" /> Ryan admin
          </Link>
        ) : null}
        <Link href="/dashboard/billing" className="text-cyan-400 hover:underline mt-2 inline-block">
          {cta}
        </Link>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex w-72 shrink-0 flex-col border-r border-white/5 bg-ink-950/80 backdrop-blur-xl">
      <div className="p-5 border-b border-white/5">
        <Logo href="/dashboard" />
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
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="lg:hidden h-10 w-10 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 active:bg-white/15 flex items-center justify-center text-white shrink-0"
      >
        <Menu className="h-5 w-5" strokeWidth={2.25} />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-ink-950 border-r border-white/10 flex flex-col animate-fade-up shadow-2xl shadow-black/50">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <Logo href="/dashboard" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="h-10 w-10 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 flex items-center justify-center text-white shrink-0"
              >
                <X className="h-5 w-5" strokeWidth={2.25} />
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
