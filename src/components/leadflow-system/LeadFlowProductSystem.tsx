import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  FileCheck2,
  FileWarning,
  FileText,
  Layers3,
  LockKeyhole,
  Loader2,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type LeadScoreLevel = "high" | "medium" | "low" | "unknown";
export type ConfidenceLevel = "high" | "medium" | "low" | "needs_review";
export type SignalStatus =
  | "submitted"
  | "review"
  | "approved"
  | "rejected"
  | "suppressed"
  | "sold"
  | "sampleAvailable"
  | "sample_available"
  | "pending_access";
export type CtaVariant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "premium";
export type CardVariant = "compact" | "full" | "marketplace" | "dashboard";
export type MarketplaceCardVariant = "compact" | "full" | "featured" | "locked" | "buyer_approved" | "admin";
export type SemanticBadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "verified"
  | "review"
  | "suppressed"
  | "premium"
  | "neutral";

type IconComponent = ComponentType<{ className?: string }>;

const scoreClasses: Record<LeadScoreLevel, string> = {
  high: "border-lead-300/35 bg-lead-300/12 text-lead-100 shadow-[0_18px_44px_-34px_rgba(166,227,107,0.9)]",
  medium: "border-accent-300/35 bg-accent-300/12 text-accent-100 shadow-[0_18px_44px_-34px_rgba(255,186,61,0.8)]",
  low: "border-red-300/30 bg-red-300/10 text-red-100 shadow-[0_18px_44px_-34px_rgba(248,113,113,0.72)]",
  unknown: "border-white/12 bg-white/[0.045] text-ink-200 shadow-[0_18px_44px_-34px_rgba(148,163,184,0.65)]",
};

const confidenceClasses: Record<ConfidenceLevel, string> = {
  high: "border-cyan-300/35 bg-cyan-300/12 text-cyan-100",
  medium: "border-accent-300/35 bg-accent-300/12 text-accent-100",
  low: "border-white/12 bg-white/[0.045] text-ink-200",
  needs_review: "border-accent-300/35 bg-accent-300/12 text-accent-100",
};

const statusConfig: Record<
  SignalStatus,
  { label: string; icon: IconComponent; className: string }
> = {
  submitted: {
    label: "Submitted",
    icon: Clock3,
    className: "border-white/12 bg-white/[0.045] text-ink-100",
  },
  review: {
    label: "In review",
    icon: FileText,
    className: "border-accent-300/35 bg-accent-300/12 text-accent-100",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    className: "border-lead-300/35 bg-lead-300/12 text-lead-100",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "border-red-300/35 bg-red-300/12 text-red-100",
  },
  suppressed: {
    label: "Suppressed",
    icon: LockKeyhole,
    className: "border-red-300/35 bg-red-300/12 text-red-100",
  },
  sold: {
    label: "Sold",
    icon: BadgeCheck,
    className: "border-fuchsia-300/30 bg-fuchsia-300/12 text-fuchsia-100",
  },
  sampleAvailable: {
    label: "Sample available",
    icon: FileCheck2,
    className: "border-cyan-300/35 bg-cyan-300/12 text-cyan-100",
  },
  sample_available: {
    label: "Sample available",
    icon: FileCheck2,
    className: "border-cyan-300/35 bg-cyan-300/12 text-cyan-100",
  },
  pending_access: {
    label: "Pending access",
    icon: Clock3,
    className: "border-accent-300/35 bg-accent-300/12 text-accent-100",
  },
};

const ctaClasses: Record<CtaVariant, string> = {
  primary: "btn-accent",
  secondary: "btn-primary",
  ghost: "btn-ghost",
  outline:
    "btn border border-cyan-300/35 bg-transparent text-cyan-50 shadow-lg shadow-cyan-950/20 hover:-translate-y-0.5 hover:border-cyan-200/60 hover:bg-cyan-300/10",
  danger:
    "btn border border-red-300/55 bg-red-400/15 text-red-50 shadow-lg shadow-red-950/20 hover:-translate-y-0.5 hover:bg-red-400/20",
  premium:
    "btn border border-fuchsia-300/45 bg-fuchsia-400/15 text-fuchsia-50 shadow-lg shadow-fuchsia-950/20 hover:-translate-y-0.5 hover:bg-fuchsia-400/20",
};

