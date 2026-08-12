import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Boxes, Check, FileSearch, ShieldCheck, Store } from "lucide-react";
import CtaLink from "@/components/site/CtaLink";

// Packages: the build ladder. System Map, LeadFlow Launch, Industry OS, and
// Custom Platform, matching Notion "1. Business Model, Offers and Money Path".
//
// Learn It / Build It With You / Done For You at /pricing/[tier] are the three
// public paths from the same Notion page and are LIVE in Stripe. They are a
// different ladder, not a dead one, and still need a home in the new nav.
// Tracked in docs/company-builder-redesign.md section 8.

export const metadata: Metadata = {
  title: "Packages | The LeadFlow Pro",
  description:
    "Start with a $497 System Map, then build the connected LeadFlow core, a full Industry OS, or a larger custom platform. Scope is mapped before the build is quoted.",
  alternates: { canonical: "https://www.theleadflowpro.com/pricing" },
  openGraph: {
    title: "Start with the map. Then price the real work.",
    description:
      "The System Map, LeadFlow Launch, Industry OS, and Custom Platform. Clear entry point, honest scope.",
    url: "https://www.theleadflowpro.com/pricing",
    siteName: "The LeadFlow Pro",
    images: [{ url: "/og/pricing.png", width: 1200, height: 630 }],
    type: "website",
  },
};

const LADDER = [
  {
    kind: "Start here",
    name: "System Map",
    price: "$497",
    lead: true,
    body: "A working blueprint of your company before anybody starts selling you software, pages, or automation. Credited in full toward an approved build, and yours to keep either way.",
    items: [
      "Full inventory of your current website, marketplaces, software, and workflows",
      "Customer path, data flow, ownership, and handoff map",
      "Ownership audit: what you own versus what you rent",
      "Recommended modules, phases, dependencies, and an honest build range",
      "Credited toward an approved LeadFlow build",
    ],
    href: "/packages/system-map",
    cta: "Get the System Map",
  },
  {
    kind: "Connected core",
    name: "LeadFlow Launch",
    price: "$7,500+",
    lead: false,
    body: "The owned public site and operating core a serious business needs to capture, route, and actually work demand.",
    items: [
      "Public site or sales home base",
      "Lead capture, CRM, admin workspace, and reporting",
      "Transactional email and practical automation",
      "First-party analytics and source attribution",
      "GitHub, Vercel, and Supabase in accounts you control",
    ],
    href: "/packages/launch",
    cta: "See the full build",
  },
  {
    kind: "Full operating system",
    name: "Industry OS",
    price: "$15,000+",
    lead: false,
    body: "The connected core plus the vertical tools, records, portals, training, and communications that make your business different from the one down the street.",
    items: [
      "Everything in LeadFlow Launch",
      "Customer, member, student, partner, or vendor portals",
      "Industry tools, courses, archives, calls, and texts",
      "Deeper permissions, migration, and integrations",
      "Automation and AI-ready connectors",
    ],
    href: "/packages/industry-os",
    cta: "See the full system",
  },
];

const CLARITY = [
  {
    num: "01",
    title: "Scope first",
    body: "The map identifies what exists, what stays, what connects, what moves, and what should be left alone. Nothing gets built on a guess.",
  },
  {
    num: "02",
    title: "Approve the phases",
    body: "You see the modules, ownership, dependencies, assumptions, and investment before the build begins. No surprise invoices.",
  },
  {
    num: "03",
    title: "Build in accounts you control",
    body: "Code, hosting, database, domains, and approved vendor accounts are organised so the business keeps control of all of it.",
  },
];

const CHANNELS = [
  {
    icon: Store,
    title: "Keep the useful channels",
    body: "Amazon, eBay, Poshmark, Mercari, and Whatnot reach can stay part of the model. They are sales channels, not your website.",
  },
  {
    icon: FileSearch,
    title: "Audit the real fees",
    body: "No fake blended percentage. We use your actual category and your actual statements to work out what each channel costs you.",
  },
  {
    icon: ShieldCheck,
    title: "Build owned leverage",
    body: "Own the brand, data, workflows, and direct customer relationships you are allowed to own, and let the channels do what they are good at.",
  },
];

