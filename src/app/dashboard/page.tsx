import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  BrainCircuit,
  CheckCircle2,
  DatabaseZap,
  Eye,
  FileCheck2,
  Fingerprint,
  Globe2,
  LockKeyhole,
  LucideIcon,
  Network,
  PackageCheck,
  Radar,
  Scale,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientWorkOrders, remainingHours } from "@/lib/client-office";
import { formatHours } from "@/lib/workload";
import { formatCurrency, relativeTime } from "@/lib/utils";
import { LIST_TYPES, SOURCE_LANES, labelFor } from "@/lib/data-market";

export const dynamic = "force-dynamic";

const OPERATING_LANES: Array<{
  icon: LucideIcon;
  title: string;
  body: string;
  signal: string;
}> = [
  {
    icon: Radar,
    title: "Capture live intent",
    body: "Pull from problem intake, web forms, social demand, ecommerce signals, AI searches, and public business footprints.",
    signal: "Source map",
  },
  {
    icon: BrainCircuit,
    title: "Score the person or business",
    body: "Rank pain, buying urgency, budget fit, contactability, source depth, and compliance readiness before anything is sold.",
    signal: "Signal score",
  },
  {
    icon: PackageCheck,
    title: "Package clean lists",
    body: "Turn raw signal into filtered buyer lists with fields, exclusions, proof notes, and delivery status.",
    signal: "Buyer-ready",
  },
  {
    icon: Scale,
    title: "Sell at a fair rate",
    body: "Quote by volume, depth, scoring strength, and use case so buyers understand exactly what they are purchasing.",
    signal: "Rate engine",
  },
];

const PIPELINE_STEPS = [
  "Adult problem intake",
  "Public source sweep",
  "Intent tags",
  "Consent/provenance",
  "Buyer package",
  "Delivery",
];

type QueueRequest = {
  id: string;
  requestMode: string;
  status: string;
  listTypes: string[];
  sourceLanes: string[];
  volume: number;
  estimatedPriceUsd: number;
  targetCustomer: string;
  createdAt: Date;
};

