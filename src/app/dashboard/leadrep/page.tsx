import Link from "next/link";
import { LeadRepPackageCard } from "@/components/leadrep/LeadRepPackageCard";

export const dynamic = "force-dynamic";

const metrics = [
  ["5", "sellable verified data-package ideas"],
  ["2", "packages ready for buyers"],
  ["1", "paying buyer or serious sales opportunity"],
  ["50%+", "research time savings target"],
  ["Weekly", "recurring lead-drop category"],
];

export default function LeadRepDashboardPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/[0.055] p-6 text-white">
        <p className="dashboard-kicker">LeadRep package desk</p>
        <h1 className="mt-2 text-3xl font-black">SignalScout to PackageCloser</h1>
        <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-ink-300">
          Issues are tasks. PR comments are handoff notes. Actions are triggers. Commits are proof of work.
          Grok stays useful only if it produces sellable packages, buyer-ready offers, and recurring lead drops.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {metrics.map(([value, label]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-slate-950/55 p-4">
              <p className="text-2xl font-black text-cyan-200">{value}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-ink-300">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <LeadRepPackageCard
          eyebrow="Build first"
          title="LeadSource Clarity Report"
          body="Source clarity score, fraud-risk flags, geo placeholder, response-time placeholder, and $79 audit CTA."
          price="$79"
          recurring="Source Guardian $149/mo"
          href="/tools/leadsource-clarity"
          cta="Open Tool"
          bullets={["SignalScout", "Business lead-source buyers", "Deployable now"]}
        />
        <LeadRepPackageCard
          eyebrow="RepWatchr"
          title="VendorTrust Badge"
          body="Public-source vendor confidence preview with a $29 check and Family Vendor Shield upsell."
          price="$29"
          recurring="Family Vendor Shield $39/mo"
          href="https://www.repwatchr.com/tools/vendortrust"
          cta="Open RepWatchr"
          bullets={["ProofRanker", "Family and local vendor buyers", "Public-source only"]}
        />
        <LeadRepPackageCard
          eyebrow="Waitlist"
          title="Sales Rep Signal Profile"
          body="Opt-in self-submitted profile pilot. Not a background check, consumer report, or employment decision tool."
          price="Pilot"
          href="/tools/sales-rep-signal"
          cta="Open Waitlist"
          bullets={["PredictivePulse", "Consent required", "No report sale"]}
        />
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.055] p-6 text-white">
        <p className="dashboard-kicker">Cancel rule</p>
        <h2 className="mt-2 text-2xl font-black">Grok must move toward revenue.</h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-ink-300">
          If Grok only creates research notes and no sellable packages, downgrade it or cancel it.
        </p>
        <Link href="/dashboard" className="mt-5 inline-flex rounded-lg border border-cyan-300/30 px-4 py-2 text-sm font-black text-cyan-100 hover:bg-cyan-300/10">
          Back to dashboard
        </Link>
      </section>
    </div>
  );
}
