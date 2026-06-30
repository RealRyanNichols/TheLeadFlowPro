"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BadgeDollarSign,
  BrainCircuit,
  Check,
  CheckCircle2,
  CircuitBoard,
  Crosshair,
  Database,
  FileDown,
  Flame,
  Gauge,
  Layers3,
  Loader2,
  LockKeyhole,
  MousePointerClick,
  Network,
  Radar,
  Route,
  ScanSearch,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Tags,
  TrendingUp,
  Workflow
} from "lucide-react";
import {
  DELIVERABLES,
  LIST_TYPES,
  MUST_HAVE_FIELDS,
  REGIONS,
  SOURCE_LANES,
  estimateDataProduct,
  labelFor
} from "@/lib/data-market";
import { formatCurrency } from "@/lib/utils";
import { SignalConversionDock } from "@/components/site/SignalConversionDock";

type Urgency = "standard" | "rush" | "weekly";

interface FormState {
  requestMode: "buy" | "list";
  buyerName: string;
  buyerEmail: string;
  companyName: string;
  website: string;
  useCase: string;
  targetCustomer: string;
  listTypes: string[];
  sourceLanes: string[];
  regions: string[];
  volume: number;
  budgetUsd: string;
  urgency: Urgency;
  deliverable: string;
  mustHaveFields: string[];
  excludedTargets: string;
  complianceAccepted: boolean;
}

const initialState: FormState = {
  requestMode: "list",
  buyerName: "",
  buyerEmail: "",
  companyName: "",
  website: "",
  useCase: "",
  targetCustomer: "",
  listTypes: ["ecommerce_stores", "datasets_and_databases"],
  sourceLanes: ["owner_submitted_listings", "websites", "marketplaces"],
  regions: ["United States"],
  volume: 500,
  budgetUsd: "",
  urgency: "standard",
  deliverable: "public_listing",
  mustHaveFields: ["Source URL", "Lead/source title", "Asking price or budget", "Source proof", "Confidence score", "Suppression status"],
  excludedTargets: "",
  complianceAccepted: false
};

type ProblemStarter = {
  title: string;
  pain: string;
  targetCustomer: string;
  useCase: string;
  requestMode: FormState["requestMode"];
  listTypes: string[];
  sourceLanes: string[];
  deliverable: string;
  accent: "lead" | "cyan" | "accent";
};

const PROBLEM_STARTERS: ProblemStarter[] = [
  {
    title: "Find buyers with budget",
    pain: "I need the owners already showing spend, growth, hiring, or vendor-fit pressure.",
    targetCustomer:
      "US-based business owners and operators with public websites, hiring/growth signals, visible service needs, and reachable company contact paths.",
    useCase:
      "Build a source-backed outreach list that explains why each business is worth contacting, what problem they appear to have, and which field proves the signal.",
    requestMode: "buy",
    listTypes: ["local_business_owners", "funding_hiring_signals"],
    sourceLanes: ["websites", "directories", "job_posts", "public_business_records"],
    deliverable: "csv",
    accent: "lead"
  },
  {
    title: "Map ecommerce opportunities",
    pain: "I need stores, brands, or online assets that show buyer intent, vendor gaps, or acquisition value.",
    targetCustomer:
      "Ecommerce stores, content sites, Shopify brands, domains, and marketplace sellers with public product, traffic, category, or vendor-fit clues.",
    useCase:
      "Create a lead product that tags stores by category, likely need, public source, quality score, and the most useful reason a buyer should care.",
    requestMode: "buy",
    listTypes: ["ecommerce_stores", "domains_and_websites"],
    sourceLanes: ["marketplaces", "websites", "directories", "verified_asset_docs"],
    deliverable: "profile_vault",
    accent: "cyan"
  },
  {
    title: "Sell a source or dataset",
    pain: "I have a useful source, route, directory, list, audience, or database and need it packaged without looking like a raw dump.",
    targetCustomer:
      "A submitted source with records, reach, URLs, screenshots, public proof, audience notes, and a clear buyer who could use it.",
    useCase:
      "Score the source, create a clean marketplace listing, define proof requirements, and route buyer interest to the right paid handoff or data room.",
    requestMode: "list",
    listTypes: ["datasets_and_databases", "local_service_routes"],
    sourceLanes: ["owner_submitted_listings", "verified_asset_docs", "websites"],
    deliverable: "public_listing",
    accent: "accent"
  },
  {
    title: "Find public demand signals",
    pain: "People are saying what they need, what broke, or what they almost bought, but nobody is converting it into a list.",
    targetCustomer:
      "Adults posting public demand signals, product complaints, business needs, buying research, service requests, or niche comparison language.",
    useCase:
      "Turn public demand into a reviewed signal feed with source links, intent reason, category tags, suppression status, and a safer buyer route.",
    requestMode: "buy",
    listTypes: ["social_intent_posts", "ai_saas_companies"],
    sourceLanes: ["social_public_posts", "launch_databases", "websites"],
    deliverable: "custom_brief",
    accent: "lead"
  }
];

