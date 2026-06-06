import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  ShieldCheck,
  Target,
  XCircle,
} from "lucide-react";
import { ConversionAnchor, ConversionHiddenFields, ConversionLink } from "@/components/site/ConversionEvents";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { BuiltProjectCard } from "@/components/site/BuiltProjectCard";
import { VisitorIdField } from "@/components/site/VisitorIdField";
import { BUILT_PROJECTS } from "@/lib/built-projects";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "$197 Lead Leak Audit | The LeadFlow Pro",
  description:
    "Find where your business is losing leads from missed calls, texts, DMs, website forms, ads, booking gaps, and slow follow-up. Built by Ryan Nichols for serious business owners.",
  path: "/lead-leak-audit-197",
  openGraphTitle: "$197 Lead Leak Audit | The LeadFlow Pro",
  openGraphDescription:
    "Find the leaks in your calls, texts, DMs, forms, ads, booking path, and follow-up before you spend more money on traffic.",
  image: "/images/lead-leak-audit-197-og.png",
});

const CHECKS = [
  "Website and landing page",
  "Missed calls",
  "Missed texts",
  "Facebook and Instagram DMs",
  "Website forms",
  "Booking path",
  "Follow-up process",
  "Proof and trust path",
  "Lead source tracking",
  "Owner visibility",
];

const GETS = [
  "A plain-English lead leak readout",
  "Top 3 leaks ranked by urgency",
  "Recommended next move",
  "Screenshots or examples where appropriate",
  "A clear path to fix it with Ryan if it makes sense",
];

const RIGHT_FIT = [
  "Business owners with a real offer",
  "Local service businesses",
  "Contractors",
  "Dental and medical offices",
  "Attorneys and professional services",
  "Real estate and insurance",
  "Car dealerships",
  "Owners who know leads are slipping",
  "People who can make a decision",
];

const WRONG_FIT = [
  "People looking for free coaching",
  "People wanting guaranteed results",
  "People with no offer, no budget, and no willingness to move",
  "People shopping for the cheapest possible consultant",
];

const REVENUE_OPTIONS = [
  "Under $10K/mo",
  "$10K-$50K/mo",
  "$50K-$250K/mo",
  "$250K+/mo",
  "Prefer not to say yet",
];

const LEAD_SOURCES = [
  "Facebook or Instagram ads",
  "Google search or Maps",
  "Website forms",
  "Phone calls",
  "Texts",
  "DMs",
  "Referrals",
  "Not sure",
];

const RESPONSE_TIMES = [
  "Under 5 minutes",
  "5-30 minutes",
  "Same day",
  "Next day",
  "Depends who sees it",
  "Not sure",
];

const TIMELINES = [
  "Tonight",
  "Within 24 hours",
  "This week",
  "I need Ryan to confirm fit first",
];

function auditCheckoutHref() {
  const env =
    process.env.STRIPE_LINK_LEAD_LEAK_AUDIT_197 ||
    process.env.NEXT_PUBLIC_STRIPE_LINK_LEAD_LEAK_AUDIT_197;
  return env && /^https?:\/\//i.test(env) ? env : null;
}

