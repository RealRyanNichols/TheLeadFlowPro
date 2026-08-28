import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | The LeadFlow Pro",
  description: "How The LeadFlow Pro collects, uses, and protects information.",
};

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <span className="eyebrow">Last updated August 28, 2026</span>
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
        If you complete a business diagnostic, you may also choose to share more detailed
        business information. This can include revenue or advertising ranges, lead volume,
        conversion and follow-up practices, offers and pricing, team structure, software and
        sales channels, website or account ownership issues, operational bottlenecks,
        available marketing assets, and the outcomes you want help achieving. Most
        diagnostic questions are optional; more context helps us prepare a more useful
        recommendation.
      </p>
      <p>
        We may also receive basic technical and attribution information, including device
        and browser data, pages viewed, referring source, campaign parameters, and
        interaction events. Payment providers process payment details under their own
        privacy policies. We do not store full card numbers on this website.
      </p>
      <h2>Information you should not submit</h2>
      <p>
        Do not put passwords, one-time authentication codes, API or private keys, full
        payment-card or bank-account numbers, Social Security or tax identification
        numbers, protected health information, or private customer records into a contact
        form or diagnostic. If access to a business account is needed for approved work, we
        will arrange a separate, appropriate access method.
      </p>
      <h2>How we use information</h2>
      <ul>
        <li>Respond to requests and prepare a relevant system recommendation.</li>
        <li>
          Review diagnostic answers to identify possible gaps, prioritize follow-up
          questions, and prepare a proposal or action plan.
        </li>
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
      <h2>Saved diagnostics and email choices</h2>
      <p>
        When you choose to save a diagnostic for later, we use your email address to send
        the requested resume link and may retain the draft so you can return to it. Treat a
        resume link as private because it may provide access to the answers in that draft.
      </p>
      <p>
        Messages that confirm a submission, deliver a requested resume link, or respond to
        your request are service messages. An optional educational follow-up series or
        ongoing marketing email is sent only when you select the corresponding consent.
        You can unsubscribe from marketing messages at any time without affecting a
        proposal, active project, or other service request.
      </p>
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
        We retain submitted information and saved drafts only as long as reasonably needed
        to respond, prepare or deliver requested services, maintain business records,
        comply with legal obligations, resolve disputes, and protect the business. Retention
        may vary based on whether the record is an inactive draft, an active lead, or part
        of a client engagement. We periodically remove information that is no longer needed,
        subject to legal, security, backup, and operational requirements.
      </p>
      <p>
        We use administrative and technical safeguards designed to limit unauthorized
        access, including access controls and trusted hosting, database, and communications
        providers. Please use the forms only for the business context they request. No
        internet service, storage system, or transmission method can promise absolute
        security.
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