const cardClasses: Record<CardVariant, string> = {
  compact: "lead-panel p-4",
  full: "lead-shell p-5 md:p-6",
  marketplace: "lead-shell p-5",
  dashboard: "rounded-lg border border-white/10 bg-[#060a11]/90 p-4 shadow-2xl shadow-black/35 md:p-5",
};

export type LeadSignalProduct = {
  title: string;
  category: string;
  score: number;
  confidence: ConfidenceLevel;
  sourceProof: string;
  suppressionStatus: SignalStatus;
  buyerUseCase: string;
  records: string;
  priceBand: string;
  freshness: string;
  releaseMode: string;
  href?: string;
};

function levelForScore(score: number): LeadScoreLevel {
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  return "low";
}

export function LeadScoreBadge({
  score,
  level = levelForScore(score),
  label = "Lead score",
  className,
}: {
  score: number;
  level?: LeadScoreLevel;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-grid min-h-14 min-w-20 place-items-center rounded-lg border px-3 py-2 text-center",
        scoreClasses[level],
        className
      )}
      data-component="LeadScoreBadge"
      data-variant={level}
      aria-label={`${label}: ${score}`}
    >
      <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">{label}</span>
      <strong className="text-2xl font-black leading-none text-white">{score}</strong>
    </div>
  );
}

export function ConfidenceLabel({
  level,
  label = `${level} confidence`,
  className,
}: {
  level: ConfidenceLevel;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center gap-2 rounded-lg border px-2.5 text-xs font-extrabold capitalize",
        confidenceClasses[level],
        className
      )}
      data-component="ConfidenceLabel"
      data-variant={level}
    >
      <BadgeCheck className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

export function SourceProofChip({
  label,
  verified = true,
  className,
}: {
  label: string;
  verified?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center gap-2 rounded-lg border px-2.5 text-xs font-bold",
        verified
          ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
          : "border-white/12 bg-white/[0.045] text-ink-200",
        className
      )}
      data-component="SourceProofChip"
      data-variant={verified ? "verified" : "unverified"}
    >
      {verified ? <CheckCircle2 className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

export function SuppressionStatusBadge({
  status,
  label,
  className,
}: {
  status: SignalStatus;
  label?: string;
  className?: string;
}) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center gap-2 rounded-lg border px-2.5 text-xs font-extrabold",
        config.className,
        className
      )}
      data-component="SuppressionStatusBadge"
      data-variant={status}
    >
      <Icon className="h-3.5 w-3.5" />
      {label ?? config.label}
    </span>
  );
}

