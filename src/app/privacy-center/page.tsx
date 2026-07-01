import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Ban,
  BadgeCheck,
  Database,
  FileSearch,
  Gauge,
  KeyRound,
  MailX,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { LeadFlowConsentModules } from "@/components/leadflow-system";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { LEADFLOW_CONSENT_VERSION } from "@/lib/leadflow-consent";

export const metadata: Metadata = {
  title: "Privacy Center - The LeadFlow Pro",
  description:
    "Plain-English LeadFlow Pro privacy controls for consent, source-backed signal data, suppression, deletion, contact opt-out, buyer access, and scoring.",
};

const privacySections = [
  {
    title: "What data is collected",
    icon: Database,
    body:
      "LeadFlow Pro can collect public source context, submitted answers, permissioned seller choices, consented contact paths, source proof, marketplace review notes, and onsite behavior signals tied to a session or account. Public analytics stays separate from identified lead data.",
    facts: ["Public and submitted signals", "Permissioned seller choices", "Anonymous and identified lanes"],
  },
  {
    title: "Why it is collected",
    icon: FileSearch,
    body:
      "The first job is to solve a problem for the person using the tool. Answers can produce a result, score intent, identify fit, prevent duplicates, honor suppression, and create reviewed data products only when the permission mode allows it.",
    facts: ["Give value first", "Score fit and urgency", "Keep suppression enforceable"],
  },
  {
    title: "How it is used",
    icon: SlidersHorizontal,
    body:
      "Signal data may be used to build tool results, lead profiles, source proof, intent tags, confidence labels, aggregate insights, review queues, buyer samples, routing decisions, and audit records. Raw answers are not pushed into public analytics.",
    facts: ["Tool results", "Lead profile review", "Aggregate insight"],
  },
  {
    title: "When it may be shared",
    icon: BadgeCheck,
    body:
      "Sharing depends on the permission mode. It can stay tool-only, be used for LeadFlow contact, go to one named seller, go to selected sellers, or be released as aggregate insight. Phone and text seller routing requires named or selected seller consent.",
    facts: ["No unnamed seller pool", "No vague blanket routing", "Review-gated release"],
  },
  {
    title: "How suppression works",
    icon: Ban,
    body:
      "Do-not-contact, delete, opt-out, and suppressed-status records block matched lead follow-up and buyer release. LeadFlow may keep limited suppression proof so the same person or source is not accidentally contacted again.",
    facts: ["Stops matched outreach", "Blocks buyer release", "Keeps suppression proof"],
  },
  {
    title: "How to request deletion",
    icon: Trash2,
    body:
      "A deletion request creates an audit record, pauses new routing where a match is found, and starts verification when needed. Personal data can be deleted or de-identified unless limited records must be retained for security, legal, audit, transaction, or suppression reasons.",
    facts: ["Request logged", "Routing paused", "Delete or de-identify"],
  },
  {
    title: "How to opt out of contact",
    icon: MailX,
    body:
      "A do-not-contact request stops matched marketing or lead follow-up contact. Transactional, security, privacy, or legally required messages may still be sent when needed to complete or document the request.",
    facts: ["Stops marketing follow-up", "Matches known signals", "Privacy messages may continue"],
  },
  {
    title: "How to report incorrect data",
    icon: FileSearch,
    body:
      "Incorrect or stale data should be reported for review. The team can check source proof, timestamps, consent status, buyer use case, suppression status, and open questions before correcting, suppressing, rejecting, or re-verifying a profile.",
    facts: ["Review source proof", "Correct or suppress", "Re-verify before release"],
  },
  {
    title: "How buyer access works",
    icon: KeyRound,
    body:
      "Buyer access is review-gated. Buyers may receive samples, aggregate insight, shared access, or exclusive access only when the buyer use case, consent scope, suppression status, source proof, and entitlement rules support that release.",
    facts: ["Entitlement-gated", "Use-case reviewed", "Suppression-aware"],
  },
  {
    title: "How lead scoring works",
    icon: Gauge,
    body:
      "Scores are plain-English estimates from disclosed answers, onsite behavior, source proof, freshness, buyer fit, contactability, compliance readiness, and revenue potential. LeadFlow does not score minors or use protected traits, private financial account data, health data, religion, sexual orientation, or private political identity for the general commercial product.",
    facts: ["0 to 100 scoring", "Explanation required", "Protected traits excluded"],
  },
];

const eventFields = [
  "identity_id or anonymous_session_id",
  "consent_type",
  "consent_text",
  "consent_version",
  "seller_id if applicable",
  "timestamp",
  "IP hash if available",
  "source_url",
  "tool_slug",
  "user-agent hash if available",
];