export default function PricingPage() {
  return (
    <main className="cb-page">
      <section className="cb-hero">
        <div className="cb-shell">
          <p className="cb-eyebrow">Clear entry point. Honest scope.</p>
          <h1 className="cb-h1">
            <em>Start with the map.</em>
            Then price the real work.
          </h1>
          <p className="cb-hero-lead">
            A mortgage company, a dental academy, a fleet washing crew, and a multi-channel
            seller should not get the same canned package. The entry point is fixed. The
            complexity is mapped before the build is quoted.
          </p>
          <div className="cb-actions">
            <CtaLink
              href="/start"
              event="map_my_company"
              placement="pricing_hero"
              className="cb-btn cb-btn--primary"
            >
              Map My Company
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </CtaLink>
            <Link className="cb-btn cb-btn--ghost" href="/portfolio">
              See the Live Systems
            </Link>
          </div>
        </div>
      </section>

      <section className="cb-band">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">The ladder</p>
              <h2 className="cb-h2 cb-heading">Three ways in. One of them comes first.</h2>
            </div>
            <p className="cb-lead">
              Every engagement starts with the map, because quoting a build before you know
              what a company already runs is guessing with someone else&rsquo;s money.
            </p>
          </div>

          <div className="cb-ladder">
            {LADDER.map((r) => (
              <article
                key={r.name}
                id={r.href.split("/").pop()}
                className={`cb-rung${r.lead ? " cb-rung--lead" : ""}`}
              >
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
                $30,000+. The System Map still comes first.
              </p>
            </div>
            <Link className="cb-btn cb-btn--ghost" href="/start?goal=custom">
              Map the bigger idea
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="cb-band cb-band--tint">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Marketplace and multi-channel sellers</p>
              <h2 className="cb-h2 cb-heading">
                We do not pretend a marketplace is your website.
              </h2>
            </div>
            <p className="cb-lead">
              Those are sales channels with category, order, fulfillment, shipping,
              advertising, and transaction fees attached. They can stay in the plan. We audit
              the real statements, connect what each platform permits, and decide where an
              owned home base actually creates leverage.
            </p>
          </div>

          <div className="cb-pillars">
            {CHANNELS.map((c) => (
              <article key={c.title} className="cb-pillar">
                <div className="cb-pillar-top">
                  <h3>{c.title}</h3>
                  <c.icon aria-hidden="true" className="h-6 w-6" />
                </div>
                <p>{c.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-12 flex justify-center">
            <CtaLink
              href="/start?goal=replace_tools"
              event="map_my_company"
              placement="pricing_channels"
              className="cb-btn cb-btn--primary"
            >
              Map my sales channels
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </CtaLink>
          </div>
        </div>
      </section>

      <section className="cb-band cb-band--ink">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">What the starting price means</p>
              <h2 className="cb-h2 cb-heading">No mystery package. No forced migration.</h2>
            </div>
            <p className="cb-lead">
              A starting price is a floor, not a bait number. What moves it is scope, and
              scope is decided by the map, in writing, before anyone starts building.
            </p>
          </div>
          <ol className="cb-steps cb-steps--three">
            {CLARITY.map((c, i) => (
              <li key={c.num} className={`cb-step${i === 0 ? " cb-step--done" : ""}`}>
                <span className="cb-step-num">{c.num}</span>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
              </li>
            ))}
          </ol>
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
            The map is the first move for every engagement on this page. Start there and find
            out what your company actually needs before you spend a real dollar on it.
          </p>
          <div className="cb-actions">
            <CtaLink
              href="/start"
              event="map_my_company"
              placement="pricing_final"
              className="cb-btn cb-btn--primary"
            >
              Map My Company
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </CtaLink>
            <Link className="cb-btn cb-btn--ghost" href="/contact">
              Ask a question first
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
