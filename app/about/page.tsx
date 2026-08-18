import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, ShieldCheck } from "lucide-react";
import CtaLink from "@/components/site/CtaLink";
import { ARTICLES } from "@/lib/articles";
import { TOOL_COUNT } from "@/lib/tools";

// About Ryan. Operator proof, grounded in receipts, kept short on purpose. This
// is not an autobiography: it exists to answer one question, which is whether
// the person building the system has ever had to run one.
//
// Everything here is either visible in this repository or on a live property.
// No revenue, client, or outcome numbers are claimed.

export const metadata: Metadata = {
  title: "About Ryan Nichols | The LeadFlow Pro",
  description:
    "The operator behind The LeadFlow Pro. Companies, offers, audiences, ecommerce operations, fulfillment, sales processes, websites, and software, all built under real pressure.",
  alternates: { canonical: "https://www.theleadflowpro.com/about" },
  openGraph: {
    title: "I have already built what you are trying to build.",
    description: `The operator behind The LeadFlow Pro: 8 live systems across 6 industries, ${TOOL_COUNT} published tools, and real software products.`,
    url: "https://www.theleadflowpro.com/about",
    siteName: "The LeadFlow Pro",
    images: [{ url: "/og/home.png", width: 1200, height: 630 }],
    type: "profile",
  },
};

const CHAPTERS = [
  {
    kicker: "Before the software",
    title: "He ran the operation first.",
    body: "Wholesale and ecommerce: sourcing loads, moving pallets, holding inventory, packing orders, and running the sales process behind all of it. Nothing about that job is theoretical. When a system failed, the cost was payroll and product sitting in a warehouse, not a missed sprint.",
    image: "/images/ryan-wholesale-universe-2015-pallets.jpg",
    alt: "Shrink-wrapped pallets of wholesale inventory stacked in the warehouse operation Ryan Nichols ran",
    w: 1800,
    h: 1350,
    photo: true,
  },
  {
    kicker: "Then the demand side",
    title: "He had to go get the customers himself.",
    body: "Offers, content, ads, live selling, and audience building across platforms he did not own. That is where the follow-up lesson comes from: the post gets attention, the system makes money. Attention that lands nowhere is just noise you paid for.",
    image: "/images/ryan-live-content-work-1.jpg",
    alt: "Ryan Nichols producing live content, with camera and lighting equipment set up",
    w: 1600,
    h: 1200,
    photo: true,
  },
  {
    kicker: "Then the software",
    title: "He stopped renting the tools and built them.",
    body: "Eight live systems across six industries: media platforms, a dental school's enrollment engine, a public-records product, a commerce marketplace, a legal services catalog, a nonprofit mission platform, and a local service business. Four of them are real software products on the owned stack, with databases, search, and paid tiers, not brochure pages.",
    image: "/og/portfolio/repwatchr.jpg",
    alt: "RepWatchr, a public officials records product built by Ryan Nichols, showing profile and record counts",
    w: 1200,
    h: 630,
    photo: false,
  },
];

const RECEIPTS = [
  {
    head: "8 live systems, 6 industries.",
    body: "Every one is publicly inspectable. The portfolio links straight to them and labels which are client systems and which are Ryan's own products.",
  },
  {
    head: "16,783 official profiles. 59,054 sourced records.",
    body: "RepWatchr is a working software product on the same stack installed for clients. Searchable database, scorecards, packet builder, paid research tiers.",
  },
  {
    head: "He has been on the buying side of premium work.",
    body: "Ryan has flown a specialist in first class, covered the room, the board and the food, and paid five figures for a two day shoot, because the content that came out of it paid for itself once it went to work. That is why he does not flinch at quoting a real number, and why he will tell you when something is not worth it.",
  },
  {
    head: `${TOOL_COUNT} free working tools. ${ARTICLES.length} owned articles.`,
    body: "Calculators, assessments, and generators published on infrastructure he controls, not on a rented platform that can change the terms.",
  },
  {
    head: "Everything installed in accounts the client owns.",
    body: "GitHub, Vercel, Supabase, domains, and approved vendor accounts, organised so the business keeps control of its own code, data, and customers.",
  },
];

export default function AboutPage() {
  return (
    <main className="cb-page">
      <section className="cb-hero">
        <div className="cb-shell">
          <p className="cb-eyebrow">The operator</p>
          <h1 className="cb-h1">
            <em>I have already built what you are trying to build.</em>
            Now let&rsquo;s build yours.
          </h1>
          <p className="cb-hero-lead">
            Ryan Nichols builds business systems because he needed them before he sold them.
            The companies, the offers, the inventory, the fulfillment, the sales process, the
            audience, and eventually the software. All of it under real pressure, with his own
            money on the line.
          </p>
          <div className="cb-actions">
            <CtaLink
              href="/start"
              event="map_my_company"
              placement="about_hero"
              className="cb-btn cb-btn--primary"
            >
              Map My Company
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </CtaLink>
            <Link className="cb-btn cb-btn--ghost" href="/portfolio">
              See the Live Systems
            </Link>
          </div>
          <p className="cb-hero-own">
            <ShieldCheck aria-hidden="true" className="h-5 w-5" />
            Built by an operator. Installed in your accounts. Your business stays yours.
          </p>
        </div>
      </section>

      <section className="cb-band">
        <div className="cb-shell">
          <div className="cb-cases">
            {CHAPTERS.map((c, i) => (
              <article key={c.title} className={`cb-case${i % 2 === 1 ? " cb-case--flip" : ""}`}>
                <div className={`cb-case-shot${c.photo ? " cb-case-shot--photo" : ""}`}>
                  <Image
                    src={c.image}
                    alt={c.alt}
                    width={c.w}
                    height={c.h}
                    sizes="(max-width: 900px) 100vw, 55vw"
                    priority={i === 0}
                  />
                </div>
                <div>
                  <p className="cb-eyebrow">{c.kicker}</p>
                  <h2 className="cb-h2 cb-h2--case">
                    {c.title}
                  </h2>
                  <p className="cb-lead">{c.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cb-band cb-band--tint">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Receipts</p>
              <h2 className="cb-h2 cb-heading">Proof before promise.</h2>
            </div>
            <p className="cb-lead">
              No revenue claims, no client testimonials invented for a page, no guaranteed
              results. Just what exists and can be checked.
            </p>
          </div>
          <ul className="cb-receipts cb-receipts--standalone">
            {RECEIPTS.map((r) => (
              <li key={r.head}>
                <BadgeCheck aria-hidden="true" className="h-5 w-5" />
                <span>
                  <strong>{r.head}</strong> {r.body}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="cb-final">
        <div className="cb-shell">
          <p className="cb-eyebrow">Your next move</p>
          <h2 className="cb-h2">
            <em>Show me the business.</em>
            I&rsquo;ll show you what to build.
          </h2>
          <p className="cb-lead">
            Start with how your company actually runs today. The map shows what to build,
            what to connect, and what to stop paying for.
          </p>
          <div className="cb-actions">
            <CtaLink
              href="/start"
              event="map_my_company"
              placement="about_final"
              className="cb-btn cb-btn--primary"
            >
              Map My Company
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </CtaLink>
            <Link className="cb-btn cb-btn--ghost" href="/contact">
              Send a message
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