const operatingRules = [
  "Consent appears next to the action it controls. It is not hidden in a footer.",
  "One-seller and multi-seller routing must name the seller or selected sellers.",
  "Buyer release is review-gated by proof, suppression, consent, and use case.",
  "Anonymous analytics and identified lead records stay in separate lanes.",
];

export default function PrivacyCenterPage() {
  return (
    <>
      <Header />
      <main>
        <section className="relative overflow-hidden border-b border-white/10 py-14 md:py-20">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_10%,rgba(47,203,255,0.18),transparent_28%),radial-gradient(circle_at_78%_8%,rgba(255,190,82,0.16),transparent_30%),linear-gradient(180deg,#050813_0%,#080b18_58%,#050813_100%)]" />
          <div className="container">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.62fr)] lg:items-end">
              <div className="max-w-4xl">
                <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-cyan-200">
                  <ShieldCheck className="h-4 w-4" />
                  Privacy center
                </p>
                <h1 className="mt-5 text-4xl font-black leading-tight text-white md:text-6xl">
                  Consent is a product control.
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-7 text-ink-100 md:text-xl">
                  LeadFlow Pro collects public, submitted, permissioned, and consented signal data.
                  The system can sell trusted intent, but only through visible permission modes,
                  source proof, suppression checks, and review-gated buyer access.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link href="/tools" className="btn-accent text-base">
                    Start a signal tool
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/marketplace" className="btn-ghost text-base">
                    See buyer marketplace
                  </Link>
                </div>
              </div>

              <aside className="lead-shell p-5">
                <p className="text-xs font-extrabold uppercase tracking-wider text-accent-300">
                  Audit standard
                </p>
                <h2 className="mt-3 text-2xl font-black text-white">Every consent event saves the receipt.</h2>
                <div className="mt-5 grid gap-2">
                  {eventFields.map((field) => (
                    <div
                      key={field}
                      className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 break-words text-ink-100">{field}</span>
                      <ShieldCheck className="h-4 w-4 shrink-0 text-cyan-300" />
                    </div>
                  ))}
                </div>
                <p className="mt-5 text-xs font-bold uppercase tracking-wider text-ink-400">
                  Consent version: {LEADFLOW_CONSENT_VERSION}
                </p>
              </aside>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 bg-white/[0.02] py-12 md:py-16">
          <div className="container">
            <div className="grid gap-3 md:grid-cols-4">
              {operatingRules.map((rule) => (
                <div key={rule} className="lead-panel p-4">
                  <Scale className="h-5 w-5 text-accent-300" />
                  <p className="mt-3 text-sm font-bold leading-6 text-white">{rule}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="container">
            <div className="mb-8 max-w-3xl">
              <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">
                Data rules
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight text-white md:text-5xl">
                What happens to signal data.
              </h2>
              <p className="mt-4 text-base leading-7 text-ink-200">
                The product can be aggressive about finding intent without turning into hidden
                data resale. The permission mode decides what can happen next.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {privacySections.map((section) => {
                const Icon = section.icon;
                return (
                  <article key={section.title} className="lead-shell min-w-0 p-5">
                    <div className="flex items-start gap-4">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-2xl font-black leading-tight text-white">{section.title}</h3>
                        <p className="mt-3 text-sm leading-6 text-ink-200">{section.body}</p>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {section.facts.map((fact) => (
                        <span
                          key={fact}
                          className="rounded-lg border border-white/10 bg-white/[0.045] px-2.5 py-1.5 text-xs font-extrabold text-ink-100"
                        >
                          {fact}
                        </span>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-[#050813] py-14 md:py-20">
          <div className="container">
            <div className="mb-8 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(20rem,0.55fr)] lg:items-end">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-accent-300">
                  Reusable consent modules
                </p>
                <h2 className="mt-3 text-3xl font-black leading-tight text-white md:text-5xl">
                  The permission is visible before the action fires.
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-7 text-ink-200">
                  These modules can be reused across tools, marketplace requests, submit-source
                  flows, seller selection, suppression, and deletion. Seller routing is never a
                  vague blanket permission.
                </p>
              </div>
              <div className="lead-panel p-4">
                <p className="text-sm font-bold leading-6 text-white">
                  For phone, text, or seller follow-up, the person must see one named seller or
                  select the sellers. “Being on the site” is not enough for seller routing.
                </p>
              </div>
            </div>

            <LeadFlowConsentModules />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
