import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CodeXml,
  ExternalLink,
  GraduationCap,
  LibraryBig,
  Store,
} from "lucide-react";

export const metadata: Metadata = {
  title: "The Work | The LeadFlow Pro",
  description:
    "Live business systems, industry tools, portals, archives, and platforms built by The LeadFlow Pro.",
};

const WORK = [
  {
    href: "https://www.premierdentalacademyoflongview.com/",
    icon: GraduationCap,
    tag: "Dental education and software",
    title: "Premier Dental Academy",
    body: "Enrollment, payment planning, student training, public career tools, office directories, and real practice-management simulators in one vertical system.",
  },
  {
    href: "https://realryannichols.com/",
    icon: LibraryBig,
    tag: "Independent media and public records",
    title: "RealRyanNichols.com",
    body: "Publishing, evidence collections, public records, profiles, forms, and a large searchable archive under one owned operating system.",
  },
  {
    href: "https://gideonhq.com/",
    icon: Store,
    tag: "Commerce platform",
    title: "Gideon Commerce",
    body: "A marketplace and commerce system built around direct ownership, seller economics, product workflows, and a lower-fee operating model.",
  },
  {
    href: "https://repwatchr.com/",
    icon: CodeXml,
    tag: "Public information software",
    title: "RepWatchr",
    body: "A purpose-built product for organized public records, official profiles, evidence, and structured research that goes far beyond a brochure site.",
  },
];

export default function PortfolioPage() {
  return (
    <main>
      <section className="page-hero page-hero-centered">
        <span className="eyebrow">Proof before promise</span>
        <h1>Live systems. Different industries. One reliable core.</h1>
        <p>
          These are working properties, not concept cards. The public experience changes by
          industry, while the underlying approach stays connected: real tools, real
          workflows, and an operating layer behind the page.
        </p>
      </section>
      <section className="section-shell pricing-shell">
        <div className="work-grid portfolio-work-grid">
          {WORK.map((w) => (
            <a key={w.title} href={w.href} target="_blank" rel="noreferrer" className="work-card">
              <div className="portfolio-work-icon">
                <w.icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <span>{w.tag}</span>
              <h2>{w.title}</h2>
              <p>{w.body}</p>
              <small>
                Visit the live system <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
              </small>
            </a>
          ))}
        </div>
        <div className="final-cta portfolio-cta">
          <div>
            <span className="eyebrow">Your business does not need to copy these</span>
            <h2>It needs the same level of fit.</h2>
            <p>
              The guided map starts with your leak, your home base, your sales channels,
              and your workflow. Then it recommends the first connected version without
              locking you into a canned funnel.
            </p>
          </div>
          <div>
            <Link className="button-primary" href="/start">
              Map My System
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link className="button-secondary" href="/pricing">
              Compare Packages
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
