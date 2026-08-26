import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | The LeadFlow Pro",
  description: "How The LeadFlow Pro collects, uses, and protects information.",
  alternates: { canonical: "https://www.theleadflowpro.com/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <span className="eyebrow">Last updated August 7, 2026</span>
      <h1>Privacy Policy</h1>
      <p>
        The LeadFlow Pro is a DBA of Longview Training Center, LLC. This policy explains
        how we handle information when you use this website, request a system map, contact
        us, register for an event or training, or become a client.
      </p>
      <h2>Information we collect</h2>
      <p>
        We collect information you choose to provide, such as your name, business name,
        email address, phone number, website or selling profile, industry, current setup,
        goals, budget range, timeline, and the modules or sales channels you select.
      </p>
      <p>
        We may also receive basic technical and attribution information, including device
        and browser data, pages viewed, referring source, campaign parameters, and
        interaction events. Payment providers process payment details under their own
        privacy policies. We do not store full card numbers on this website.
      </p>
      <h2>How we use information</h2>
      <ul>
        <li>Respond to requests and prepare a relevant system recommendation.</li>
        <li>Deliver contracted services, training, events, support, and account access.</li>
        <li>Operate, secure, measure, and improve the website and its workflows.</li>
        <li>Send service messages related to a request, purchase, project, or account.</li>
        <li>
          Send marketing email only when you opt in or when otherwise permitted, with a way
          to unsubscribe.
        </li>
        <li>
          Call or text when you provide a number and the applicable consent. You may revoke
          that consent at any time, including by replying STOP to a text.
        </li>
      </ul>
      <h2>How information is shared</h2>
      <p>
        We do not sell personal information. We share information with service providers
        only as needed to operate the business, such as hosting, database, email,
        communications, analytics, scheduling, payment, and security providers. We may
        also disclose information when required by law, to protect rights or safety, or as
        part of a business transaction subject to appropriate safeguards.
      </p>
      <h2>Retention and security</h2>
      <p>
        We retain information for as long as reasonably needed to respond, deliver
        services, maintain business records, comply with legal obligations, resolve
        disputes, and protect the business. We use administrative and technical
        safeguards, but no internet service can promise absolute security.
      </p>
      <h2>Your choices</h2>
      <p>
        You can request access, correction, deletion, or a copy of information associated
        with you, subject to legal and operational exceptions. You can unsubscribe from
        marketing email through the link in the message. You can revoke call or text
        consent through any reasonable method.
      </p>
      <h2>Children and external services</h2>
      <p>
        This business website is not directed to children under 13. Links, marketplaces,
        payment providers, and other third-party services have their own terms and privacy
        practices.
      </p>
      <h2>Contact</h2>
      <p>
        Questions or privacy requests can be sent to{" "}
        <a href="mailto:hello@theleadflowpro.com">hello@theleadflowpro.com</a>. Please
        include enough information for us to verify and respond to the request.
      </p>
      <Link className="button-secondary" href="/start">
        Return to the System Map
      </Link>
    </main>
  );
}