export function LeadFlowCta({
  children,
  href,
  variant = "primary",
  className,
  type = "button",
  disabled,
}: {
  children: ReactNode;
  href?: string;
  variant?: CtaVariant;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}) {
  const classNames = cn(ctaClasses[variant], className);

  if (href) {
    return (
      <Link href={href} className={classNames} data-component="LeadFlowCta" data-variant={variant}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      className={classNames}
      data-component="LeadFlowCta"
      data-variant={variant}
    >
      {children}
    </button>
  );
}

export function LeadMarketplaceCard({
  product,
  variant = "marketplace",
  className,
}: {
  product: LeadSignalProduct;
  variant?: CardVariant;
  className?: string;
}) {
  return (
    <article
      className={cn(cardClasses[variant], "flex min-w-0 flex-col gap-5", className)}
      data-component="LeadMarketplaceCard"
      data-variant={variant}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-cyan-300">{product.category}</p>
          <h3 className="mt-2 text-2xl font-black leading-tight text-white">{product.title}</h3>
          <p className="mt-2 text-sm leading-6 text-ink-300">{product.buyerUseCase}</p>
        </div>
        <LeadScoreBadge score={product.score} />
      </div>

      <div className="flex flex-wrap gap-2">
        <ConfidenceLabel level={product.confidence} />
        <SourceProofChip label={product.sourceProof} />
        <SuppressionStatusBadge status={product.suppressionStatus} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <SignalFact label="Records" value={product.records} />
        <SignalFact label="Freshness" value={product.freshness} />
        <SignalFact label="Release mode" value={product.releaseMode} />
        <SignalFact label="Price band" value={product.priceBand} />
      </div>

      <div className="mt-auto flex flex-col gap-3 sm:flex-row">
        <LeadFlowCta href={product.href ?? "/buy-leads"} variant="primary" className="justify-center text-sm">
          Request access
          <ArrowRight className="h-4 w-4" />
        </LeadFlowCta>
        <LeadFlowCta href="/profile-model" variant="ghost" className="justify-center text-sm">
          View proof model
        </LeadFlowCta>
      </div>
    </article>
  );
}

export function BuyerPathCard({
  title,
  body,
  href,
  icon: Icon = ShieldCheck,
  proof,
  className,
}: {
  title: string;
  body: string;
  href: string;
  icon?: IconComponent;
  proof?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "lead-panel group grid min-h-52 gap-4 p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950",
        className
      )}
      data-component="BuyerPathCard"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-2xl font-black leading-tight text-white">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-ink-200">{body}</p>
      </div>
      {proof ? <SourceProofChip label={proof} className="w-fit" /> : null}
      <span className="mt-auto inline-flex items-center gap-2 text-sm font-extrabold text-accent-300 group-hover:text-white">
        Choose path
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

export function PublicQuizCard({
  title,
  purpose,
  collected,
  result,
  href,
  icon: Icon = FileCheck2,
  className,
}: {
  title: string;
  purpose: string;
  collected: string;
  result: string;
  href: string;
  icon?: IconComponent;
  className?: string;
}) {
  return (
    <article className={cn("lead-panel flex min-h-72 flex-col p-5", className)} data-component="PublicQuizCard">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-lead-300/20 bg-lead-300/10 text-lead-200">
          <Icon className="h-5 w-5" />
        </div>
        <SourceProofChip label="First party signal" />
      </div>
      <h3 className="mt-5 text-2xl font-black leading-tight text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-ink-200">{purpose}</p>
      <div className="mt-5 grid gap-2">
        <SignalFact label="Collects" value={collected} />
        <SignalFact label="Gives back" value={result} />
      </div>
      <LeadFlowCta href={href} variant="ghost" className="mt-auto justify-center text-sm">
        Open tool
        <ArrowRight className="h-4 w-4" />
      </LeadFlowCta>
    </article>
  );
}

export function ToolLandingPageShell({
  eyebrow,
  title,
  body,
  children,
  aside,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="border-b border-white/10 py-12 md:py-16" data-component="ToolLandingPageShell">
      <div className="container">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.72fr)] lg:items-start">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">{eyebrow}</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight text-white md:text-6xl">{title}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ink-100 md:text-lg">{body}</p>
            <div className="mt-8">{children}</div>
          </div>
          {aside ? <aside className="lead-shell p-5">{aside}</aside> : null}
        </div>
      </div>
    </section>
  );
}

