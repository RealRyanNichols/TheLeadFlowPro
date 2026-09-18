import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import AgencyPayForm, { type PayableService } from "./AgencyPayForm";
import { agencyFixedPriceUsd, payableAgencyServices } from "@/lib/agencyPayment";
import { AGENCY_PROCESS, OWNERSHIP_PROMISE } from "@/lib/site/agency";
import { BUSINESS } from "@/lib/site/business";
import { usd } from "@/lib/site/prices";

// Pay an agency scope. One page, five fields, no header or footer (the same
// treatment /agency/start gets), and a clear way back. The charge is built
// server-side in lib/agencyPayment.ts; the buyer lands on /agency/paid, which
// verifies the session with Stripe before it says anything.

export const metadata: Metadata = withPublicPageMetadata("/agency/pay", {
  title: "Pay an agency scope | The LeadFlow Pro",
  description:
    "Pay the number in your written scope by card: the service, one-time or monthly, and your receipt. Ad spend stays on your own card.",
  robots: { index: false, follow: true },
});

export default async function AgencyPayPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; cancelled?: string }>;
}) {
  const { service, cancelled } = await searchParams;
  const services: PayableService[] = payableAgencyServices().map((s) => {
    const fixed = agencyFixedPriceUsd(s);
    return {
      slug: s.slug,
      name: s.name,
      eyebrow: s.eyebrow,
      fixedUsd: fixed,
      fixedLabel: fixed !== null ? usd(fixed) : null,
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
            <p className="cb-eyebrow">Agency payment</p>
            <h1 className="cb-h1">
              <em>Use the number in writing.</em>
              Keep the payment tied to the work.
            </h1>
            <p className="cb-lead">
              Ryan puts every agency scope in writing before anything starts: what gets built, what you
              own, what you pay the platforms directly, and the price. This is where that price gets
              paid. Nothing here changes the scope, and nothing runs without your written approval.
            </p>
            <ul className="sv-form-points">
              {[
                OWNERSHIP_PROMISE.points[1],
                "One-time for a setup, build, shoot, or fixed project. Monthly for a management fee. Both are on the scope.",
                `Paid by card through Stripe. The receipt is your record. Questions first? Call or text ${BUSINESS.phone.display}.`,
                `After payment: ${AGENCY_PROCESS.map((p) => p.name.toLowerCase()).join(", ")}, in your accounts.`,
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
              and Ryan sends one within one business day. Buying the website outright? That is the{" "}
              <Link href="/packages/launch" className="cb-textlink">
                Website Launch
              </Link>
              , paid on its own page.
            </p>
          </div>
          <AgencyPayForm services={services} preselected={preselected} cancelled={cancelled === "1"} />
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
