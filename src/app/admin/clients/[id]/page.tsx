import Link from "next/link";
import { notFound } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Inbox,
  Mail,
  MessageSquareText,
  ShieldCheck,
  Users,
} from "lucide-react";
import { requireAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import {
  CLIENT_STATUS_COPY,
  DEFAULT_STATUS_COPY,
  dueLabel,
  extractClientUpdates,
  orderHoursLabel,
  progressPercent,
} from "@/lib/client-office";
import { formatHours } from "@/lib/workload";
import { relativeTime } from "@/lib/utils";
import { RyanUpdateForm } from "./RyanUpdateForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  return { title: `Client ${params.id.slice(-6)} - Ryan Admin` };
}

export default async function AdminClientPage({ params }: { params: { id: string } }) {
  await requireAdminUser();

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      socialAccounts: { orderBy: { connectedAt: "desc" } },
      leads: { orderBy: [{ lastContact: "desc" }, { createdAt: "desc" }], take: 8 },
      brainProfile: true,
    },
  });
  if (!user) notFound();

  const email = user.email.toLowerCase();
  const [orders, intakes, visitorProfile] = await Promise.all([
    (prisma as any).workOrder.findMany({
      where: {
        OR: [
          { notes: { contains: `user_id:${user.id}` } },
          { notes: { contains: `buyer_email:${email}` } },
          { notes: { contains: user.email } },
          { clientName: { equals: user.email, mode: "insensitive" } },
        ],
      },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    }),
    prisma.publicIntake.findMany({
      where: { email: { equals: user.email, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.publicVisitorProfile.findFirst({
      where: { email: { equals: user.email, mode: "insensitive" } },
      orderBy: { lastSeenAt: "desc" },
    }).catch(() => null),
  ]);

  const chats = visitorProfile
    ? await prisma.publicChatMessage.findMany({
        where: { visitorId: visitorProfile.visitorId },
        orderBy: { createdAt: "desc" },
        take: 12,
      }).catch(() => [])
    : [];

  const activeOrders = orders.filter((order: any) =>
    ["intake_needed", "pending_review", "in_progress", "waiting_on_client"].includes(order.status),
  );
  const remaining = activeOrders.reduce(
    (sum: number, order: any) =>
      sum + Math.max(0, Number(order.estimatedHours || 0) - Number(order.completedHours || 0)),
    0,
  );
  const messages = orders.flatMap((order: any) =>
    extractClientUpdates(order.notes).map((message) => ({
      ...message,
      orderId: order.id,
      orderTitle: order.title,
    })),
  ) as Array<{
    author: "Client" | "Ryan";
    stamp: string;
    body: string;
    orderId: string;
    orderTitle: string;
  }>;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="relative overflow-hidden border-b border-cyan-300/20">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#020617_0%,#0a1d3f_46%,#082f49_72%,#431407_100%)]" />
        <div className="absolute -right-32 -top-36 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -left-32 -bottom-36 h-96 w-96 rounded-full bg-accent-400/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-7">
          <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to admin
          </Link>
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
                <Users className="h-3.5 w-3.5" /> Client office admin view
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
                {user.businessName || user.name || user.email}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
                {user.email} - {user.plan} plan. Ryan can see orders, messages, intake,
                leads, connected accounts, and profile context from here.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:w-[360px]">
              <a
                href={`mailto:${user.email}`}
                className="rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-slate-950 hover:bg-cyan-50"
              >
                Email client
              </a>
              <Link
                href="/admin/capacity"
                className="rounded-xl bg-accent-500 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-accent-600"
              >
                Edit capacity
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AdminMetric icon={BriefcaseBusiness} label="Open work" value={String(activeOrders.length)} sub={`${formatHours(remaining)} remaining`} />
            <AdminMetric icon={Inbox} label="Intakes" value={String(intakes.length)} sub="Public forms tied by email" />
            <AdminMetric icon={MessageSquareText} label="Office messages" value={String(messages.length)} sub="Client and Ryan updates" />
            <AdminMetric icon={ShieldCheck} label="Profile" value={`${user.brainProfile?.completeness ?? 0}%`} sub="Client onboarding context" />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
            <h2 className="text-xl font-semibold tracking-tight">Work orders</h2>
            <div className="mt-5 grid gap-4">
              {orders.length > 0 ? orders.map((order: any) => (
                <WorkOrderAdminCard key={order.id} order={order} />
              )) : (
                <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-400">
                  No work orders are linked to this client yet.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
            <h2 className="text-xl font-semibold tracking-tight">Office message stream</h2>
            <p className="mt-1 text-sm text-slate-400">
              This is the shared work-order stream. Ryan updates posted here show in the client office.
            </p>
            <div className="mt-5 grid gap-3">
              {messages.length > 0 ? messages.map((message) => (
                <div key={`${message.orderId}-${message.stamp}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <span className={message.author === "Ryan" ? "text-accent-200" : "text-cyan-200"}>
                      {message.author}
                    </span>
                    <span>{message.orderTitle}</span>
                    <span>{message.stamp}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                    {message.body}
                  </p>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-400">
                  No office messages yet.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
            <h2 className="text-xl font-semibold tracking-tight">Public intakes tied to this client</h2>
            <div className="mt-5 grid gap-3">
              {intakes.length > 0 ? intakes.map((intake) => (
                <div key={intake.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="font-semibold text-white">{intake.biggestGoal || intake.budgetTier}</p>
                  <p className="mt-1 text-xs text-slate-500">{relativeTime(intake.createdAt)} - routed to {intake.routedTo || "not routed"}</p>
                  {intake.biggestBlocker ? (
                    <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                      {intake.biggestBlocker}
                    </p>
                  ) : null}
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-400">
                  No public intakes found for this email.
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          {orders[0] ? (
            <RyanUpdateForm
              orderId={orders[0].id}
              currentStatus={orders[0].status}
              completedHours={Number(orders[0].completedHours || 0)}
            />
          ) : null}

          <SidePanel title="Connected accounts" icon={Users}>
            {user.socialAccounts.length > 0 ? user.socialAccounts.map((account) => (
              <div key={account.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <p className="text-sm font-semibold text-white">{account.platform}</p>
                <p className="mt-1 text-xs text-slate-400">{account.handle}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {account.followers.toLocaleString()} followers - synced {account.lastSyncedAt ? relativeTime(account.lastSyncedAt) : "never"}
                </p>
              </div>
            )) : (
              <p className="text-sm text-slate-400">No social accounts connected yet.</p>
            )}
          </SidePanel>

          <SidePanel title="Recent leads" icon={Mail}>
            {user.leads.length > 0 ? user.leads.map((lead) => (
              <div key={lead.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <p className="text-sm font-semibold text-white">{lead.name || lead.email || lead.phone || "Lead"}</p>
                <p className="mt-1 text-xs text-slate-400">{lead.status}</p>
              </div>
            )) : (
              <p className="text-sm text-slate-400">No leads in this client account yet.</p>
            )}
          </SidePanel>

          <SidePanel title="Remembered visitor context" icon={MessageSquareText}>
            {visitorProfile ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs leading-relaxed text-slate-300">
                <p><strong className="text-white">Stage:</strong> {visitorProfile.stage}</p>
                <p><strong className="text-white">Topic:</strong> {visitorProfile.lastTopic || "none"}</p>
                <p><strong className="text-white">Last seen:</strong> {relativeTime(visitorProfile.lastSeenAt)}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No public visitor memory tied to this email yet.</p>
            )}
            {chats.length > 0 ? chats.map((chat) => (
              <div key={chat.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {chat.role} - {relativeTime(chat.createdAt)}
                </p>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-slate-300">{chat.content}</p>
              </div>
            )) : null}
          </SidePanel>
        </aside>
      </main>
    </div>
  );
}

function WorkOrderAdminCard({ order }: { order: any }) {
  const status = CLIENT_STATUS_COPY[order.status] || DEFAULT_STATUS_COPY;
  const progress = progressPercent(order);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${status.tone}`}>
              {status.label}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              #{order.id.slice(-6)}
            </span>
          </div>
          <h3 className="mt-3 text-lg font-semibold text-white">{order.title}</h3>
          <p className="mt-1 text-sm text-slate-400">{order.clientName}</p>
        </div>
        <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-3 lg:min-w-[430px]">
          <Mini label="Hours" value={orderHoursLabel(order)} icon={Clock3} />
          <Mini label="Due" value={dueLabel(order.dueAt)} icon={Clock3} />
          <Mini label="Progress" value={`${progress}%`} icon={CheckCircle2} />
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-accent-400" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function AdminMetric({
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
    <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-100">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </div>
  );
}

function Mini({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className="mt-1 text-xs font-semibold text-white">{value}</p>
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
