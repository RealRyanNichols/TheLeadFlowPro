import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  MessageSquareText,
  MousePointerClick,
  ShieldCheck,
  Video,
} from "lucide-react";
import { OrganicAuditForm } from "@/components/site/OrganicAuditForm";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import {
  FACEBOOK_AD_VARIANTS,
  TONIGHT_AD_SETUP,
  TONIGHT_FACEBOOK_OFFER,
} from "@/lib/facebook-offer";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "Free Lead Leak Audit - Facebook Offer",
  description:
    "Request a free Lead Leak Audit from The LeadFlow Pro and see the first fixes to check across website, calls, forms, DMs, proof, booking, and follow-up.",
  path: "/facebook-ad-offer",
  imageTitle: "Free Lead Leak Audit",
  imageSubtitle: "Check the path from attention to follow-up before scaling traffic.",
});

const CHECKS = [
  { Icon: MousePointerClick, title: "Website and CTA", body: "Is there one clear next action?" },
  { Icon: MessageSquareText, title: "Follow-up", body: "What happens after the form, call, or DM?" },
  { Icon: ShieldCheck, title: "Proof", body: "Does the page give a cold visitor a reason to trust it?" },
  { Icon: BarChart3, title: "Owner visibility", body: "Can the owner see source, status, and next action?" },
];

export default function FacebookAdOfferPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <LightHeader activePath="/lead-leak-audit" />

      <main>
        <section className="border-b border-slate-200 bg-slate-950 text-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-16">
            <div className="flex flex-col justify-center">
              <div className="inline-flex w-fit items-center gap-2 rounded-md border border-cyan-300/35 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
                <ClipboardCheck className="h-3.5 w-3.5" />
                Tonight's offer
              </div>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                {TONIGHT_FACEBOOK_OFFER.title}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                {TONIGHT_FACEBOOK_OFFER.promise}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="#audit-form"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent-500 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-accent-400"
                >
                  Request free audit <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/proof"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white hover:bg-white/15"
                >
                  See proof
                </Link>
              </div>
            </div>
            <div id="audit-form">
              <OrganicAuditForm
                source="facebook-ad-tonight"
                landingPage="/facebook-ad-offer"
                industry="Owner-led business"
                ctaLabel="Request my free audit"
              />
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                What the audit checks
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                The first fix is usually after the click, not inside the ad account.
              </h2>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {CHECKS.map((check) => (
                <div key={check.title} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                  <check.Icon className="h-6 w-6 text-cyan-700" />
                  <h3 className="mt-4 text-lg font-bold text-slate-950">{check.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{check.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-16">
            <div>
              <div className="inline-flex items-center gap-2 rounded-md border border-accent-300 bg-accent-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-950">
                <Video className="h-3.5 w-3.5" />
                Ad copy Ryan can run
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Use benefit-first copy that does not make personal-attribute claims.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-700">
                Meta reviews the ad and the landing page. Keep the wording focused on the service,
                not assumptions about the viewer.
              </p>
            </div>
            <div className="grid gap-3">
              {FACEBOOK_AD_VARIANTS.map((variant) => (
                <div key={variant.name} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                    {variant.name}
                  </div>
                  <h3 className="mt-2 font-bold text-slate-950">{variant.headline}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{variant.primaryText}</p>
                  <p className="mt-3 text-xs font-semibold text-slate-500">{variant.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                Tonight setup
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Push one simple offer and judge it by submitted audits.
              </h2>
            </div>
            <div className="mt-8 grid gap-3">
              {TONIGHT_AD_SETUP.map((item) => (
                <div key={item} className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700" />
                  <p className="text-sm font-semibold leading-6 text-slate-800">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <LightFooter />
    </div>
  );
}
