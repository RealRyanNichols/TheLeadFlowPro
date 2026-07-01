import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  Ban,
  FileText,
  type LucideIcon,
  MailCheck,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserCheck,
} from "lucide-react";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import {
  LEADFLOW_COMPLIANCE_COPY,
  LEADFLOW_COMPLIANCE_COPY_VERSION,
  type LeadFlowComplianceCopyBlock,
  type LeadFlowComplianceCopyKey,
} from "@/lib/leadflow-compliance-copy";

export const metadata: Metadata = {
  title: "Privacy Center - The LeadFlow Pro",
  description:
    "Plain-English LeadFlow Pro controls for consent, named-seller routing, do-not-contact, deletion, ADMT opt-out, email, mortgage, and adult-only intake.",
};

const highlightKeys: LeadFlowComplianceCopyKey[] = [
  "notice_at_collection",
  "one_seller_consent",
  "multiple_named_sellers_consent",
  "admt_opt_out",
];

const controlKeys: LeadFlowComplianceCopyKey[] = [
  "do_not_contact",
  "delete_my_data",
  "admt_access",
  "no_sale_no_sharing_footer",
  "mortgage_refi_disclaimer",
  "age_gate",
  "email_marketing_footer",
  "email_transactional_footer",
];

const iconMap = {
  notice_at_collection: FileText,
  one_seller_consent: UserCheck,
  multiple_named_sellers_consent: BadgeCheck,
  no_sale_no_sharing_footer: Ban,
  do_not_contact: MailCheck,
  delete_my_data: Trash2,
  admt_access: SlidersHorizontal,
  admt_opt_out: ShieldCheck,
  email_marketing_footer: MailCheck,
  email_transactional_footer: MailCheck,
  mortgage_refi_disclaimer: Scale,
  age_gate: UserCheck,
} satisfies Record<LeadFlowComplianceCopyKey, LucideIcon>;

function copyByKey(key: LeadFlowComplianceCopyKey) {
  const block = LEADFLOW_COMPLIANCE_COPY.find((item) => item.key === key);
  if (!block) {
    throw new Error(`Missing compliance copy block: ${key}`);
  }
  return block;
}

export default function PrivacyCenterPage() {
  const highlightBlocks = highlightKeys.map(copyByKey);
  const controlBlocks = controlKeys.map(copyByKey);

  return (
    <>
      <Header />
      <main>
        <section className="relative overflow-hidden border-b border-white/10 py-16 md:py-24">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(35,184,255,0.18),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(255,184,76,0.14),transparent_30%),linear-gradient(180deg,#050813_0%,#080b18_100%)]" />
          <div className="container">
            <div className="max-w-4xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-cyan-200">
                <ShieldCheck className="h-4 w-4" />
                Privacy center
              </p>
              <h1 className="mt-5 text-4xl font-black text-white md:text-6xl">
                The rules that keep the lead brain usable.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-ink-100 md:text-xl">
                LeadFlow Pro can collect strong adult preference signals without hiding
                resale, burying consent, or steering people by pay. These are the
                plain-English controls for named sellers, scoring, email, deletion,
                contact suppression, mortgage/refi flows, and child-safety gates.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/problem-intake" className="btn-accent text-base">
                  Build a preference map
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/data-marketplace" className="btn-ghost text-base">
                  Open marketplace
                </Link>
              </div>
              <p className="mt-5 text-xs uppercase tracking-wider text-ink-400">
                Copy version: {LEADFLOW_COMPLIANCE_COPY_VERSION}
              </p>
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="container">
            <div className="grid gap-4 md:grid-cols-2">
              {highlightBlocks.map((block) => (
                <ComplianceCard key={block.key} block={block} featured />
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/[0.02] py-14 md:py-20">
          <div className="container">
            <div className="mb-8 max-w-3xl">
              <p className="text-xs font-extrabold uppercase tracking-wider text-accent-300">
                Consumer controls
              </p>
              <h2 className="mt-3 text-3xl font-black text-white md:text-5xl">
                Stop, delete, access, opt out, or stay aggregate-only.
              </h2>
              <p className="mt-4 text-base leading-7 text-ink-200">
                The intake should earn better data by being useful and direct.
                These blocks keep the user in control while preserving the buyer
                marketplace value.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {controlBlocks.map((block) => (
                <ComplianceCard key={block.key} block={block} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function ComplianceCard({
  block,
  featured = false,
}: {
  block: LeadFlowComplianceCopyBlock;
  featured?: boolean;
}) {
  const Icon = iconMap[block.key];

  return (
    <article
      className={[
        "lead-panel h-full p-5",
        featured ? "border-cyan-300/25 bg-cyan-300/[0.04]" : "",
      ].join(" ")}
    >
      <div className="flex items-start gap-4">
        <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-lead-400/10 text-lead-300">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">
            {block.label}
          </p>
          <h2 className="mt-2 text-xl font-black text-white md:text-2xl">
            {block.headline ?? block.label}
          </h2>
        </div>
      </div>

      <div className="mt-5 space-y-3 text-sm leading-6 text-ink-100">
        {block.body.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>

      {block.checkboxLabel ? (
        <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm font-semibold leading-6 text-white">
          {block.checkboxLabel}
        </div>
      ) : null}

      {block.shortFooter ? (
        <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-ink-300">
          {block.shortFooter}
        </p>
      ) : null}

      {block.cta ? (
        <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-accent-300/25 bg-accent-300/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-accent-200">
          {block.cta}
          <ArrowRight className="h-3.5 w-3.5" />
        </p>
      ) : null}
    </article>
  );
}
