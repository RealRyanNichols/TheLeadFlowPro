import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bot,
  CheckCircle2,
  DatabaseZap,
  Gauge,
  Link2,
  MessageCircle,
  PhoneCall,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import {
  getLeadFlowIndustryPage,
  industrySystemKeywordFit,
  leadFlowIndustryPages,
  type IndustryToolLink,
  type LeadFlowIndustryPage,
} from "@/lib/leadflow-industries";
import { createSeoMetadata } from "@/lib/seo-metadata";

const BASE_URL = "https://www.theleadflowpro.com";

type IndustryPageProps = {
  params: {
    slug: string;
  };
};

export const dynamicParams = false;

export function generateStaticParams() {
  return leadFlowIndustryPages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: IndustryPageProps): Promise<Metadata> {
  const page = getLeadFlowIndustryPage(params.slug);
  if (!page) return { title: "Industry Not Found | The LeadFlow Pro" };

  return createSeoMetadata({
    title: page.metaTitle,
    description: page.metaDescription,
    path: `/industries/${page.slug}`,
    image: `/industries/${page.slug}/opengraph-image`,
    imageTitle: page.title,
    imageSubtitle: page.hero,
    openGraphTitle: page.metaTitle,
    openGraphDescription: page.metaDescription,
    twitterTitle: page.metaTitle,
    twitterDescription: page.metaDescription,
  });
}

