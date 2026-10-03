import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  AGENCY_HUB,
  AGENCY_SERVICES,
  CORE_AGENCY_SERVICES,
} from "@/lib/site/agency";
import { BUSINESS } from "@/lib/site/business";
import AgencyIntake from "./AgencyIntake";
import { agencyIntakeContext } from "@/lib/site/agencyIntake";
import { smsHref } from "@/lib/site/textLinks";
import styles from "./agency-intake.module.css";

// The agency intake. One page, eight question groups, no header or footer (the same
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
  searchParams: Promise<{
    service?: string | string[];
    plan?: string | string[];
    lead?: string | string[];
  }>;
}) {
  const { requestedService, preselected, initialPlan, originatingLead } =
    agencyIntakeContext(
      await searchParams,
      AGENCY_SERVICES,
      CORE_AGENCY_SERVICES,
    );
  return (
    <div className={`cb-page ${styles.page}`}>
      <main className={styles.shell}>
        <p>
          <Link href="/agency" className={styles.back}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to managed
            services
          </Link>
        </p>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Managed marketing request</p>
          <h1>Tell us what needs to work.</h1>
          <p>
            Tell Ryan about your business and what you want handled. Expect a
            reply within one business day, then a written scope before work or
            billing starts.
          </p>
        </div>
        <div>
          <AgencyIntake
            services={[
              ...CORE_AGENCY_SERVICES.map((s) => ({
                slug: s.slug,
                label: s.navLabel,
              })),
              { slug: "custom", label: "A custom build or another priority" },
            ]}
            preselected={preselected}
            initialPlan={initialPlan}
            requestedService={requestedService}
            originatingLead={originatingLead}
          />
        </div>
      </main>
      <footer className={styles.footer}>
        <span>{BUSINESS.dbaLine}</span>
        <span>
          Rather talk first? <a href={BUSINESS.phone.tel}>Call</a> or{" "}
          <a href={smsHref("agency_start")}>text {BUSINESS.phone.display}</a>.
        </span>
      </footer>
    </div>
  );
}
