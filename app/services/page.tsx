import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Boxes, Check, Layers, Minus, ShieldCheck, Users, Wrench } from "lucide-react";
import CompanyLoop from "@/components/site/CompanyLoop";
import CapabilityExplorer from "@/components/site/CapabilityExplorer";
import CtaLink from "@/components/site/CtaLink";
import { FREE_BUILD } from "@/lib/freeBuild";
import {
  COMPANY_BUILDER,
  LADDER,
  PHONE_DISPLAY,
  PHONE_TEL,
  STEPS,
  WEBSITE_BUILDER,
} from "@/lib/siteContent";

// The Services page. Everything that used to live in the middle of the
// homepage scroll: what gets built, how it compares to a website builder, the
// process, the training platform, and the packages. Moved here so the homepage
// can do one job: qualify the visitor and point them at the free website.

const SITE = "https://www.theleadflowpro.com";

export const metadata: Metadata = {
  title: "Services | The LeadFlow Pro",
  description:
    "Websites, lead capture, CRM, follow-up, payments, portals, and analytics, built in accounts you control. See what The LeadFlow Pro builds and what it costs.",
  alternates: { canonical: `${SITE}/services` },
  openGraph: {
    title: "Services | The LeadFlow Pro",
    description:
      "The website, the system behind it, and the back office that runs it, built in accounts you control.",
    url: `${SITE}/services`,
    siteName: "The LeadFlow Pro",
    images: [{ url: "/og/home.png", width: 1200, height: 630 }],
    type: "website",
  },
};

const FREE_WEBSITE_STEPS = FREE_BUILD.steps.slice(0, 3);

