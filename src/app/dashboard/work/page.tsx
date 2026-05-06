import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  Inbox,
  Send,
  type LucideIcon,
} from "lucide-react";
import { currentUser } from "@/lib/auth";
import {
  CLIENT_STATUS_COPY,
  DEFAULT_STATUS_COPY,
  clientNeedsForOffer,
  dueLabel,
  getClientIntakes,
  getClientWorkOrders,
  offerWorkloadNote,
  orderHoursLabel,
  progressPercent,
  remainingHours,
  type ClientWorkOrder,
} from "@/lib/client-office";
import { formatHours } from "@/lib/workload";

export const dynamic = "force-dynamic";
export const metadata = { title: "Client Office — The LeadFlow Pro" };

const ACTIVE_STATUSES = new Set(["intake_needed", "pending_review", "in_progress", "waiting_on_client"]);

export default async function ClientWorkOfficePage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const officeUser = {
    id: user.id,
    email: user.email,
    name: user.name,
  };

  const [orders, intakes] = await Promise.all([
    getClientWorkOrders(officeUser),
    getClientIntakes(officeUser),
  ]);

  const activeOrders = orders.filter((order) => ACTIVE_STATUSES.has(order.status));
  const pendingRyanReview = orders.filter((order) => order.status === "pending_review").length;
  const hoursReserved = activeOrders.reduce((sum, order) => sum + remainingHours(order), 0);
  const nextDue = activeOrders
    .map((order) => order.dueAt)
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime())[0] || null;
  const firstOpenOrder = activeOrders[0] || orders[0] || null;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <section className="glass rounded-3xl border border-cyan-400/20 p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-200">
              <BriefcaseBusiness className="h-3.5 w-3.5" /> Client Office
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Paid work, deadlines, files, and next steps in one place.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-200">
              This is the customer back office. Orders here are tied to Stripe checkout and Ryan's
              workload meter. No fake tasks, no made-up progress, and no public admin controls.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:w-[360px]">
            <Link href="/start" className="btn-primary justify-center">
              Send intake <Send className="h-4 w-4" />
            </Link>
            <Link href="/book" className="btn-accent justify-center">
              Book call <CalendarClock className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OfficeStat label="Open orders" value={activeOrders.length.toString()} sub={`${orders.length} total linked to this login`} />
        <OfficeStat label="Capacity held" value={formatHours(hoursReserved)} sub="Remaining active work only" highlight />
        <OfficeStat label="Next due" value={dueLabel(nextDue)} sub={nextDue ? "Based on current work-order due date" : "No active deadline yet"} />
        <OfficeStat label="Ryan review" value={pendingRyanReview.toString()} sub="Items waiting for manual review" />
      </section>

      {orders.length > 0 ? (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Your work orders</h2>
                <p className="text-sm text-ink-300">Open the order to send links, files, notes, or decisions back to Ryan.</p>
              </div>
            </div>
            <div className="grid gap-4">
              {orders.map((order) => (
                <WorkOrderCard key={order.id} order={order} />
              ))}
            </div>
          </div>

          <aside className="space-y-4">
            <NeedsCard order={firstOpenOrder} />
            <RecentIntakesCard intakes={intakes} />
          </aside>
        </section>
      ) : (
        <EmptyOffice intakesCount={intakes.length} />
      )}
    </div>
  );
}

function OfficeStat({
  label,
  value,
  sub,
  highlight = false,
}: {
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div className={`glass rounded-2xl p-5 ${highlight ? "ring-1 ring-cyan-500/40 shadow-lg shadow-cyan-500/10" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{label}</p>
      <p className={`mt-2 text-3xl font-extrabold ${highlight ? "funnel-text" : "text-white"}`}>{value}</p>
      <p className="mt-1 text-xs text-ink-300">{sub}</p>
    </div>
  );
}

function WorkOrderCard({ order }: { order: ClientWorkOrder }) {
  const status = CLIENT_STATUS_COPY[order.status] || DEFAULT_STATUS_COPY;
  const progress = progressPercent(order);
  return (
    <Link
      href={`/dashboard/work/${order.id}`}
      className="glass group rounded-2xl border border-white/10 p-5 transition hover:border-cyan-400/40 hover:bg-white/[0.04]"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${status.tone}`}>
              {status.label}
            </span>
            {order.offerSlug && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-300">
                {order.offerSlug}
              </span>
            )}
          </div>
          <h3 className="mt-3 text-lg font-bold text-white">{order.title}</h3>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-300">
            {offerWorkloadNote(order.offerSlug)}
          </p>
        </div>
        <ArrowRight className="hidden h-5 w-5 shrink-0 text-ink-400 transition group-hover:translate-x-0.5 group-hover:text-cyan-300 md:block" />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MiniMetric icon={Clock3} label="Hours" value={orderHoursLabel(order)} />
        <MiniMetric icon={CalendarClock} label="Due" value={dueLabel(order.dueAt)} />
        <MiniMetric icon={CheckCircle2} label="Progress" value={`${progress}% tracked`} />
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-accent-400"
          style={{ width: `${progress}%` }}
        />
      </div>
    </Link>
  );
}

function MiniMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function NeedsCard({ order }: { order: ClientWorkOrder | null }) {
  const items = clientNeedsForOffer(order?.offerSlug);
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 text-sm font-bold text-white">
        <FileText className="h-4 w-4 text-cyan-300" /> What Ryan needs next
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ink-300">
        {order ? `For ${order.title}, send this first so work does not sit idle.` : "Once a work order exists, this checklist updates around the service you bought."}
      </p>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-relaxed text-ink-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      {order && (
        <Link href={`/dashboard/work/${order.id}`} className="btn-primary mt-5 w-full justify-center text-sm">
          Open order <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function RecentIntakesCard({
  intakes,
}: {
  intakes: Awaited<ReturnType<typeof getClientIntakes>>;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 text-sm font-bold text-white">
        <Inbox className="h-4 w-4 text-accent-300" /> Recent intake
      </div>
      {intakes.length > 0 ? (
        <div className="mt-4 space-y-3">
          {intakes.map((intake) => (
            <div key={intake.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-sm font-semibold text-white">{intake.businessName || intake.fullName}</p>
              <p className="mt-1 text-xs text-ink-400">
                {intake.routedTo ? `Routed to ${intake.routedTo}` : `Budget lane: ${intake.budgetTier}`}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-ink-300">
          No intake has been submitted from this email yet. Start with the router if Ryan does not
          already have your business context.
        </p>
      )}
    </div>
  );
}

function EmptyOffice({ intakesCount }: { intakesCount: number }) {
  return (
    <section className="glass rounded-3xl border border-dashed border-white/15 p-8 text-center">
      <BriefcaseBusiness className="mx-auto h-11 w-11 text-cyan-300" />
      <h2 className="mt-4 text-2xl font-bold text-white">No paid work order is linked to this login yet.</h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-ink-300">
        {intakesCount > 0
          ? "Your intake is visible, but no Stripe-created work order has been attached yet. Pick a paid entry point or book the fit call."
          : "Use the router, buy a lower paid entry point, or book the 10-minute fit call. Once Stripe creates the order, it appears here automatically."}
      </p>
      <div className="mx-auto mt-6 grid max-w-2xl gap-3 sm:grid-cols-3">
        <Link href="/start" className="btn-primary justify-center">Start router</Link>
        <Link href="/offers/quick-look" className="btn-accent justify-center">$47 Quick-Look</Link>
        <Link href="/book" className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5">
          Book call
        </Link>
      </div>
    </section>
  );
}