export default async function DashboardOverview() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const userEmail = session?.user?.email || "";
  const firstName =
    (session?.user?.name || session?.user?.email || "").split(" ")[0]?.split("@")[0] || "there";

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const requestOr = [
    ...(userId ? [{ userId }] : []),
    ...(userEmail ? [{ buyerEmail: userEmail }] : []),
  ];
  const intakeOr = [
    ...(userId ? [{ userId }] : []),
    ...(userEmail ? [{ email: userEmail }] : []),
  ];
  const dataRequestWhere = requestOr.length ? { OR: requestOr } : { id: "__none__" };
  const intakeWhere = intakeOr.length ? { OR: intakeOr } : { id: "__none__" };

  const [
    newLeadsThisMonth,
    totalLeads,
    wonLeads,
    recentLeads,
    buyerRequests,
    sourceSubmissions,
    readyPackages,
    quotedRequests,
    requestPipeline,
    recentRequests,
    intakeCount,
    strongSignalIntakes,
  ] = await Promise.all([
    userId ? prisma.lead.count({ where: { userId, createdAt: { gte: monthStart } } }) : 0,
    userId ? prisma.lead.count({ where: { userId } }) : 0,
    userId ? prisma.lead.count({ where: { userId, status: "won" } }) : 0,
    userId
      ? prisma.lead.findMany({
          where: { userId },
          orderBy: [{ lastContact: "desc" }, { createdAt: "desc" }],
          take: 4,
        })
      : [],
    prisma.dataListRequest.count({ where: { ...dataRequestWhere, requestMode: "buy" } }),
    prisma.dataListRequest.count({ where: { ...dataRequestWhere, requestMode: "list" } }),
    prisma.dataListRequest.count({ where: { ...dataRequestWhere, status: "ready" } }),
    prisma.dataListRequest.count({ where: { ...dataRequestWhere, status: "quoted" } }),
    prisma.dataListRequest.aggregate({
      where: dataRequestWhere,
      _sum: { estimatedPriceUsd: true },
    }),
    prisma.dataListRequest.findMany({
      where: dataRequestWhere,
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        requestMode: true,
        status: true,
        listTypes: true,
        sourceLanes: true,
        volume: true,
        estimatedPriceUsd: true,
        targetCustomer: true,
        createdAt: true,
      },
    }),
    prisma.adultInterestIntake.count({ where: intakeWhere }),
    prisma.adultInterestIntake.count({ where: { ...intakeWhere, leadScore: { gte: 78 } } }),
  ]);

  const workOrders = userId && userEmail
    ? await getClientWorkOrders({ id: userId, email: userEmail, name: session?.user?.name })
    : [];
  const openWorkOrders = workOrders.filter((order) =>
    ["intake_needed", "pending_review", "in_progress", "waiting_on_client"].includes(order.status)
  );
  const openOrderHours = openWorkOrders.reduce((sum, order) => sum + remainingHours(order), 0);
  const pipelineValue = requestPipeline._sum.estimatedPriceUsd ?? 0;
  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  return (
    <div className="dashboard-signal-shell mx-auto max-w-7xl space-y-8">
      <section className="dashboard-command-hero">
        <div className="dashboard-command-copy">
          <p className="dashboard-kicker">LeadFlow command brain</p>
          <h1>
            Welcome{session?.user ? `, ${firstName}` : ""}. Build lists people actually pay for.
          </h1>
          <p>
            This is the operating room for captured intent: adults with real problems,
            business owners, ecommerce stores, AI/search demand, public web signals,
            social indicators, and buyer requests in one scored marketplace.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/data-marketplace" className="btn-accent btn-magnetic text-sm">
              Build or buy a list
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/problem-intake" className="btn-ghost text-sm">
              Capture problem intent
            </Link>
            <Link href="/dashboard/data-requests" className="btn-ghost text-sm">
              Review requests
            </Link>
          </div>
          <div className="dashboard-trust-strip">
            <span><ShieldCheck className="h-4 w-4" /> permissioned</span>
            <span><Fingerprint className="h-4 w-4" /> source-labeled</span>
            <span><Scale className="h-4 w-4" /> fair-rate priced</span>
          </div>
        </div>

        <div className="dashboard-orbit-panel" aria-label="LeadFlow data marketplace map">
          <div className="dashboard-orbit-grid" />
          <div className="dashboard-orbit-core">
            <BrainCircuit className="h-8 w-8" />
            <strong>Signal Brain</strong>
            <span>{intakeCount + totalLeads + buyerRequests + sourceSubmissions} records</span>
          </div>
          <MarketNode className="left-[5%] top-[12%]" icon={Globe2} title="Public web" value="Open sources" />
          <MarketNode className="right-[6%] top-[15%]" icon={Users} title="Adult intent" value={`${intakeCount} intakes`} />
          <MarketNode className="left-[9%] bottom-[17%]" icon={ShoppingCart} title="Buyer demand" value={`${buyerRequests} asks`} />
          <MarketNode className="right-[9%] bottom-[14%]" icon={BadgeDollarSign} title="Pipeline" value={formatCurrency(pipelineValue)} />
          <div className="dashboard-delivery-readout">
            <span>Ready packages</span>
            <strong>{readyPackages}</strong>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={DatabaseZap}
          label="Captured signals"
          value={String(intakeCount + newLeadsThisMonth)}
          sub={`${strongSignalIntakes} high-intent intakes`}
          highlight
        />
        <MetricCard
          icon={ShoppingCart}
          label="Buyer requests"
          value={String(buyerRequests)}
          sub={`${quotedRequests} quoted`}
        />
        <MetricCard
          icon={Network}
          label="Source submissions"
          value={String(sourceSubmissions)}
          sub="Lists offered or being built"
        />
        <MetricCard
          icon={BadgeDollarSign}
          label="Pipeline value"
          value={formatCurrency(pipelineValue)}
          sub="Estimated fair-rate revenue"
        />
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="dashboard-kicker">Operating lanes</p>
              <h2 className="text-2xl font-extrabold text-white">From raw signal to sellable list</h2>
            </div>
            <Link href="/dashboard/data-requests" className="text-sm font-semibold text-cyan-300 hover:text-white">
              Open marketplace queue
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {OPERATING_LANES.map((lane) => (
              <OperatingLane key={lane.title} {...lane} />
            ))}
          </div>
        </div>

        <div className="dashboard-progress-panel">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="dashboard-kicker">Packaging pipeline</p>
              <h2 className="text-2xl font-extrabold text-white">Proof before purchase</h2>
              <p className="mt-2 text-sm leading-6 text-ink-300">
                Each list needs a source trail, intent tags, exclusions, contactability,
                and consent/provenance status before it becomes deliverable.
              </p>
            </div>
            <span className="dashboard-score-badge">{readyPackages} ready</span>
          </div>
          <div className="mt-6 space-y-3">
            {PIPELINE_STEPS.map((step, index) => (
              <div key={step} className="dashboard-pipeline-step">
                <span>{index + 1}</span>
                <p>{step}</p>
                <CheckCircle2 className="h-4 w-4" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 dashboard-queue-panel">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="dashboard-kicker">Demand queue</p>
              <h2 className="text-2xl font-extrabold text-white">Buyer asks and source offers</h2>
              <p className="mt-2 text-sm text-ink-300">
                This is where the main brain turns demand into scoped deliverables.
              </p>
            </div>
            <Link href="/data-marketplace" className="btn-primary text-sm">
              New request
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-5 grid gap-3">
            {recentRequests.length > 0 ? (
              recentRequests.map((request) => <QueueRequestCard key={request.id} request={request} />)
            ) : (
              <div className="dashboard-empty-state">
                <Sparkles className="h-8 w-8 text-accent-300" />
                <h3>No data marketplace requests yet</h3>
                <p>
                  Start with a buyer request, a source submission, or the problem-intake
                  trap that turns visitor pain into scored demand.
                </p>
                <Link href="/data-marketplace" className="btn-accent mt-4 text-sm">
                  Open marketplace
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="dashboard-side-panel">
            <p className="dashboard-kicker">Consent and quality</p>
            <h3>Delivery gate</h3>
            <div className="mt-4 space-y-3">
              <QualityRow icon={LockKeyhole} label="Consent/provenance field" value="Required" />
              <QualityRow icon={Eye} label="Source labels" value="Visible" />
              <QualityRow icon={Target} label="Lead conversion rate" value={`${conversionRate}%`} />
              <QualityRow icon={FileCheck2} label="Open fulfillment" value={`${openWorkOrders.length} orders`} />
            </div>
            <p className="mt-4 text-xs leading-5 text-ink-400">
              The platform can sell data only when the record is adult-confirmed,
              source-labeled, and suitable for the buyer use case.
            </p>
          </div>

          <LeadRepOrchestratorCard />

          <Link href="/dashboard/work" className="dashboard-side-panel block transition hover:border-cyan-300/35">
            <p className="dashboard-kicker">Client office</p>
            <h3>Fulfillment lane</h3>
            <p className="mt-2 text-sm leading-6 text-ink-300">
              {openWorkOrders.length > 0
                ? `${openWorkOrders.length} open order${openWorkOrders.length === 1 ? "" : "s"} with ${formatHours(openOrderHours)} still reserved.`
                : "Paid work orders, files, deadlines, notes, and list-delivery work will live here."}
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-cyan-300">
              Open office <ArrowRight className="h-4 w-4" />
            </span>
          </Link>

          <div className="dashboard-side-panel">
            <p className="dashboard-kicker">Captured CRM leads</p>
            <h3>Recent people and companies</h3>
            <div className="mt-4 space-y-3">
              {recentLeads.length > 0 ? (
                recentLeads.map((lead) => {
                  const display = lead.name || lead.phone || lead.email || "New lead";
                  return (
                    <Link
                      key={lead.id}
                      href={`/dashboard/leads/${lead.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 transition hover:border-cyan-300/30"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-white">{display}</span>
                        <span className="block truncate text-xs text-ink-400">{lead.notes || lead.source}</span>
                      </span>
                      <span className="shrink-0 text-[0.68rem] text-ink-400">
                        {relativeTime(lead.lastContact ?? lead.createdAt)}
                      </span>
                    </Link>
                  );
                })
              ) : (
                <p className="rounded-lg border border-dashed border-white/10 p-4 text-sm leading-6 text-ink-300">
                  No captured CRM leads yet. Start with problem intake or a data
                  marketplace request.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function LeadRepOrchestratorCard() {
  const packageIdeas = [
    "Buyer-ready data packages",
    "Predictive signal sweeps",
    "Conversion fixes from verified demand",
  ];

  return (
    <div className="dashboard-side-panel">
      <p className="dashboard-kicker">LeadRep agent bus</p>
      <h3>GitHub to Supabase to Grok</h3>
      <p className="mt-2 text-sm leading-6 text-ink-300">
        Agent runs stay in dry-run until manual approval clears the handoff. Supabase stores the memory trail;
        GitHub issues keep the handoff log.
      </p>
      <div className="mt-4 grid gap-2">
        <QualityRow icon={BrainCircuit} label="Agent runs" value="approval gated" />
        <QualityRow icon={PackageCheck} label="Package ideas" value="candidate only" />
        <QualityRow icon={ShieldCheck} label="Outbound actions" value="blocked" />
      </div>
      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.035] p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-400">Queue focus</p>
        <ul className="mt-2 space-y-1 text-sm font-semibold leading-6 text-ink-300">
          {packageIdeas.map((idea) => (
            <li key={idea}>{idea}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MarketNode({
  icon: Icon,
  title,
  value,
  className,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  className: string;
}) {
  return (
    <div className={`dashboard-market-node ${className}`}>
      <Icon className="h-4 w-4" />
      <span>
        <strong>{title}</strong>
        <small>{value}</small>
      </span>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  highlight = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <article className={`dashboard-metric-card ${highlight ? "dashboard-metric-card-hot" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="dashboard-metric-icon"><Icon className="h-5 w-5" /></span>
        {highlight ? <span className="dashboard-score-badge">live</span> : null}
      </div>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{sub}</span>
    </article>
  );
}

function OperatingLane({ icon: Icon, title, body, signal }: {
  icon: LucideIcon;
  title: string;
  body: string;
  signal: string;
}) {
  return (
    <article className="dashboard-lane-card">
      <div className="flex items-start justify-between gap-4">
        <span className="dashboard-lane-icon"><Icon className="h-5 w-5" /></span>
        <span className="dashboard-score-badge">{signal}</span>
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

function QueueRequestCard({ request }: { request: QueueRequest }) {
  const listLabel = request.listTypes.length
    ? request.listTypes.map((id) => labelFor(LIST_TYPES, id)).join(", ")
    : "Custom lead list";
  const sourceLabel = request.sourceLanes.length
    ? request.sourceLanes.map((id) => labelFor(SOURCE_LANES, id)).join(", ")
    : "Mixed sources";
  const mode = request.requestMode === "list" ? "Source offer" : "Buyer request";

  return (
    <article className="dashboard-request-card">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="dashboard-score-badge">{mode}</span>
          <span className="dashboard-status-pill">{request.status.replace(/_/g, " ")}</span>
          <span className="text-xs text-ink-500">{relativeTime(request.createdAt)}</span>
        </div>
        <h3>{listLabel}</h3>
        <p>{request.targetCustomer}</p>
        <small>{sourceLabel}</small>
      </div>
      <div className="dashboard-request-stats">
        <span>
          <strong>{request.volume.toLocaleString()}</strong>
          records
        </span>
        <span>
          <strong>{formatCurrency(request.estimatedPriceUsd)}</strong>
          estimate
        </span>
      </div>
    </article>
  );
}

function QualityRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="dashboard-quality-row">
      <span><Icon className="h-4 w-4" /></span>
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}