const INTAKE_MECHANISMS = [
  {
    icon: Flame,
    title: "Pain",
    body: "What hurts, what is expensive, what keeps getting searched, delayed, compared, or almost bought."
  },
  {
    icon: ScanSearch,
    title: "Signal",
    body: "The public or submitted clue that proves the person, business, source, or market is worth reviewing."
  },
  {
    icon: CircuitBoard,
    title: "Proof",
    body: "Source URL, sample row, screenshot, public profile, field list, contact route, and suppression state."
  },
  {
    icon: Gauge,
    title: "Score",
    body: "Intent, source depth, freshness, compliance, volume, fields, urgency, and route quality."
  },
  {
    icon: Route,
    title: "Solve",
    body: "A buyer list, source listing, profile vault, custom brief, weekly drop, or managed data room."
  }
];

export function DataMarketplaceClient() {
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<null | { id: string; price: number }>(null);

  const score = useMemo(() => estimateDataProduct(form), [form]);
  const isSourceMode = form.requestMode === "list";

  function toggleArray(key: "listTypes" | "sourceLanes" | "regions" | "mustHaveFields", value: string) {
    setForm((current) => {
      const active = current[key].includes(value);
      const next = active
        ? current[key].filter((item) => item !== value)
        : [...current[key], value];
      return { ...current, [key]: next };
    });
  }

  function setValue<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function applyProblemStarter(starter: ProblemStarter) {
    setForm((current) => ({
      ...current,
      requestMode: starter.requestMode,
      targetCustomer: starter.targetCustomer,
      useCase: starter.useCase,
      listTypes: starter.listTypes,
      sourceLanes: starter.sourceLanes,
      deliverable: starter.deliverable,
      mustHaveFields: Array.from(
        new Set([
          ...current.mustHaveFields,
          "Source URL",
          "Intent reason",
          "Confidence score",
          "Suppression status"
        ])
      ).slice(0, 12)
    }));
  }


  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/data-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          budgetUsd: form.budgetUsd ? Number(form.budgetUsd) : null
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save the lead request.");
      setSuccess({
        id: data.request.id,
        price: data.request.estimatedPriceUsd
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the lead request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="signal-page pb-32 pt-10 md:pb-36 md:pt-16">
      <div className="container">
        <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]">
          <div className="min-w-0 space-y-8">
            <div className="signal-hero-grid">
              <div>
                <div className="signal-eyebrow">
                  <BrainCircuit className="h-4 w-4" />
                  Problem-led data marketplace
                </div>
                <h1 className="mt-5 max-w-full break-words text-4xl font-extrabold leading-tight text-white md:max-w-4xl md:text-6xl">
                  Tell us the problem. We turn it into a scored lead product.
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-ink-100 md:text-lg">
                  People do not buy data because rows look nice. They buy it
                  when it helps them find customers, source assets, validate a
                  market, spot demand, or sell a useful lead source. This page
                  intakes the pain first, then turns it into source-backed data
                  with scoring, exclusions, proof, and a clean buyer route.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <SignalMetric value={score.totalScore.toString()} label="solve score" tone="lead" />
                  <SignalMetric value={form.sourceLanes.length.toString()} label="source lanes" tone="cyan" />
                  <SignalMetric value={formatCurrency(score.estimatedPriceUsd)} label="fair start" tone="accent" />
                </div>
              </div>
              <MarketplaceMap form={form} score={score} isSourceMode={isSourceMode} />
            </div>

            <ProblemSolverPanel form={form} score={score} onApplyStarter={applyProblemStarter} />

            <MarketplaceRail />

            <MarketplaceDealRoom form={form} score={score} />

            <form
              id="data-marketplace-request-form"
              onSubmit={submit}
              className="space-y-8"
              data-conversion-event="data_marketplace_form_submit"
              data-conversion-cta={isSourceMode ? "Submit lead source" : "Request this data product"}
              data-conversion-source-page="/data-marketplace"
              data-conversion-destination="/api/data-requests"
            >
              <BuilderSection
                icon={Database}
                eyebrow="Step 0"
                title="Choose your intake path"
                body="One flow handles both sides: buyers who need useful data and source owners who want a source packaged, scored, and sold."
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <ModeButton
                    title="I want leads built"
                    body="Describe the audience, business type, niche, source lanes, and fields you want in the lead brain."
                    active={!isSourceMode}
                    onClick={() => setValue("requestMode", "buy")}
                  />
                  <ModeButton
                    title="I have a lead source"
                    body="Submit a dataset, directory, site, route, channel, public source, or niche signal to score and add."
                    active={isSourceMode}
                    onClick={() => setValue("requestMode", "list")}
                  />
                </div>
              </BuilderSection>

              <BuilderSection
                icon={Crosshair}
                eyebrow="Step 1"
                title="Name the problem we are solving"
                body="This is the signal. A useful marketplace starts with the pain, target, and exclusions before it asks for a package format."
              >
                <div className="grid gap-4">
                  <TextArea
                    label={isSourceMode ? "What source or market pain does this solve?" : "What problem needs solved?"}
                    value={form.useCase}
                    onChange={(value) => setValue("useCase", value)}
                    required
                    placeholder={isSourceMode ? "Example: Buyers need a reliable way to find local service routes with proof, public source links, and enough context to know which routes are worth pursuing." : "Example: I need a list of business owners already showing budget pressure, hiring needs, launch momentum, or vendor-fit signals so outreach starts with a real reason."}
                  />
                  <TextArea
                    label={isSourceMode ? "Who would buy or use this source?" : "Who or what is the answer?"}
                    value={form.targetCustomer}
                    onChange={(value) => setValue("targetCustomer", value)}
                    required
                    placeholder={isSourceMode ? "Example: Agencies, brokers, lenders, acquisition buyers, recruiters, software sellers, or operators who can use this source to find qualified demand." : "Example: US-based Shopify store owners, AI SaaS founders, home service operators, agency owners, ecommerce sellers, or a tighter segment."}
                  />
                  <TextArea
                    label={isSourceMode ? "What should be excluded before this is sold?" : "Who or what should be filtered out?"}
                    value={form.excludedTargets}
                    onChange={(value) => setValue("excludedTargets", value)}
                    placeholder="Example: No minors, no private addresses, no medical data, no protected-trait targeting, no do-not-contact records, no scraped private spaces."
                  />
                </div>
              </BuilderSection>

              <BuilderSection
                icon={SlidersHorizontal}
                eyebrow="Step 2"
                title={isSourceMode ? "Pick the source category" : "Pick the lead category"}
                body={isSourceMode ? "Choose the lead-source class. The submission gets stronger when the source, sample records, audience, and buyer value are clear." : "Start narrow. One good list, source, or signal package beats a huge dump nobody trusts."}
              >
                <OptionGrid>
                  {LIST_TYPES.map((item) => (
                    <OptionButton
                      key={item.id}
                      title={item.label}
                      body={item.description}
                      active={form.listTypes.includes(item.id)}
                      onClick={() => toggleArray("listTypes", item.id)}
                    />
                  ))}
                </OptionGrid>
              </BuilderSection>

              <BuilderSection
                icon={Radar}
                eyebrow="Step 3"
                title={isSourceMode ? "Attach the source lanes" : "Choose source lanes"}
                body={isSourceMode ? "These lanes tell the system what supports the source: submitted details, public pages, analytics summaries, source links, and verification docs." : "These lanes shape data quality, price, and compliance review time."}
              >
                <OptionGrid>
                  {SOURCE_LANES.map((item) => (
                    <OptionButton
                      key={item.id}
                      title={item.label}
                      body={item.description}
                      active={form.sourceLanes.includes(item.id)}
                      onClick={() => toggleArray("sourceLanes", item.id)}
                    />
                  ))}
                </OptionGrid>
              </BuilderSection>

              <BuilderSection
                icon={FileDown}
                eyebrow="Step 4"
                title={isSourceMode ? "Source package and proof fields" : "Package and fields"}
                body={isSourceMode ? "Choose how this should feed the lead brain: searchable profile, qualified handoff, managed workspace, or reviewed research pack." : "Choose how the buyer should receive the list and what must be attached to each row."}
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-semibold text-ink-300">Deliverable</span>
                    <select
                      value={form.deliverable}
                      onChange={(e) => setValue("deliverable", e.target.value)}
                      className="lead-control mt-1 w-full"
                    >
                      {DELIVERABLES.map((item) => (
                        <option key={item.id} value={item.id} className="bg-ink-950">
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-ink-300">
                      {isSourceMode ? "Approx. records, subscribers, locations, or reach" : "Requested volume"}
                    </span>
                    <input
                      type="number"
                      min={50}
                      max={100000}
                      step={50}
                      value={form.volume}
                      onChange={(e) => setValue("volume", Number(e.target.value))}
                      className="lead-control mt-1 w-full"
                    />
                  </label>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {MUST_HAVE_FIELDS.map((field) => (
                    <button
                      key={field}
                      type="button"
                      onClick={() => toggleArray("mustHaveFields", field)}
                      className={[
                        "flex min-h-12 items-center gap-2 rounded-lg border p-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950",
                        form.mustHaveFields.includes(field)
                          ? "border-lead-400/40 bg-lead-400/10 text-white"
                          : "border-white/10 bg-white/[0.03] text-ink-300 hover:border-cyan-400/40"
                      ].join(" ")}
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-lead-400" />
                      {field}
                    </button>
                  ))}
                </div>
              </BuilderSection>

              <BuilderSection
                icon={ShieldCheck}
                eyebrow="Step 5"
                title={isSourceMode ? "Source owner and scope details" : "Buyer and scope details"}
                body={isSourceMode ? "This captures who submitted the source, where it lives, how big it is, and what must be reviewed before it enters the marketplace." : "This captures the buyer route, region, timeline, budget range, and review guardrails before the request becomes a quote."}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField
                    label={isSourceMode ? "Submitter name" : "Your name"}
                    value={form.buyerName}
                    onChange={(value) => setValue("buyerName", value)}
                    required
                    placeholder="Ryan Nichols"
                  />
                  <TextField
                    label="Email"
                    type="email"
                    value={form.buyerEmail}
                    onChange={(value) => setValue("buyerEmail", value)}
                    required
                    placeholder="you@company.com"
                  />
                  <TextField
                    label={isSourceMode ? "Company, brand, or source name" : "Company"}
                    value={form.companyName}
                    onChange={(value) => setValue("companyName", value)}
                    placeholder="Company or agency name"
                  />
                  <TextField
                    label="Website"
                    value={form.website}
                    onChange={(value) => setValue("website", value)}
                    placeholder="https://example.com"
                  />
                  <label className="block">
                    <span className="text-xs font-semibold text-ink-300">Region</span>
                    <div className="mt-2 grid gap-2">
                      {REGIONS.map((region) => (
                        <button
                          key={region}
                          type="button"
                          onClick={() => toggleArray("regions", region)}
                          className={[
                            "flex min-h-12 items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950",
                            form.regions.includes(region)
                              ? "border-cyan-400/40 bg-cyan-400/10 text-white"
                              : "border-white/10 bg-white/[0.03] text-ink-300 hover:border-cyan-400/40"
                          ].join(" ")}
                        >
                          {region}
                          {form.regions.includes(region) ? <Check className="h-4 w-4 text-cyan-300" /> : null}
                        </button>
                      ))}
                    </div>
                  </label>
                  <div className="grid gap-4">
                    <label className="block">
                      <span className="text-xs font-semibold text-ink-300">Urgency</span>
                      <select
                        value={form.urgency}
                        onChange={(e) => setValue("urgency", e.target.value as Urgency)}
                        className="lead-control mt-1 w-full"
                      >
                        <option value="standard" className="bg-ink-950">Standard build</option>
                        <option value="rush" className="bg-ink-950">Rush build</option>
                        <option value="weekly" className="bg-ink-950">Weekly recurring drop</option>
                      </select>
                    </label>
                    <TextField
                      label={isSourceMode ? "Target value, if known" : "Budget, if known"}
                      type="number"
                      value={form.budgetUsd}
                      onChange={(value) => setValue("budgetUsd", value)}
                      placeholder="500"
                    />
                  </div>
                </div>

                <label className="mt-5 flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm text-ink-100">
                  <input
                    type="checkbox"
                    checked={form.complianceAccepted}
                    onChange={(e) => setValue("complianceAccepted", e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-white/20 bg-ink-950"
                    required
                  />
                  <span>
                    I understand this lead system is for public, submitted, or permissioned
                    source research only. No private addresses, minors, sealed records, medical
                    data, financial account data, harassment targeting, or protected-trait targeting.
                  </span>
                </label>
              </BuilderSection>

              {error ? (
                <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-ink-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="rounded-lg border border-lead-400/30 bg-lead-400/10 p-5">
                  <p className="flex items-center gap-2 text-base font-bold text-white">
                    <CheckCircle2 className="h-5 w-5 text-lead-400" />
                    Request captured
                  </p>
                  <p className="mt-2 text-sm text-ink-200">
                    Request ID: <span className="font-mono text-cyan-300">{success.id}</span>.
                    Estimated starting price: {formatCurrency(success.price)}. Next step:
                    review the source map, confirm scope, and send the payment link,
                    invoice, or source approval.
                  </p>
                </div>
              ) : null}

              <button type="submit" disabled={submitting} className="btn-accent w-full text-base md:w-auto">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {submitting ? "Saving request..." : isSourceMode ? "Submit lead source" : "Request this data product"}
              </button>
            </form>
          </div>

          <aside className="min-w-0 xl:sticky xl:top-24 xl:self-start">
            <ScorePanel form={form} score={score} />
          </aside>
        </div>
      </div>
      <SignalConversionDock
        proofTitle={isSourceMode ? "Package the source before buyers see it" : "LeadFlow is building a fair-rate data request"}
        proofBody="Problem, source lanes, proof fields, exclusions, score, and buyer route stay attached to the request."
        metrics={[
          { value: `${score.totalScore}`, label: "score" },
          { value: formatCurrency(score.estimatedPriceUsd), label: "fair start" },
          { value: `${form.sourceLanes.length}`, label: "sources" }
        ]}
        primaryHref="#data-marketplace-request-form"
        primaryLabel={isSourceMode ? "Submit source" : "Request quote"}
        primaryEvent="data_marketplace_start_click"
        secondaryHref="/problem-intake"
        secondaryLabel="Start intake"
        secondaryEvent="data_marketplace_problem_intake_click"
        sourcePage="/data-marketplace"
      />
    </section>
  );
}

function SignalMetric({
  value,
  label,
  tone
}: {
  value: string;
  label: string;
  tone: "lead" | "cyan" | "accent";
}) {
  const toneClass =
    tone === "lead" ? "text-lead-400" : tone === "cyan" ? "text-cyan-300" : "text-accent-300";

  return (
    <div className="lead-panel min-h-24 p-4">
      <p className={["text-2xl font-extrabold sm:text-3xl", toneClass].join(" ")}>{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-ink-400">{label}</p>
    </div>
  );
}

function ProblemSolverPanel({
  form,
  score,
  onApplyStarter
}: {
  form: FormState;
  score: ReturnType<typeof estimateDataProduct>;
  onApplyStarter: (starter: ProblemStarter) => void;
}) {
  const blueprint = buildMarketplaceBlueprint(form, score);
  const hasProblem = form.useCase.trim().length >= 20 && form.targetCustomer.trim().length >= 10;
  const selectedSources = form.sourceLanes.map((id) => labelFor(SOURCE_LANES, id)).slice(0, 3);
  const selectedLists = form.listTypes.map((id) => labelFor(LIST_TYPES, id)).slice(0, 2);
  const solvePath = [
    {
      label: "Problem",
      value: form.useCase.trim() || "What is costing money, time, customers, clarity, or momentum?"
    },
    {
      label: "Target",
      value: form.targetCustomer.trim() || "Which buyer, source, niche, asset, or demand signal would solve it?"
    },
    {
      label: "Source map",
      value: selectedSources.length ? selectedSources.join(" + ") : "Public, submitted, or permissioned proof lanes."
    },
    {
      label: "Data product",
      value: `${blueprint.packageName} / ${labelFor(DELIVERABLES, form.deliverable)}`
    }
  ];

  return (
    <section className="marketplace-solver-stage">
      <div className="marketplace-solver-copy">
        <div className="signal-eyebrow">
          <Workflow className="h-4 w-4" />
          Intake that solves something
        </div>
        <h2 className="mt-4 text-3xl font-extrabold leading-tight text-white md:text-5xl">
          The mechanism is not “collect names.” It is problem capture, proof, scoring, and route.
        </h2>
        <p className="mt-4 text-sm leading-6 text-ink-200 md:text-base">
          The page asks what hurts, who needs to be found, which public or
          submitted source proves it, what fields matter, who must be excluded,
          and how the buyer should receive the data. That turns vague demand
          into a priced lead product instead of a dead spreadsheet.
        </p>

        <div className="marketplace-mechanism-grid mt-5">
          {INTAKE_MECHANISMS.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="marketplace-mechanism-card">
                <div className="marketplace-mechanism-icon">
                  <Icon className="h-4 w-4" />
                </div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="marketplace-solver-console">
        <div className="marketplace-console-top">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
              Live solve path
            </p>
            <h3 className="mt-1 text-2xl font-extrabold text-white">
              {hasProblem ? "Problem signal detected" : "Start with one painful sentence"}
            </h3>
          </div>
          <div className="marketplace-score-orb">
            <strong>{score.totalScore}</strong>
            <span>score</span>
          </div>
        </div>

        <div className="marketplace-live-path">
          {solvePath.map((item, index) => (
            <div key={item.label} className="marketplace-live-row">
              <span className="marketplace-live-index">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <p>{item.label}</p>
                <strong>{item.value}</strong>
              </div>
              {index < solvePath.length - 1 ? <ArrowRight className="marketplace-live-arrow h-4 w-4" /> : null}
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="marketplace-signal-chip">
            <span>Selected demand</span>
            <strong>{selectedLists.length ? selectedLists.join(" + ") : "Pick a category"}</strong>
          </div>
          <div className="marketplace-signal-chip">
            <span>Fair-rate estimate</span>
            <strong>{formatCurrency(score.estimatedPriceUsd)}</strong>
          </div>
        </div>
      </div>

      <div className="marketplace-starter-strip">
        {PROBLEM_STARTERS.map((starter) => (
          <button
            key={starter.title}
            type="button"
            onClick={() => onApplyStarter(starter)}
            className={["marketplace-problem-card", `marketplace-problem-card-${starter.accent}`].join(" ")}
            data-conversion-event="data_marketplace_starter_click"
            data-conversion-cta={starter.title}
            data-conversion-source-page="/data-marketplace"
            data-conversion-destination="#data-marketplace-request-form"
          >
            <span className="marketplace-card-kicker">Use case</span>
            <strong>{starter.title}</strong>
            <span>{starter.pain}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function MarketplaceRail() {
  const rows = [
    {
      n: "01",
      icon: Activity,
      title: "Source class",
      body: "Dataset, website, store, route, directory, public profile set, or submitted opportunity map.",
      tone: "text-lead-400"
    },
    {
      n: "02",
      icon: Network,
      title: "Proof depth",
      body: "Links, sample rows, source notes, buyer use case, suppression state, and confidence level.",
      tone: "text-cyan-300"
    },
    {
      n: "03",
      icon: MousePointerClick,
      title: "Buyer route",
      body: "Public listing, CSV drop, profile vault, weekly drop, managed workspace, or qualified handoff.",
      tone: "text-accent-300"
    }
  ];

  return (
    <div className="signal-pressure-rail">
      {rows.map((row) => {
        const Icon = row.icon;
        return (
        <div key={row.n} className="signal-pressure-row">
          <div className={["signal-index", row.tone].join(" ")}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Mechanism {row.n}</p>
            <h2 className="text-xl font-extrabold text-white">{row.title}</h2>
            <p className="mt-1 text-sm leading-6 text-ink-300">{row.body}</p>
          </div>
        </div>
      );
      })}
    </div>
  );
}

function buildMarketplaceBlueprint(form: FormState, score: ReturnType<typeof estimateDataProduct>) {
  const listLabels = form.listTypes.map((id) => labelFor(LIST_TYPES, id));
  const sourceLabels = form.sourceLanes.map((id) => labelFor(SOURCE_LANES, id));
  const primaryList = listLabels[0] ?? "lead source";
  const primarySource = sourceLabels[0] ?? "source lane";
  const deliverable = labelFor(DELIVERABLES, form.deliverable);
  const region = form.regions[0] ?? "selected market";
  const isSourceMode = form.requestMode === "list";
  const packageName = isSourceMode
    ? `${primaryList} source profile`
    : `${primaryList} buyer list`;
  const route = isSourceMode
    ? form.deliverable === "public_listing"
      ? "review, score, then publish as a searchable marketplace listing"
      : "review proof, create sample records, then route qualified buyer interest"
    : form.urgency === "weekly"
      ? "build a recurring weekly drop with suppression and confidence labels"
      : "build a first lead package, verify source links, then price delivery";

  return {
    isSourceMode,
    packageName,
    primaryList,
    primarySource,
    deliverable,
    region,
    route,
    buyerValue:
      score.totalScore >= 84
        ? "Premium-ready: strong source depth, clear buyer use case, and enough proof to package."
        : score.totalScore >= 70
          ? "Marketable: good starting signal, but it needs tighter proof and sample rows."
          : "Early-stage: collect more proof, narrow the category, and reduce noisy fields.",
    records: `${form.volume.toLocaleString()} ${isSourceMode ? "units or reach" : "records"}`,
    marginNote:
      score.estimatedPriceUsd > 500
        ? "High-value request. Route to review before payment."
        : "Starter package. Good fit for fast quote or self-serve checkout.",
    steps: [
      "classify the source",
      "attach proof and links",
      "score confidence and freshness",
      "price the package",
      "route buyer or source owner"
    ]
  };
}

function MarketplaceDealRoom({
  form,
  score
}: {
  form: FormState;
  score: ReturnType<typeof estimateDataProduct>;
}) {
  const blueprint = buildMarketplaceBlueprint(form, score);
  const stages = [
    { icon: Search, label: "Source", value: blueprint.primarySource },
    { icon: Tags, label: "Package", value: blueprint.packageName },
    { icon: BadgeDollarSign, label: "Price", value: formatCurrency(score.estimatedPriceUsd) },
    { icon: TrendingUp, label: "Route", value: blueprint.route }
  ];

  return (
    <section className="signal-command-center">
      <div className="min-w-0">
        <div className="signal-eyebrow">
          <Layers3 className="h-4 w-4" />
          Marketplace deal room
        </div>
        <h2 className="mt-4 max-w-full break-words text-3xl font-extrabold leading-tight text-white md:max-w-3xl md:text-4xl">
          Every lead source needs proof, price, and a clean buyer route.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-300 md:text-base">
          This is the part that makes the marketplace useful: source class,
          sample records, field requirements, confidence, suppression status,
          fulfillment path, fair-rate pricing, and the first commercial action.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="signal-work-card">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Product being built</p>
            <h3 className="mt-2 text-xl font-extrabold text-white">{blueprint.packageName}</h3>
            <p className="mt-2 text-sm leading-6 text-ink-300">{blueprint.buyerValue}</p>
          </div>
          <div className="signal-work-card">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-300">Commercial route</p>
            <h3 className="mt-2 text-xl font-extrabold text-white">{blueprint.deliverable}</h3>
            <p className="mt-2 text-sm leading-6 text-ink-300">
              {blueprint.records} in {blueprint.region}. {blueprint.marginNote}
            </p>
          </div>
        </div>

        <div className="signal-action-strip mt-4">
          {stages.slice(0, 3).map((stage) => {
            const Icon = stage.icon;
            return (
              <div key={stage.label} className="signal-action-card">
                <Icon className="h-5 w-5 text-lead-400" />
                <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-ink-400">{stage.label}</p>
                <p className="mt-1 text-sm leading-6">
                  <strong>{stage.value}</strong>
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="signal-terminal self-stretch">
        <div className="border-b border-cyan-300/20 px-3 py-3">
          <p className="text-xs uppercase tracking-wider text-cyan-300">Fulfillment logic</p>
        </div>
        {stages.map((stage) => (
          <div key={stage.label} className="signal-terminal-row">
            <span className="signal-terminal-dot" />
            <span>
              <span className="text-accent-300">{stage.label.toUpperCase()}</span>
              <span className="text-ink-500"> / </span>
              {stage.value}
            </span>
          </div>
        ))}
        <div className="px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Release checklist</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {blueprint.steps.map((step) => (
              <span key={step} className="signal-rail-pill">
                <CheckCircle2 className="h-3.5 w-3.5 text-lead-400" />
                {step}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-ink-200">{blueprint.route}</p>
        </div>
      </div>
    </section>
  );
}

function MarketplaceMap({
  form,
  score,
  isSourceMode
}: {
  form: FormState;
  score: ReturnType<typeof estimateDataProduct>;
  isSourceMode: boolean;
}) {
  const blueprint = buildMarketplaceBlueprint(form, score);
  const nodes = [
    { label: "Pain", detail: "what hurts", className: "left-[7%] top-[19%] h-24 w-24 border-accent-300/70 bg-accent-300/15" },
    { label: "Intent", detail: "why now", className: "right-[7%] top-[16%] h-24 w-24 border-lead-400/70 bg-lead-400/15" },
    { label: "Proof", detail: "source trail", className: "left-[33%] top-[40%] h-32 w-32 border-cyan-300/70 bg-cyan-300/15" },
    { label: "Risk", detail: "exclusions", className: "left-[9%] bottom-[20%] h-20 w-20 border-red-400/70 bg-red-400/15" },
    { label: "Route", detail: "buyer path", className: "right-[11%] bottom-[18%] h-24 w-24 border-cyan-300/70 bg-cyan-300/15" }
  ];

  return (
    <div className="signal-map signal-map-grid marketplace-graph-stage">
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
            {isSourceMode ? "Source listing engine" : "Buyer problem engine"}
          </p>
          <h2 className="mt-1 text-2xl font-extrabold text-white">Signal solve graph</h2>
        </div>
        <div className="rounded-lg border border-lead-400/30 bg-lead-400/10 px-4 py-3 text-right">
          <p className="text-3xl font-extrabold text-lead-400">{score.totalScore}</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">score</p>
        </div>
      </div>

      <div className="marketplace-radar-field" />
      <div className="marketplace-core">
        <span>Build</span>
        <strong>{blueprint.packageName}</strong>
        <small>{formatCurrency(score.estimatedPriceUsd)}</small>
      </div>
      <span className="signal-route-line left-[18%] top-[36%] w-[62%] rotate-[10deg]" />
      <span className="signal-route-line left-[18%] bottom-[34%] w-[58%] -rotate-[12deg]" />
      <span className="signal-route-line left-[42%] top-[52%] w-[36%] rotate-[34deg]" />
      <span className="signal-route-line left-[19%] top-[56%] w-[34%] -rotate-[38deg]" />
      {nodes.map((node) => (
        <div key={node.label} className={["signal-node", node.className].join(" ")}>
          <strong>{node.label}</strong>
          <span>{node.detail}</span>
        </div>
      ))}

      <div className="absolute inset-x-4 bottom-4 space-y-2">
        {score.notes.slice(0, 3).map((note, index) => (
          <div key={note} className="grid min-h-12 grid-cols-[0.35rem_1fr_3.5rem] items-center gap-3 rounded-lg border border-white/10 bg-[#070a10]/90 p-3 text-sm">
            <span className={index === 0 ? "h-8 rounded-full bg-lead-400" : index === 1 ? "h-8 rounded-full bg-cyan-300" : "h-8 rounded-full bg-accent-300"} />
            <span className="min-w-0 text-ink-100">{note}</span>
            <span className="font-extrabold text-accent-300">{formatCurrency(Math.max(49, score.priceFloorUsd + index * 35))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BuilderSection({
  icon: Icon,
  eyebrow,
  title,
  body,
  children
}: {
  icon: typeof Radar;
  eyebrow: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <section className="lead-panel-strong overflow-hidden p-5 md:p-6">
      <div className="signal-section-head">
        <div className="signal-section-icon">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-300">{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-extrabold leading-tight text-white md:text-3xl">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-300">{body}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function OptionGrid({ children }: { children: React.ReactNode }) {
  return <div className="lead-option-grid">{children}</div>;
}

function OptionButton({
  title,
  body,
  active,
  onClick
}: {
  title: string;
  body: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "signal-choice",
        active ? "signal-choice-active" : "signal-choice-idle"
      ].join(" ")}
    >
      <span className="relative flex min-w-0 items-center gap-2 break-words text-base font-bold text-white">
        {active ? <CheckCircle2 className="h-5 w-5 shrink-0 text-lead-400" /> : <span className="h-5 w-5 shrink-0 rounded-full border border-white/20" />}
        {title}
      </span>
      <span className="relative mt-2 block text-sm leading-6 text-ink-300">{body}</span>
    </button>
  );
}

function ModeButton({
  title,
  body,
  active,
  onClick
}: {
  title: string;
  body: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "signal-choice min-h-40",
        active ? "border-accent-400/60 bg-accent-400/10 shadow-lg shadow-black/20 before:bg-accent-400" : "signal-choice-idle"
      ].join(" ")}
    >
      <span className="relative flex min-w-0 items-center gap-2 break-words text-lg font-extrabold text-white">
        {active ? <CheckCircle2 className="h-5 w-5 shrink-0 text-accent-300" /> : <span className="h-5 w-5 shrink-0 rounded-full border border-white/20" />}
        {title}
      </span>
      <span className="relative mt-2 block text-sm leading-6 text-ink-300">{body}</span>
    </button>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-3 text-xs font-semibold text-ink-300">
        <span>{label}</span>
        <span className={required ? "text-cyan-300" : "text-ink-500"}>
          {required ? "Required" : "Optional"}
        </span>
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="lead-control mt-1 w-full"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-3 text-xs font-semibold text-ink-300">
        <span>{label}</span>
        <span className={required ? "text-cyan-300" : "text-ink-500"}>
          {required ? "Required" : "Optional"}
        </span>
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        rows={4}
        className="lead-control mt-1 w-full resize-y leading-6"
      />
    </label>
  );
}

function ScorePanel({
  form,
  score
}: {
  form: FormState;
  score: ReturnType<typeof estimateDataProduct>;
}) {
  const isSourceMode = form.requestMode === "list";
  const blueprint = buildMarketplaceBlueprint(form, score);
  const readiness = [
    form.listTypes.length > 0,
    form.sourceLanes.length >= 2,
    form.mustHaveFields.length >= 4,
    form.targetCustomer.length >= 40,
    form.useCase.length >= 50
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="signal-score-panel">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
          {isSourceMode ? "Source estimate" : "Live estimate"}
        </p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-5xl font-extrabold text-white">{score.totalScore}</p>
            <p className="mt-1 text-sm text-ink-400">
              {isSourceMode ? "Lead-source score" : "Data product score"}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-3xl font-extrabold text-accent-300">
              {formatCurrency(score.estimatedPriceUsd)}
            </p>
            <p className="mt-1 text-xs text-ink-400">
              {isSourceMode ? "estimated source package" : "fair starting rate"}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <ScoreBar label="Intent" value={score.intentScore} />
          <ScoreBar label="Source depth" value={score.sourceDepthScore} />
          <ScoreBar label="Freshness" value={score.freshnessScore} />
          <ScoreBar label="Compliance" value={score.complianceScore} />
        </div>

        <div className="mt-5 rounded-lg border border-white/10 bg-[#05080d]/70 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-white">
            <LockKeyhole className="h-4 w-4 text-lead-400" />
            Compliance posture
          </p>
          <p className="mt-2 text-xs leading-5 text-ink-300">
            This {isSourceMode ? "source" : "request"} requires public, submitted,
            or permissioned sources, source links, confidence labels, suppression
            status, and review before release.
          </p>
        </div>
      </div>

      <div className="lead-panel-strong p-5 signal-float">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-300">
          {isSourceMode ? "Source revenue path" : "Buyer fulfillment path"}
        </p>
        <h3 className="mt-2 text-xl font-extrabold text-white">{blueprint.packageName}</h3>
        <p className="mt-2 text-sm leading-6 text-ink-300">{blueprint.buyerValue}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="signal-kpi-tile">
            <p className="text-2xl font-extrabold text-lead-400">{readiness}/5</p>
            <p className="mt-1 text-xs text-ink-400">package readiness</p>
            <div className="signal-kpi-meter">
              <div className="signal-kpi-fill" style={{ width: `${readiness * 20}%` }} />
            </div>
          </div>
          <div className="signal-kpi-tile">
            <p className="text-2xl font-extrabold text-cyan-300">{formatCurrency(score.estimatedPriceUsd)}</p>
            <p className="mt-1 text-xs text-ink-400">starting package</p>
            <div className="signal-kpi-meter">
              <div className="signal-kpi-fill" style={{ width: `${Math.min(100, Math.max(18, score.estimatedPriceUsd / 12))}%` }} />
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-ink-200">{blueprint.route}</p>
      </div>

      <div className="lead-panel p-5">
        <h3 className="font-bold text-white">Selected package</h3>
        <dl className="mt-4 space-y-3 text-sm">
          <SummaryRow label={isSourceMode ? "Source types" : "List types"} value={form.listTypes.map((id) => labelFor(LIST_TYPES, id)).join(", ")} />
          <SummaryRow label="Sources" value={form.sourceLanes.map((id) => labelFor(SOURCE_LANES, id)).join(", ")} />
          <SummaryRow label="Regions" value={form.regions.join(", ")} />
          <SummaryRow label={isSourceMode ? "Size or reach" : "Volume"} value={`${form.volume.toLocaleString()} ${isSourceMode ? "units" : "records"}`} />
          <SummaryRow label="Deliverable" value={labelFor(DELIVERABLES, form.deliverable)} />
        </dl>
      </div>

      <div className="lead-panel p-5">
        <h3 className="font-bold text-white">Build notes</h3>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-ink-200">
          {score.notes.map((note) => (
            <li key={note} className="flex gap-2">
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-cyan-300" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </div>

      <Link href="/" className="btn-ghost w-full text-sm">
        Back to product page
      </Link>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-semibold text-ink-200">{label}</span>
        <span className="text-ink-400">{value}/100</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-accent-400"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-ink-500">{label}</dt>
      <dd className="mt-1 break-words text-ink-100">{value || "Not selected"}</dd>
    </div>
  );
}
