import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AGENCY_HUB, AGENCY_SERVICES, agencyService } from "@/lib/site/agency";
import { BUSINESS } from "@/lib/site/business";
import AgencyIntake from "./AgencyIntake";

// The agency intake. One page, ten questions, no header or footer (the same
// treatment /start gets), and a clear way back. The form posts to /api/leads
// so the lead lands in the CRM with an owner alert, a welcome email, and a
// timestamp like every other door.

export const metadata: Metadata = withPublicPageMetadata("/agency/start", {
  title: "Agency intake | The LeadFlow Pro",
  description: AGENCY_HUB.budgetNote,
  robots: { index: false, follow: true },
});

export default async function AgencyStartPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const { service } = await searchParams;
  const preselected = service && agencyService(service) ? service : null;
  return (
    <div className="cb-page">
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <p>
          <Link href="/agency" className="cb-textlink">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to the agency lane
          </Link>
        </p>
        <p className="cb-eyebrow mt-6">Agency intake</p>
        <h1 className="cb-h1">
          <em>Tell Ryan what is leaking.</em>
          Ten questions. One business day to a reply.
        </h1>
        <p className="cb-lead">{AGENCY_HUB.budgetNote}</p>
        <div className="mt-8">
          <AgencyIntake
            services={AGENCY_SERVICES.map((s) => ({ slug: s.slug, label: s.navLabel }))}
            preselected={preselected}
          />
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
