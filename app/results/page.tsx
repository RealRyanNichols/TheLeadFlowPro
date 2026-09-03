import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, ExternalLink, Eye, ShieldCheck, Users } from "lucide-react";
import CtaLink from "@/components/site/CtaLink";
import { FEATURED, PHONE_DISPLAY, PHONE_TEL, PROOF, RECEIPTS } from "@/lib/siteContent";

// The Results page. The proof that used to sit deep in the homepage scroll:
// the shipped numbers, the three featured live systems, and the operator's
// receipts. Everything here is publicly inspectable right now.

const SITE = "https://www.theleadflowpro.com";

export const metadata: Metadata = {
  title: "Results | The LeadFlow Pro",
  description:
    "Eight live systems you can open and inspect right now: client websites, enrollment engines, a media archive, and working software, all built in accounts the owners control.",
  alternates: { canonical: `${SITE}/results` },
  openGraph: {
    title: "Results | The LeadFlow Pro",
    description:
      "Live systems you can open and inspect right now, built in accounts the owners control.",
    url: `${SITE}/results`,
    siteName: "The LeadFlow Pro",
    images: [{ url: "/og/home.png", width: 1200, height: 630 }],
    type: "website",
  },
};

export default function ResultsPage() {
  return (
    <main className="cb-page cb-home-dark">
      {/* ------------------------------------------------------------ intro */}
      <section className="cb-subhero">
        <div className="cb-shell">
          <p className="cb-eyebrow">Results</p>
          <h1 className="cb-h1">Open the work. Check it yourself.</h1>
          <p className="cb-lead">
            No mockups and no concept cards. These are live systems running for real
            businesses right now. Open any of them in a new tab, use them on your phone,
            and judge the work directly.
          </p>
          <div className="cb-actions">
            <Link className="cb-btn cb-btn--primary" href="/free-build">
              Start My Free Website
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link className="cb-btn cb-btn--ghost" href="/portfolio">
              See all 7 live systems
            </Link>
          </div>
          <div className="cb-subhero-who" aria-label="What this page shows">
            <span>
              <Eye aria-hidden="true" className="h-4 w-4" /> Every system is publicly
              inspectable
            </span>
            <span>
              <Users aria-hidden="true" className="h-4 w-4" /> Client builds and founder
              builds, labeled
            </span>
            <span>
              <ShieldCheck aria-hidden="true" className="h-4 w-4" /> No revenue or ROI
              claims, just the work
            </span>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- shipped proof */}
      <section className="cb-band cb-band--tint">
        <div className="cb-shell">
          <div className="cb-proof-cockpit" aria-label="Proof points">
            <div className="cb-proof-cockpit__art">
              <Image
                src="/images/homepage-v2/proof-cockpit.webp"
                alt="Five precision instruments representing shipped systems, industries, tools, products, and client ownership"
                width={1920}
                height={1080}
                sizes="(max-width: 900px) 100vw, 52vw"
              />
              <span>Live build telemetry</span>
            </div>
            <div className="cb-proof-cockpit__ledger">
              <p className="cb-eyebrow">Built, shipped, running</p>
              <h2 className="cb-h2">Proof before promises.</h2>
              <div className="cb-proof-grid">
                {PROOF.map((p) => (
                  <div key={p.label} className="cb-proof-item">
                    <strong>{p.figure}</strong>
                    <span>{p.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- live work */}
      <section className="cb-band">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Proof before promise</p>
              <h2 className="cb-h2 cb-heading">
                Three of the systems. All of them are live right now.
              </h2>
            </div>
            <p className="cb-lead">
              Client systems and Ryan&rsquo;s own products are labeled as what they are.
              Open any of them in a new tab and check the work yourself.
            </p>
          </div>

          <div className="cb-cases">
            {FEATURED.map((c, i) => (
              <article key={c.name} className={`cb-case${i % 2 === 1 ? " cb-case--flip" : ""}`}>
                {/* Not a link: the named link below already goes to the live
                    site, and a second unlabeled link to the same place is noise
                    for anyone navigating by keyboard or screen reader. */}
                <div className="cb-case-shot">
                  <Image
                    src={c.shot}
                    alt={c.alt}
                    width={1200}
                    height={630}
                    sizes="(max-width: 900px) 100vw, 55vw"
                    priority={i === 0}
                  />
                </div>
                <div>
                  <span className={`cb-case-kind cb-case-kind--${c.kind}`}>{c.kindLabel}</span>
                  <h3>{c.name}</h3>
                  <p className="cb-case-what">{c.what}</p>

                  <dl className="cb-case-block">
                    <dt>The problem</dt>
                    <dd>{c.problem}</dd>
                  </dl>
                  <dl className="cb-case-block">
                    <dt>What Ryan built</dt>
                    <dd>{c.built}</dd>
                  </dl>

                  <ul className="cb-case-facts">
                    {c.facts.map((f) => (
                      <li key={f.l}>
                        <strong>{f.v}</strong>
                        <span>{f.l}</span>
                      </li>
                    ))}
                  </ul>

                  <dl className="cb-case-block">
                    <dt>What it changed</dt>
                    <dd>{c.outcome}</dd>
                  </dl>

                  <div className="cb-case-foot">
                    <a className="cb-textlink" href={c.href} target="_blank" rel="noreferrer">
                      Visit {c.name}
                      <ExternalLink aria-hidden="true" className="h-4 w-4" />
                    </a>
                    <span className="cb-case-stack">{c.stack}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-14 flex flex-wrap justify-center gap-4">
            <Link className="cb-btn cb-btn--ghost" href="/portfolio">
              See all 7 live systems
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link className="cb-btn cb-btn--ghost" href="/scoreboard">
              Open the Scoreboard
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link className="cb-btn cb-btn--ghost" href="/proof-floor">
              Open the Proof Floor
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- operator */}
      <section className="cb-band cb-band--ink">
        <div className="cb-shell">
          <div className="cb-operator">
            <div className="cb-operator-shot">
              <Image
                src="/images/ryan-wholesale-universe-owner.jpg"
                alt="Ryan Nichols standing on top of shrink-wrapped pallets in his wholesale warehouse, arms out, beside a large American flag"
                width={1800}
                height={1350}
                sizes="(max-width: 900px) 100vw, 40vw"
              />
            </div>
            <div>
              <p className="cb-eyebrow">The operator</p>
              <h2 className="cb-h2 cb-heading--wide">
                Built by someone who has run the business, not just the website.
              </h2>
              <p className="cb-lead">
                Ryan Nichols builds these systems because he needed them first. The receipts
                are companies, offers, audiences, inventory, fulfillment, sales processes,
                and software, all built under real pressure.
              </p>

              <ul className="cb-receipts">
                {RECEIPTS.map((r) => (
                  <li key={r.head}>
                    <BadgeCheck aria-hidden="true" className="h-5 w-5" />
                    <span>
                      <strong>{r.head}</strong> {r.body}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="cb-pullquote">
                &ldquo;I have already built what you are trying to build. Now let&rsquo;s
                build yours.&rdquo;
              </p>

              <div className="cb-actions">
                <Link className="cb-btn cb-btn--ghost" href="/about">
                  More about Ryan
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- final CTA */}
      <section className="cb-final">
        <div className="cb-shell">
          <p className="cb-eyebrow">Your next move</p>
          <h2 className="cb-h2">
            <em>You have seen the work.</em>
            Now get yours built.
          </h2>
          <p className="cb-lead">
            Apply for the $0 five-page foundation, or call and ask about any system on this
            page. You talk to the person who built them.
          </p>
          <div className="cb-actions">
            <CtaLink
              href="/free-build"
              event="apply_free_website"
              placement="results_final"
              className="cb-btn cb-btn--primary"
            >
              Start My Free Website
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </CtaLink>
            <a className="cb-btn cb-btn--ghost" href={PHONE_TEL}>
              Call or text {PHONE_DISPLAY}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
