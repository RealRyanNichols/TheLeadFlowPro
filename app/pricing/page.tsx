import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Boxes, Check, FileSearch, ShieldCheck, Store } from "lucide-react";
import CtaLink from "@/components/site/CtaLink";

// Packages: Website Launch, System Map, Industry OS, and Custom Platform.
//
// Learn It / Build It With You / Done For You at /pricing/[tier] are the three
// public paths from the same Notion page and are LIVE in Stripe. They are a
// different ladder, not a dead one, and still need a home in the new nav.
// Tracked in docs/company-builder-redesign.md section 8.

export const metadata: Metadata = {
  title: "Packages | The LeadFlow Pro",
  description:
    "Start with a five-page Website Launch for $1,000, use a $497 System Map for deeper dependencies, or scope a larger operating system around the real work.",
  alternates: { canonical: "https://www.theleadflowpro.com/pricing" },
  openGraph: {
    title: "Start with the right first release.",
    description:
      "Website Launch, System Map, Industry OS, and Custom Platform. Clear entry points and written scope.",
    url: "https://www.theleadflowpro.com/pricing",
    siteName: "The LeadFlow Pro",
    images: [{ url: "/og/pricing.png", width: 1200, height: 630 }],
    type: "website",
  },
};

const LADDER = [
  {
    kind: "Fixed-scope foundation",
    name: "Website Launch",
    price: "$1,000",
    lead: true,
    body: "A conversion-led five-page public experience with one clear goal, lead capture, and a real approval checkpoint.",
    items: [
      "Conversion map and five premium pages",
      "Lead capture and routing",
      "Responsive production build, analytics, and deployment",
      "Two revision rounds",
      "$500 to start and $500 after approval, before launch",
    ],
    href: "/packages/launch",
    cta: "See Website Launch",
  },
  {
    kind: "Deeper diagnostic",
    name: "System Map",
    price: "$497",
    lead: false,
    body: "A working blueprint for a business that needs more than a five-page launch before anyone scopes software or automation.",
    items: [
      "Full inventory of current software and workflows",
      "Customer path, data flow, ownership, and handoff map",
      "Ownership audit: what you own versus what you rent",
      "Recommended modules, phases, and dependencies",
      "An honest build range before production begins",
    ],
    href: "/packages/system-map",
    cta: "Get the System Map",
  },
  {
    kind: "Full operating system",
    name: "Industry OS",
    price: "$15,000+",
    lead: false,
    body: "The connected core plus the vertical tools, records, portals, training, and communications that make your business different from the one down the street.",
    items: [
      "Everything required beyond Website Launch",
      "Customer, member, student, partner, or vendor portals",
      "Industry tools, courses, archives, calls, and texts",
      "Deeper permissions, migration, and integrations",
      "Automation and AI-ready connectors",
    ],
    href: "/packages/industry-os",
    cta: "See the full system",
  },
];

// Ryan, Aug 12 2026: "Every quote was different. Every business was different.
// Not everybody's paying the same amount, but not everybody's getting the same
// exact thing."
//
// The ladder above shows three starting points, which reads as one-size-fits-all
// if nothing explains why two businesses on the same rung pay different numbers.
// This is that explanation, and it turns custom pricing from evasion into the
// reason the number is honest.
const WHY_DIFFERENT = [
  {
    num: "01",
    title: "Same door, different building",
    body: "Two businesses can both need an operating system and require completely different work. One has a clean brand and 40 customers in a spreadsheet. The other has eight years of records in three systems and a team that needs permissions. The System Map exposes that difference before anyone quotes the build.",
  },
  {
    num: "02",
    title: "You are quoted for what you actually need",
    body: "Nobody pays for a portal they will not use, a migration they do not need, or an integration that does not apply. The map decides the scope, and the scope decides the number. That is why the price is a range until the map is done.",
  },
  {
    num: "03",
    title: "Priced by the real work",
    body: "The number comes from what the build actually takes, not from a rate card that charges every client the same because it is easier to invoice. If a piece turns out simpler than expected, it costs less. That runs both ways, in writing, before anything starts.",
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
            <em>Start with the right first release.</em>
            Map the complexity before you build it.
          </h1>
          <p className="cb-hero-lead">
            A mortgage company, a dental academy, a fleet washing crew, and a multi-channel
            seller should not get the same canned package. Website Launch is fixed at
            $1,000. Larger systems are mapped before the build is quoted.
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
              <h2 className="cb-h2 cb-heading">Three ways in. Pick the right first move.</h2>
            </div>
            <p className="cb-lead">
              Start with Website Launch when five focused pages solve the immediate problem.
              Start with the System Map when software, data, teams, or migrations make the
              dependencies more complex.
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

      <section className="cb-band cb-band--ink">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Why the number moves</p>
              <h2 className="cb-h2 cb-heading">
                Every quote is different, because every business is.
              </h2>
            </div>
            <p className="cb-lead">
              Not everybody pays the same amount, and not everybody is getting the same
              thing. A price list that charges two very different companies the same number
              is not being fair to either of them. It is just easier to print.
            </p>
          </div>
          <ol className="cb-steps cb-steps--three">
            {/* No cb-step--done accent here. These three are peers, not a
                sequence, so nothing should read as "you are here". */}
            {WHY_DIFFERENT.map((c) => (
              <li key={c.num} className="cb-step">
                <span className="cb-step-num">{c.num}</span>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
              </li>
            ))}
          </ol>
          <p className="cb-quotenote">
            Worth saying plainly: this is not the cheapest way to get a website. It is the
            way that leaves you owning the thing when it is done. If price is the only
            number that matters, there are faster answers than this one.
          </p>
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
            Start with Website Launch when five focused pages solve the immediate problem.
            Start with the System Map when software, data, team, or migration dependencies
            make the build more complex.
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
