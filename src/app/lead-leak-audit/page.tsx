import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  MapPinned,
  MessageSquareText,
  PhoneCall,
  Search,
  ShieldCheck,
  Target,
} from "lucide-react";
import { OrganicAuditForm } from "@/components/site/OrganicAuditForm";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import {
  LEAD_LEAK_CHECKS,
  ORGANIC_DISTRIBUTION_PLAYS,
  ORGANIC_LANDING_PAGES,
} from "@/lib/organic-growth";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "Free Lead Leak Audit - The LeadFlow Pro",
  description:
    "Get a practical lead leak audit for your calls, forms, DMs, website, follow-up, proof, and owner-visible sales path.",
  path: "/lead-leak-audit",
  imageTitle: "Free Lead Leak Audit",
  imageSubtitle: "Find where calls, clicks, forms, and DMs are turning into lost money.",
});

const AUDIT_STEPS = [
  {
    title: "Find the traffic path",
    body: "Google, Facebook, ads, referrals, website forms, calls, and DMs all need one clean owner view.",
    Icon: Search,
  },
  {
    title: "Find the first-response leak",
    body: "Most cold leads do not wait around. The audit looks at what happens in the first minutes after interest shows up.",
    Icon: PhoneCall,
  },
  {
    title: "Find the follow-up gap",
    body: "If leads get one touch and then disappear, the business does not have a sales system. It has memory.",
    Icon: MessageSquareText,
  },
  {
    title: "Find the proof problem",
    body: "Cold buyers need proof, clarity, and a reason to trust the next click before they give you their info.",
    Icon: ShieldCheck,
  },
];

export default function LeadLeakAuditPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is a lead leak audit?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "A lead leak audit reviews where calls, forms, DMs, website visitors, ad clicks, and referrals stop turning into tracked sales conversations.",
        },
      },
      {
        "@type": "Question",
        name: "Do I need to run ads first?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. The audit is built for organic and cold traffic too. The point is to fix capture and follow-up before spending more money on traffic.",
        },
      },
      {
        "@type": "Question",
        name: "What happens after I submit?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Your request lands in the LeadFlow Pro admin queue so Ryan can review the business path and identify the clearest next move.",
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <LightHeader activePath="/lead-leak-audit" />

      <main>
        <section className="border-b border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#eef9ff_42%,#fff7ed_100%)]">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-16">
            <div className="flex flex-col justify-center">
              <div className="inline-flex w-fit items-center gap-2 rounded-md border border-cyan-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-800">
                <Target className="h-3.5 w-3.5" />
                Cold traffic starts here
              </div>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Find where your business is leaking leads before you spend another dollar on traffic.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-700 sm:text-lg">
                The LeadFlow Pro looks at the path from attention to sale: website, calls, forms,
                DMs, ads, follow-up, proof, booking, and owner visibility. The first win is knowing
                exactly where the money is falling out.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <Metric label="Audit focus" value="6 leaks" />
                <Metric label="Ad spend needed" value="$0" />
                <Metric label="Goal" value="Next move" />
              </div>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="#audit-form"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-accent-500/20 hover:bg-accent-400"
                >
                  Run my audit <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/organic-growth"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-900 hover:border-cyan-400"
                >
                  See the organic plan <MapPinned className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div id="audit-form">
              <OrganicAuditForm source="lead-leak-audit" landingPage="/lead-leak-audit" />
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                Audit sequence
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                The review starts with what a cold buyer can see and what the owner can track.
              </h2>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {AUDIT_STEPS.map((step) => (
                <div key={step.title} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                  <step.Icon className="h-6 w-6 text-cyan-700" />
                  <h3 className="mt-4 text-lg font-bold text-slate-950">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                What gets checked
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Cold traffic does not convert unless the path after the click is clean.
              </h2>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {LEAD_LEAK_CHECKS.map((check) => (
                <div key={check.title} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                  <CheckCircle2 className="h-5 w-5 text-cyan-700" />
                  <h3 className="mt-4 text-lg font-bold text-slate-950">{check.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{check.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-slate-950 text-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-16">
            <div>
              <div className="inline-flex items-center gap-2 rounded-md border border-cyan-300/35 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
                <BarChart3 className="h-3.5 w-3.5" />
                Organic distribution machine
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                The audit is not just a page. It is the reason to start conversations.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-300">
                Organic traffic needs a hook people understand fast. The lead leak audit gives
                cold outreach, local SEO, social posts, proof screenshots, and tools one shared
                destination.
              </p>
              <Link
                href="/proof"
                className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-50"
              >
                Open proof page <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-3">
              {ORGANIC_DISTRIBUTION_PLAYS.map((play) => (
                <div key={play.channel} className="rounded-lg border border-white/10 bg-white/[0.05] p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="font-bold text-white">{play.channel}</h3>
                    <span className="rounded-md border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
                      {play.cadence}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{play.action}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                Organic entry pages
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Give cold visitors a page that matches the problem in their head.
              </h2>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {ORGANIC_LANDING_PAGES.map((page) => (
                <Link
                  key={page.slug}
                  href={`/growth/${page.slug}`}
                  className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-lg"
                >
                  <ClipboardCheck className="h-5 w-5 text-cyan-700" />
                  <div className="mt-4 text-xs font-semibold uppercase tracking-widest text-cyan-700">
                    {page.eyebrow}
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-slate-950">{page.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{page.description}</p>
                  <div className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-cyan-700 group-hover:text-cyan-950">
                    Open page <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <LightFooter />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-black text-slate-950">{value}</div>
    </div>
  );
}
