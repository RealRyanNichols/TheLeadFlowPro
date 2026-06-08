import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AdminStatEditor } from "@/components/weird-stats/AdminStatEditor";
import { StatTile } from "@/components/weird-stats/StatTile";
import { requireAdminUser } from "@/lib/admin";
import { STARTER_WEIRD_STATS } from "@/lib/weird-stats";

export const dynamic = "force-dynamic";
export const metadata = { title: "Weird Stats Admin - The LeadFlow Pro" };

export default async function AdminStatsPage() {
  const admin = await requireAdminUser();

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <main className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-cyan-100">
              Admin stat machine
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">
              Weird Stats Clock control room.
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Signed in as {admin.email}. Create and edit formula counters, source notes,
              confidence labels, request statuses, and premium cards.
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-black text-white hover:bg-white/10"
          >
            Back to admin <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <AdminStatEditor />
          <div>
            <h2 className="text-xl font-black tracking-tight">Seed stat previews</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {STARTER_WEIRD_STATS.slice(0, 4).map((stat) => (
                <StatTile key={stat.slug} stat={stat} dense />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
