import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  Brain,
  ClipboardCheck,
  Database,
  Factory,
  Megaphone,
  MessageSquareText,
  Package,
  RadioTower,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
} from "lucide-react";
import { requireAdminUser } from "@/lib/admin";
import {
  GROWTH_BUILD_ORDER,
  GROWTH_CAPABILITIES,
  GROWTH_LOOP,
  TONIGHT_READINESS,
  type GrowthOsStatus,
} from "@/lib/growth-os";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Growth OS - The LeadFlow Pro" };

const ACTIVE_WORK_STATUSES = ["intake_needed", "pending_review", "in_progress", "waiting_on_client"];

const STATUS_STYLES: Record<GrowthOsStatus, { label: string; className: string; dot: string }> = {
  live: {
    label: "Live",
    className: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
    dot: "bg-emerald-300",
  },
  partial: {
    label: "Partial",
    className: "border-cyan-300/30 bg-cyan-300/10 text-cyan-100",
    dot: "bg-cyan-300",
  },
  missing: {
    label: "Missing",
    className: "border-amber-300/35 bg-amber-300/10 text-amber-100",
    dot: "bg-amber-300",
  },
  blocked: {
    label: "Blocked",
    className: "border-rose-300/35 bg-rose-300/10 text-rose-100",
    dot: "bg-rose-300",
  },
};

const CAPABILITY_ICONS: LucideIcon[] = [
  RadioTower,
  Brain,
  Target,
  Factory,
  Megaphone,
  MessageSquareText,
  Package,
  Search,
];

export default async function AdminGrowthOsPage() {
  const admin = await requireAdminUser();
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [openIntakes, visitorMemories, pulseToday, activeOrders] = await Promise.all([
    safeCount(prisma.publicIntake.count({ where: { handled: false } })),
    safeCount((prisma as any).publicVisitorProfile.count()),
    safeCount(prisma.sitePulseEvent.count({ where: { createdAt: { gte: dayStart } } })),
    safeCount((prisma as any).workOrder.count({ where: { status: { in: ACTIVE_WORK_STATUSES } } })),
  ]);

  const blockedReadiness = TONIGHT_READINESS.filter((item) => item.state === "blocked").length;
  const missingCapabilities = GROWTH_CAPABILITIES.filter((capability) =>
    capability.status === "missing" || capability.status === "blocked",
  ).length;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="relative overflow-hidden border-b border-cyan-300/20">
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(135deg,#020617_0%,#082f49_38%,#111827_67%,#3b1f08_100%)]"
        />
        <div className="absolute -right-28 -top-32 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -left-28 -bottom-32 h-96 w-96 rounded-full bg-accent-400/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
                <Brain className="h-3.5 w-3.5" /> Internal machine map
              </div>
              <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Build the loop that creates, sells, ships, and learns.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
                Signed in as {admin.email}. This is the Growth OS view for The LeadFlow Pro:
                idea, create, advertise, sell, follow up, ship, and learn. Anything that does
                not improve that loop gets pushed down.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/intelligence" className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-50">
                Lead intelligence
              </Link>
              <Link href="/admin/blueprint-lab" className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/15">
                Blueprint lab
              </Link>
              <Link href="/admin" className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15">
                Admin home
              </Link>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric icon={ClipboardCheck} label="Open demand" value={String(openIntakes)} sub="Unhandled intakes" />
            <Metric icon={Brain} label="Visitor memory" value={String(visitorMemories)} sub="Known public visitors" />
            <Metric icon={RadioTower} label="Pulse today" value={String(pulseToday)} sub="Tracked site events" />
            <Metric icon={ShieldAlert} label="Launch blockers" value={String(blockedReadiness)} sub={`${activeOrders} active orders; ${missingCapabilities} system gaps`} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent-200">
                <Sparkles className="h-4 w-4" />
                The only loop that matters
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">From idea to shipped revenue system</h2>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-400">
                This is the operating path. The current site has pieces of every stage. The
                build now needs memory, scoring, sequencing, and hard launch gates.
              </p>
            </div>
            <Link
              href="/stump-ryan"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-3 text-sm font-semibold text-white hover:bg-accent-600"
            >
              Public offer <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-7">
            {GROWTH_LOOP.map((stage) => (
              <article key={stage.step} className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-cyan-200">{stage.step}</div>
                <h3 className="mt-2 text-lg font-semibold tracking-tight text-white">{stage.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">{stage.job}</p>
                <div className="mt-4 border-t border-white/10 pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-200">Exists</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{stage.current}</p>
                </div>
                <div className="mt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-200">Missing</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{stage.missing}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-200">
              <Database className="h-4 w-4" />
              Capability audit
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">What is incomplete right now</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">
              These are the systems we need before this becomes a repeatable funnel machine.
            </p>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {GROWTH_CAPABILITIES.map((capability, index) => {
                const Icon = CAPABILITY_ICONS[index] || BarChart3;
                return (
                  <article key={capability.name} className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold tracking-tight text-white">{capability.name}</h3>
                          <p className="mt-1 text-xs leading-relaxed text-slate-400">{capability.role}</p>
                        </div>
                      </div>
                      <StatusBadge state={capability.status} />
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <MiniList title="Exists" tone="good" items={capability.exists} />
                      <MiniList title="Gaps" tone="risk" items={capability.gaps} />
                    </div>
                    <div className="mt-4 rounded-xl border border-cyan-300/15 bg-cyan-300/10 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-cyan-100">Next build</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-200">{capability.next}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-rose-200">
                <ShieldAlert className="h-4 w-4" />
                Ad launch gate
              </div>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">Do not run traffic until this is green.</h2>
              <div className="mt-4 grid gap-3">
                {TONIGHT_READINESS.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-950/55 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">{item.label}</p>
                      <StatusBadge state={item.state} />
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.note}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent-200">
                <Target className="h-4 w-4" />
                First automation target
              </div>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">Build the Learning Core next.</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                The system should remember every winning hook, audience, offer, objection,
                close reason, fulfillment snag, and next test. That is the difference between
                using AI as a one-off assistant and building a compounding operating system.
              </p>
            </section>
          </aside>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-200">
            <Factory className="h-4 w-4" />
            Build order
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">What we build next, in order</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-5">
            {GROWTH_BUILD_ORDER.map((build) => (
              <article key={build.title} className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                <div className="inline-flex rounded-full border border-accent-300/30 bg-accent-300/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-accent-100">
                  {build.priority}
                </div>
                <h3 className="mt-3 text-lg font-semibold tracking-tight text-white">{build.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{build.why}</p>
                <ul className="mt-4 space-y-2">
                  {build.ships.map((item) => (
                    <li key={item} className="flex gap-2 text-xs leading-relaxed text-slate-300">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

async function safeCount(promise: Promise<number>) {
  try {
    return await promise;
  } catch {
    return 0;
  }
}

function Metric({
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

function StatusBadge({ state }: { state: GrowthOsStatus }) {
  const status = STATUS_STYLES[state];
  return (
    <span className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${status.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
      {status.label}
    </span>
  );
}

function MiniList({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "good" | "risk";
  items: string[];
}) {
  const color = tone === "good" ? "text-emerald-200" : "text-amber-200";
  const dot = tone === "good" ? "bg-emerald-300" : "bg-amber-300";
  return (
    <div>
      <p className={`text-[11px] font-semibold uppercase tracking-widest ${color}`}>{title}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-xs leading-relaxed text-slate-400">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
