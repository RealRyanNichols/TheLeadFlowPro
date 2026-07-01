import Link from "next/link";
import { AlertTriangle, ArrowRight, DatabaseZap, FileText, ShieldCheck, UploadCloud } from "lucide-react";
import { getAdminTokenSession } from "@/lib/admin-token";
import { hasLeadFlowDataApiConfig, selectLeadFlowRows } from "@/lib/leadflow-data-api";
import { sourceReviewStatusLabel } from "@/lib/source-submission";
import { SourceSubmissionReviewActions } from "./SourceSubmissionReviewActions";

export const dynamic = "force-dynamic";

type SubmittedSourceRow = {
  id: string;
  source_name: string;
  source_type: string;
  source_url: string | null;
  description: string;
  vertical: string;
  categories: string[];
  geography: string | null;
  buyer_type: string | null;
  best_use_case: string | null;
  data_fields_present: string[];
  origin_type: string;
  permission_claim: Record<string, unknown>;
  resale_claim: string;
  outreach_claim: string;
  sensitive_data_flag: boolean;
  minors_flag: boolean;
  restrictions: string | null;
  review_status: string;
  risk_level: string;
  risk_flags: string[];
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
};

type SourceUploadRow = {
  id: string;
  submitted_source_id: string;
  upload_type: string;
  file_name: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  storage_status: string;
  blocked_reason: string | null;
  created_at: string;
};

const riskTone: Record<string, string> = {
  low: "border-lead-300/30 bg-lead-300/10 text-lead-100",
  medium: "border-accent-300/30 bg-accent-300/10 text-accent-100",
  high: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  prohibited: "border-red-300/35 bg-red-400/10 text-red-100",
};

