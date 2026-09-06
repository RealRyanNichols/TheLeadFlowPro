import { PRIVATE_PAGE_METADATA } from "@/lib/publicPageMetadata";
export const metadata = PRIVATE_PAGE_METADATA;
import Link from "next/link";
import BrandLockup from "@/components/BrandLockup";
import { Activity, ArrowRight, Hammer, LayoutDashboard } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--text)]">
      <div className="border-b border-[var(--line)] bg-[var(--panel)]">
        <div className="mx-auto max-w-6xl px-4 pt-5 pb-2"><BrandLockup href="/dashboard" /></div>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3 text-sm font-black">
          <Link href="/dashboard" className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3 text-[var(--text)] hover:bg-[var(--fill-2)]"><LayoutDashboard className="h-4 w-4 text-[var(--blue)]" /> Command Center</Link>
          <Link href="/dashboard/war-room" className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[var(--accent-tint)] px-3 text-[var(--blue)]"><Activity className="h-4 w-4" /> Business War Room</Link>
          <Link href="/dashboard/build-room" className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3 text-[var(--text)] hover:bg-[var(--fill-2)]"><Hammer className="h-4 w-4 text-[var(--blue)]" /> Build Room</Link>
          <Link href="/contact" className="ml-auto inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[var(--line-strong)] px-3 text-[var(--text)]">Message the team <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>
      {children}
    </div>
  );
}