export function LeadDashboardTable({
  title,
  columns,
  rows,
  className,
}: {
  title: string;
  columns: string[];
  rows: Array<Record<string, ReactNode>>;
  className?: string;
}) {
  return (
    <section className={cn(cardClasses.dashboard, className)} data-component="LeadDashboardTable">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
        <h2 className="text-xl font-black text-white">{title}</h2>
        <SuppressionStatusBadge status="review" />
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} className="border-b border-white/10 px-3 py-3 text-xs font-extrabold uppercase text-ink-400">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="align-top">
                {columns.map((column) => (
                  <td key={column} className="border-b border-white/5 px-3 py-3 text-ink-100">
                    {row[column] ?? "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ProfileDetailPanel({
  product,
  className,
}: {
  product: LeadSignalProduct;
  className?: string;
}) {
  return (
    <article className={cn(cardClasses.full, className)} data-component="ProfileDetailPanel">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <p className="text-sm font-extrabold text-cyan-300">{product.category}</p>
          <h2 className="mt-2 text-3xl font-black leading-tight text-white">{product.title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-200">{product.buyerUseCase}</p>
        </div>
        <LeadScoreBadge score={product.score} />
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <SignalFact label="Source proof" value={product.sourceProof} />
        <SignalFact label="Confidence" value={product.confidence} />
        <SignalFact label="Suppression" value={statusConfig[product.suppressionStatus].label} />
        <SignalFact label="Release mode" value={product.releaseMode} />
        <SignalFact label="Freshness" value={product.freshness} />
        <SignalFact label="Price band" value={product.priceBand} />
      </div>
    </article>
  );
}

export function ConsentModule({
  title,
  body,
  bullets,
  status = "review",
  ctaLabel = "Continue",
  className,
}: {
  title: string;
  body: string;
  bullets: string[];
  status?: SignalStatus;
  ctaLabel?: string;
  className?: string;
}) {
  return (
    <section className={cn(cardClasses.full, className)} data-component="ConsentModule" data-variant={status}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <SuppressionStatusBadge status={status} />
          <h2 className="mt-4 text-2xl font-black text-white">{title}</h2>
          <p className="mt-3 text-sm leading-6 text-ink-200">{body}</p>
        </div>
        <ShieldCheck className="h-7 w-7 shrink-0 text-cyan-300" />
      </div>
      <div className="mt-5 grid gap-2">
        {bullets.map((bullet) => (
          <div key={bullet} className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-ink-100">
            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-lead-400" />
            <span>{bullet}</span>
          </div>
        ))}
      </div>
      <LeadFlowCta variant="primary" className="mt-5 w-full justify-center sm:w-auto">
        {ctaLabel}
        <ArrowRight className="h-4 w-4" />
      </LeadFlowCta>
    </section>
  );
}

export function RequestAccessFormCard({
  action = "/contact",
  className,
}: {
  action?: string;
  className?: string;
}) {
  return (
    <form action={action} className={cn(cardClasses.full, "space-y-4", className)} data-component="RequestAccessFormCard">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Request buyer access</p>
        <h2 className="mt-2 text-2xl font-black text-white">Tell us what signal you need.</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <LeadField label="Name" name="name" />
        <LeadField label="Work email" name="email" type="email" />
        <LeadField label="Company" name="company" />
        <LeadField label="Target niche" name="targetNiche" />
      </div>
      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wider text-ink-400">Use case</span>
        <textarea name="useCase" rows={4} className="mt-2 w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-ink-500 focus:border-cyan-300/60" />
      </label>
      <label className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-ink-100">
        <input type="checkbox" name="reviewAcknowledged" className="mt-1 h-4 w-4 shrink-0" required />
        <span>I understand buyer access is reviewed, suppression-aware, and limited to approved fields.</span>
      </label>
      <LeadFlowCta type="submit" variant="primary" className="w-full justify-center sm:w-auto">
        Request access
        <ArrowRight className="h-4 w-4" />
      </LeadFlowCta>
    </form>
  );
}

export function SubmitSourceFormCard({
  action = "/submit-source",
  className,
}: {
  action?: string;
  className?: string;
}) {
  return (
    <form action={action} className={cn(cardClasses.full, "space-y-4", className)} data-component="SubmitSourceFormCard">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-wider text-lead-300">Submit source</p>
        <h2 className="mt-2 text-2xl font-black text-white">Send a source for review.</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <LeadField label="Source title" name="sourceTitle" />
        <LeadField label="Source URL" name="sourceUrl" type="url" />
        <LeadField label="Owner email" name="email" type="email" />
        <LeadField label="Approx records" name="records" type="number" />
      </div>
      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wider text-ink-400">Proof notes</span>
        <textarea name="proofNotes" rows={4} className="mt-2 w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-ink-500 focus:border-cyan-300/60" />
      </label>
      <div className="rounded-lg border border-accent-300/25 bg-accent-300/10 p-4 text-sm leading-6 text-accent-50">
        <TriangleAlert className="mb-2 h-4 w-4" />
        Do not submit minors, hacked or leaked data, protected-trait targeting, medical data, financial-account data, or private records without permission.
      </div>
      <LeadFlowCta type="submit" variant="primary" className="w-full justify-center sm:w-auto">
        Submit for review
        <ArrowRight className="h-4 w-4" />
      </LeadFlowCta>
    </form>
  );
}

function SignalFact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-1 text-sm leading-6 text-ink-100">{value}</p>
    </div>
  );
}

function LeadField({
  label,
  name,
  type = "text",
}: {
  label: string;
  name: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-ink-400">{label}</span>
      <input
        name={name}
        type={type}
        className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none placeholder:text-ink-500 focus:border-cyan-300/60"
      />
    </label>
  );
}

export function Button({
  children,
  href,
  variant = "primary",
  className,
  type = "button",
  disabled,
}: {
  children: ReactNode;
  href?: string;
  variant?: CtaVariant;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}) {
  const classNames = cn(ctaClasses[variant], className);

  if (href) {
    return (
      <Link
        href={href}
        aria-disabled={disabled}
        className={cn(classNames, disabled && "pointer-events-none opacity-50")}
        data-component="Button"
        data-variant={variant}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      className={classNames}
      data-component="Button"
      data-variant={variant}
    >
      {children}
    </button>
  );
}

const badgeClasses: Record<SemanticBadgeVariant, string> = {
  success: "border-lead-300/35 bg-lead-300/12 text-lead-100",
  warning: "border-accent-300/35 bg-accent-300/12 text-accent-100",
  danger: "border-red-300/35 bg-red-300/12 text-red-100",
  verified: "border-cyan-300/35 bg-cyan-300/12 text-cyan-100",
  review: "border-accent-300/35 bg-accent-300/12 text-accent-100",
  suppressed: "border-red-300/35 bg-red-300/12 text-red-100",
  premium: "border-fuchsia-300/35 bg-fuchsia-300/12 text-fuchsia-100",
  neutral: "border-white/12 bg-white/[0.045] text-ink-200",
};

export function Badge({
  children,
  variant = "neutral",
  className,
}: {
  children: ReactNode;
  variant?: SemanticBadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center gap-2 rounded-lg border px-2.5 text-xs font-extrabold uppercase tracking-[0.08em]",
        badgeClasses[variant],
        className,
      )}
      data-component="Badge"
      data-variant={variant}
    >
      {children}
    </span>
  );
}

export function ScoreBadge({
  score,
  variant,
  label = "Score",
  className,
}: {
  score?: number;
  variant?: LeadScoreLevel;
  label?: string;
  className?: string;
}) {
  const level = variant ?? (typeof score === "number" ? levelForScore(score) : "unknown");
  return (
    <LeadScoreBadge
      score={typeof score === "number" ? score : 0}
      level={level}
      label={level === "unknown" ? "Unknown" : label}
      className={className}
    />
  );
}

export function ConfidenceBadge({
  confidence,
  label,
  className,
}: {
  confidence: ConfidenceLevel;
  label?: string;
  className?: string;
}) {
  const readable = confidence === "needs_review" ? "Needs review" : `${confidence} confidence`;
  return <ConfidenceLabel level={confidence} label={label ?? readable} className={className} />;
}

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: SignalStatus;
  label?: string;
  className?: string;
}) {
  return <SuppressionStatusBadge status={status} label={label} className={className} />;
}

