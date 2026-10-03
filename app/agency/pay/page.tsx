import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import AgencyPayForm, { type PayableService } from "./AgencyPayForm";
import { agencyFixedBilling, agencyFixedPriceUsd, payableAgencyServices } from "@/lib/agencyPayment";
import { BUSINESS } from "@/lib/site/business";
import { usd } from "@/lib/site/prices";

// Pay an agency scope. One page, five fields, no header or footer (the same
// treatment /agency/start gets), and a clear way back. The charge is built
// server-side in lib/agencyPayment.ts; the buyer lands on /agency/paid, which
// verifies the session with Stripe before it says anything.

export const metadata: Metadata = withPublicPageMetadata("/agency/pay", {
  title: "Existing client scope payment | The LeadFlow Pro",
  description:
    "Existing clients: pay only the amount and billing cadence already agreed in your signed written scope. New buyers start with a scoped managed plan.",
  robots: { index: false, follow: true },
});

export default async function AgencyPayPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; cancelled?: string; lead?: string }>;
}) {
  const { service, cancelled, lead } = await searchParams;
  // The lead Ryan put on the link. Only a well-formed id is carried; the
  // page never reads or shows anything about that lead.
  const leadId = typeof lead === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lead) ? lead.toLowerCase() : null;
  const services: PayableService[] = payableAgencyServices().map((s) => {
    const fixed = agencyFixedPriceUsd(s);
    return {
      slug: s.slug,
      name: s.name,
      eyebrow: s.eyebrow,
      fixedUsd: fixed,
      fixedLabel: fixed !== null ? usd(fixed) : null,
      fixedBilling: agencyFixedBilling(s),
    };
  });
  const preselected = service && services.some((s) => s.slug === service) ? service : null;

  return (
    <div className="cb-page">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <p>
          <Link href="/agency" className="cb-textlink">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to the agency lane
          </Link>
        </p>
        <div className="cb-deposit-grid mt-6">
          <div>
            <p className="cb-eyebrow">Existing client payment only</p>
            <h1 className="cb-h1">
              <em>Use the number in writing.</em>
              Your signed scope controls this payment.
            </h1>
            <p className="cb-lead">
              Use this page only for work and an amount already approved in writing. It does not buy a new managed plan or change your agreement. Existing clients retain the price, billing cadence, advertising treatment, and deliverables in their signed scope.
            </p>
            <ul className="sv-form-points">
              {[
                "Your existing signed agreement controls advertising allocation and any outside vendor costs.",
                "One-time for a setup, build, shoot, or fixed project. Monthly for a management fee. Both are on the scope.",
                `Paid by card through Stripe. The receipt is your record. Questions first? Call or text ${BUSINESS.phone.display}.`,
                "After payment, work follows your existing scope. No new service or allocation is added here.",
              ].map((line) => (
                <li key={line}>
                  <Check aria-hidden="true" className="h-5 w-5" />
                  {line}
                </li>
              ))}
            </ul>
            <p className="cb-lead" style={{ fontSize: 16 }}>
              No scope yet?{" "}
              <Link href="/agency/start" className="cb-textlink">
                Start the intake
              </Link>{" "}
              to discuss the current managed plans and receive a proposal before purchase.
            </p>
          </div>
          <AgencyPayForm services={services} preselected={preselected} cancelled={cancelled === "1"} leadId={leadId} />
        </div>
      </main>
      <footer className="router-footer">
        <span>{BUSINESS.dbaLine}</span>
        <span>
          Rather talk first? Call or text <a href={BUSINESS.phone.tel}>{BUSINESS.phone.display}</a>.
        </span>
      </footer>
    </div>
  );
}
