"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Factory,
  FileText,
  Loader2,
  PackagePlus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { trackLeadFlowEvent } from "@/lib/leadflow-events-client";
import type {
  ProductFactoryAction,
  ProductFactoryBuyerUseCase,
  ProductFactoryBuyerRequestOption,
  ProductFactoryComplianceChecklist,
  ProductFactoryComplianceSummary,
  ProductFactoryDashboardData,
  ProductFactoryFieldGroup,
  ProductFactoryGeneratedCopy,
  ProductFactoryListingSettings,
  ProductFactoryQualitySummary,
  ProductFactorySourceType,
} from "@/lib/product-factory";
import type { SegmentCandidate } from "@/lib/segments/rules";
import { cn } from "@/lib/utils";

const steps = [
  "Choose source",
  "Review quality",
  "Buyer use case",
  "Marketplace listing",
  "Compliance review",
  "Generated copy",
  "Publish",
] as const;

const sourceTypeLabels: Record<ProductFactorySourceType, string> = {
  segment: "Segment",
  lead_profiles: "Lead profile batch",
  submitted_source: "Submitted source",
  questionnaire_result_group: "Questionnaire result group",
  civic_aggregate: "Civic aggregate",
  manual_selection: "Manual selection",
  predictive_recommendation: "Predictive recommendation",
};

const sampleFieldOptions: Array<{ key: ProductFactoryFieldGroup; label: string }> = [
  { key: "public_profile", label: "Public profile" },
  { key: "source_proof", label: "Source proof" },
  { key: "compliance", label: "Compliance" },
  { key: "contact", label: "Contact fields" },
];

function readable(value: string) {
  return value.replace(/_/g, " ");
}

