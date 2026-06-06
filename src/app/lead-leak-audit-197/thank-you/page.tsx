import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Link2,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import { ConversionHiddenFields, ConversionLink } from "@/components/site/ConversionEvents";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { VisitorIdField } from "@/components/site/VisitorIdField";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "Audit Application Received | The LeadFlow Pro",
  description:
    "Your $197 Lead Leak Audit application is in. Add the next-step context Ryan should review first.",
  path: "/lead-leak-audit-197/thank-you",
  noIndex: true,
});

export default function PaidAuditThankYouPage({
  searchParams,
}: {
  searchParams?: { context?: string; context_error?: string };
}) {
  const contextSaved = searchParams?.context === "1";
  const contextError = searchParams?.context_error === "1";

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <LightHeader
        activePath="/lead-leak-audit-197"
        hideFreeAuditLink
        primaryAction={{
          href: "/contact?source=lead-leak-audit-197-thank-you",
          label: "Leave a message",
          eventName: "lead_leak_197_message_click",
          ctaText: "Leave a message",
          sourcePage: "/lead-leak-audit-197/thank-you",
          mobileDescription: "AI first. Ryan later if needed.",
          Icon: MessageSquareText,
        }}
        secondaryAction={{
          href: "#next-step-context",
          label: "Add context",
          eventName: "lead_leak_197_apply_click",
          ctaText: "Add next-step context",
          sourcePage: "/lead-leak-audit-197/thank-you",
          mobileDescription: "Tell Ryan what to check first.",
          Icon: ClipboardCheck,
          muted: true,
        }}
      />

      <main>
        <section className="border-b border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#eef9ff_48%,#fff7ed_100%)]">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-14">
            <div>
              <div className="inline-flex items-center gap-2 rounded-md border border-cyan-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-800">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Application received
              </div>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">
                Your audit application is in.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700 sm:text-lg">
                Ryan will review what you sent. If the fit is clear, he will follow up with
                the next step for the $197 Lead Leak Audit.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <ConversionLink
                  href="/contact?source=lead-leak-audit-197-thank-you"
                  eventName="lead_leak_197_message_click"
                  ctaText="Leave a message"
                  sourcePage="/lead-leak-audit-197/thank-you"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-accent-500/20 hover:bg-accent-400"
                >
                  Leave a message <MessageSquareText className="h-4 w-4" />
                </ConversionLink>
                <a
                  href="#next-step-context"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-900 hover:border-cyan-400"
                >
                  Add what Ryan should check first <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="rounded-3xl border border-cyan-200 bg-white p-5 shadow-xl shadow-cyan-100/70 sm:p-6">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-800">
                <ShieldCheck className="h-4 w-4" />
                What happens now
              </div>
              <ol className="mt-5 grid gap-3 text-sm font-semibold leading-6 text-slate-700">
                <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4">1. Ryan reviews the application and decides if the audit makes sense.</li>
                <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4">2. If the fit is clear, Ryan sends the payment step for the $197 audit.</li>
                <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4">3. Ryan follows the lead path from attention to follow-up.</li>
                <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4">4. You get the top leaks and the next practical move.</li>
              </ol>
              <p className="mt-5 text-xs leading-5 text-slate-500">
                No passwords here. No outcome promises. Add links, notes, and where to look first.
              </p>
            </div>
          </div>
        </section>

        <section id="next-step-context" className="bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8 lg:py-16">
            <div>
              <div className="inline-flex items-center gap-2 rounded-md border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-800">
                <Link2 className="h-3.5 w-3.5" />
                Next step
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Add the context Ryan should check first.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-700">
                Use this if you already know where the leak might be. Website links, booking links, ad links, social pages, screenshots you plan to send, and access notes help Ryan move faster.
              </p>
              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-lg font-semibold text-slate-950">Good things to add</h3>
                <ul className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-slate-700">
                  <li>Website, landing page, booking, ad, or profile links.</li>
                  <li>Where calls, texts, DMs, or forms are supposed to go.</li>
                  <li>Where you suspect the handoff is breaking.</li>
                  <li>Who owns follow-up inside the business.</li>
                </ul>
              </div>
            </div>

            <form
              action="/api/lead-leak-audit-context"
              method="post"
              data-conversion-event="lead_leak_197_context_submit"
              data-conversion-cta="Send next-step context"
              data-conversion-source-page="/lead-leak-audit-197/thank-you"
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70 sm:p-6"
            >
              <VisitorIdField />
              <ConversionHiddenFields
                formType="paid_lead_leak_audit_197_context"
                sourcePage="/lead-leak-audit-197/thank-you"
              />
              {contextSaved ? (
                <div className="mb-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-semibold leading-6 text-cyan-950">
                  Context added. Ryan can see it in the admin queue with your audit application.
                </div>
              ) : null}
              {contextError ? (
                <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold leading-6 text-rose-900">
                  That context did not save. Try again or leave a message.
                </div>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Email used on application" name="email" type="email" placeholder="you@business.com" required />
                <Field label="Name" name="fullName" placeholder="Your name" />
                <Field label="Phone" name="phone" placeholder="Best number" />
                <Field label="Business name" name="businessName" placeholder="Business name" />
                <Field label="Website" name="businessUrl" placeholder="https://yourbusiness.com" />
              </div>
              <TextArea
                label="Links Ryan should review first"
                name="linksToReview"
                placeholder="Website, booking page, ad link, social profile, form link, or CRM path..."
              />
              <TextArea
                label="Where do you think the lead path breaks?"
                name="leadPathNotes"
                placeholder="Calls go to voicemail, DMs get missed, forms do not notify anyone, booking is confusing..."
                required
              />
              <TextArea
                label="Access notes, no passwords"
                name="accessNotes"
                placeholder="Who owns the inbox, where the form notifications go, what platform you use, or what Ryan should ask for next..."
              />
              <button
                type="submit"
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-accent-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-accent-500/20 hover:bg-accent-400"
              >
                Send next-step context <ArrowRight className="h-4 w-4" />
              </button>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Do not paste passwords, private keys, card numbers, medical records, or sensitive client data here.
              </p>
            </form>
          </div>
        </section>
      </main>

      <LightFooter hideFreeAuditLink />
    </div>
  );
}

function Field({
  label,
  name,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label>
      <span className="text-sm font-bold text-slate-800">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="mt-4 block">
      <span className="text-sm font-bold text-slate-800">{label}</span>
      <textarea
        name={name}
        rows={4}
        required={required}
        placeholder={placeholder}
        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
      />
    </label>
  );
}