export default function PaidLeadLeakAuditPage({
  searchParams,
}: {
  searchParams?: { submitted?: string; error?: string };
}) {
  const checkoutHref = auditCheckoutHref();
  const submitted = searchParams?.submitted === "1";
  const saveError = searchParams?.error === "save_failed";
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "$197 Lead Leak Audit",
    provider: {
      "@type": "ProfessionalService",
      name: "The LeadFlow Pro",
      url: "https://www.theleadflowpro.com",
      email: "Hello@TheLeadFlowPro.com",
    },
    areaServed: "United States",
    offers: {
      "@type": "Offer",
      price: "197",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    description:
      "A practical review of website, calls, texts, DMs, ads, forms, booking, and follow-up to find where serious leads are falling out.",
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is the $197 audit a guarantee of leads or sales?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. The audit finds leaks, ranks the top issues, and recommends the next move. It does not guarantee followers, leads, sales, revenue, ad approval, or ad performance.",
        },
      },
      {
        "@type": "Question",
        name: "Who should buy the audit?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The audit is for serious business owners, founders, operators, local service businesses, sales teams, and creators with real offers who need to find where leads are slipping.",
        },
      },
      {
        "@type": "Question",
        name: "What happens after the audit?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Ryan sends the lead leak readout and the recommended next move. If implementation makes sense, Ryan can quote or build the fix.",
        },
      },
    ],
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.theleadflowpro.com" },
      {
        "@type": "ListItem",
        position: 2,
        name: "$197 Lead Leak Audit",
        item: "https://www.theleadflowpro.com/lead-leak-audit-197",
      },
    ],
  };

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <LightHeader
        activePath="/lead-leak-audit-197"
        hideFreeAuditLink
        primaryAction={{
          href: "#audit-application",
          label: "Apply for the $197 Audit",
          eventName: "lead_leak_197_apply_click",
          ctaText: "Apply for the $197 Audit",
          sourcePage: "/lead-leak-audit-197",
          mobileDescription: "Send the details first.",
        }}
        secondaryAction={{
          href: "/book?source=lead-leak-audit-197",
          label: "Book the 10-minute fit call",
          eventName: "lead_leak_197_book_call_click",
          ctaText: "Book the 10-minute fit call",
          sourcePage: "/lead-leak-audit-197",
          mobileDescription: "Quick fit check.",
          Icon: CalendarCheck,
          muted: true,
        }}
      />

      <main>
        <section className="relative overflow-hidden border-b border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#eef9ff_44%,#fff7ed_100%)]">
          <div className="mx-auto grid w-full min-w-0 max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-14">
            <div className="min-w-0 flex flex-col justify-center">
              <div className="inline-flex w-fit items-center gap-2 rounded-md border border-cyan-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-800">
                <ClipboardCheck className="h-3.5 w-3.5" />
                $197 Lead Leak Audit
              </div>
              <h1 className="mt-5 max-w-full break-words text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Find the leak before you spend another dollar on traffic.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-700 sm:text-lg">
                For $197, Ryan reviews your website, calls, forms, DMs, ads, booking path,
                and follow-up process so you can see where serious leads are falling out.
              </p>
              <div className="mt-4 rounded-2xl border border-cyan-200 bg-white/80 p-4 text-sm font-semibold leading-6 text-slate-800 shadow-sm">
                Built by an operator with 82K+ audience across Facebook, X, YouTube, Instagram, and TikTok.
              </div>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <ConversionAnchor
                  href="#audit-application"
                  eventName="lead_leak_197_apply_click"
                  ctaText="Apply for the $197 Audit"
                  sourcePage="/lead-leak-audit-197"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-accent-500/20 hover:bg-accent-400"
                >
                  Apply for the $197 Audit <ArrowRight className="h-4 w-4" />
                </ConversionAnchor>
                <ConversionLink
                  href="/book?source=lead-leak-audit-197"
                  eventName="lead_leak_197_book_call_click"
                  ctaText="Book the 10-minute fit call"
                  sourcePage="/lead-leak-audit-197"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-900 hover:border-cyan-400"
                >
                  Book the 10-minute fit call <CalendarCheck className="h-4 w-4" />
                </ConversionLink>
              </div>
              <p className="mt-4 max-w-2xl text-xs leading-5 text-slate-500">
                No guaranteed followers, leads, sales, ROAS, CPL, revenue, rankings, or ad approval.
                The audit finds the leak and the next practical move.
              </p>
            </div>

            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(260px,0.7fr)] lg:items-stretch">
              <div className="rounded-3xl border border-slate-900/10 bg-slate-950 p-4 text-white shadow-[0_30px_80px_-36px_rgba(15,23,42,0.72)]">
                <div className="relative overflow-hidden rounded-2xl bg-slate-900">
                  <video
                    className="mx-auto aspect-[9/16] max-h-[660px] w-full bg-slate-950 object-cover"
                    controls
                    controlsList="nodownload"
                    disablePictureInPicture
                    playsInline
                    preload="metadata"
                    poster="/images/lead-leak-audit-197-ad-still.jpg"
                    aria-label="Lead Leak Audit ad video with Ryan Nichols meeting a person who recognized him in public"
                  >
                    <source src="/videos/lead-leak-audit-197-ad.mp4" type="video/mp4" />
                    Your browser does not support this video.
                  </video>
                </div>
                <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
                  <div className="text-xs font-semibold uppercase tracking-widest text-cyan-100">
                    Watch the ad
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    A real mall interaction, caught on camera. When attention turns into a click,
                    call, text, DM, form, or booking request, the business path has to catch it.
                    That is what the $197 audit checks.
                  </p>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-700">
                  <Target className="h-4 w-4" />
                  Audit target
                </div>
                <div className="mt-5 grid gap-3">
                  {["Missed calls", "Slow replies", "Dead forms", "DM confusion", "No source trail"].map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-900">
                      <CheckCircle2 className="h-4 w-4 text-cyan-700" />
                      {item}
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-2xl border border-accent-200 bg-accent-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-widest text-slate-600">
                    Price
                  </div>
                  <div className="mt-2 text-4xl font-black tracking-tight text-slate-950">$197</div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    Built for serious owners who want the leak found before buying more traffic.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                  Proof Ryan ships
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  Four live builds. Four different problems solved.
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  The audit is not theory. Ryan has built and deployed real systems for funnel flow,
                  public data organization, trust-heavy niche positioning, and founder-led service intake.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {BUILT_PROJECTS.map((project) => (
                  <BuiltProjectCard
                    key={project.name}
                    project={project}
                    variant="light"
                    density="compact"
                    showAngle
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <SectionTitle eyebrow="What this audit checks" title="The review follows the lead from first attention to next action." />
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {CHECKS.map((item) => (
                <CheckCard key={item} text={item} />
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-slate-950 text-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-16">
            <div>
              <SectionTitle eyebrow="What the buyer gets" title="Plain readout. No vague marketing fog." dark />
              <div className="mt-8 grid gap-3">
                {GETS.map((item) => (
                  <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm font-semibold leading-6 text-slate-100">
                    <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-200" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-100">
                <Eye className="h-4 w-4" />
                Owner visibility
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight">
                The owner should not have to guess where the lead died.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Ryan looks for the broken handoff between attention, contact, response, proof,
                booking, and follow-up. If the path is not visible, the business cannot fix it.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <MiniMetric label="Leaks ranked" value="Top 3" />
                <MiniMetric label="Focus" value="Lead flow" />
                <MiniMetric label="Output" value="Next move" />
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 py-12 sm:px-6 md:grid-cols-2 lg:px-8 lg:py-16">
            <FitBlock title="Who this is for" items={RIGHT_FIT} right />
            <FitBlock title="Who this is not for" items={WRONG_FIT} />
          </div>
        </section>

        <section id="audit-application" className="bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.78fr_1.22fr] lg:px-8 lg:py-16">
            <div>
              <div className="inline-flex items-center gap-2 rounded-md border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-800">
                <ShieldCheck className="h-3.5 w-3.5" />
                Start here
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Apply for the $197 Audit.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-700">
                Submit the application below. If the fit is clear, Ryan will confirm the next step
                and send the payment link for the $197 Lead Leak Audit.
              </p>
              <p className="mt-5 text-sm leading-6 text-slate-700">
                For $197, Ryan reviews your website, calls, forms, DMs, ads, booking path,
                and follow-up process so you can see where serious leads are falling out.
              </p>
              {checkoutHref ? <PaymentLinkNote checkoutHref={checkoutHref} /> : null}
            </div>

            <div>
              {!submitted ? <WhatHappensNext /> : null}
              {submitted ? (
                <CompletionState />
              ) : (
                <AuditApplicationForm saveError={saveError} />
              )}
            </div>
          </div>
        </section>
      </main>

      <LightFooter hideFreeAuditLink />
    </div>
  );
}

function SectionTitle({ eyebrow, title, dark }: { eyebrow: string; title: string; dark?: boolean }) {
  return (
    <div className="max-w-3xl">
      <div className={`text-xs font-semibold uppercase tracking-widest ${dark ? "text-cyan-100" : "text-cyan-700"}`}>
        {eyebrow}
      </div>
      <h2 className={`mt-2 text-3xl font-semibold tracking-tight sm:text-4xl ${dark ? "text-white" : "text-slate-950"}`}>
        {title}
      </h2>
    </div>
  );
}

function CheckCard({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-900">
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700" />
      {text}
    </div>
  );
}

function FitBlock({ title, items, right }: { title: string; items: string[]; right?: boolean }) {
  const Icon = right ? CheckCircle2 : XCircle;
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <div key={item} className="flex gap-3 text-sm font-semibold leading-6 text-slate-700">
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${right ? "text-cyan-700" : "text-rose-600"}`} />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{label}</div>
      <div className="mt-2 text-xl font-black text-white">{value}</div>
    </div>
  );
}

function WhatHappensNext() {
  return (
    <div className="mb-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="text-xl font-semibold tracking-tight text-slate-950">
        What happens next?
      </h3>
      <ol className="mt-4 grid gap-3 text-sm font-semibold leading-6 text-slate-700">
        <li>You send the business, website, and lead-flow details.</li>
        <li>Ryan reviews whether the audit makes sense.</li>
        <li>If it is a fit, you get the payment step for the $197 audit.</li>
        <li>Ryan reviews the business path and identifies the top leaks.</li>
        <li>You get the next practical move.</li>
      </ol>
      <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
        No fake guarantees. No free coaching. No vague marketing fog.
      </p>
    </div>
  );
}

function CompletionState() {
  return (
    <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-6 shadow-xl shadow-cyan-100/70">
      <CheckCircle2 className="h-10 w-10 text-cyan-700" />
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
        Your audit application is in.
      </h2>
      <p className="mt-3 text-base leading-7 text-slate-700">
        Ryan will review what you sent. If the fit is clear, he will follow up with
        the next step for the $197 Lead Leak Audit.
      </p>
      <ConversionLink
        href="/book?source=lead-leak-audit-197-submitted"
        eventName="lead_leak_197_book_call_click"
        ctaText="Book the 10-minute fit call"
        sourcePage="/lead-leak-audit-197"
        className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-6 py-3 text-sm font-bold text-white hover:bg-slate-800"
      >
        Book the 10-minute fit call <ArrowRight className="h-4 w-4" />
      </ConversionLink>
    </div>
  );
}

function PaymentLinkNote({ checkoutHref }: { checkoutHref: string }) {
  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold leading-6 text-slate-700">
        Already confirmed by Ryan?
      </p>
      <ConversionAnchor
        href={checkoutHref}
        eventName="lead_leak_197_payment_link_click"
        ctaText="Already confirmed by Ryan? Pay the $197 audit"
        sourcePage="/lead-leak-audit-197"
        className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-accent-300 bg-accent-50 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-accent-100"
      >
        Pay the $197 audit <ArrowRight className="h-4 w-4" />
      </ConversionAnchor>
    </div>
  );
}

function AuditApplicationForm({ saveError }: { saveError?: boolean }) {
  return (
    <form
      action="/api/lead-leak-audit-197"
      method="post"
      data-conversion-event="lead_leak_197_form_submit"
      data-conversion-cta="Apply for the $197 Audit"
      data-conversion-source-page="/lead-leak-audit-197"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70 sm:p-6"
    >
      <VisitorIdField />
      <ConversionHiddenFields formType="paid_lead_leak_audit_197" sourcePage="/lead-leak-audit-197" />
      {saveError ? (
        <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold leading-6 text-rose-900">
          The application did not save. Try again or book the 10-minute fit call so Ryan can catch it directly.
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" name="fullName" placeholder="Your name" required />
        <Field label="Email" name="email" type="email" placeholder="you@business.com" required />
        <Field label="Phone" name="phone" placeholder="Best number" required />
        <Field label="Business name" name="businessName" placeholder="Business name" required />
        <Field label="Website" name="businessUrl" placeholder="https://yourbusiness.com" />
        <Select label="Monthly revenue range" name="monthlyRevenueRange" options={REVENUE_OPTIONS} />
        <Select label="Main lead source" name="currentLeadSource" options={LEAD_SOURCES} />
        <Select label="Average first response time" name="responseTime" options={RESPONSE_TIMES} />
      </div>
      <label className="mt-4 block">
        <span className="text-sm font-bold text-slate-800">Where do you think the leak is?</span>
        <textarea
          name="leakConcern"
          rows={4}
          required
          placeholder="Missed calls, slow replies, DMs, forms, booking, ads, follow-up, proof, or source tracking..."
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
        />
      </label>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Select
          label="Are you ready to invest $197 if Ryan confirms fit?"
          name="auditReadiness"
          options={["Yes, if Ryan confirms fit", "I need one quick fit call first", "Not sure yet"]}
        />
        <Select label="How soon do you want this reviewed?" name="reviewTimeline" options={TIMELINES} />
      </div>
      <button
        type="submit"
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-accent-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-accent-500/20 hover:bg-accent-400"
      >
        Apply for the $197 Audit <ArrowRight className="h-4 w-4" />
      </button>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        This is not free coaching. It is the fit path for a paid audit. No outcome guarantees.
      </p>
    </form>
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

function Select({ label, name, options }: { label: string; name: string; options: string[] }) {
  return (
    <label>
      <span className="text-sm font-bold text-slate-800">{label}</span>
      <select
        name={name}
        defaultValue={options[0]}
        className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