export function RiskBadge({
  risk = "neutral",
  label,
  className,
}: {
  risk?: "low" | "medium" | "high" | "prohibited" | "neutral";
  label?: string;
  className?: string;
}) {
  const variant: SemanticBadgeVariant =
    risk === "low" ? "success" : risk === "medium" ? "warning" : risk === "high" || risk === "prohibited" ? "danger" : "neutral";
  return (
    <Badge variant={variant} className={className}>
      <TriangleAlert className="h-3.5 w-3.5" />
      {label ?? `${risk} risk`}
    </Badge>
  );
}

export function MarketplaceCard({
  title,
  category,
  score,
  confidence,
  sourceType,
  bestBuyer,
  sampleCount,
  proofStatus,
  suppressionStatus,
  lastUpdated,
  ctaLabel = "Request access",
  href = "/marketplace",
  variant = "full",
  locked = false,
  adminOnly = false,
  className,
}: {
  title: string;
  category: string;
  score: number;
  confidence: ConfidenceLevel;
  sourceType: string;
  bestBuyer: string;
  sampleCount: string;
  proofStatus: string;
  suppressionStatus: SignalStatus;
  lastUpdated: string;
  ctaLabel?: string;
  href?: string;
  variant?: MarketplaceCardVariant;
  locked?: boolean;
  adminOnly?: boolean;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "lead-shell flex min-w-0 flex-col gap-5 p-5",
        variant === "compact" && "p-4",
        variant === "featured" && "border-accent-300/30 bg-[#0b111a]/95",
        variant === "locked" && "border-white/10 opacity-90",
        variant === "buyer_approved" && "border-lead-300/30",
        variant === "admin" && "border-fuchsia-300/25",
        className,
      )}
      data-component="MarketplaceCard"
      data-variant={variant}
      data-locked={locked}
      data-admin-only={adminOnly}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Badge variant={adminOnly ? "premium" : "verified"}>{category}</Badge>
          <h3 className="mt-3 text-2xl font-black leading-tight text-white">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-ink-300">{bestBuyer}</p>
        </div>
        <ScoreBadge score={score} />
      </div>

      <div className="flex flex-wrap gap-2">
        <ConfidenceBadge confidence={confidence} />
        <SourceProofChip label={proofStatus} />
        <StatusBadge status={suppressionStatus} />
        {locked ? <Badge variant="neutral"><LockKeyhole className="h-3.5 w-3.5" />Locked</Badge> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SignalFact label="Source type" value={sourceType} />
        <SignalFact label="Sample count" value={sampleCount} />
        <SignalFact label="Last updated" value={lastUpdated} />
        <SignalFact label="Release" value={locked ? "Review-gated" : "Requestable"} />
      </div>

      <div className="mt-auto flex flex-col gap-3 sm:flex-row">
        <Button href={href} variant={locked ? "outline" : "primary"} className="justify-center text-sm">
          {ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button href="/profile-model" variant="ghost" className="justify-center text-sm">
          Proof model
        </Button>
      </div>
    </article>
  );
}

