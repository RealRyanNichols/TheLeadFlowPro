import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Mail,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { currentUser } from "@/lib/auth";
import {
  CLIENT_STATUS_COPY,
  DEFAULT_STATUS_COPY,
  clientNeedsForOffer,
  dueLabel,
  extractClientUpdates,
  getClientWorkOrderById,
  offerWorkloadNote,
  orderHoursLabel,
  progressPercent,
} from "@/lib/client-office";
import { ClientUpdateForm } from "./ClientUpdateForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  return { title: `Work Order ${params.id.slice(-6)} — The LeadFlow Pro` };
}

export default async function ClientWorkOrderPage({ params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const order = await getClientWorkOrderById(params.id, {
    id: user.id,
    email: user.email,
    name: user.name,
  });
  if (!order) notFound();

  const status = CLIENT_STATUS_COPY[order.status] || DEFAULT_STATUS_COPY;
  const progress = progressPercent(order);
  const needs = clientNeedsForOffer(order.offerSlug);
  const updates = extractClientUpdates(order.notes);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/dashboard/work" className="inline-flex items-center gap-2 text-sm text-ink-300 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to Client Office
      </Link>

      <section className="glass rounded-3xl border border-cyan-400/20 p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${status.tone}`}>
                {status.label}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-300">
                Order #{order.id.slice(-6)}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {order.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-200">
              {status.body}
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-300">
              {offerWorkloadNote(order.offerSlug)}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:w-[360px]">
            <a
              href={`mailto:theflashflash24@gmail.com?subject=${encodeURIComponent(`Files for LeadFlow order ${order.id.slice(-6)}`)}`}
              className="btn-primary justify-center"
            >
              Email files <Mail className="h-4 w-4" />
            </a>
            <Link href="/book" className="btn-accent justify-center">
              Book/check call <CalendarClock className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <DetailMetric icon={Clock3} label="Hours" value={orderHoursLabel(order)} />
          <DetailMetric icon={CalendarClock} label="Due" value={dueLabel(order.dueAt)} />
          <DetailMetric icon={CheckCircle2} label="Progress" value={`${progress}% tracked`} />
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-accent-400"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_370px]">
        <div className="space-y-6">
          <ClientUpdateForm orderId={order.id} />

          <section className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-cyan-300" />
              <h2 className="text-base font-bold text-white">Fulfillment path</h2>
            </div>
            <div className="mt-5 grid gap-3">
              <TimelineStep done title="Payment captured" body={`Stripe created this order on ${dueLabel(order.createdAt)}.`} />
              <TimelineStep
                done={order.status !== "intake_needed"}
                title="Intake loaded"
                body="Ryan has the account context, files, links, or first message needed to begin."
              />
              <TimelineStep
                done={["pending_review", "in_progress", "delivered", "completed"].includes(order.status)}
                title="Ryan review"
                body="Every customer-facing deliverable goes through Ryan's manual review before it is sent."
              />
              <TimelineStep
                done={["in_progress", "delivered", "completed"].includes(order.status)}
                title="Work block"
                body="Ryan and the machines run the research, parsing, edits, worksheet, content, or system build."
              />
              <TimelineStep
                done={["delivered", "completed"].includes(order.status)}
                title="Delivery"
                body="Final files, notes, links, or proposal are sent back to you."
              />
            </div>
          </section>

          {updates.length > 0 && (
            <section className="glass rounded-2xl p-5">
              <h2 className="text-base font-bold text-white">Recent client updates</h2>
              <div className="mt-4 space-y-3">
                {updates.map((update) => (
                  <div key={update.stamp} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{update.stamp}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-200">{update.body}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-accent-300" />
              <h2 className="text-base font-bold text-white">What Ryan needs</h2>
            </div>
            <ul className="mt-4 space-y-2">
              {needs.map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-relaxed text-ink-200">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="glass rounded-2xl p-5">
            <h2 className="text-base font-bold text-white">Quick actions</h2>
            <div className="mt-4 grid gap-3">
              <Link href="/start" className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white hover:bg-white/[0.06]">
                Update intake <ExternalLink className="ml-2 inline h-3.5 w-3.5" />
              </Link>
              <Link href="/offers/quick-look" className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white hover:bg-white/[0.06]">
                Add Quick-Look <ExternalLink className="ml-2 inline h-3.5 w-3.5" />
              </Link>
              <Link href="/services" className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white hover:bg-white/[0.06]">
                See service lanes <ExternalLink className="ml-2 inline h-3.5 w-3.5" />
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function DetailMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function TimelineStep({
  done,
  title,
  body,
}: {
  done: boolean;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className={`mt-0.5 h-5 w-5 rounded-full border ${done ? "border-cyan-300 bg-cyan-400" : "border-white/20 bg-white/5"}`} />
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-300">{body}</p>
      </div>
    </div>
  );
}
