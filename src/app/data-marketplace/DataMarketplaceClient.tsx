"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Database,
  FileDown,
  Loader2,
  LockKeyhole,
  Radar,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles
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
    <section className="py-10 md:py-16">
      <div className="container">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]">
          <div className="space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-cyan-200">
                <Database className="h-4 w-4" />
                Universal lead intake
              </div>
              <h1 className="mt-5 max-w-4xl text-4xl font-extrabold leading-tight text-white md:text-6xl">
                One intake flow for every lead source your business can use.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-ink-200 md:text-lg">
                Request lists, submit source maps, score demand, and build a main
                brain database of leads across businesses, ecommerce, AI, local
                services, creator channels, websites, routes, directories, and
                public-source opportunity signals.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ValueCard
                icon={Radar}
                title="Any lead source"
                body="Lists, stores, tools, routes, datasets, domains, channels, communities, and public opportunity maps."
              />
              <ValueCard
                icon={BadgeCheck}
                title="Source proof plus score"
                body="Every submitted source gets depth, proof, intent, freshness, and compliance scoring."
              />
              <ValueCard
                icon={FileDown}
                title="Lead brain output"
                body="Turn intake into lead profiles, CSV drops, CRM imports, watched segments, and managed research packs."
              />
            </div>

            <form onSubmit={submit} className="space-y-8">
              <BuilderSection
                icon={Database}
                eyebrow="Step 0"
                title="Choose your intake path"
                body="Keep one simple flow: request leads you want or submit a source that should be added to the lead brain."
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
                icon={SlidersHorizontal}
                eyebrow="Step 1"
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
                eyebrow="Step 2"
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
                eyebrow="Step 3"
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
                eyebrow="Step 4"
                title={isSourceMode ? "Source and submitter details" : "Buyer and target details"}
                body={isSourceMode ? "This is the information we collect so the source can be reviewed, scored, priced, and routed cleanly." : "This is the information we collect from the buyer so the list can be built and sold cleanly."}
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

                <div className="mt-4 grid gap-4">
                  <TextArea
                    label={isSourceMode ? "What source should be added?" : "Who do you want on this list?"}
                    value={form.targetCustomer}
                    onChange={(value) => setValue("targetCustomer", value)}
                    required
                    placeholder={isSourceMode ? "Example: A database of 4,800 ecommerce brands with source links, category tags, and vendor-fit notes." : "Example: US-based Shopify store owners selling premium home goods, showing recent launch or vendor-fit signals."}
                  />
                  <TextArea
                    label={isSourceMode ? "Why does this source matter?" : "What will you use this data for?"}
                    value={form.useCase}
                    onChange={(value) => setValue("useCase", value)}
                    required
                    placeholder={isSourceMode ? "Example: This source can power vendor outreach, agency prospecting, acquisition research, or niche market mapping. I can show sample rows and proof of source." : "Example: Build a prospect list for agency outreach, with a reason to contact each company and a confidence score."}
                  />
                  <TextArea
                    label={isSourceMode ? "Restrictions, exclusions, or source notes" : "Who should be excluded?"}
                    value={form.excludedTargets}
                    onChange={(value) => setValue("excludedTargets", value)}
                    placeholder="Example: No minors, no private addresses, no medical data, no protected-trait targeting, no do-not-contact records."
                  />
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

          <aside className="xl:sticky xl:top-24 xl:self-start">
            <ScorePanel form={form} score={score} />
          </aside>
        </div>
      </div>
    </section>
  );
}

function ValueCard({
  icon: Icon,
  title,
  body
}: {
  icon: typeof Radar;
  title: string;
  body: string;
}) {
  return (
    <div className="lead-panel min-h-44 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-ink-300">{body}</p>
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
    <section className="lead-panel-strong p-5 md:p-6">
      <div className="mb-5 flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-400/10 text-accent-300">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-300">{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-extrabold text-white">{title}</h2>
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
        "min-h-40 min-w-0 rounded-lg border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950",
        active
          ? "border-cyan-400/50 bg-cyan-400/10 shadow-lg shadow-cyan-950/20"
          : "border-white/10 bg-white/[0.03] hover:border-cyan-400/30"
      ].join(" ")}
    >
      <span className="flex min-w-0 items-center gap-2 break-words text-base font-bold text-white">
        {active ? <CheckCircle2 className="h-5 w-5 text-lead-400" /> : null}
        {title}
      </span>
      <span className="mt-2 block text-sm leading-6 text-ink-300">{body}</span>
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
        "min-h-40 min-w-0 rounded-lg border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950",
        active
          ? "border-accent-400/60 bg-accent-400/10 shadow-lg shadow-ink-950/20"
          : "border-white/10 bg-white/[0.03] hover:border-accent-400/40"
      ].join(" ")}
    >
      <span className="flex min-w-0 items-center gap-2 break-words text-lg font-extrabold text-white">
        {active ? <CheckCircle2 className="h-5 w-5 text-accent-300" /> : null}
        {title}
      </span>
      <span className="mt-2 block text-sm leading-6 text-ink-300">{body}</span>
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
  return (
    <div className="space-y-4">
      <div className="lead-shell p-5">
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
              {isSourceMode ? "estimated source package" : "estimated start"}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <ScoreBar label="Intent" value={score.intentScore} />
          <ScoreBar label="Source depth" value={score.sourceDepthScore} />
          <ScoreBar label="Freshness" value={score.freshnessScore} />
          <ScoreBar label="Compliance" value={score.complianceScore} />
        </div>

        <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.035] p-4">
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