export default function IndustryPage({ params }: IndustryPageProps) {
  const page = getLeadFlowIndustryPage(params.slug);
  if (!page) notFound();

  const tools = uniqueToolLinks(page.availableTools);
  const schema = buildIndustrySchema(page);

  return (
    <>
      <Header />
      <main className="pb-24">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

        <section className="relative overflow-hidden border-b border-white/10 py-14 md:py-20">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(35,184,255,0.18),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(255,186,61,0.16),transparent_30%),linear-gradient(135deg,#030711_0%,#07101c_52%,#101108_100%)]" />
          <div className="container">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(22rem,0.7fr)] lg:items-center">
              <div>
                <Link
                  href="/industries"
                  className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-cyan-200"
                >
                  <Sparkles className="h-4 w-4" />
                  {page.eyebrow}
                </Link>
                <h1 className="mt-5 max-w-5xl text-4xl font-black leading-[0.96] text-white md:text-7xl">
                  {page.title}
                </h1>
                <p className="mt-6 max-w-3xl text-base leading-7 text-ink-100 md:text-xl">
                  {page.hero}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link href="/marketplace" className="btn-accent text-base">
                    Browse Available Signals
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/build-my-system" className="btn-ghost text-base">
                    Build My Lead Machine
                  </Link>
                  <Link href="/tools" className="btn-ghost text-base">
                    Start related tool
                  </Link>
                </div>
              </div>

              <SampleProfilePanel page={page} />
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 bg-white/[0.02] py-12 md:py-16">
          <div className="container">
            <div className="grid gap-4 lg:grid-cols-3">
              <SignalColumn title="Buyer pain" icon="pain" items={page.buyerPain} />
              <SignalColumn title="What signals matter" icon="signals" items={page.signalsMatter} />
              <article className="lead-shell p-5">
                <ShieldCheck className="h-6 w-6 text-cyan-300" />
                <h2 className="mt-4 text-2xl font-black text-white">Compliance note</h2>
                <p className="mt-3 text-sm leading-6 text-ink-200">{page.complianceNote}</p>
              </article>
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="container">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.52fr)_minmax(0,1fr)] lg:items-start">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-accent-300">
                  Available tools
                </p>
                <h2 className="mt-3 text-3xl font-black leading-tight text-white md:text-5xl">
                  Tools that solve a problem and collect cleaner signal.
                </h2>
                <p className="mt-4 text-sm leading-6 text-ink-200">
                  {industrySystemKeywordFit()}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {tools.map((tool, index) => (
                  <Link key={`${tool.label}-${tool.href}-${index}`} href={tool.href} className="lead-panel group p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
                        <Bot className="h-5 w-5" />
                      </div>
                      <ArrowRight className="h-5 w-5 text-ink-500 transition group-hover:translate-x-1 group-hover:text-accent-300" />
                    </div>
                    <h3 className="mt-5 text-xl font-black text-white">{tool.label}</h3>
                    <p className="mt-3 text-sm leading-6 text-ink-200">{tool.fit}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-[#050813] py-14 md:py-20">
          <div className="container">
            <div className="grid gap-4 lg:grid-cols-2">
              <CtaPanel
                eyebrow="Buy signals"
                title={page.marketplaceAngle}
                body="Search reviewed lead signal products by industry, source type, confidence, freshness, price range, release mode, and compliance status."
                href="/marketplace"
                label="Open marketplace"
                accent="accent"
              />
              <CtaPanel
                eyebrow="Build system"
                title={page.buildSystemAngle}
                body="Build the website funnel, AI receptionist, AI chatbot, AI agent path, CRM automation, appointment booking, follow-up, dashboards, and reporting."
                href="/build-my-system"
                label="Build my system"
                accent="cyan"
              />
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="container">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.45fr)_minmax(0,1fr)]">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">
                  FAQ
                </p>
                <h2 className="mt-3 text-3xl font-black leading-tight text-white md:text-5xl">
                  Questions buyers ask before they move.
                </h2>
                <div className="mt-6 flex flex-wrap gap-2">
                  {page.primaryKeywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-lg border border-white/10 bg-white/[0.045] px-2.5 py-1.5 text-xs font-extrabold text-ink-100"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid gap-4">
                {page.faq.map((item) => (
                  <details key={item.question} className="lead-shell group p-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-xl font-black text-white">
                      <span>{item.question}</span>
                      <ArrowRight className="h-5 w-5 shrink-0 rotate-90 text-ink-500 transition group-open:-rotate-90 group-open:text-accent-300" />
                    </summary>
                    <p className="mt-3 text-sm leading-6 text-ink-200">{item.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 bg-white/[0.02] py-12">
          <div className="container">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">
                  Internal paths
                </p>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-200">
                  Keep moving through the lead flow: compare source-backed leads, run the tools,
                  inspect the profile model, review buyer paths, or build the capture system.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Link href="/buy-leads" className="btn-ghost justify-center text-sm">
                  Buy Leads
                </Link>
                <Link href="/tools" className="btn-ghost justify-center text-sm">
                  Tools
                </Link>
                <Link href="/marketplace" className="btn-ghost justify-center text-sm">
                  Marketplace
                </Link>
                <Link href="/profile-model" className="btn-ghost justify-center text-sm">
                  Profile model
                </Link>
                <Link href="/privacy-center" className="btn-ghost justify-center text-sm">
                  Privacy center
                </Link>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {page.relatedSlugs.map((slug) => {
                const related = getLeadFlowIndustryPage(slug);
                if (!related) return null;
                return (
                  <Link
                    key={slug}
                    href={`/industries/${slug}`}
                    className="rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-extrabold text-ink-100 transition hover:border-cyan-300/35 hover:text-cyan-100"
                  >
                    {related.shortTitle}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function SampleProfilePanel({ page }: { page: LeadFlowIndustryPage }) {
  const profile = page.sampleProfile;
  return (
    <aside className="lead-shell p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">
            Sample lead profile
          </p>
          <h2 className="mt-2 text-2xl font-black leading-tight text-white">{profile.title}</h2>
        </div>
        <div className="min-w-[4.75rem] rounded-lg border border-lead-300/30 bg-lead-300/10 px-3 py-2 text-center">
          <p className="whitespace-nowrap text-[9px] font-extrabold uppercase tracking-wider text-lead-200">Score</p>
          <p className="whitespace-nowrap text-3xl font-black leading-none text-white">{profile.score}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3">
        <ProfileFact label="Category" value={profile.category} />
        <ProfileFact label="Confidence" value={profile.confidence} />
        <ProfileFact label="Source type" value={profile.sourceType} />
        <ProfileFact label="Best buyer" value={profile.bestBuyer} />
        <ProfileFact label="Buyer use case" value={profile.buyerUseCase} />
        <ProfileFact label="Proof" value={profile.proof} />
        <ProfileFact label="Recommended next action" value={profile.nextAction} />
      </div>
      <Link href="/profile-model" className="btn-ghost mt-5 w-full justify-center text-sm">
        See profile model
      </Link>
    </aside>
  );
}

function ProfileFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-1 text-sm leading-6 text-ink-100">{value}</p>
    </div>
  );
}

function SignalColumn({ title, icon, items }: { title: string; icon: "pain" | "signals"; items: string[] }) {
  const Icon = icon === "pain" ? MessageCircle : DatabaseZap;
  return (
    <article className="lead-shell p-5">
      <Icon className="h-6 w-6 text-accent-300" />
      <h2 className="mt-4 text-2xl font-black text-white">{title}</h2>
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <div key={item} className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3">
            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-lead-300" />
            <p className="text-sm leading-6 text-ink-100">{item}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function CtaPanel({
  eyebrow,
  title,
  body,
  href,
  label,
  accent,
}: {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  label: string;
  accent: "accent" | "cyan";
}) {
  return (
    <article className="lead-shell p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={accent === "accent" ? "text-xs font-extrabold uppercase tracking-wider text-accent-300" : "text-xs font-extrabold uppercase tracking-wider text-cyan-300"}>
            {eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-white">{title}</h2>
        </div>
        {accent === "accent" ? <BarChart3 className="h-7 w-7 shrink-0 text-accent-300" /> : <PhoneCall className="h-7 w-7 shrink-0 text-cyan-300" />}
      </div>
      <p className="mt-4 text-sm leading-6 text-ink-200">{body}</p>
      <Link href={href} className={accent === "accent" ? "btn-accent mt-6 w-full justify-center text-sm sm:w-auto" : "btn-ghost mt-6 w-full justify-center text-sm sm:w-auto"}>
        {label}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}

function buildIndustrySchema(page: LeadFlowIndustryPage) {
  const url = `${BASE_URL}/industries/${page.slug}`;
  const tools = uniqueToolLinks(page.availableTools);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: page.metaTitle,
        description: page.metaDescription,
        inLanguage: "en-US",
        isPartOf: {
          "@type": "WebSite",
          name: "The LeadFlow Pro",
          url: BASE_URL,
        },
        about: page.primaryKeywords,
      },
      {
        "@type": "Service",
        "@id": `${url}#service`,
        name: page.title,
        serviceType: "Lead generation, lead scoring, buyer signal marketplace, and business automation",
        provider: {
          "@type": "Organization",
          name: "The LeadFlow Pro",
          url: BASE_URL,
        },
        areaServed: "United States",
        description: page.hero,
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: `${page.shortTitle} LeadFlow offers`,
          itemListElement: [
            {
              "@type": "Offer",
              name: "Buy lead signals",
              itemOffered: {
                "@type": "Service",
                name: page.marketplaceAngle,
              },
              url: `${BASE_URL}/marketplace`,
            },
            {
              "@type": "Offer",
              name: "Build my lead machine",
              itemOffered: {
                "@type": "Service",
                name: page.buildSystemAngle,
              },
              url: `${BASE_URL}/build-my-system`,
            },
          ],
        },
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: page.faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
      {
        "@type": "ItemList",
        "@id": `${url}#tools`,
        name: `${page.shortTitle} LeadFlow tools`,
        itemListElement: tools.map((tool, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: tool.label,
          url: `${BASE_URL}${tool.href}`,
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Industries", item: `${BASE_URL}/industries` },
          { "@type": "ListItem", position: 3, name: page.shortTitle, item: url },
        ],
      },
    ],
  };
}

function uniqueToolLinks(tools: IndustryToolLink[]) {
  const seen = new Set<string>();
  return tools.filter((tool) => {
    const key = `${tool.label}-${tool.href}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
