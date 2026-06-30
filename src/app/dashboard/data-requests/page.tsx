import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Database, FileDown, ShieldCheck } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DELIVERABLES, LIST_TYPES, SOURCE_LANES, labelFor } from "@/lib/data-market";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ScoreShape = {
  totalScore?: number;
  intentScore?: number;
  sourceDepthScore?: number;
  complianceScore?: number;
};

function scoreValue(scoring: unknown, key: keyof ScoreShape) {
  if (!scoring || typeof scoring !== "object") return null;
  const value = (scoring as ScoreShape)[key];
  return typeof value === "number" ? value : null;
}

export default async function DataRequestsPage() {
  const user = await currentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard/data-requests");

  const requests = await prisma.dataListRequest.findMany({
    where: {
      OR: [
        { userId: user.id },
        { buyerEmail: user.email }
      ]
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      requestMode: true,
      status: true,
      listTypes: true,
      sourceLanes: true,
      regions: true,
      deliverable: true,
      volume: true,
      estimatedPriceUsd: true,
      scoring: true,
      createdAt: true,
      targetCustomer: true
    }
  });

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-cyan-400">Universal lead brain</p>
          <h1 className="mt-1 text-3xl font-extrabold text-white">Lead Requests</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-300">
            Track buyer requests, source submissions, scored packages, estimates, and review status.
          </p>
        </div>
        <Link href="/data-marketplace" className="btn-accent text-sm">
          Open marketplace
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={Database} label="Marketplace items" value={String(requests.length)} />
        <MetricCard
          icon={FileDown}
          label="Estimated pipeline"
          value={formatCurrency(requests.reduce((sum, item) => sum + item.estimatedPriceUsd, 0))}
        />
        <MetricCard
          icon={ShieldCheck}
          label="Avg score"
          value={
            requests.length
              ? String(Math.round(
                  requests.reduce((sum, item) => sum + (scoreValue(item.scoring, "totalScore") ?? 0), 0) /
                    requests.length
                ))
              : "0"
          }
        />
      </div>

      {requests.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-8 text-center">
          <h2 className="text-xl font-bold text-white">No marketplace requests yet</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-ink-300">
            Use the marketplace builder to request a list or submit a lead source
            for review.
          </p>
          <Link href="/data-marketplace" className="btn-accent mt-5 text-sm">
            Open marketplace
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <article key={request.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={request.status} />
                    <span className="rounded-lg border border-accent-400/30 bg-accent-400/10 px-2.5 py-1 text-xs font-semibold capitalize text-accent-200">
                      {request.requestMode === "list" ? "source submission" : "buyer request"}
                    </span>
                    <span className="text-xs text-ink-500">
                      {request.createdAt.toLocaleDateString()}
                    </span>
                  </div>
                  <h2 className="mt-3 text-xl font-extrabold text-white">
                    {request.listTypes.map((id) => labelFor(LIST_TYPES, id)).join(", ")}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-300">
                    {request.targetCustomer}
                  </p>
                </div>
                <div className="grid min-w-52 grid-cols-2 gap-2 text-right sm:grid-cols-3 lg:grid-cols-1">
                  <MiniStat label="Score" value={String(scoreValue(request.scoring, "totalScore") ?? "N/A")} />
                  <MiniStat label="Estimate" value={formatCurrency(request.estimatedPriceUsd)} />
                  <MiniStat label="Volume" value={request.volume.toLocaleString()} />
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <DetailBlock label="Sources" value={request.sourceLanes.map((id) => labelFor(SOURCE_LANES, id)).join(", ")} />
                <DetailBlock label="Regions" value={request.regions.join(", ")} />
                <DetailBlock label="Deliverable" value={labelFor(DELIVERABLES, request.deliverable)} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Database;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs uppercase tracking-wider text-ink-500">{label}</p>
          <p className="mt-1 text-2xl font-extrabold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ");
  return (
    <span className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-xs font-semibold capitalize text-cyan-200">
      {label}
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-ink-950/60 p-3">
      <p className="text-xs text-ink-500">{label}</p>
      <p className="mt-1 text-base font-bold text-white">{value}</p>
    </div>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-ink-950/60 p-3">
      <p className="text-xs uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-1 text-sm leading-6 text-ink-100">{value}</p>
    </div>
  );
}
