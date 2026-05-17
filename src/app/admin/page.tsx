import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Brain,
  BriefcaseBusiness,
  ClipboardList,
  Inbox,
  Lightbulb,
  MessageSquareText,
  RadioTower,
  ShieldCheck,
  Users,
} from "lucide-react";
import { requireAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatHours } from "@/lib/workload";
import { relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ryan Admin - The LeadFlow Pro" };

const ACTIVE_WORK_STATUSES = ["intake_needed", "pending_review", "in_progress", "waiting_on_client"];

export default async function AdminHomePage() {
  const admin = await requireAdminUser();
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    users,
    userCount,
    openIntakes,
    openIntakeCount,
    workOrders,
    activeWorkCount,
    openToolRequestCount,
    pulseToday,
    recentChats,
  ] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        email: true,
        name: true,
        businessName: true,
        plan: true,
        createdAt: true,
        _count: { select: { leads: true, socialAccounts: true } },
      },
    }),
    prisma.user.count(),
    prisma.publicIntake.findMany({
      where: { handled: false },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.publicIntake.count({ where: { handled: false } }),
    (prisma as any).workOrder.findMany({
      where: { status: { in: ACTIVE_WORK_STATUSES } },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 12,
    }),
    (prisma as any).workOrder.count({ where: { status: { in: ACTIVE_WORK_STATUSES } } }),
    prisma.toolRequest.count({
      where: {
        status: { notIn: ["shipped_one", "shipped_all", "gifted", "declined"] },
      },
    }),
    prisma.sitePulseEvent.count({ where: { createdAt: { gte: dayStart } } }).catch(() => 0),
    prisma.publicChatMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    }).catch(() => []),
  ]);

  const activeHours = workOrders.reduce(
    (sum: number, order: any) =>
      sum + Math.max(0, Number(order.estimatedHours || 0) - Number(order.completedHours || 0)),
    0,
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="relative overflow-hidden border-b border-cyan-300/20">
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(135deg,#020617_0%,#082f49_42%,#0a1d3f_70%,#431407_100%)]"
        />
        <div className="absolute -right-28 -top-32 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -left-28 -bottom-32 h-96 w-96 rounded-full bg-accent-400/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
                <ShieldCheck className="h-3.5 w-3.5" /> Ryan admin login
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
                Operator command center.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
                Signed in as {admin.email}. This is the owner view across client offices,
                orders, intakes, messages, site pulse, and workload.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/work" className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-50">
                My client office
              </Link>
              <Link href="/admin/requests" className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15">
                Lead applications
              </Link>
              <Link href="/admin/tools" className="rounded-xl border border-accent-300/30 bg-accent-300/10 px-4 py-3 text-sm font-semibold text-accent-100 hover:bg-accent-300/15">
                Tool requests
              </Link>
              <Link href="/admin/blueprint-lab" className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/15">
                Blueprint lab
              </Link>
              <Link href="/admin/growth-os" className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/15">
                Growth OS
              </Link>
              <Link href="/admin/intelligence" className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/15">
                Lead intelligence
              </Link>
              <Link href="/admin/pulse" className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/15">
                Pulse control
              </Link>
              <Link href="/admin/radar" className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15">
                Local radar
              </Link>
              <Link href="/admin/capacity" className="rounded-xl bg-accent-500 px-4 py-3 text-sm font-semibold text-white hover:bg-accent-600">
                Capacity
              </Link>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AdminStat icon={Users} label="Client logins" value={String(userCount)} sub="User accounts in database" />
            <AdminStat icon={BriefcaseBusiness} label="Active orders" value={String(activeWorkCount)} sub={`${formatHours(activeHours)} still reserved`} />
            <AdminStat icon={ClipboardList} label="Open intakes" value={String(openIntakeCount)} sub="Unreviewed public requests" />
            <AdminStat icon={Lightbulb} label="Tool requests" value={String(openToolRequestCount)} sub="Client ideas waiting on Ryan" />
            <AdminStat icon={RadioTower} label="Pulse today" value={String(pulseToday)} sub="Tracked anonymous events" />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Client back offices</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Open any client to see their orders, messages, intakes, leads, and connected data.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {users.map((user) => (
                <Link
                  key={user.id}
                  href={`/admin/clients/${user.id}`}
                  className="group grid gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 hover:border-cyan-300/40 hover:bg-white/[0.07] md:grid-cols-[1fr_auto]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-white">{user.businessName || user.name || user.email}</p>
                      <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-100">
                        {user.plan}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-400">{user.email}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {user._count.leads} leads - {user._count.socialAccounts} social accounts - joined {relativeTime(user.createdAt)}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-200">
                    Open office <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
            <h2 className="text-xl font-semibold tracking-tight">Active work queue</h2>
            <p className="mt-1 text-sm text-slate-400">
              These are the orders currently holding time against the business.
            </p>
            <div className="mt-5 grid gap-3">
              {workOrders.length > 0 ? workOrders.map((order: any) => (
                <Link
                  key={order.id}
                  href={`/admin/clients/by-order/${order.id}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 hover:border-accent-300/40 hover:bg-white/[0.07]"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-white">{order.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{order.clientName}</p>
                    </div>
                    <div className="text-sm text-slate-300 md:text-right">
                      <p>{order.status}</p>
                      <p className="text-xs text-slate-500">
                        {formatHours(Math.max(0, Number(order.estimatedHours || 0) - Number(order.completedHours || 0)))} left
                      </p>
                    </div>
                  </div>
                </Link>
              )) : (
                <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-400">
                  No active work orders are currently holding capacity.
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <SidePanel title="Build brain" icon={Brain}>
            <Link
              href="/admin/growth-os"
              className="block rounded-2xl border border-accent-300/20 bg-accent-300/10 p-3 text-sm font-semibold text-accent-100 hover:bg-accent-300/15"
            >
              Open the Growth OS: idea, create, advertise, sell, follow up, ship, and learn.
            </Link>
            <Link
              href="/admin/blueprint-lab"
              className="block rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/15"
            >
              Generate a blueprint, AI memory file, repo prompt, and handoff checklist from a client idea.
            </Link>
          </SidePanel>

          <SidePanel title="Open lead applications" icon={Inbox}>
            {openIntakes.length > 0 ? openIntakes.map((intake) => (
              <Link
                key={intake.id}
                href="/admin/requests"
                className="block rounded-2xl border border-white/10 bg-white/[0.04] p-3 hover:bg-white/[0.07]"
              >
                <p className="text-sm font-semibold text-white">{intake.businessName || intake.fullName}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-400">{intake.biggestBlocker || intake.biggestGoal || intake.email}</p>
              </Link>
            )) : (
              <p className="text-sm text-slate-400">No open intakes.</p>
            )}
          </SidePanel>

          <SidePanel title="Recent visitor messages" icon={MessageSquareText}>
            {recentChats.length > 0 ? recentChats.map((message) => (
              <div key={message.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {message.role} - {relativeTime(message.createdAt)}
                </p>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-slate-300">
                  {message.content}
                </p>
              </div>
            )) : (
              <p className="text-sm text-slate-400">No public chatbot history yet.</p>
            )}
          </SidePanel>
        </aside>
      </main>
    </div>
  );
}

function AdminStat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 shadow-lg shadow-black/10">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-100">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </div>
  );
}

function SidePanel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-cyan-200" />
        <h2 className="font-semibold tracking-tight text-white">{title}</h2>
      </div>
      <div className="mt-4 grid gap-3">{children}</div>
    </section>
  );
}