function dollars(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function statusTone(status: string) {
  if (/ready|eligible|approved|published|created|active/.test(status)) return "border-lead-300/35 bg-lead-300/12 text-lead-100";
  if (/blocked|prohibited|suppressed|rejected/.test(status)) return "border-red-300/35 bg-red-300/12 text-red-100";
  if (/review|needs|draft|sample|exclusive/.test(status)) return "border-accent-300/35 bg-accent-300/12 text-accent-100";
  return "border-white/10 bg-white/[0.045] text-ink-200";
}

function defaultBuyerUseCase(source?: { vertical?: string; category?: string }): ProductFactoryBuyerUseCase {
  const vertical = source?.vertical || "Ecommerce";
  return {
    bestBuyerType: "agency, operator, or business owner",
    industry: vertical,
    geography: "United States",
    useCase: `Find reviewed ${vertical.toLowerCase()} buyer signals with proof attached before requesting full access.`,
    recommendedOutreachPath: "Review the sample, confirm allowed use, then route approved signals into the buyer follow-up system.",
    problemSolved: "stop buying blind lists and focus on source-backed buyer intent",
    offerAngle: "Open with the problem the signal already revealed, not a generic pitch.",
    buyerWarning: "This is reviewed signal intelligence, not a guaranteed lead volume or revenue promise.",
    allowedUse: "Use this product to review source proof, score context, buyer fit, and permitted follow-up options before outreach.",
    restrictedUse: "Do not use suppressed, outdated, prohibited, raw-answer, hidden, or unauthorized contact data.",
  };
}

function defaultListingSettings(source?: { title?: string; vertical?: string; category?: string }): ProductFactoryListingSettings {
  const title = source?.title && !source.title.toLowerCase().includes("queue")
    ? `${source.title} Product`
    : `${source?.vertical || "Lead"} Signal Pack`;
  return {
    title,
    description: "Source-backed signal product created from reviewed Product Factory inputs.",
    category: source?.category || "Signal product",
    vertical: source?.vertical || "Ecommerce",
    tags: ["source-backed", "review-gated", "intent-signal"],
    accessModel: "shared",
    price: 149,
    samplePrice: 49,
    sampleCount: 5,
    sampleFields: ["public_profile", "source_proof", "compliance"],
    requiresAdminApproval: true,
    visibility: "buyer_preview",
    listingStatus: "review",
  };
}

function defaultChecklist(): ProductFactoryComplianceChecklist {
  return {
    sourceProofAttached: false,
    suppressionChecked: false,
    noProhibitedData: true,
    noMinors: true,
    noProtectedTraitTargeting: true,
    consentStatusReviewed: false,
    contactFieldsReviewed: true,
    civicRestrictionsReviewed: false,
    allowedUseWritten: true,
    restrictedUseWritten: true,
  };
}

function candidateMatchesSource(candidate: SegmentCandidate, sourceType: ProductFactorySourceType) {
  if (sourceType === "lead_profiles") return candidate.segmentType === "lead_profiles";
  if (sourceType === "submitted_source") return candidate.segmentType === "submitted_sources";
  if (sourceType === "questionnaire_result_group") return candidate.segmentType === "questionnaire_responses";
  if (sourceType === "civic_aggregate") return candidate.segmentType === "aggregate_civic_signals";
  if (sourceType === "predictive_recommendation") return candidate.score >= 75 && candidate.riskLevel !== "prohibited";
  if (sourceType === "manual_selection") return true;
  return true;
}

function emptyGeneratedCopy(settings: ProductFactoryListingSettings): ProductFactoryGeneratedCopy {
  return {
    listingTitle: settings.title,
    shortSummary: "",
    buyerUseCase: "",
    sampleDescription: "",
    proofSummary: "",
    recommendedBuyerCta: "Request sample access",
    complianceNote: "",
    faq: [
      { question: "What am I buying?", answer: "" },
      { question: "Can I see a sample first?", answer: "" },
      { question: "Can I request exclusive access?", answer: "" },
      { question: "How is release controlled?", answer: "" },
    ],
  };
}

export function ProductFactoryClient({ data }: { data: ProductFactoryDashboardData }) {
  const firstSource = data.sources[0];
  const [activeStep, setActiveStep] = useState(0);
  const [sourceType, setSourceType] = useState<ProductFactorySourceType>(firstSource?.sourceType || "segment");
  const [sourceId, setSourceId] = useState(firstSource?.id || "");
  const [attachedBuyerRequestId, setAttachedBuyerRequestId] = useState(data.buyerRequests[0]?.id || "");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [buyerUseCase, setBuyerUseCase] = useState<ProductFactoryBuyerUseCase>(() => defaultBuyerUseCase(firstSource));
  const [listingSettings, setListingSettings] = useState<ProductFactoryListingSettings>(() => defaultListingSettings(firstSource));
  const [complianceChecklist, setComplianceChecklist] = useState<ProductFactoryComplianceChecklist>(() => defaultChecklist());
  const [quality, setQuality] = useState<ProductFactoryQualitySummary | null>(null);
  const [compliance, setCompliance] = useState<ProductFactoryComplianceSummary | null>(null);
  const [generatedCopy, setGeneratedCopy] = useState<ProductFactoryGeneratedCopy>(() => emptyGeneratedCopy(defaultListingSettings(firstSource)));
  const [pendingAction, setPendingAction] = useState<ProductFactoryAction | null>(null);
  const [result, setResult] = useState<{ error?: string; message?: string; runId?: string; listingId?: string; sampleId?: string } | null>(null);

  const sourceOptions = useMemo(() => data.sources.filter((source) => source.sourceType === sourceType), [data.sources, sourceType]);
  const selectedSource = useMemo(() => data.sources.find((source) => source.sourceType === sourceType && source.id === sourceId) || sourceOptions[0] || firstSource, [data.sources, firstSource, sourceId, sourceOptions, sourceType]);
  const visibleCandidates = useMemo(() => data.candidates.filter((candidate) => candidateMatchesSource(candidate, sourceType)).slice(0, 80), [data.candidates, sourceType]);

  useEffect(() => {
    trackLeadFlowEvent("product_factory_opened", {
      route: "/dashboard/product-factory",
      source_options: data.sources.length,
      status: data.mode,
      user_role: "admin",
    });
  }, [data.mode, data.sources.length]);

  function chooseSourceType(value: ProductFactorySourceType) {
    const nextSource = data.sources.find((source) => source.sourceType === value);
    setSourceType(value);
    setSourceId(nextSource?.id || value);
    setSelectedMemberIds([]);
    setBuyerUseCase(defaultBuyerUseCase(nextSource));
    setListingSettings(defaultListingSettings(nextSource));
    setGeneratedCopy(emptyGeneratedCopy(defaultListingSettings(nextSource)));
    setQuality(null);
    setCompliance(null);
    trackLeadFlowEvent("product_factory_source_selected", {
      route: "/dashboard/product-factory",
      source_type: value,
      vertical: nextSource?.vertical || "unknown",
      category: nextSource?.category || "unknown",
      user_role: "admin",
    });
  }

  function chooseSource(id: string) {
    const source = data.sources.find((item) => item.sourceType === sourceType && item.id === id);
    setSourceId(id);
    if (source) {
      setBuyerUseCase(defaultBuyerUseCase(source));
      setListingSettings(defaultListingSettings(source));
      setGeneratedCopy(emptyGeneratedCopy(defaultListingSettings(source)));
    }
    setQuality(null);
    setCompliance(null);
    trackLeadFlowEvent("product_factory_source_selected", {
      route: "/dashboard/product-factory",
      source_type: sourceType,
      source_id: id,
      vertical: source?.vertical || "unknown",
      category: source?.category || "unknown",
      user_role: "admin",
    });
  }

  function updateBuyerUseCase<K extends keyof ProductFactoryBuyerUseCase>(key: K, value: ProductFactoryBuyerUseCase[K]) {
    setBuyerUseCase((current) => ({ ...current, [key]: value }));
  }

  function updateListing<K extends keyof ProductFactoryListingSettings>(key: K, value: ProductFactoryListingSettings[K]) {
    setListingSettings((current) => ({ ...current, [key]: value }));
  }

  function toggleCandidate(id: string) {
    setSelectedMemberIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleSampleField(field: ProductFactoryFieldGroup) {
    setListingSettings((current) => ({
      ...current,
      sampleFields: current.sampleFields.includes(field)
        ? current.sampleFields.length === 1 ? current.sampleFields : current.sampleFields.filter((item) => item !== field)
        : [...current.sampleFields, field],
    }));
  }

  function toggleChecklist(key: keyof ProductFactoryComplianceChecklist) {
    setComplianceChecklist((current) => ({ ...current, [key]: !current[key] }));
  }

  function updateCopy<K extends keyof ProductFactoryGeneratedCopy>(key: K, value: ProductFactoryGeneratedCopy[K]) {
    setGeneratedCopy((current) => ({ ...current, [key]: value }));
  }

  function updateFaq(index: number, key: "question" | "answer", value: string) {
    setGeneratedCopy((current) => ({
      ...current,
      faq: current.faq.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item),
    }));
  }

  async function submit(action: ProductFactoryAction) {
    setPendingAction(action);
    setResult(null);
    trackLeadFlowEvent(
      action === "quality_review" ? "product_factory_quality_reviewed" :
      action === "publish_listing" ? "product_factory_listing_published" :
      action === "create_sample" || action === "create_exclusive_offer" ? "product_factory_listing_generated" :
      "product_factory_listing_generated",
      {
        route: "/dashboard/product-factory",
        source_type: sourceType,
        vertical: listingSettings.vertical,
        category: listingSettings.category,
        status: action,
        user_role: "admin",
      },
    );

    try {
      const response = await fetch("/api/leadflow/product-factory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          sourceType,
          sourceId,
          selectedMemberIds,
          attachedBuyerRequestId,
          buyerUseCase,
          listingSettings,
          complianceChecklist,
          generatedCopy,
          confirmed: ["publish_listing", "create_sample", "create_exclusive_offer", "attach_buyer_request"].includes(action),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (payload.quality) setQuality(payload.quality);
      if (payload.compliance) setCompliance(payload.compliance);
      if (payload.generatedCopy) setGeneratedCopy(payload.generatedCopy);
      if (!response.ok) throw new Error(payload.error || "Product Factory action failed.");
      setResult({
        message: payload.message || "Product Factory action completed.",
        runId: payload.runId,
        listingId: payload.listingId,
        sampleId: payload.sampleId,
      });
      if (action === "quality_review") setActiveStep(1);
      if (action === "generate_copy") setActiveStep(5);
    } catch (error) {
      trackLeadFlowEvent("product_factory_blocked_by_compliance", {
        route: "/dashboard/product-factory",
        source_type: sourceType,
        vertical: listingSettings.vertical,
        category: listingSettings.category,
        status: "blocked",
        user_role: "admin",
      });
      setResult({ error: error instanceof Error ? error.message : "Product Factory action failed." });
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1540px] space-y-6">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_12%_10%,rgba(35,184,255,0.18),transparent_30%),radial-gradient(circle_at_80%_16%,rgba(166,227,107,0.14),transparent_30%),linear-gradient(135deg,#07101b,#050711)] p-5 shadow-2xl shadow-black/30 md:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-cyan-200">
              <Factory className="h-4 w-4" />
              Product Factory
            </p>
            <h1 className="mt-4 max-w-5xl text-4xl font-black leading-tight text-white md:text-6xl">
              Turn reviewed signal groups into sellable marketplace products.
            </h1>
            <p className="mt-4 max-w-4xl text-sm leading-6 text-ink-200 md:text-base md:leading-7">
              Choose a reviewed source, check proof and risk, define the buyer use case, generate editable listing copy, then create a listing, sample, or exclusive offer with an audit trail.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-extrabold uppercase tracking-wider text-ink-200">
            {data.mode === "live" ? "Live data" : "Safe test data"}
          </div>
        </div>
        {data.loadErrors.length ? (
          <div className="mt-5 rounded-lg border border-accent-300/30 bg-accent-300/10 p-3 text-sm leading-6 text-accent-100">
            {data.loadErrors[0]}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Sources" value={data.stats.sourceOptions} />
        <Stat label="Runs" value={data.stats.productRuns} />
        <Stat label="Draft" value={data.stats.draftRuns} />
        <Stat label="Review" value={data.stats.reviewRuns} />
        <Stat label="Published" value={data.stats.publishedRuns} />
        <Stat label="Blocked" value={data.stats.blockedRuns} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-white/10 bg-[#060a11]/92 p-4 shadow-2xl shadow-black/25">
          <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Workflow</p>
          <div className="mt-4 grid gap-2">
            {steps.map((step, index) => (
              <button
                key={step}
                type="button"
                onClick={() => setActiveStep(index)}
                className={cn(
                  "flex min-h-11 items-center justify-between rounded-lg border px-3 text-left text-sm font-bold transition",
                  activeStep === index
                    ? "border-cyan-300/35 bg-cyan-300/10 text-white"
                    : "border-white/10 bg-white/[0.025] text-ink-300 hover:bg-white/[0.055]",
                )}
              >
                <span>{index + 1}. {step}</span>
                {index < activeStep ? <CheckCircle2 className="h-4 w-4 text-lead-300" /> : null}
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.035] p-3">
            <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Current source</p>
            <h3 className="mt-2 text-base font-black text-white">{selectedSource?.title || "No source selected"}</h3>
            <p className="mt-2 text-xs leading-5 text-ink-400">{selectedSource?.summary || "Choose a source to start."}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge label={sourceTypeLabels[sourceType]} tone="border-cyan-300/30 bg-cyan-300/10 text-cyan-100" />
              {selectedSource ? <Badge label={selectedSource.complianceStatus} tone={statusTone(selectedSource.complianceStatus)} /> : null}
            </div>
          </div>
        </aside>

        <main className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
          {activeStep === 0 ? (
            <SourceStep
              data={data}
              sourceType={sourceType}
              sourceId={sourceId}
              sourceOptions={sourceOptions}
              visibleCandidates={visibleCandidates}
              selectedMemberIds={selectedMemberIds}
              onSourceType={chooseSourceType}
              onSource={chooseSource}
              onToggleCandidate={toggleCandidate}
              onReview={() => submit("quality_review")}
              pending={pendingAction === "quality_review"}
            />
          ) : null}

          {activeStep === 1 ? (
            <QualityStep
              quality={quality}
              selectedSource={selectedSource}
              onReview={() => submit("quality_review")}
              onNext={() => setActiveStep(2)}
              pending={pendingAction === "quality_review"}
            />
          ) : null}

          {activeStep === 2 ? (
            <BuyerUseCaseStep buyerUseCase={buyerUseCase} update={updateBuyerUseCase} onNext={() => setActiveStep(3)} />
          ) : null}

          {activeStep === 3 ? (
            <ListingStep
              listingSettings={listingSettings}
              update={updateListing}
              toggleSampleField={toggleSampleField}
              onNext={() => setActiveStep(4)}
            />
          ) : null}

          {activeStep === 4 ? (
            <ComplianceStep
              checklist={complianceChecklist}
              compliance={compliance}
              quality={quality}
              toggle={toggleChecklist}
              onReview={() => submit("quality_review")}
              onNext={() => setActiveStep(5)}
              pending={pendingAction === "quality_review"}
            />
          ) : null}

          {activeStep === 5 ? (
            <CopyStep
              copy={generatedCopy}
              updateCopy={updateCopy}
              updateFaq={updateFaq}
              onGenerate={() => submit("generate_copy")}
              onNext={() => setActiveStep(6)}
              pending={pendingAction === "generate_copy"}
            />
          ) : null}

          {activeStep === 6 ? (
            <PublishStep
              quality={quality}
              compliance={compliance}
              result={result}
              pendingAction={pendingAction}
              buyerRequests={data.buyerRequests}
              attachedBuyerRequestId={attachedBuyerRequestId}
              onAttachedBuyerRequest={setAttachedBuyerRequestId}
              onAction={submit}
            />
          ) : null}

          {result ? (
            <div className={cn(
              "mt-5 rounded-lg border p-3 text-sm leading-6",
              result.error ? "border-red-300/35 bg-red-300/10 text-red-100" : "border-lead-300/35 bg-lead-300/10 text-lead-100",
            )}>
              {result.error || result.message}
              {result.listingId ? <p className="mt-1 font-mono text-xs">listing_id: {result.listingId}</p> : null}
              {result.sampleId ? <p className="mt-1 font-mono text-xs">sample_id: {result.sampleId}</p> : null}
              {result.runId ? <p className="mt-1 font-mono text-xs">run_id: {result.runId}</p> : null}
            </div>
          ) : null}
        </main>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Recent runs</p>
            <h2 className="mt-2 text-2xl font-black text-white">Factory ledger</h2>
          </div>
          <Link href="/dashboard/segments" className="btn-ghost justify-center text-sm">
            Open segments
          </Link>
        </div>
        <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm">
            <thead>
              <tr>
                {["Source", "Status", "Profiles", "Average score", "Buyer request", "Listing", "Sample", "Created"].map((header) => (
                  <th key={header} className="whitespace-nowrap bg-white/[0.035] px-3 py-3 text-xs font-extrabold uppercase tracking-wider text-ink-400">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recentRuns.length ? data.recentRuns.map((run) => {
                const qualitySummary = run.quality_summary as Partial<ProductFactoryQualitySummary>;
                return (
                  <tr key={run.id}>
                    <td className="border-t border-white/10 px-3 py-3">
                      <p className="font-black text-white">{sourceTypeLabels[run.source_type] || readable(run.source_type)}</p>
                      <p className="mt-1 font-mono text-xs text-ink-500">{run.id}</p>
                    </td>
                    <td className="border-t border-white/10 px-3 py-3"><Badge label={readable(run.status)} tone={statusTone(run.status)} /></td>
                    <td className="border-t border-white/10 px-3 py-3 font-mono text-ink-200">{qualitySummary.profileCount ?? 0}</td>
                    <td className="border-t border-white/10 px-3 py-3 font-mono text-ink-200">{qualitySummary.averageScore ?? 0}</td>
                    <td className="border-t border-white/10 px-3 py-3 font-mono text-xs text-ink-300">{run.attached_buyer_request_id || "Not attached"}</td>
                    <td className="border-t border-white/10 px-3 py-3 font-mono text-xs text-ink-300">{run.generated_listing_id || "Not created"}</td>
                    <td className="border-t border-white/10 px-3 py-3 font-mono text-xs text-ink-300">{run.generated_sample_id || "Not created"}</td>
                    <td className="whitespace-nowrap border-t border-white/10 px-3 py-3 text-ink-300">{new Date(run.created_at).toLocaleString()}</td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={8} className="border-t border-white/10 px-3 py-8 text-center text-sm text-ink-400">
                    No Product Factory runs loaded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SourceStep(props: {
  data: ProductFactoryDashboardData;
  sourceType: ProductFactorySourceType;
  sourceId: string;
  sourceOptions: ProductFactoryDashboardData["sources"];
  visibleCandidates: SegmentCandidate[];
  selectedMemberIds: string[];
  onSourceType: (value: ProductFactorySourceType) => void;
  onSource: (value: string) => void;
  onToggleCandidate: (id: string) => void;
  onReview: () => void;
  pending: boolean;
}) {
  return (
    <div>
      <StepHeader icon={PackagePlus} eyebrow="Step 1" title="Choose the source" body="Start from a saved segment, reviewed profile group, submitted source, aggregate civic set, manual pick, or predictive recommendation." />
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Select label="Source type" value={props.sourceType} onChange={(value) => props.onSourceType(value as ProductFactorySourceType)} options={Object.entries(sourceTypeLabels).map(([value, label]) => ({ value, label }))} />
        <Select label="Source" value={props.sourceId} onChange={props.onSource} options={props.sourceOptions.map((source) => ({ value: source.id, label: `${source.title} (${source.memberCount})` }))} />
      </div>

      <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.025] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Optional manual members</p>
            <p className="mt-1 text-sm text-ink-300">Select specific records to narrow the batch. Leave empty to use the whole source group.</p>
          </div>
          <Badge label={`${props.selectedMemberIds.length} selected`} tone="border-cyan-300/30 bg-cyan-300/10 text-cyan-100" />
        </div>
        <div className="mt-4 grid max-h-[420px] gap-2 overflow-y-auto pr-1 md:grid-cols-2">
          {props.visibleCandidates.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              onClick={() => props.onToggleCandidate(candidate.id)}
              className={cn(
                "rounded-lg border p-3 text-left transition",
                props.selectedMemberIds.includes(candidate.id)
                  ? "border-cyan-300/45 bg-cyan-300/10"
                  : "border-white/10 bg-ink-950/70 hover:bg-white/[0.055]",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-white">{candidate.title}</p>
                  <p className="mt-1 text-xs leading-5 text-ink-400">{candidate.summary}</p>
                </div>
                <span className="font-mono text-sm font-black text-cyan-200">{candidate.score}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge label={candidate.vertical} tone="border-white/10 bg-white/[0.045] text-ink-200" />
                <Badge label={candidate.sourceProofStatus} tone={statusTone(candidate.sourceProofStatus)} />
                <Badge label={candidate.riskLevel} tone={statusTone(candidate.riskLevel)} />
              </div>
            </button>
          ))}
        </div>
      </div>

      <FooterActions>
        <button type="button" onClick={props.onReview} disabled={props.pending} className="btn-primary justify-center">
          {props.pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
          Review quality
        </button>
      </FooterActions>
    </div>
  );
}

function QualityStep(props: {
  quality: ProductFactoryQualitySummary | null;
  selectedSource?: ProductFactoryDashboardData["sources"][number];
  onReview: () => void;
  onNext: () => void;
  pending: boolean;
}) {
  const quality = props.quality;
  return (
    <div>
      <StepHeader icon={ClipboardCheck} eyebrow="Step 2" title="Review data quality" body="Check whether the source has enough score, proof, freshness, and suppression clearance to become a product." />
      {quality ? (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Stat label="Profile count" value={quality.profileCount} />
            <Stat label="Average score" value={quality.averageScore} />
            <Stat label="Proof coverage" value={`${quality.sourceProofCoverage}%`} />
            <Stat label="Freshness" value={quality.freshness} />
          </div>
          <div className="mt-5 rounded-lg border border-cyan-300/25 bg-cyan-300/10 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-200">Pricing suggestion</p>
                <p className="mt-2 text-sm leading-6 text-ink-200">{quality.pricingSuggestion.reasoning}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:min-w-72">
                <Stat label="Listing" value={dollars(quality.pricingSuggestion.listingPrice)} />
                <Stat label="Sample" value={dollars(quality.pricingSuggestion.samplePrice)} />
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <Panel title="Confidence distribution">
              <div className="flex flex-wrap gap-2">
                {Object.entries(quality.confidenceDistribution).map(([label, count]) => (
                  <Badge key={label} label={`${label}: ${count}`} tone={statusTone(label)} />
                ))}
              </div>
            </Panel>
            <Panel title="Export readiness">
              <div className="flex flex-wrap gap-2">
                <Badge label={quality.exportEligibility} tone={statusTone(quality.exportEligibility)} />
                <Badge label={`${quality.suppressionCount} suppressed`} tone={statusTone(quality.suppressionCount ? "blocked" : "ready")} />
                <Badge label={`${quality.highRiskCount} high-risk`} tone={statusTone(quality.highRiskCount ? "review" : "ready")} />
              </div>
            </Panel>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <Panel title="Risk flags">
              {quality.riskFlags.length ? (
                <ul className="grid gap-2 text-sm text-accent-100">
                  {quality.riskFlags.map((flag) => <li key={flag} className="rounded-md border border-accent-300/20 bg-accent-300/10 p-2">{flag}</li>)}
                </ul>
              ) : <p className="text-sm text-ink-300">No risk flags in this review.</p>}
            </Panel>
            <Panel title="Missing fields">
              {quality.missingFields.length ? (
                <div className="flex flex-wrap gap-2">
                  {quality.missingFields.map((field) => <Badge key={field} label={field} tone="border-accent-300/30 bg-accent-300/10 text-accent-100" />)}
                </div>
              ) : <p className="text-sm text-ink-300">No missing required product fields detected.</p>}
            </Panel>
          </div>
        </>
      ) : (
        <div className="mt-5 rounded-lg border border-accent-300/25 bg-accent-300/10 p-4 text-sm leading-6 text-accent-100">
          Run a quality review first. Source preview: {props.selectedSource?.title || "No source selected"}.
        </div>
      )}
      <FooterActions>
        <button type="button" onClick={props.onReview} disabled={props.pending} className="btn-ghost justify-center">
          {props.pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
          Refresh quality
        </button>
        <button type="button" onClick={props.onNext} className="btn-primary justify-center">
          Buyer use case
          <ArrowRight className="h-4 w-4" />
        </button>
      </FooterActions>
    </div>
  );
}

function BuyerUseCaseStep({ buyerUseCase, update, onNext }: {
  buyerUseCase: ProductFactoryBuyerUseCase;
  update: <K extends keyof ProductFactoryBuyerUseCase>(key: K, value: ProductFactoryBuyerUseCase[K]) => void;
  onNext: () => void;
}) {
  return (
    <div>
      <StepHeader icon={ShieldCheck} eyebrow="Step 3" title="Define the buyer use case" body="Spell out who should buy this, what it helps them do, what path to take, and what not to assume." />
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Field label="Best buyer type" value={buyerUseCase.bestBuyerType} onChange={(value) => update("bestBuyerType", value)} />
        <Field label="Industry" value={buyerUseCase.industry} onChange={(value) => update("industry", value)} />
        <Field label="Geography" value={buyerUseCase.geography} onChange={(value) => update("geography", value)} />
        <Field label="Offer angle" value={buyerUseCase.offerAngle} onChange={(value) => update("offerAngle", value)} />
      </div>
      <div className="mt-4 grid gap-4">
        <Textarea label="Use case" value={buyerUseCase.useCase} onChange={(value) => update("useCase", value)} />
        <Textarea label="Recommended outreach path" value={buyerUseCase.recommendedOutreachPath} onChange={(value) => update("recommendedOutreachPath", value)} />
        <Textarea label="Problem solved" value={buyerUseCase.problemSolved} onChange={(value) => update("problemSolved", value)} />
        <Textarea label="Buyer warning or limitation" value={buyerUseCase.buyerWarning} onChange={(value) => update("buyerWarning", value)} />
        <Textarea label="Allowed use" value={buyerUseCase.allowedUse} onChange={(value) => update("allowedUse", value)} />
        <Textarea label="Restricted use" value={buyerUseCase.restrictedUse} onChange={(value) => update("restrictedUse", value)} />
      </div>
      <FooterActions>
        <button type="button" onClick={onNext} className="btn-primary justify-center">
          Set listing
          <ArrowRight className="h-4 w-4" />
        </button>
      </FooterActions>
    </div>
  );
}

function ListingStep({ listingSettings, update, toggleSampleField, onNext }: {
  listingSettings: ProductFactoryListingSettings;
  update: <K extends keyof ProductFactoryListingSettings>(key: K, value: ProductFactoryListingSettings[K]) => void;
  toggleSampleField: (field: ProductFactoryFieldGroup) => void;
  onNext: () => void;
}) {
  return (
    <div>
      <StepHeader icon={PackagePlus} eyebrow="Step 4" title="Set marketplace listing" body="Package the product as shared, limited-seat, exclusive, or internal-only with sample rules and review status." />
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Field label="Title" value={listingSettings.title} onChange={(value) => update("title", value)} />
        <Field label="Category" value={listingSettings.category} onChange={(value) => update("category", value)} />
        <Field label="Vertical" value={listingSettings.vertical} onChange={(value) => update("vertical", value)} />
        <Field label="Tags, comma separated" value={listingSettings.tags.join(", ")} onChange={(value) => update("tags", value.split(",").map((item) => item.trim()).filter(Boolean))} />
      </div>
      <div className="mt-4">
        <Textarea label="Description" value={listingSettings.description} onChange={(value) => update("description", value)} />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Select label="Access model" value={listingSettings.accessModel} onChange={(value) => update("accessModel", value as ProductFactoryListingSettings["accessModel"])} options={["shared", "limited_seats", "exclusive_listing", "exclusive_geo", "exclusive_vertical", "exclusive_time_window", "internal_only"].map((value) => ({ value, label: readable(value) }))} />
        <Select label="Visibility" value={listingSettings.visibility} onChange={(value) => update("visibility", value as ProductFactoryListingSettings["visibility"])} options={["internal", "buyer_preview", "buyer_visible", "archived"].map((value) => ({ value, label: readable(value) }))} />
        <Select label="Listing status" value={listingSettings.listingStatus} onChange={(value) => update("listingStatus", value as ProductFactoryListingSettings["listingStatus"])} options={["draft", "review", "sample_available", "available", "reserved", "sold_shared", "sold_exclusive", "expired", "archived", "suppressed"].map((value) => ({ value, label: readable(value) }))} />
        <Select label="Admin approval" value={listingSettings.requiresAdminApproval ? "yes" : "no"} onChange={(value) => update("requiresAdminApproval", value === "yes")} options={[{ value: "yes", label: "Required" }, { value: "no", label: "Not required" }]} />
        <NumberField label="Price" value={listingSettings.price} onChange={(value) => update("price", value)} />
        <NumberField label="Sample price" value={listingSettings.samplePrice} onChange={(value) => update("samplePrice", value)} />
        <NumberField label="Sample count" value={listingSettings.sampleCount} onChange={(value) => update("sampleCount", value)} />
      </div>
      <Panel title="Sample field groups" className="mt-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {sampleFieldOptions.map((field) => (
            <button
              key={field.key}
              type="button"
              onClick={() => toggleSampleField(field.key)}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm font-bold transition",
                listingSettings.sampleFields.includes(field.key)
                  ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                  : "border-white/10 bg-white/[0.025] text-ink-300 hover:bg-white/[0.055]",
              )}
            >
              {field.label}
            </button>
          ))}
        </div>
      </Panel>
      <FooterActions>
        <button type="button" onClick={onNext} className="btn-primary justify-center">
          Compliance review
          <ArrowRight className="h-4 w-4" />
        </button>
      </FooterActions>
    </div>
  );
}

function ComplianceStep({ checklist, compliance, quality, toggle, onReview, onNext, pending }: {
  checklist: ProductFactoryComplianceChecklist;
  compliance: ProductFactoryComplianceSummary | null;
  quality: ProductFactoryQualitySummary | null;
  toggle: (key: keyof ProductFactoryComplianceChecklist) => void;
  onReview: () => void;
  onNext: () => void;
  pending: boolean;
}) {
  const checks: Array<{ key: keyof ProductFactoryComplianceChecklist; label: string; detail: string }> = [
    { key: "sourceProofAttached", label: "Source proof attached", detail: "The listing has proof context buyers can inspect." },
    { key: "suppressionChecked", label: "Suppression checked", detail: "Suppressed records are excluded before release." },
    { key: "noProhibitedData", label: "No prohibited data", detail: "No hacked, leaked, private, medical, financial, minors, or sensitive records." },
    { key: "noMinors", label: "No minors", detail: "No minor data is included." },
    { key: "noProtectedTraitTargeting", label: "No protected-trait targeting", detail: "No race, religion, health, sexual orientation, or protected-trait targeting." },
    { key: "consentStatusReviewed", label: "Consent status reviewed", detail: "Consent and permission status was checked." },
    { key: "contactFieldsReviewed", label: "Contact fields reviewed", detail: "Contact fields stay hidden unless explicitly approved." },
    { key: "civicRestrictionsReviewed", label: "Civic restrictions reviewed", detail: "Civic data remains aggregate, public-source, or consented." },
    { key: "allowedUseWritten", label: "Allowed use written", detail: "Buyer-facing allowed-use text is present." },
    { key: "restrictedUseWritten", label: "Restricted use written", detail: "Buyer-facing restricted-use text is present." },
  ];
  return (
    <div>
      <StepHeader icon={ShieldCheck} eyebrow="Step 5" title="Compliance review" body="The factory should package trusted intent, not hidden dossiers. Clear every item before publishing." />
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {checks.map((check) => (
          <button
            key={check.key}
            type="button"
            onClick={() => toggle(check.key)}
            className={cn(
              "rounded-lg border p-3 text-left transition",
              checklist[check.key] ? "border-lead-300/35 bg-lead-300/10" : "border-white/10 bg-white/[0.025] hover:bg-white/[0.055]",
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn("mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border", checklist[check.key] ? "border-lead-300 bg-lead-300/20 text-lead-100" : "border-white/20 text-ink-500")}>
                {checklist[check.key] ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
              </div>
              <div>
                <p className="text-sm font-black text-white">{check.label}</p>
                <p className="mt-1 text-xs leading-5 text-ink-400">{check.detail}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Panel title="Current gate">
          {compliance ? (
            <div className="space-y-3">
              <Badge label={compliance.blocked ? "blocked" : "not blocked"} tone={statusTone(compliance.blocked ? "blocked" : "ready")} />
              {compliance.requiredBeforePublish.length ? <p className="text-sm text-accent-100">Before publish: {compliance.requiredBeforePublish.join(", ")}</p> : <p className="text-sm text-lead-100">No required checklist gaps from the last review.</p>}
              {compliance.warnings.map((warning) => <p key={warning} className="rounded-md border border-accent-300/20 bg-accent-300/10 p-2 text-sm text-accent-100">{warning}</p>)}
            </div>
          ) : <p className="text-sm text-ink-300">Run quality review after changing checklist items.</p>}
        </Panel>
        <Panel title="Quality signal">
          {quality ? (
            <div className="flex flex-wrap gap-2">
              <Badge label={`${quality.sourceProofCoverage}% proof`} tone={statusTone(quality.sourceProofCoverage === 100 ? "ready" : "review")} />
              <Badge label={`${quality.suppressionCount} suppressed`} tone={statusTone(quality.suppressionCount ? "blocked" : "ready")} />
              <Badge label={quality.exportEligibility} tone={statusTone(quality.exportEligibility)} />
            </div>
          ) : <p className="text-sm text-ink-300">No quality review yet.</p>}
        </Panel>
      </div>
      <FooterActions>
        <button type="button" onClick={onReview} disabled={pending} className="btn-ghost justify-center">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
          Recheck gate
        </button>
        <button type="button" onClick={onNext} className="btn-primary justify-center">
          Generate copy
          <ArrowRight className="h-4 w-4" />
        </button>
      </FooterActions>
    </div>
  );
}

function CopyStep({ copy, updateCopy, updateFaq, onGenerate, onNext, pending }: {
  copy: ProductFactoryGeneratedCopy;
  updateCopy: <K extends keyof ProductFactoryGeneratedCopy>(key: K, value: ProductFactoryGeneratedCopy[K]) => void;
  updateFaq: (index: number, key: "question" | "answer", value: string) => void;
  onGenerate: () => void;
  onNext: () => void;
  pending: boolean;
}) {
  return (
    <div>
      <StepHeader icon={FileText} eyebrow="Step 6" title="Generate editable listing copy" body="Copy is generated from quality, proof, use case, and compliance inputs. Edit it before saving or publishing." />
      <div className="mt-5 grid gap-4">
        <Field label="Listing title" value={copy.listingTitle} onChange={(value) => updateCopy("listingTitle", value)} />
        <Textarea label="Short summary" value={copy.shortSummary} onChange={(value) => updateCopy("shortSummary", value)} />
        <Textarea label="Buyer use case" value={copy.buyerUseCase} onChange={(value) => updateCopy("buyerUseCase", value)} />
        <Textarea label="Sample description" value={copy.sampleDescription} onChange={(value) => updateCopy("sampleDescription", value)} />
        <Textarea label="Proof summary" value={copy.proofSummary} onChange={(value) => updateCopy("proofSummary", value)} />
        <Field label="Recommended buyer CTA" value={copy.recommendedBuyerCta} onChange={(value) => updateCopy("recommendedBuyerCta", value)} />
        <Textarea label="Compliance note" value={copy.complianceNote} onChange={(value) => updateCopy("complianceNote", value)} />
      </div>
      <Panel title="FAQ" className="mt-4">
        <div className="grid gap-3">
          {copy.faq.map((item, index) => (
            <div key={`${item.question}-${index}`} className="grid gap-2 rounded-lg border border-white/10 bg-ink-950/70 p-3">
              <Field label={`Question ${index + 1}`} value={item.question} onChange={(value) => updateFaq(index, "question", value)} />
              <Textarea label="Answer" value={item.answer} onChange={(value) => updateFaq(index, "answer", value)} />
            </div>
          ))}
        </div>
      </Panel>
      <FooterActions>
        <button type="button" onClick={onGenerate} disabled={pending} className="btn-ghost justify-center">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate copy
        </button>
        <button type="button" onClick={onNext} className="btn-primary justify-center">
          Publish actions
          <ArrowRight className="h-4 w-4" />
        </button>
      </FooterActions>
    </div>
  );
}

function PublishStep({
  quality,
  compliance,
  result,
  pendingAction,
  buyerRequests,
  attachedBuyerRequestId,
  onAttachedBuyerRequest,
  onAction,
}: {
  quality: ProductFactoryQualitySummary | null;
  compliance: ProductFactoryComplianceSummary | null;
  result: { error?: string; message?: string; runId?: string; listingId?: string; sampleId?: string } | null;
  pendingAction: ProductFactoryAction | null;
  buyerRequests: ProductFactoryBuyerRequestOption[];
  attachedBuyerRequestId: string;
  onAttachedBuyerRequest: (value: string) => void;
  onAction: (action: ProductFactoryAction) => void;
}) {
  const blocked = Boolean(compliance?.blocked);
  return (
    <div>
      <StepHeader icon={PackagePlus} eyebrow="Step 7" title="Publish or save draft" body="Create the audited run. Publishing, sample creation, and exclusive offers are confirmed server-side and blocked if compliance fails." />
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Panel title="Quality">
          {quality ? (
            <div className="space-y-2 text-sm text-ink-300">
              <p>Profiles: <span className="font-mono text-white">{quality.profileCount}</span></p>
              <p>Average score: <span className="font-mono text-white">{quality.averageScore}</span></p>
              <p>Proof coverage: <span className="font-mono text-white">{quality.sourceProofCoverage}%</span></p>
            </div>
          ) : <p className="text-sm text-ink-300">Run quality review before publishing.</p>}
        </Panel>
        <Panel title="Compliance">
          {compliance ? (
            <div className="space-y-2">
              <Badge label={blocked ? "blocked" : "not blocked"} tone={statusTone(blocked ? "blocked" : "ready")} />
              {compliance.requiredBeforePublish.length ? <p className="text-sm text-accent-100">{compliance.requiredBeforePublish.length} checklist items remain before publish.</p> : <p className="text-sm text-lead-100">Publish checklist cleared.</p>}
            </div>
          ) : <p className="text-sm text-ink-300">No compliance review yet.</p>}
        </Panel>
        <Panel title="Result">
          {result ? (
            <p className={cn("text-sm leading-6", result.error ? "text-red-100" : "text-lead-100")}>{result.error || result.message}</p>
          ) : <p className="text-sm text-ink-300">No action submitted yet.</p>}
        </Panel>
      </div>

      <Panel title="Attach buyer request" className="mt-5">
        {buyerRequests.length ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <Select
              label="Buyer request"
              value={attachedBuyerRequestId}
              onChange={onAttachedBuyerRequest}
              options={buyerRequests.map((request) => ({
                value: request.id,
                label: `${request.label} | ${request.requestType} | ${request.budgetRange} | ${request.status}`,
              }))}
            />
            <ActionButton label="Attach request" action="attach_buyer_request" pendingAction={pendingAction} onAction={onAction} />
            <div className="lg:col-span-2">
              {buyerRequests.filter((request) => request.id === attachedBuyerRequestId).map((request) => (
                <div key={request.id} className="rounded-lg border border-white/10 bg-ink-950/70 p-3 text-sm leading-6 text-ink-300">
                  <span className="font-black text-white">{request.vertical}</span> | {request.category} | intended use: {request.intendedUse}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm leading-6 text-ink-300">
            No buyer requests loaded. Save the product run or publish the listing first, then attach it after buyer demand is available.
          </p>
        )}
      </Panel>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <ActionButton label="Save draft" action="save_draft" pendingAction={pendingAction} onAction={onAction} />
        <ActionButton label="Send to review" action="send_review" pendingAction={pendingAction} onAction={onAction} />
        <ActionButton label="Publish listing" action="publish_listing" pendingAction={pendingAction} onAction={onAction} premium />
        <ActionButton label="Create sample" action="create_sample" pendingAction={pendingAction} onAction={onAction} />
        <ActionButton label="Exclusive offer" action="create_exclusive_offer" pendingAction={pendingAction} onAction={onAction} />
      </div>

      {blocked ? (
        <div className="mt-5 rounded-lg border border-red-300/30 bg-red-300/10 p-3 text-sm leading-6 text-red-100">
          Compliance is blocked. Save/publish actions will not persist until the prohibited issue is cleared.
        </div>
      ) : null}
    </div>
  );
}

function ActionButton({ label, action, pendingAction, onAction, premium = false }: {
  label: string;
  action: ProductFactoryAction;
  pendingAction: ProductFactoryAction | null;
  onAction: (action: ProductFactoryAction) => void;
  premium?: boolean;
}) {
  return (
    <button type="button" onClick={() => onAction(action)} disabled={Boolean(pendingAction)} className={premium ? "btn-primary justify-center" : "btn-ghost justify-center"}>
      {pendingAction === action ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
      {label}
    </button>
  );
}

function StepHeader({ icon: Icon, eyebrow, title, body }: {
  icon: typeof Factory;
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-black text-white md:text-3xl">{title}</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-ink-300">{body}</p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.045] p-4">
      <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function Badge({ label, tone }: { label: string; tone: string }) {
  return <span className={cn("inline-flex items-center rounded-md border px-2 py-1 text-xs font-extrabold uppercase tracking-wide", tone)}>{readable(label)}</span>;
}

function Panel({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-lg border border-white/10 bg-white/[0.025] p-4", className)}>
      <p className="mb-3 text-xs font-extrabold uppercase tracking-wider text-ink-400">{title}</p>
      {children}
    </div>
  );
}

function FooterActions({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">{children}</div>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/50" />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</span>
      <input type="number" min={0} value={value} onChange={(event) => onChange(Number(event.target.value || 0))} className="h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/50" />
      <span className="text-xs text-ink-500">{dollars(value)}</span>
    </label>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="rounded-lg border border-white/10 bg-ink-950 px-3 py-3 text-sm leading-6 text-white outline-none focus:border-cyan-300/50" />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/50">
        {options.length ? options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>) : <option value="">No options loaded</option>}
      </select>
    </label>
  );
}