export default function ServicesPage() {
  return (
    <main className="cb-page cb-home-dark">
      {/* ------------------------------------------------------------ intro */}
      <section className="cb-subhero">
        <div className="cb-shell">
          <p className="cb-eyebrow">Services</p>
          <h1 className="cb-h1">We build the website and the system behind it.</h1>
          <p className="cb-lead">
            Websites, lead capture, follow-up, CRM, payments, portals, and analytics,
            connected and installed in accounts you control. Start with the free five-page
            website, then add only what your business actually needs.
          </p>
          <div className="cb-actions">
            <Link className="cb-btn cb-btn--primary" href="/free-build">
              Start My Free Website
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <a className="cb-btn cb-btn--ghost" href={PHONE_TEL}>
              Call or text {PHONE_DISPLAY}
            </a>
          </div>
          <div className="cb-subhero-who" aria-label="Who this is for">
            <span>
              <Users aria-hidden="true" className="h-4 w-4" /> For business owners, operators,
              and sales teams
            </span>
            <span>
              <Wrench aria-hidden="true" className="h-4 w-4" /> Built by one operator, in your
              accounts
            </span>
            <span>
              <ShieldCheck aria-hidden="true" className="h-4 w-4" /> You keep the code, data,
              and leads
            </span>
          </div>
        </div>
      </section>

      {/* ------------------------------------------- website builder vs us */}
      <section className="cb-band">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">The difference</p>
              <h2 className="cb-h2 cb-heading">
                Your website should run your business. Not just sit there.
              </h2>
            </div>
            <p className="cb-lead">
              A website builder gives you pages. We build the connected company those pages
              are supposed to power. Same front door. Completely different building behind
              it.
            </p>
          </div>

          <div className="cb-vs">
            <div className="cb-vs-col cb-vs-col--them">
              <span className="cb-vs-label">A website builder delivers</span>
              <h3>Pages.</h3>
              <ul className="cb-vs-list">
                {WEBSITE_BUILDER.map((item) => (
                  <li key={item}>
                    <Minus aria-hidden="true" className="h-4 w-4" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="cb-vs-foot">
                Then the work of actually running the company starts, and none of it is
                connected to the site you just paid for.
              </p>
            </div>

            <div className="cb-vs-mid" aria-hidden="true">
              <span>vs</span>
            </div>

            <div className="cb-vs-col cb-vs-col--us">
              <span className="cb-vs-label">The Company Builder delivers</span>
              <h3>The company.</h3>
              <ul className="cb-vs-list">
                {COMPANY_BUILDER.map((item) => (
                  <li key={item}>
                    <Check aria-hidden="true" className="h-4 w-4" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="cb-vs-foot">
                One system. One set of data. One place where a customer moves from stranger
                to paid to delivered to measured.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- four parts */}
      <section id="what-we-build" className="cb-band cb-band--tint" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">What we build</p>
              <h2 className="cb-h2 cb-heading">A connected company has four parts.</h2>
            </div>
            <p className="cb-lead">
              Start with a station, then open any module. Every choice shows a visual
              walkthrough, a real system example, the plain-English meaning, current market
              references, and a full indexed guide you can keep exploring.
            </p>
          </div>

          <CapabilityExplorer />
        </div>
      </section>

      {/* ------------------------------------------ connected lead system */}
      <section className="cb-band cb-band--visual" aria-labelledby="connected-system-title">
        <div className="cb-shell">
          <div className="cb-visual-intro">
            <div>
              <p className="cb-eyebrow">The connected lead system</p>
              <h2 id="connected-system-title" className="cb-h2 cb-heading--wide">
                Every signal becomes one customer story.
              </h2>
            </div>
            <p className="cb-lead">
              A call should not live in one app while a text, social message, and website
              form live in three more. We connect the doors, preserve the history, and give
              the next person one clear action.
            </p>
          </div>

          <div className="cb-visual-ledger">
            <article className="cb-visual-scene cb-visual-scene--record">
              <div className="cb-visual-art">
                <Image
                  src="/images/visual-system/one-customer-one-record.webp"
                  alt="Phone calls, text messages, social direct messages, and website forms flowing into one customer record"
                  width={1254}
                  height={1254}
                  sizes="(max-width: 900px) 100vw, 58vw"
                />
              </div>
              <div className="cb-visual-copy">
                <span className="cb-visual-index">01</span>
                <p className="cb-visual-kicker">Unify the signal</p>
                <h3>One customer. One record.</h3>
                <p>
                  The conversation history follows the person, not the channel. Your team
                  sees what happened, what matters, and what needs to happen next.
                </p>
                <ul className="cb-visual-points">
                  <li>Calls, texts, DMs, and forms connected</li>
                  <li>Source and consent preserved</li>
                  <li>One accountable owner for the next move</li>
                </ul>
              </div>
            </article>

            <article className="cb-visual-scene cb-visual-scene--reverse cb-visual-scene--followup">
              <div className="cb-visual-art">
                <Image
                  src="/images/visual-system/automate-the-reminder.webp"
                  alt="Quote sent, follow up, and owner review shown as a connected workflow"
                  width={1254}
                  height={1254}
                  sizes="(max-width: 900px) 100vw, 58vw"
                />
              </div>
              <div className="cb-visual-copy">
                <span className="cb-visual-index">02</span>
                <p className="cb-visual-kicker">Run the follow up</p>
                <h3>Automate the reminder. Keep the owner.</h3>
                <p>
                  Automation should keep promises, not make decisions nobody can explain.
                  The system remembers the timing and brings the judgment call back to the
                  owner.
                </p>
                <ul className="cb-visual-points">
                  <li>Immediate acknowledgement</li>
                  <li>Timed quote and appointment reminders</li>
                  <li>Human review before the important move</li>
                </ul>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ------------------------------------------- source attribution */}
      <section className="cb-band cb-band--attribution" aria-labelledby="trace-sale-title">
        <div className="cb-shell">
          <div className="cb-attribution-grid">
            <div className="cb-attribution-art">
              <Image
                src="/images/visual-system/trace-the-sale.webp"
                alt="A connected path from a social post to a click, website form, customer record, and sale"
                width={1254}
                height={1254}
                sizes="(max-width: 900px) 100vw, 52vw"
              />
            </div>
            <div className="cb-attribution-copy">
              <p className="cb-eyebrow">First party attribution</p>
              <h2 id="trace-sale-title" className="cb-h2 cb-heading--wide">
                Can you trace the sale?
              </h2>
              <p className="cb-lead">
                A dashboard full of views is not proof. The useful chain is the post, the
                click, the form, the customer, and the sale. We build the path so the next
                budget decision is based on evidence.
              </p>
              <dl className="cb-trace-ledger">
                <div>
                  <dt>Source</dt>
                  <dd>The post, ad, search, referral, or page that created attention.</dd>
                </div>
                <div>
                  <dt>Action</dt>
                  <dd>The click, call, text, booking, form, or payment that followed.</dd>
                </div>
                <div>
                  <dt>Outcome</dt>
                  <dd>The customer record and closed result tied back to the beginning.</dd>
                </div>
              </dl>
              <Link className="cb-btn cb-btn--primary" href="/live">
                See the live proof system
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------- the operating loop */}
      <section className="cb-band cb-band--operations" aria-label="Connected company operating system">
        <div className="cb-shell">
          <CompanyLoop />
        </div>
      </section>

      {/* ---------------------------------------------------------- process */}
      <section id="how-it-works" className="cb-band cb-band--ink" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">How it works</p>
              <h2 className="cb-h2 cb-heading">How Ryan builds a company.</h2>
            </div>
            <p className="cb-lead">
              The same five moves every time, whether it is a one-truck service business or a
              software product. Nothing gets built before the map is approved.
            </p>
          </div>

          <ol className="cb-steps">
            {STEPS.map((s, i) => (
              <li key={s.num} className={`cb-step${i === 0 ? " cb-step--done" : ""}`}>
                <span className="cb-step-num">{s.num}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* --------------------------------------------- operator academy */}
      <section className="cb-band cb-band--academy" aria-labelledby="academy-title">
        <div className="cb-shell">
          <div className="cb-academy-grid">
            <div className="cb-academy-copy">
              <p className="cb-eyebrow">LeadFlow Operator Academy</p>
              <h2 id="academy-title" className="cb-h2 cb-heading--wide">
                The course is not the system.
              </h2>
              <p className="cb-lead">
                A video library is content. A training platform connects interest,
                application, payment, access, progress, resources, and the next lesson into
                one owned experience.
              </p>
              <div className="cb-academy-proof">
                <span>Public catalog</span>
                <span>Member access</span>
                <span>Progress tracking</span>
                <span>Daily module publishing</span>
              </div>
              <div className="cb-actions">
                <Link className="cb-btn cb-btn--primary" href="/training">
                  Preview the training platform
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
                <Link className="cb-btn cb-btn--ghost" href="/packages">
                  See the platform packages
                </Link>
              </div>
            </div>
            <div className="cb-academy-art">
              <Image
                src="/images/visual-system/course-system-blueprint.webp"
                alt="Blueprint showing interest, application, payment, and student portal as one connected training system"
                width={1254}
                height={1254}
                sizes="(max-width: 900px) 100vw, 52vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- packages */}
      <section id="packages" className="cb-band cb-band--tint" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Engagement</p>
              <h2 className="cb-h2 cb-heading">Start with the right first release.</h2>
            </div>
            <p className="cb-lead">
              A mortgage company, a dental academy, and a fleet washing crew should not get
              the same canned package. Website Launch has a fixed scope and price. Larger
              operating systems are mapped around what the business actually needs.
            </p>
          </div>

          <div className="cb-ladder">
            {LADDER.map((r) => (
              <article key={r.name} className={`cb-rung${r.lead ? " cb-rung--lead" : ""}`}>
                {r.lead ? <span className="cb-rung-flag">The first move</span> : null}
                <span className="cb-rung-kind">{r.kind}</span>
                <h3>{r.name}</h3>
                <p className="cb-rung-price">{r.price}</p>
                <p>{r.body}</p>
                <ul>
                  {r.items.map((i) => (
                    <li key={i}>
                      <Check aria-hidden="true" className="h-4 w-4" />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  className={`cb-btn ${r.lead ? "cb-btn--primary" : "cb-btn--ghost"}`}
                  href={r.href}
                >
                  {r.cta}
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>

          <div className="cb-custom">
            <div>
              <p className="cb-eyebrow">
                <Boxes aria-hidden="true" className="h-4 w-4" />
                Larger than a package
              </p>
              <h3>Custom Platform</h3>
              <p>
                Multi-location operations, software products, complex migrations, tenant
                systems, advanced permissions, and deeper AI connectors are scoped from
                $15,000+. A System Map comes first when the dependencies are complex.
              </p>
            </div>
            <Link className="cb-btn cb-btn--ghost" href="/start?goal=custom">
              Map the bigger idea
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------ Free Website Program */}
      <section className="cb-band cb-band--ink cb-freebuild">
        <div className="cb-shell">
          <div className="cb-freebuild-grid">
            <div>
              <p className="cb-eyebrow">
                <Layers aria-hidden="true" className="h-4 w-4" />
                The Free Website Program
              </p>
              <h2 className="cb-h2 cb-heading">
                Own your website. Your first five-page build is $0.
              </h2>
              <p className="cb-lead">
                Apply for one of ten monthly openings. The build fee is genuinely free for
                approved businesses, with no required add-on. Your code, domain, accounts,
                analytics, customer records, and leads stay under your control.
              </p>
              <div className="cb-actions">
                <Link
                  href="/free-build"
                  data-analytics="cta-free-website-services"
                  className="cb-btn cb-btn--primary"
                >
                  Start My Free Website
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
                <Link className="cb-btn cb-btn--ghost" href="/packages">
                  See optional growth services
                </Link>
              </div>
              <p className="mt-3 max-w-[64ch] text-[15px] leading-6 text-[#aebdd3]">
                Domain registration, paid hosting after the included 90 days, ad spend,
                software subscriptions, extra pages, CRM, automation, content, video, and
                ongoing marketing are separate and quoted before you approve them.
              </p>
            </div>
            <ol className="cb-freebuild-steps">
              {FREE_WEBSITE_STEPS.map((s) => (
                <li key={s.name}>
                  <span className="cb-freebuild-num">{s.number}</span>
                  <div>
                    <strong>{s.name}</strong>
                    <span>{s.body}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- final CTA */}
      <section className="cb-final">
        <div className="cb-shell">
          <p className="cb-eyebrow">Your next move</p>
          <h2 className="cb-h2">
            <em>Start with the free website.</em>
            Add the system when you are ready.
          </h2>
          <p className="cb-lead">
            Apply for the $0 five-page foundation. If you want ads, daily follow-up,
            content, CRM, automation, video, or a complete operating system after that,
            we scope it separately and you decide what comes next.
          </p>
          <div className="cb-actions">
            <CtaLink
              href="/free-build"
              event="apply_free_website"
              placement="services_final"
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