export function ListingPreviewModal({
  title,
  body,
  open = true,
  children,
}: {
  title: string;
  body: string;
  open?: boolean;
  children?: ReactNode;
}) {
  if (!open) return null;

  return (
    <section
      className="lead-shell max-w-3xl p-5 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="listing-preview-title"
      data-component="ListingPreviewModal"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <Badge variant="verified">Listing preview</Badge>
          <h2 id="listing-preview-title" className="mt-3 text-3xl font-black text-white">{title}</h2>
          <p className="mt-3 text-sm leading-6 text-ink-200">{body}</p>
        </div>
        <LockKeyhole className="h-6 w-6 shrink-0 text-cyan-300" />
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}

export function LeadProfileHeader({
  title,
  category,
  vertical,
  score,
  confidence,
  sourceStatus,
  suppressionStatus,
  reviewStatus = "review",
}: {
  title: string;
  category: string;
  vertical: string;
  score: number;
  confidence: ConfidenceLevel;
  sourceStatus: string;
  suppressionStatus: SignalStatus;
  reviewStatus?: SignalStatus;
}) {
  return (
    <header className="lead-shell p-5 md:p-7" data-component="LeadProfileHeader">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="verified">{category}</Badge>
            <Badge variant="neutral">{vertical}</Badge>
            <StatusBadge status={reviewStatus} />
          </div>
          <h1 className="mt-4 text-4xl font-black leading-tight text-white md:text-6xl">{title}</h1>
          <div className="mt-5 flex flex-wrap gap-2">
            <ConfidenceBadge confidence={confidence} />
            <SourceProofChip label={sourceStatus} />
            <StatusBadge status={suppressionStatus} />
          </div>
        </div>
        <ScoreBadge score={score} label="Lead score" />
      </div>
    </header>
  );
}

export function ScoreBreakdownCard({
  title = "Score breakdown",
  items,
}: {
  title?: string;
  items: Array<{
    label: string;
    score: number;
    explanation: string;
    confidence?: ConfidenceLevel;
  }>;
}) {
  return (
    <section className="lead-shell p-5 md:p-6" data-component="ScoreBreakdownCard">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Badge variant="verified">Explainable scoring</Badge>
          <h2 className="mt-3 text-2xl font-black text-white">{title}</h2>
        </div>
        <DatabaseZap className="h-6 w-6 text-cyan-300" />
      </div>
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <article key={item.label} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-white">{item.label}</h3>
                <p className="mt-1 text-sm leading-6 text-ink-300">{item.explanation}</p>
              </div>
              <ScoreBadge score={item.score} label="Score" className="min-w-16" />
            </div>
            {item.confidence ? <ConfidenceBadge confidence={item.confidence} className="mt-3" /> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export function SourceProofList({
  items,
}: {
  items: Array<{
    title: string;
    sourceType: string;
    href?: string;
    status: string;
    verifiedDate: string;
  }>;
}) {
  return (
    <section className="lead-shell p-5 md:p-6" data-component="SourceProofList">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-black text-white">Source proof</h2>
        <SourceProofChip label="Proof attached" />
      </div>
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <article key={`${item.title}-${item.verifiedDate}`} className="lead-panel p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-black text-white">{item.title}</h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-ink-400">{item.sourceType}</p>
              </div>
              <Badge variant={item.status === "verified" ? "verified" : "review"}>{item.status}</Badge>
            </div>
            <p className="mt-3 text-sm text-ink-300">Verified: {item.verifiedDate}</p>
            {item.href ? (
              <Link href={item.href} className="mt-3 inline-flex text-sm font-extrabold text-cyan-200 hover:text-white">
                Open source
              </Link>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export function BuyerRequestForm({
  title = "Request buyer access",
  ctaLabel = "Submit request",
}: {
  title?: string;
  ctaLabel?: string;
}) {
  return (
    <form className="lead-shell space-y-4 p-5 md:p-6" data-component="BuyerRequestForm">
      <div>
        <Badge variant="verified">Review gated</Badge>
        <h2 className="mt-3 text-2xl font-black text-white">{title}</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <LeadField label="Company" name="company" />
        <LeadField label="Buyer type" name="buyerType" />
        <LeadField label="Budget range" name="budgetRange" />
        <LeadField label="Intended use" name="intendedUse" />
      </div>
      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wider text-ink-400">Access reason</span>
        <textarea className="mt-2 min-h-28 w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-3 text-sm text-white outline-none placeholder:text-ink-500 focus:border-cyan-300/60" />
      </label>
      <Button type="submit" variant="primary" className="w-full justify-center sm:w-auto">
        {ctaLabel}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}

export function ToolCard({
  title,
  who,
  answer,
  time,
  dataCategory,
  href,
}: {
  title: string;
  who: string;
  answer: string;
  time: string;
  dataCategory: string;
  href: string;
}) {
  return (
    <article className="lead-panel flex min-h-72 flex-col p-5" data-component="ToolCard">
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-lg border border-lead-300/20 bg-lead-300/10 text-lead-200">
          <Sparkles className="h-5 w-5" />
        </div>
        <Badge variant="neutral">{time}</Badge>
      </div>
      <h3 className="mt-5 text-2xl font-black leading-tight text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-ink-200">{answer}</p>
      <div className="mt-5 grid gap-2">
        <SignalFact label="For" value={who} />
        <SignalFact label="Data category" value={dataCategory} />
      </div>
      <Button href={href} variant="ghost" className="mt-auto justify-center text-sm">
        Start tool
        <ArrowRight className="h-4 w-4" />
      </Button>
    </article>
  );
}

export function ProgressIndicator({
  current,
  total,
  label,
}: {
  current: number;
  total: number;
  label?: string;
}) {
  const safeTotal = Math.max(total, 1);
  const percent = Math.min(100, Math.max(0, Math.round((current / safeTotal) * 100)));
  return (
    <div data-component="ProgressIndicator">
      <div className="flex items-center justify-between gap-3 text-xs font-extrabold uppercase tracking-wider text-ink-400">
        <span>{label ?? `Step ${current} of ${safeTotal}`}</span>
        <span>{percent}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-lead-400 via-cyan-400 to-accent-400" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function QuestionnaireStep({
  eyebrow = "Questionnaire",
  title,
  body,
  current,
  total,
  children,
}: {
  eyebrow?: string;
  title: string;
  body: string;
  current: number;
  total: number;
  children?: ReactNode;
}) {
  return (
    <section className="lead-shell p-5 md:p-6" data-component="QuestionnaireStep">
      <ProgressIndicator current={current} total={total} />
      <p className="mt-5 text-xs font-extrabold uppercase tracking-wider text-cyan-300">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-black leading-tight text-white">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-ink-200">{body}</p>
      {children ? <div className="mt-5 grid gap-3">{children}</div> : null}
    </section>
  );
}

export function AdminDataTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: Array<Record<string, ReactNode>>;
}) {
  return <LeadDashboardTable title={title} columns={columns} rows={rows} />;
}

export function AdminStatCard({
  title,
  value,
  trend,
  status = "neutral",
}: {
  title: string;
  value: string | number;
  trend?: string;
  status?: SemanticBadgeVariant;
}) {
  return (
    <article className="lead-panel p-5" data-component="AdminStatCard">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{title}</p>
          <strong className="mt-2 block text-4xl font-black text-white">{value}</strong>
        </div>
        <Badge variant={status}>{status}</Badge>
      </div>
      {trend ? <p className="mt-4 text-sm leading-6 text-ink-300">{trend}</p> : null}
    </article>
  );
}

export function SearchInput({
  label = "Search",
  placeholder = "Search signals",
}: {
  label?: string;
  placeholder?: string;
}) {
  return (
    <label className="block" data-component="SearchInput">
      <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</span>
      <span className="mt-2 flex min-h-12 items-center gap-2 rounded-lg border border-white/10 bg-ink-950 px-3 text-white focus-within:border-cyan-300/60 focus-within:ring-2 focus-within:ring-cyan-300/15">
        <Search className="h-4 w-4 shrink-0 text-cyan-300" />
        <input className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-500" placeholder={placeholder} />
      </span>
    </label>
  );
}

export function FilterBar({
  filters,
}: {
  filters: Array<{ label: string; value: string }>;
}) {
  return (
    <section className="lead-shell p-4" data-component="FilterBar">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <SearchInput />
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {filters.map((filter) => (
            <label key={filter.label} className="block">
              <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{filter.label}</span>
              <select className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/60" defaultValue={filter.value}>
                <option>{filter.value}</option>
              </select>
            </label>
          ))}
        </div>
        <Button variant="outline" className="justify-center text-sm">
          <SlidersHorizontal className="h-4 w-4" />
          Apply
        </Button>
      </div>
    </section>
  );
}

export function EmptyState({
  title,
  body,
  ctaLabel,
  href,
}: {
  title: string;
  body: string;
  ctaLabel?: string;
  href?: string;
}) {
  return (
    <section className="lead-shell p-8 text-center" data-component="EmptyState">
      <Layers3 className="mx-auto h-9 w-9 text-cyan-300" />
      <h2 className="mt-4 text-2xl font-black text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink-300">{body}</p>
      {ctaLabel && href ? <Button href={href} variant="primary" className="mx-auto mt-5 justify-center text-sm">{ctaLabel}</Button> : null}
    </section>
  );
}

export function LoadingState({ label = "Loading signal data" }: { label?: string }) {
  return (
    <div className="lead-shell flex min-h-40 items-center justify-center gap-3 p-6 text-sm font-extrabold text-ink-100" data-component="LoadingState">
      <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
      {label}
    </div>
  );
}

export function ErrorState({
  title = "Something needs review",
  body,
}: {
  title?: string;
  body: string;
}) {
  return (
    <section className="lead-shell border-red-300/25 p-6" data-component="ErrorState">
      <div className="flex items-start gap-3">
        <FileWarning className="mt-1 h-5 w-5 shrink-0 text-red-300" />
        <div>
          <h2 className="text-xl font-black text-white">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-red-100">{body}</p>
        </div>
      </div>
    </section>
  );
}

export function ExportConfirmModal({
  title = "Confirm controlled export",
  body = "Exports are audited. Only export fields needed for the approved use.",
  fieldGroups,
}: {
  title?: string;
  body?: string;
  fieldGroups: string[];
}) {
  return (
    <section className="lead-shell max-w-2xl p-5 md:p-6" role="dialog" aria-modal="true" data-component="ExportConfirmModal">
      <Badge variant="warning">Export control</Badge>
      <h2 className="mt-3 text-2xl font-black text-white">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-ink-200">{body}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {fieldGroups.map((field) => <Badge key={field} variant="neutral">{field}</Badge>)}
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button variant="primary" className="justify-center text-sm">Confirm export</Button>
        <Button variant="ghost" className="justify-center text-sm">Cancel</Button>
      </div>
    </section>
  );
}
