import Link from "next/link";
import { Activity, ArrowRight, Hammer, LayoutDashboard } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3 text-sm font-black">
          <Link href="/dashboard" className="inline-flex min-h-[40px] items-center gap-2 rounded-lg px-3 text-[var(--text)] hover:bg-[var(--fill-2)]"><LayoutDashboard className="h-4 w-4 text-[var(--blue)]" /> Command Center</Link>
          <Link href="/dashboard/war-room" className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[var(--accent-tint)] px-3 text-[var(--blue)]"><Activity className="h-4 w-4" /> Business War Room</Link>
          <Link href="/dashboard/build-room" className="inline-flex min-h-[40px] items-center gap-2 rounded-lg px-3 text-[var(--text)] hover:bg-[var(--fill-2)]"><Hammer className="h-4 w-4 text-[var(--blue)]" /> Build Room</Link>
          <Link href="/contact" className="ml-auto inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-[var(--line-strong)] px-3 text-[var(--text)]">Message the team <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>
      {children}
    </div>
  );
}
