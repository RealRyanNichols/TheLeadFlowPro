import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use | The LeadFlow Pro",
  description: "Terms for using The LeadFlow Pro website and requesting services.",
  alternates: { canonical: "https://www.theleadflowpro.com/terms" },
};

export default function TermsPage() {
  return (
    <main className="legal-page">
      <span className="eyebrow">Last updated August 17, 2026</span>
      <h1>Terms of Use</h1>
      <p>
        These terms apply to this website operated by The LeadFlow Pro, a DBA of Longview
        Training Center, LLC. By using the site, you agree to these terms. A signed
        proposal, statement of work, order form, or service agreement controls any paid
        project and will replace conflicting website language for that project.
      </p>
      <h2>Website information</h2>
      <p>
        The system map, package descriptions, calculators, marketplace fee notes,
        recommendations, examples, and other website content are general planning
        information. They are not legal, tax, accounting, investment, lending, or
        compliance advice. Vendor prices, platform rules, integrations, and features can
        change.
      </p>
      <h2>Prices, scope, and results</h2>
      <p>
        Website Launch is offered at a fixed $1,000 for its published five-page scope:
        $500 to begin and $500 after approval, before launch. Once intake begins, the
        initial $500 deposit is non-refundable, except where the written agreement or
        applicable law requires otherwise. Work outside that scope, larger modules, and
        custom-platform starting prices are not final quotes. Final scope, price, timing,
        deliverables, responsibilities, ownership, support, and payment terms are
        established in the applicable written agreement. We do not guarantee traffic,
        leads, approvals, rankings, revenue, platform access, marketplace performance,
        advertising results, or any particular business outcome.
      </p>
      <h2>Marketplace and third-party platforms</h2>
      <p>
        Amazon, eBay, Poshmark, Mercari, Whatnot, Etsy, social networks, payment
        providers, and other services are independent third parties. You remain
        responsible for your accounts, listings, products, customer promises, taxes, fees,
        policies, and compliance. The LeadFlow Pro will not design or operate a workflow
        intended to evade a marketplace fee, policy, or restriction.
      </p>
      <h2>Acceptable use</h2>
      <p>
        You may not misuse the website, interfere with its operation, attempt unauthorized
        access, submit false or unlawful material, introduce malicious code, scrape
        protected information, impersonate another person, or use the service to violate
        law or third-party rights.
      </p>
      <h2>Intellectual property</h2>
      <p>
        The website, brand, copy, design, software, and materials are owned by or licensed
        to Longview Training Center, LLC unless stated otherwise. Client ownership and
        licenses are governed by the signed project agreement. References to an
        &ldquo;owned system&rdquo; mean the agreed project assets and accounts are
        delivered or configured as described in that agreement, subject to third-party
        software, open-source licenses, vendor services, and recurring infrastructure
        charges.
      </p>
      <h2>Availability and liability</h2>
      <p>
        The website is provided on an &ldquo;as available&rdquo; basis. To the fullest
        extent permitted by law, Longview Training Center, LLC disclaims implied
        warranties and is not liable for indirect, incidental, special, consequential, or
        punitive damages arising from website use. Some jurisdictions do not allow certain
        limitations, so those limitations may not apply to you.
      </p>
      <h2>Changes and governing law</h2>
      <p>
        We may update these terms by posting a revised date. These terms are governed by
        the laws of the State of Texas, without regard to conflict-of-law rules, unless a
        signed agreement says otherwise.
      </p>
      <h2>Contact</h2>
      <p>
        Questions can be sent to{" "}
        <a href="mailto:hello@theleadflowpro.com">hello@theleadflowpro.com</a>.
      </p>
      <Link className="button-secondary" href="/packages">
        Return to Product Studio
      </Link>
    </main>
  );
}
