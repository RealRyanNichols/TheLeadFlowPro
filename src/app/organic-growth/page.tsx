import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  Link2,
  MapPinned,
  MessageSquareText,
  RadioTower,
  Search,
  Share2,
} from "lucide-react";
import { OrganicAuditForm } from "@/components/site/OrganicAuditForm";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import {
  ORGANIC_DISTRIBUTION_PLAYS,
  ORGANIC_LANDING_PAGES,
  PROOF_ASSETS,
} from "@/lib/organic-growth";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "Organic Growth Plan - The LeadFlow Pro",
  description:
    "The LeadFlow Pro organic growth plan: lead leak audits, local pages, cold outreach, proof assets, free tools, and backend follow-up.",
  path: "/organic-growth",
  imageTitle: "Organic Growth Plan",
  imageSubtitle: "Cold traffic without ads needs a sharper offer, proof, and follow-up loop.",
});

const SYSTEM = [
  {
    title: "Specific pages",
    body: "Each cold visitor needs a page matching the problem they already understand: missed calls, follow-up, contractors, Meta ads, local business, or website conversion.",
    Icon: Search,
  },
  {
    title: "Useful audit hook",
    body: "The free lead leak audit gives Ryan a reason to contact businesses without begging for attention.",
    Icon: ClipboardCheck,
  },
  {
    title: "Proof assets",
    body: "Before/after work, dashboards, tools, and clear case-style explanations do more than generic claims.",
    Icon: RadioTower,
  },
  {
    title: "Follow-up backend",
    body: "Every audit request has to land in the admin queue with source, page, problem, and next action visible.",
    Icon: MessageSquareText,
  },
];

const BACKLINK_ASSETS = [
  "Client proof pages that can link back after a build ships",
  "Shareable lead leak reports owners can forward internally",
  "Local business resources for East Texas owners",
  "Tool pages people can cite: SEO grader and ad account autopsy",
  "YouTube descriptions and social profiles pointing to the audit",
  "Google Business Profile posts that point at the same offer",
];

export default function OrganicGrowthPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <LightHeader activePath="/organic-growth" />

      <main>
        <section className="border-b border-slate-200 bg-slate-950 text-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-16">
            <div className="flex flex-col justify-center">
              <div className="inline-flex w-fit items-center gap-2 rounded-md border border-cyan-300/35 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
                <Compass className="h-3.5 w-3.5" />
                No-ads growth map
              </div>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Cold traffic converts when the offer, proof, page, and follow-up all point to one move.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                The LeadFlow Pro should be found through pain-specific pages, local intent, useful
                tools, proof posts, and outbound audits. Not spam links. Not keyword stuffing. Not
                waiting months for Google to guess what the business does.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/lead-leak-audit"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent-500 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-accent-400"
                >
                  Start with audit funnel <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/proof"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white hover:bg-white/15"
                >
                  See proof assets <Share2 className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {SYSTEM.map((item) => (
                <div key={item.title} className="rounded-lg border border-white/10 bg-white/[0.05] p-5">
                  <item.Icon className="h-6 w-6 text-cyan-200" />
                  <h2 className="mt-4 text-lg font-bold text-white">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                Organic pages now in the site
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                One broad homepage cannot carry every cold buyer.
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-700">
                These pages give Google, social posts, cold outreach, and referral links cleaner
                destinations. Each one points back to the same audit funnel.
              </p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {ORGANIC_LANDING_PAGES.map((page) => (
                <Link
                  key={page.slug}
                  href={`/growth/${page.slug}`}
                  className="group rounded-lg border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-white hover:shadow-lg"
                >
                  <MapPinned className="h-5 w-5 text-cyan-700" />
                  <div className="mt-4 text-xs font-semibold uppercase tracking-widest text-cyan-700">
                    {page.eyebrow}
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-slate-950">{page.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{page.description}</p>
                  <div className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-cyan-700 group-hover:text-cyan-950">
                    Open landing page <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8 lg:py-16">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                Distribution rhythm
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Do this every week until the market knows what LeadFlow Pro fixes.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-700">
                The site should create reasons for outreach, posts, links, referrals, and follow-up.
                This is the organic engine.
              </p>
            </div>
            <div className="grid gap-3">
              {ORGANIC_DISTRIBUTION_PLAYS.map((play) => (
                <div key={play.channel} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="font-bold text-slate-950">{play.channel}</h3>
                    <span className="rounded-md border border-cyan-200 bg-cyan-50 px-2 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-800">
                      {play.cadence}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{play.action}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-16">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                Backlinks without tricks
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Earn links by giving people something useful to link to.
              </h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {BACKLINK_ASSETS.map((asset) => (
                  <div key={asset} className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" />
                    <p className="text-sm font-semibold leading-6 text-slate-800">{asset}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <OrganicAuditForm
                source="organic-growth"
                landingPage="/organic-growth"
                industry="Local business"
                compact
                ctaLabel="Check my business"
              />
            </div>
          </div>
        </section>

        <section className="bg-slate-950 text-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-100">
                Proof inventory
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                These are the assets that should get posted, linked, and reused.
              </h2>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {PROOF_ASSETS.map((asset) => (
                <div key={asset.label} className="rounded-lg border border-white/10 bg-white/[0.05] p-5">
                  <CheckCircle2 className="h-5 w-5 text-cyan-200" />
                  <div className="mt-4 text-xs font-semibold uppercase tracking-widest text-cyan-100">
                    {asset.label}
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-white">{asset.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{asset.body}</p>
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
