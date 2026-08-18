import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Boxes, Check, FileSearch, ShieldCheck, Store } from "lucide-react";
import CtaLink from "@/components/site/CtaLink";
import SiteHero from "@/components/site/system/SiteHero";
import { OFFER_LADDER, WEBSITE_LAUNCH, WEBSITE_LAUNCH_CHECKOUT } from "@/lib/offers";

// Current offer ladder from the approved Revenue Pivot and Offer Ladder spec.

export const metadata: Metadata = {
  title: "Packages | The LeadFlow Pro",
  description:
    "Start with a five-page Website Launch for $1,000, use a $497 System Map for deeper dependencies, or scope a larger operating system around the real work.",
  alternates: { canonical: "https://www.theleadflowpro.com/pricing" },
  openGraph: {
    title: "Start with the right first release.",
    description:
      "Website Launch, System Map, Lead Engine, Training Platform, Company OS, and Custom Platform. Clear entry points and written scope.",
    url: "https://www.theleadflowpro.com/pricing",
    siteName: "The LeadFlow Pro",
    images: [{ url: "/og/pricing.png", width: 1200, height: 630 }],
    type: "website",
  },
};

const canonicalOffer = (id: (typeof OFFER_LADDER)[number]["id"]) =>
  OFFER_LADDER.find((offer) => offer.id === id)!;

const LADDER = [
  {
    kind: "Fixed-scope foundation",
    ...canonicalOffer("website-launch"),
    lead: true,
    body: WEBSITE_LAUNCH.summary,
    items: [...WEBSITE_LAUNCH.included],
    cta: "See Website Launch",
  },
  {
    kind: "Deeper diagnostic",
    ...canonicalOffer("system-map"),
    lead: false,
    body: canonicalOffer("system-map").purpose,
    items: [
      "Full inventory of current software and workflows",
      "Customer path, data flow, ownership, and handoff map",
      "Ownership audit: what you own versus what you rent",
      "Recommended modules, phases, and dependencies",
      "An honest build range before production begins",
    ],
    cta: "Get the System Map",
  },
  {
    kind: "Connected sales system",
    ...canonicalOffer("lead-engine"),
    lead: false,
    body: canonicalOffer("lead-engine").purpose,
    items: [
      "Conversion website and focused funnel",
      "CRM and one customer record",
      "Lead routing and response automation",
      "Source tracking and visible next actions",
    ],
    cta: "Map the Lead Engine",
  },
  {
    kind: "Owned delivery system",
    ...canonicalOffer("training-platform"),
    lead: false,
    body: canonicalOffer("training-platform").purpose,
    items: [
      "Public course catalog and member access",
      "Course, module, and lesson structure",
      "Enrollment and progress tracking",
      "Admin tools for ongoing course updates",
    ],
    cta: "Map the Training Platform",
  },
  {
    kind: "Connected company core",
    ...canonicalOffer("company-os"),
    lead: false,
    body: canonicalOffer("company-os").purpose,
    items: [
      "Website, CRM, and client portal",
      "Analytics and operating dashboard",
      "Workflow and response automation",
      "Accounts, data, and handoffs documented",
    ],
    cta: "Map the Company OS",
  },
  {
    kind: "Purpose-built software",
    ...canonicalOffer("custom-platform"),
    lead: false,
    body: canonicalOffer("custom-platform").purpose,
    items: [
      "Multi-role product and workflow design",
      "Advanced integrations and permissions",
      "Custom tools, records, and interfaces",
      "Phased architecture after a System Map",
    ],
    cta: "Map the Custom Platform",
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
      <SiteHero
        eyebrow="Clear entry point. Honest scope."
        mutedTitle="One fixed first move."
        title="Bigger systems are priced by the work."
        body="Website Launch is $1,000 total with a real approval checkpoint. CRM, funnels, portals, courses, automation, and custom software sit on a clear ladder instead of being hidden inside a vague website promise."
        media={{
          src: "/images/offer-v2/website-launch-approval-path.webp",
          alt: "A secure website build moving through assembly, approval, final payment, and launch",
          kicker: "$500 starts the build",
          caption: "$500 after approval, before launch.",
        }}
        primary={{ href: WEBSITE_LAUNCH_CHECKOUT, label: "Start Website Launch | $500", external: true }}
        secondary={{ href: "#offer-ladder", label: "Compare the full ladder" }}
        trustLine="Written scope, two revision rounds, and no final launch before approval and payment. Once intake begins, the $500 deposit is non-refundable, except where the written agreement or applicable law requires otherwise."
      />

      <section id="offer-ladder" className="cb-band scroll-mt-24">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">The ladder</p>
              <h2 className="cb-h2 cb-heading">Six clear levels. Pick the right first move.</h2>
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
                Not sure which lane fits
              </p>
              <h3>Map the dependencies before you pick a package.</h3>
              <p>
                If the project touches software, data, teams, portals, migrations, or several
                vendors, use the guided map first. It shows the likely build path before you
                send contact information.
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
