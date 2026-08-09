import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileSearch,
  Network,
  ShieldCheck,
  Store,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Packages | The LeadFlow Pro",
  description:
    "Start with a $497 System Map, then build the connected LeadFlow core, an Industry OS, or a larger custom platform.",
};

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li>
      <Check aria-hidden="true" className="h-4 w-4" />
      <span>{children}</span>
    </li>
  );
}

export default function PricingPage() {
  return (
    <main className="pricing-page">
      <section className="page-hero page-hero-centered">
        <span className="eyebrow">Clear entry point. Honest scope.</span>
        <h1>Start with the system. Then price the real work.</h1>
        <p>
          A mortgage company, dental academy, local service business, and multi-channel
          seller should not get the same canned package. The core is defined. The
          complexity is mapped before the build is quoted.
        </p>
      </section>

      <section className="section-shell pricing-shell">
        <div className="pricing-grid">
          <article id="system-map" className="pricing-card">
            <span className="eyebrow">Start here</span>
            <h2>System Map</h2>
            <p className="pricing-price">$497</p>
            <p className="pricing-description">
              A working blueprint before anybody starts selling you software, pages, or
              automation.
            </p>
            <ul>
              <CheckItem>Current website, marketplace, software, and workflow inventory</CheckItem>
              <CheckItem>Customer path, data flow, ownership, and handoff map</CheckItem>
              <CheckItem>Recommended modules, phases, dependencies, and build range</CheckItem>
              <CheckItem>Credited toward an approved LeadFlow build</CheckItem>
            </ul>
            <Link className="button-secondary" href="/packages/system-map">
              Get the System Map
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </article>

          <article id="launch" className="pricing-card is-highlighted">
            <span className="pricing-popular">Most common first build</span>
            <span className="eyebrow">Connected core</span>
            <h2>LeadFlow Launch</h2>
            <p className="pricing-price">$7,500+</p>
            <p className="pricing-description">
              The owned public site and operating core a serious business needs to capture,
              route, and work demand.
            </p>
            <ul>
              <CheckItem>Public site or sales home base</CheckItem>
              <CheckItem>Lead capture, CRM, admin workspace, and reporting</CheckItem>
              <CheckItem>Transactional email and practical automation</CheckItem>
              <CheckItem>GitHub, Vercel, and Supabase in accounts you control</CheckItem>
            </ul>
            <Link className="button-primary" href="/packages/launch">
              See the Full Build
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </article>

          <article id="industry-os" className="pricing-card">
            <span className="eyebrow">Full operating system</span>
            <h2>Industry OS</h2>
            <p className="pricing-price">$15,000+</p>
            <p className="pricing-description">
              The connected core plus the vertical tools, records, portals, training,
              communication, and workflows that make your business different.
            </p>
            <ul>
              <CheckItem>Everything in LeadFlow Launch</CheckItem>
              <CheckItem>Customer, member, student, partner, or vendor portals</CheckItem>
              <CheckItem>Industry tools, courses, archives, calls, and texts</CheckItem>
              <CheckItem>Deeper permissions, migration, integrations, and automation</CheckItem>
            </ul>
            <Link className="button-secondary" href="/packages/industry-os">
              See the Full System
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </article>
        </div>

        <div className="custom-scope-card">
          <div className="custom-scope-icon">
            <Network aria-hidden="true" className="h-6 w-6" />
          </div>
          <div>
            <span className="eyebrow">Larger than a package</span>
            <h2>Custom Platform</h2>
            <p>
              Multi-location operations, software products, complex migrations, tenant
              systems, advanced permissions, and deeper AI connectors are scoped from
              $30,000+. The System Map still comes first.
            </p>
          </div>
          <Link className="button-secondary" href="/start?goal=custom">
            Map the Bigger Idea
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="section-shell section-tinted channel-pricing-section">
        <div className="section-heading section-heading-wide">
          <div>
            <span className="eyebrow">Marketplace and multi-channel sellers</span>
            <h2>
              We do not pretend Amazon, eBay, Poshmark, Mercari, or Whatnot is your
              website.
            </h2>
          </div>
          <p>
            Those are sales channels with category, order, fulfillment, shipping,
            advertising, and transaction fees. They can stay in the plan. We audit the real
            statements, connect what each platform permits, and decide where an owned home
            base creates leverage.
          </p>
        </div>
        <div className="channel-pricing-grid">
          <div>
            <Store aria-hidden="true" />
            <strong>Keep useful channels</strong>
            <span>Reach and marketplace demand can remain part of the model.</span>
          </div>
          <div>
            <FileSearch aria-hidden="true" />
            <strong>Audit real fees</strong>
            <span>
              No fake blended percentage. We use the seller&rsquo;s category and statements.
            </span>
          </div>
          <div>
            <ShieldCheck aria-hidden="true" />
            <strong>Build owned leverage</strong>
            <span>
              Own the brand, data, workflows, and direct relationships you are allowed to
              own.
            </span>
          </div>
        </div>
        <div className="section-cta-row">
          <Link className="button-primary" href="/start?goal=replace_tools">
            Map My Sales Channels
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="section-shell pricing-clarity">
        <div className="section-heading section-heading-center">
          <span className="eyebrow">What the starting price means</span>
          <h2>No mystery package. No forced migration.</h2>
        </div>
        <div className="layer-grid">
          <article className="layer-card">
            <span>01</span>
            <h3>Scope first</h3>
            <p>
              The map identifies what exists, what stays, what connects, what moves, and
              what should be left alone.
            </p>
          </article>
          <article className="layer-card">
            <span>02</span>
            <h3>Approve the phases</h3>
            <p>
              You see the modules, ownership, dependencies, assumptions, and investment
              before the build begins.
            </p>
          </article>
          <article className="layer-card">
            <span>03</span>
            <h3>Build in controlled accounts</h3>
            <p>
              Code, hosting, database, domains, and approved vendor accounts are organized
              so the business retains control.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
