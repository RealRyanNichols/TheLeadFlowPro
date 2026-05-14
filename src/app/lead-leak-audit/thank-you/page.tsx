import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, ClipboardCheck, PhoneCall } from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "Lead Leak Audit Received - The LeadFlow Pro",
  description:
    "Your LeadFlow Pro audit request was received. Here is what Ryan checks next and what you can review while waiting.",
  path: "/lead-leak-audit/thank-you",
  noIndex: true,
});

const NEXT = [
  "Ryan reviews the public path: website, calls, forms, DMs, proof, booking, and follow-up.",
  "The request is stored in the admin queue with your business context and source page.",
  "The goal is a plain next move: what to fix first, what is leaking, and what should not be scaled yet.",
];

export default function LeadLeakAuditThankYouPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <LightHeader activePath="/lead-leak-audit" />
      <main>
        <section className="border-b border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#eef9ff_44%,#fff7ed_100%)]">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
            <div className="inline-flex items-center gap-2 rounded-md border border-cyan-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Audit request received
            </div>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl">
              Good. Now the question is where the lead is leaking.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-700 sm:text-lg">
              Your request is in the LeadFlow Pro queue. While Ryan reviews it, use the tools below
              to make the leak clearer from your side.
            </p>
            <div className="mt-8 grid gap-3">
              {NEXT.map((item) => (
                <div key={item} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700" />
                  <p className="text-sm font-semibold leading-6 text-slate-800">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
            <NextCard
              href="/tools/ad-account-autopsy"
              Icon={BarChart3}
              title="Run the ad autopsy"
              body="If you spend on Facebook or Instagram, put in rough numbers and see whether traffic, follow-up, or sales handoff is the first leak."
              cta="Open autopsy"
            />
            <NextCard
              href="/tools/seo-grader"
              Icon={ClipboardCheck}
              title="Grade the website"
              body="Check the public page basics: title, description, headings, social sharing, structured data, content, and indexability."
              cta="Grade site"
            />
            <NextCard
              href="/book?source=lead-leak-audit"
              Icon={PhoneCall}
              title="Book 10 minutes"
              body="If the problem is urgent or you already know you want help, skip the waiting and pick a serious-buyer call."
              cta="Book call"
            />
          </div>
        </section>
      </main>
      <LightFooter />
    </div>
  );
}

function NextCard({
  href,
  Icon,
  title,
  body,
  cta,
}: {
  href: string;
  Icon: typeof BarChart3;
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-lg border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-white hover:shadow-lg"
    >
      <Icon className="h-6 w-6 text-cyan-700" />
      <h2 className="mt-4 text-lg font-bold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
      <div className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-cyan-700 group-hover:text-cyan-950">
        {cta} <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
}
