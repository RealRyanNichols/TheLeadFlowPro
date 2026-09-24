import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import type { Metadata } from "next";
import Link from "next/link";
import { BUSINESS } from "@/lib/site/business";

export const metadata: Metadata = withPublicPageMetadata("/privacy", {
  title: "Privacy Policy | The LeadFlow Pro",
  description: "How The LeadFlow Pro collects, uses, and protects information.",
});

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <span className="eyebrow">Last updated September 20, 2026</span>
      <h1>Privacy Policy</h1>
      <p>
        {BUSINESS.name} is a DBA of {BUSINESS.legalName}. This policy explains
        how we handle information when you use this website, request a system map, contact
        us, register for an event or training, become a client, or subscribe to the
        LeadFlow HQ plugin for ChatGPT and Claude.
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
      <h2>The LeadFlow HQ plugin and workspaces</h2>
      <p>
        The plugin is a connector that a business owner adds to ChatGPT, Claude, Claude Code,
        or Cursor. It is backed by a private workspace on this site (HQ). A workspace stores
        what the subscriber and their connected sources put into it: the business profile
        and its settings; leads and their contact details, source, notes, and status;
        messages sent to and received from those leads; drafted and approved content;
        follow-up schedules; and a log of what the automation did and when.
      </p>
      <p>
        The subscriber is responsible for the people whose details they enter or connect,
        and we process that information on the subscriber&apos;s behalf to run their
        workspace. We do not use one workspace&apos;s leads, messages, or content for any
        other business, for advertising audiences, or for training models.
      </p>
      <p>
        When a subscriber connects a text line, a Facebook Page, a lead-ad form, or an
        automation service, the credential for that connection is encrypted before it is
        stored and is not shown again. Sign-in tokens and plugin API keys are stored only as
        hashes. A subscriber can revoke a connection, a key, or an assistant&apos;s access
        from HQ at any time.
      </p>
      <p>
        Using the plugin inside an assistant sends the assistant&apos;s requests to this
        site and returns the results to that assistant. Those results, which can include
        lead names, phone numbers, message text, and drafts, are then handled by the
        assistant&apos;s provider (OpenAI for ChatGPT, Anthropic for Claude, or the provider
        of the tool the subscriber connected) under that provider&apos;s own terms and
        privacy policy. Service providers that operate the workspace include our hosting,
        database, email, text-messaging, and payment providers, and Meta when a Page or
        lead-ad form is connected.
      </p>
      <p>
        Texts from a workspace go only to people who agreed to receive them, and a STOP
        reply ends them for that number in that workspace. Workspace records are kept while
        the subscription is active and after it ends, so a returning subscriber does not lose
        their work, until the subscriber asks for the workspace to be deleted. A subscriber
        can ask for a copy of their leads and messages, or for deletion, by emailing{" "}
        <a href={`mailto:${BUSINESS.email.hello}`}>{BUSINESS.email.hello}</a>.
      </p>
      <h2>Post Creator</h2>
      <p>
        The free Post Creator idea machine runs in your browser and sends nothing to us;
        what you type there stays on your device. For a Post Creator buyer we store their
        email, their plan, and the business profile they save, so the account works on
        every device. When a buyer uses AI writing, their saved profile, the idea they
        picked, and any note they add are sent to Anthropic, the company that runs the AI
        model, to write that draft, under Anthropic&apos;s own terms and privacy policy. We
        keep a record of each AI request (its time, size, cost, and whether it worked) but
        not the draft text. Nothing is posted, sent, or shared on a buyer&apos;s behalf. A
        buyer can ask for their account and profile to be deleted by emailing{" "}
        <a href={`mailto:${BUSINESS.email.hello}`}>{BUSINESS.email.hello}</a>.
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
        <a href={`mailto:${BUSINESS.email.hello}`}>{BUSINESS.email.hello}</a>. Please
        include enough information for us to verify and respond to the request.
      </p>
      <Link className="button-secondary" href="/start">
        Return to the System Map
      </Link>
    </main>
  );
}
