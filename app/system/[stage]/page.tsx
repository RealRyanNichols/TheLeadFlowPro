import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ExternalLink,
  Minus,
  Wrench,
} from "lucide-react";
import { STAGES, STAGE_SLUGS, getStage } from "@/lib/system-stages";
import { TOOLS } from "@/lib/tools";
import CtaLink from "@/components/site/CtaLink";

// One full page per stage of the connected-company loop. The nodes on the
// homepage diagram link here.
//
// Every page is: the leak, what we build, rent versus own where it applies,
// proof, and live interactive tools that already exist on this site. The tools
// are the "interactive" part Ryan asked for and they are real, not mock-ups.

export const revalidate = 3600;

export function generateStaticParams() {
  return STAGE_SLUGS.map((stage) => ({ stage }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stage: string }>;
}): Promise<Metadata> {
  const { stage: slug } = await params;
  const stage = getStage(slug);
  if (!stage) return {};
  const url = `https://www.theleadflowpro.com/system/${stage.slug}`;
  return {
    title: stage.title,
    description: stage.description,
    keywords: stage.keywords,
    alternates: { canonical: url },
    openGraph: {
      title: `${stage.name}: ${stage.h1Loud}`,
      description: stage.description,
      url,
      siteName: "The LeadFlow Pro",
      images: [{ url: "/og/home.png", width: 1200, height: 630 }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${stage.name}: ${stage.h1Loud}`,
      description: stage.description,
      images: ["/og/home.png"],
    },
  };
}

export default async function StagePage({
  params,
}: {
  params: Promise<{ stage: string }>;
}) {
  const { stage: slug } = await params;
  const stage = getStage(slug);
  if (!stage) notFound();

  const next = getStage(stage.next)!;
  const tools = stage.tools
    .map((s) => TOOLS.find((t) => t.slug === s))
    .filter((t): t is (typeof TOOLS)[number] => Boolean(t));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${stage.name} systems`,
    serviceType: stage.name,
    description: stage.description,
    provider: {
      "@type": "Organization",
      name: "The LeadFlow Pro",
      url: "https://www.theleadflowpro.com",
    },
    areaServed: "United States",
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: stage.buildHeading,
      itemListElement: stage.offers.map((o) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: o.name, description: o.body },
      })),
    },
  };

  return (
    <main className="cb-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* hero */}
      <section className="cb-hero">
        <div className="cb-shell">
          <p className="cb-eyebrow">
            Stage {stage.num} of 8 · {stage.short}
          </p>
          <h1 className="cb-h1">
            <em>{stage.h1Quiet}</em>
            {stage.h1Loud}
          </h1>
          <p className="cb-hero-lead">{stage.lead}</p>
          <div className="cb-actions">
            <CtaLink
              href={`/start?goal=${stage.goal}`}
              event="map_my_company"
              placement={`stage_${stage.slug}_hero`}
              className="cb-btn cb-btn--primary"
            >
              Map my company
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </CtaLink>
            <Link className="cb-btn cb-btn--ghost" href="/free-build">
              Get a free build first
            </Link>
          </div>

          {/* the loop, as a nav */}
          <nav className="cb-stagenav" aria-label="The eight stages">
            {STAGES.map((s) => (
              <Link
                key={s.slug}
                href={`/system/${s.slug}`}
                aria-current={s.slug === stage.slug ? "page" : undefined}
                className={s.slug === stage.slug ? "is-on" : undefined}
              >
                <span>{s.num}</span>
                {s.name}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      {/* the leak */}
      <section className="cb-band">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">{stage.problemHeading}</p>
              <h2 className="cb-h2 cb-heading">Find the leak before you buy the fix.</h2>
            </div>
            <p className="cb-lead">{stage.problemBody}</p>
          </div>
          <ul className="cb-leaks">
            {stage.leaks.map((l) => (
              <li key={l}>
                <Minus aria-hidden="true" className="h-4 w-4" />
                {l}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* what we build */}
      <section className="cb-band cb-band--tint">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">What we build</p>
              <h2 className="cb-h2 cb-heading">{stage.buildHeading}</h2>
            </div>
            <p className="cb-lead">{stage.buildLead}</p>
          </div>
          <div className="cb-offers">
            {stage.offers.map((o) => (
              <article key={o.name}>
                <Check aria-hidden="true" className="h-5 w-5" />
                <div>
                  <h3>{o.name}</h3>
                  <p>{o.body}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <CtaLink
              href={`/start?goal=${stage.goal}`}
              event="map_my_company"
              placement={`stage_${stage.slug}_offers`}
              className="cb-btn cb-btn--primary"
            >
              Build this for my company
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </CtaLink>
            <Link className="cb-btn cb-btn--ghost" href="/add-ons">
              See the full add-on menu
            </Link>
          </div>
        </div>
      </section>

      {/* rent vs own */}
      {stage.rentOwn && (
        <section className="cb-band cb-band--ink">
          <div className="cb-shell">
            <div className="cb-headrow">
              <div>
                <p className="cb-eyebrow">Rent or own</p>
                <h2 className="cb-h2 cb-heading">{stage.rentOwn.heading}</h2>
              </div>
              <p className="cb-lead">{stage.rentOwn.body}</p>
            </div>
            <div className="cb-rentown">
              <div className="cb-rentown-col">
                <span className="cb-vs-label">Keep renting it</span>
                <ul>
                  {stage.rentOwn.rented.map((r) => (
                    <li key={r}>
                      <Minus aria-hidden="true" className="h-4 w-4" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="cb-rentown-col cb-rentown-col--own">
                <span className="cb-vs-label">Own it once</span>
                <ul>
                  {stage.rentOwn.owned.map((r) => (
                    <li key={r}>
                      <Check aria-hidden="true" className="h-4 w-4" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* interactive tools */}
      {tools.length > 0 && (
        <section className="cb-band">
          <div className="cb-shell">
            <div className="cb-headrow">
              <div>
                <p className="cb-eyebrow">
                  <Wrench aria-hidden="true" className="h-4 w-4" />
                  Run your own numbers
                </p>
                <h2 className="cb-h2 cb-heading">
                  Free tools for this stage. No signup to use them.
                </h2>
              </div>
              <p className="cb-lead">
                Put your real figures in. If the number that comes back is uncomfortable,
                that is the leak, and it is the thing worth fixing first.
              </p>
            </div>
            <div className="cb-toolgrid">
              {tools.map((t) => (
                <Link key={t.slug} href={`/tools/${t.slug}`} className="cb-toolcard">
                  <span aria-hidden="true">{t.emoji}</span>
                  <div>
                    <h3>{t.name}</h3>
                    <p>{t.tagline}</p>
                  </div>
                  <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* proof */}
      <section className="cb-band cb-band--tint">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Proof before promise</p>
              <h2 className="cb-h2 cb-heading">Already built. Go look.</h2>
            </div>
            <p className="cb-lead">
              Live systems where this stage is running right now. Open any of them and check
              the work rather than taking our word for it.
            </p>
          </div>
          <div className="cb-proofrow">
            {stage.proof.map((p) => (
              <article key={p.name}>
                <h3>{p.name}</h3>
                <p>{p.what}</p>
                {p.url && (
                  <a className="cb-textlink" href={p.url} target="_blank" rel="noreferrer">
                    Visit it
                    <ExternalLink aria-hidden="true" className="h-4 w-4" />
                  </a>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* next stage + CTA */}
      <section className="cb-final">
        <div className="cb-shell">
          <p className="cb-eyebrow">Stage {next.num} is next</p>
          <h2 className="cb-h2">
            <em>{stage.name} feeds {next.name.toLowerCase()}.</em>
            That is the whole point.
          </h2>
          <p className="cb-lead">
            Any one stage on its own is a tool. All eight, wired together, is a company that
            runs. Start with the map and find out which stage is actually costing you money.
          </p>
          <div className="cb-actions">
            <CtaLink
              href={`/start?goal=${stage.goal}`}
              event="map_my_company"
              placement={`stage_${stage.slug}_final`}
              className="cb-btn cb-btn--primary"
            >
              Map my company
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </CtaLink>
            <Link className="cb-btn cb-btn--ghost" href={`/system/${next.slug}`}>
              Stage {next.num}: {next.name}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