export default async function SourceSubmissionsDashboardPage() {
  const admin = await getAdminTokenSession();

  if (!admin) {
    return (
      <Gate
        title="Admin review only"
        body="Source submissions can include sensitive review material. Sign in with a LeadFlow admin account to review, approve, reject, suppress, or convert submissions."
      />
    );
  }

  if (!hasLeadFlowDataApiConfig()) {
    return (
      <Gate
        title="Supabase review queue is not connected"
        body="Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to load source submissions, uploads, reviews, and admin actions."
      />
    );
  }

  const [sources, uploads] = await Promise.all([
    selectLeadFlowRows<SubmittedSourceRow>("submitted_sources", {
      select: "*",
      order: "created_at.desc",
      limit: 100,
    }),
    selectLeadFlowRows<SourceUploadRow>("source_uploads", {
      select: "id,submitted_source_id,upload_type,file_name,mime_type,file_size_bytes,storage_status,blocked_reason,created_at",
      order: "created_at.desc",
      limit: 300,
    }),
  ]);

  const uploadsBySource = uploads.reduce<Record<string, SourceUploadRow[]>>((acc, upload) => {
    acc[upload.submitted_source_id] ||= [];
    acc[upload.submitted_source_id].push(upload);
    return acc;
  }, {});

  const stats = {
    total: sources.length,
    needsReview: sources.filter((source) => ["submitted", "needs_review", "needs_permission"].includes(source.review_status)).length,
    prohibited: sources.filter((source) => source.risk_level === "prohibited").length,
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-cyan-400">Source review desk</p>
          <h1 className="mt-1 text-3xl font-extrabold text-white">Submitted Sources</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-300">
            Review submitted directories, lists, routes, audiences, tools, and signal opportunities before anything becomes source proof, a marketplace listing, or a lead profile batch.
          </p>
        </div>
        <Link href="/submit-source" className="btn-accent text-sm">
          Open public intake
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={DatabaseZap} label="Submissions" value={String(stats.total)} />
        <MetricCard icon={FileText} label="Needs review" value={String(stats.needsReview)} />
        <MetricCard icon={AlertTriangle} label="Prohibited flags" value={String(stats.prohibited)} />
      </div>

      {sources.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-8 text-center">
          <UploadCloud className="mx-auto h-8 w-8 text-cyan-300" />
          <h2 className="mt-4 text-xl font-bold text-white">No submitted sources yet</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-ink-300">
            Use the public intake page to submit a test source and verify the review queue.
          </p>
          <Link href="/submit-source" className="btn-accent mt-5 text-sm">
            Submit source
          </Link>
        </div>
      ) : (
        <div className="grid gap-5">
          {sources.map((source) => (
            <article key={source.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={source.review_status} />
                    <RiskBadge risk={source.risk_level} />
                    <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-ink-200">
                      {source.source_type.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-ink-500">{new Date(source.created_at).toLocaleDateString()}</span>
                  </div>
                  <h2 className="mt-3 text-xl font-extrabold text-white">{source.source_name}</h2>
                  <p className="mt-2 max-w-4xl text-sm leading-6 text-ink-300">{source.description}</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <DetailBlock label="Vertical" value={source.vertical} />
                    <DetailBlock label="Best buyer" value={source.buyer_type || "Needs review"} />
                    <DetailBlock label="Origin" value={source.origin_type.replace(/_/g, " ")} />
                    <DetailBlock label="Geography" value={source.geography || "Not specified"} />
                    <DetailBlock label="Resale claim" value={source.resale_claim.replace(/_/g, " ")} />
                    <DetailBlock label="Outreach claim" value={source.outreach_claim.replace(/_/g, " ")} />
                  </div>
                </div>
                <div className="grid min-w-56 gap-2">
                  <MiniStat label="Fields" value={String(source.data_fields_present.length)} />
                  <MiniStat label="Flags" value={String(source.risk_flags.length)} />
                  <MiniStat label="Uploads" value={String((uploadsBySource[source.id] || []).length)} />
                </div>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                <InfoPanel title="Use case" value={source.best_use_case || "Needs reviewer note"} />
                <InfoPanel title="Categories" value={source.categories.join(", ") || "None"} />
                <InfoPanel title="Fields present" value={source.data_fields_present.join(", ").replace(/_/g, " ") || "None"} />
              </div>

              {source.risk_flags.length || source.sensitive_data_flag || source.minors_flag || source.restrictions ? (
                <div className="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
                  <p className="font-bold">Review caution</p>
                  <p className="mt-1">
                    {[...source.risk_flags, source.sensitive_data_flag ? "sensitive data flag" : "", source.minors_flag ? "minors flag" : ""]
                      .filter(Boolean)
                      .join(", ") || "Restrictions disclosed"}
                  </p>
                  {source.restrictions ? <p className="mt-2 text-amber-50">{source.restrictions}</p> : null}
                </div>
              ) : null}

              {(uploadsBySource[source.id] || []).length ? (
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {(uploadsBySource[source.id] || []).map((upload) => (
                    <div key={upload.id} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm leading-6 text-ink-200">
                      <p className="font-semibold text-white">{upload.file_name || upload.upload_type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-ink-500">
                        {upload.storage_status.replace(/_/g, " ")}
                        {upload.file_size_bytes ? ` - ${Math.round(upload.file_size_bytes / 1024)} KB` : ""}
                      </p>
                      {upload.blocked_reason ? <p className="mt-1 text-red-100">Blocked: {upload.blocked_reason}</p> : null}
                    </div>
                  ))}
                </div>
              ) : null}

              <SourceSubmissionReviewActions
                submissionId={source.id}
                sourceType={source.source_type}
                riskLevel={source.risk_level}
              />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Gate({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-3xl rounded-lg border border-white/10 bg-white/[0.035] p-8">
      <ShieldCheck className="h-8 w-8 text-cyan-300" />
      <h1 className="mt-4 text-3xl font-black text-white">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-ink-300">{body}</p>
      <Link href="/dashboard" className="btn-ghost mt-5 text-sm">
        Back to dashboard
      </Link>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof DatabaseZap; label: string; value: string }) {
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
  return (
    <span className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-xs font-semibold capitalize text-cyan-200">
      {sourceReviewStatusLabel(status)}
    </span>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  return (
    <span className={`rounded-lg border px-2.5 py-1 text-xs font-bold capitalize ${riskTone[risk] || riskTone.medium}`}>
      {risk}
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-ink-950/60 p-3 text-right">
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

function InfoPanel({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-ink-500">{title}</p>
      <p className="mt-2 text-sm leading-6 text-ink-100">{value}</p>
    </div>
  );
}
