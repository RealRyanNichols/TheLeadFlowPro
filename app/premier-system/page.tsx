import type { Metadata } from "next";
import Image from "next/image";
import { WEBSITE_LAUNCH_CHECKOUT } from "@/lib/offers";
import styles from "./premier-system.module.css";

const CANONICAL_URL = "https://www.theleadflowpro.com/premier-system";

export const metadata: Metadata = {
  title: "Premier System Proof + $1,000 Website Launch | The LeadFlow Pro",
  description:
    "See the connected system Ryan Nichols built for Premier Dental Academy, then review the exact five-page Website Launch available for $1,000: $500 to start and $500 after approval, before launch.",
  alternates: { canonical: CANONICAL_URL },
  openGraph: {
    title: "I didn’t just build Premier a website. I built the system behind the business.",
    description:
      "Inspect the Premier system proof and the exact $1,000 Website Launch scope from The LeadFlow Pro.",
    url: CANONICAL_URL,
    siteName: "The LeadFlow Pro",
    type: "website",
    images: [
      {
        url: "/images/offer-v2/premier-operating-system.webp",
        width: 3840,
        height: 2160,
        alt: "A connected operating system linking a public website, customer records, payments, portals, and course delivery",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The system behind Premier Dental Academy",
    description: "Proof of the larger build, plus a clear $1,000 Website Launch offer.",
    images: ["/images/offer-v2/premier-operating-system.webp"],
  },
};

const PREMIER_LAYERS = [
  {
    number: "01",
    name: "Public site",
    detail: "A clear front door for program details, paths, proof, and the next enrollment action.",
  },
  {
    number: "02",
    name: "Admin office",
    detail: "A working back office for the team to see and manage the operation.",
  },
  {
    number: "03",
    name: "CRM",
    detail: "One place to organize inquiries, applications, contacts, and next steps.",
  },
  {
    number: "04",
    name: "Student portal",
    detail: "A dedicated environment for students to reach the information and tools built for them.",
  },
  {
    number: "05",
    name: "Course environment",
    detail: "A structured digital home for curriculum delivered by Premier’s instructors.",
  },
  {
    number: "06",
    name: "Payment enrollment",
    detail: "A connected path from interest to application, plan selection, and payment.",
  },
  {
    number: "07",
    name: "Email automation",
    detail: "Follow-up that supports the team after a prospect raises a hand.",
  },
];

const STORYBOARD = [
  {
    time: "00–06",
    title: "The hook",
    detail: "I didn’t just build Premier a website.",
  },
  {
    time: "06–14",
    title: "Show the front door",
    detail: "Move through the public experience so the work is visible, not theoretical.",
  },
  {
    time: "14–23",
    title: "Reveal the system",
    detail: "Cut to the CRM, admin office, student portal, course, payments, and follow-up.",
  },
  {
    time: "23–31",
    title: "Make the distinction",
    detail: "Premier is the larger proof. The fixed offer is a focused five-page Website Launch.",
  },
  {
    time: "31–36",
    title: "Give one next move",
    detail: "Start the $1,000 Website Launch with a $500 deposit.",
  },
];

const WEBSITE_LAUNCH_SCOPE = [
  {
    number: "01",
    name: "Conversion map",
    detail: "One audience, one primary offer, and one measurable next action before the pages are built.",
  },
  {
    number: "02",
    name: "Five agreed pages",
    detail: "Typically Home, About, Offer or Services, Proof, and Contact. The final page list is written into the scope.",
  },
  {
    number: "03",
    name: "Responsive production build",
    detail: "A deliberate desktop and mobile experience built for speed, clarity, and accessibility.",
  },
  {
    number: "04",
    name: "Lead capture + routing",
    detail: "One primary form and a clear delivery path so the right person receives the inquiry context.",
  },
  {
    number: "05",
    name: "Launch foundation",
    detail: "Core on-page SEO, basic analytics, domain connection, and production deployment for the agreed site.",
  },
  {
    number: "06",
    name: "Two focused revision rounds",
    detail: "Review a working preview, then tighten the approved scope before the final launch payment.",
  },
];

const VISUAL_BONUS = [
  {
    number: "A",
    name: "Hero system scene",
    detail: "A premium visual that makes the main offer understandable before the visitor reads the full page.",
  },
  {
    number: "B",
    name: "Process or lead-flow scene",
    detail: "A simple visual explanation of how attention becomes an inquiry or next action.",
  },
  {
    number: "C",
    name: "Proof or approval scene",
    detail: "A visual that supports the proof, process, or launch decision without stuffing words into the image.",
  },
];

const MILESTONES = [
  {
    number: "01",
    name: "$500 starts the project",
    detail: "The first payment reserves the Website Launch and opens intake.",
  },
  {
    number: "02",
    name: "Scope is confirmed in writing",
    detail: "Pages, assets, primary action, responsibilities, and launch requirements are agreed before production.",
  },
  {
    number: "03",
    name: "You review working proof",
    detail: "The site is presented in a live review environment with two focused revision rounds.",
  },
  {
    number: "04",
    name: "$500 is due after approval",
    detail: "The remaining balance is paid after approval and before the production site goes live.",
  },
];

const EXCLUSIONS = [
  "A custom CRM or database",
  "Funnels beyond the five-page site",
  "Student, client, or member portals",
  "Course-platform development",
  "Payment-plan or enrollment systems",
  "Email or text automation sequences",
  "Ad production, media buying, or daily content",
  "E-commerce, custom tools, or private dashboards",
  "Unlimited revisions or ongoing maintenance",
  "Third-party subscriptions, hosting, or platform fees",
];

const GOOD_FIT = [
  "You have a real offer and one primary buyer path.",
  "You can provide the core business facts, photos, and approvals needed to build.",
  "One decision-maker can give direct feedback through the two revision rounds.",
  "You need a strong public foundation now and can scope deeper systems separately later.",
];

const NOT_FIT = [
  "You expect Premier’s full operating system inside a $1,000 website scope.",
  "You need guaranteed leads, sales, rankings, or revenue.",
  "You need a portal, course platform, CRM, automation, or custom application in the first release.",
  "You want unlimited concepts, unlimited pages, or an open-ended revision process.",
];

const FAQ = [
  {
    question: "Is the $1,000 Website Launch the same system Ryan built for Premier?",
    answer:
      "No. Premier is proof of a larger, separately scoped operating system. The $1,000 Website Launch is a focused five-page public foundation with the exact items listed on this page.",
  },
  {
    question: "How do the two payments work?",
    answer:
      "$500 reserves the Website Launch and starts intake. The remaining $500 is due after you approve the working site and before it is launched to production.",
  },
  {
    question: "Are the premium graphics included?",
    answer:
      "At the current founding rate, three premium visual scenes are included as a bonus inside the agreed five-page Website Launch. Their purpose and placement are confirmed in the written scope.",
  },
  {
    question: "Can I add a funnel, CRM, portal, course, payments, ads, or automation?",
    answer:
      "Yes, when the business case is clear. Those are separate modules with their own written scope, price, requirements, and timeline. They are not hidden inside the $1,000 Website Launch.",
  },
  {
    question: "Who did what in the Premier build?",
    answer:
      "Ryan Nichols built the connected system. Premier’s instructors delivered the curriculum, and Premier’s sales team handled most direct enrollment. Ads, content, and follow-up helped support visibility and movement through the path.",
  },
  {
    question: "Does this guarantee leads or sales?",
    answer:
      "No. The work creates a clearer site, capture path, and operating foundation. Results still depend on the offer, market, traffic, responsiveness, sales execution, and other factors outside any website build.",
  },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      "@id": `${CANONICAL_URL}#service`,
      name: "The LeadFlow Pro Website Launch",
      serviceType: "Conversion-led five-page website design and development",
      description:
        "A five-page Website Launch with conversion mapping, responsive production, lead capture, launch setup, two revision rounds, and a founding-rate visual bonus.",
      provider: {
        "@type": "Organization",
        name: "The LeadFlow Pro",
        legalName: "Longview Training Center, LLC",
        url: "https://www.theleadflowpro.com",
      },
      offers: {
        "@type": "Offer",
        price: "1000",
        priceCurrency: "USD",
        url: WEBSITE_LAUNCH_CHECKOUT,
        description: "$500 to start and $500 after approval, before production launch.",
      },
    },
    {
      "@type": "FAQPage",
      "@id": `${CANONICAL_URL}#faq`,
      mainEntity: FAQ.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  ],
};

export default function PremierSystemPage() {
  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <section className={styles.hero} aria-labelledby="premier-system-title">
        <div className={styles.shell}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.kicker}>Premier Dental Academy · system proof</p>
              <h1 id="premier-system-title">
                I didn’t just build Premier a website.
                <span>I built the system behind the business.</span>
              </h1>
              <p className={styles.heroLead}>
                The public site was only the front door. Behind it, I connected the places
                where an inquiry, application, payment, student, course, and follow-up could
                move through the business.
              </p>
              <div className={styles.heroActions}>
                <a
                  className={styles.primaryAction}
                  href={WEBSITE_LAUNCH_CHECKOUT}
                  data-analytics="cta-premier-system-hero-checkout"
                >
                  Start My Website Launch | $500
                </a>
                <a className={styles.secondaryAction} href="#website-launch">
                  See Exactly What $1,000 Includes
                </a>
              </div>
              <p className={styles.heroNote}>
                $1,000 total. $500 to start. $500 after approval and before launch. Once
                intake begins, the deposit is non-refundable, except where the written
                agreement or applicable law requires otherwise.
              </p>
            </div>

            <figure className={styles.heroVisual}>
              <Image
                src="/images/offer-v2/premier-operating-system.webp"
                alt="A connected operating system linking a public website, customer records, payments, portals, and course delivery"
                fill
                priority
                sizes="(max-width: 760px) 100vw, 56vw"
              />
              <figcaption>
                <span>Premier full system</span>
                <strong>Seven connected layers. One business path.</strong>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className={styles.proofSection} aria-labelledby="proof-title">
        <div className={styles.shell}>
          <header className={styles.sectionIntro}>
            <p className={styles.kickerDark}>What the proof actually shows</p>
            <h2 id="proof-title">The website was one layer.</h2>
            <p>
              The larger work was connecting the public experience to the operating pieces
              behind it. No private student records are shown here. This is a capability map
              of the system that was built.
            </p>
          </header>

          <div className={styles.proofStage}>
            <figure className={styles.proofVisual}>
              <Image
                src="/images/offer-v2/premier-operating-system.webp"
                alt="Seven business-system capabilities connected around one customer and student record"
                fill
                sizes="(max-width: 900px) 100vw, 58vw"
              />
            </figure>
            <ol className={styles.layerLedger}>
              {PREMIER_LAYERS.map((layer) => (
                <li key={layer.number}>
                  <span>{layer.number}</span>
                  <div>
                    <strong>{layer.name}</strong>
                    <p>{layer.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <aside className={styles.truthNote} aria-label="Premier Dental Academy role clarity">
            <strong>Clear roles. Real proof.</strong>
            <p>
              Ryan Nichols built the connected system. Premier’s instructors delivered the
              curriculum, and Premier’s sales team handled most direct enrollment. Ads,
              content, and follow-up helped support visibility and movement through the path.
              This work is proof of capability, not a promise of identical results.
            </p>
            <a
              href="https://www.premierdentalacademyoflongview.com"
              target="_blank"
              rel="noreferrer"
            >
              Inspect Premier’s public website
            </a>
          </aside>
        </div>
      </section>

      <section className={styles.videoSection} aria-labelledby="video-title">
        <div className={styles.shell}>
          <div className={styles.videoGrid}>
            <div>
              <p className={styles.kicker}>The proof-led ad</p>
              <h2 id="video-title">Show it before you explain it.</h2>
              <p className={styles.videoLead}>
                The ad opens on the finished experience, reveals the machinery behind it,
                then gives one simple next move. The viewer should understand the difference
                in under 45 seconds.
              </p>
              <div className={styles.videoFrame}>
                <video
                  controls
                  playsInline
                  preload="metadata"
                  poster="/images/premier-dental-academy-makeover-poster.jpg"
                  aria-label="Premier Dental Academy website and system makeover teaser"
                >
                  <source
                    src="/videos/premier-dental-academy-makeover-teaser.mp4"
                    type="video/mp4"
                  />
                  Your browser does not support the video element.
                </video>
              </div>
              <p className={styles.videoCaption}>
                Public website views only. No private student information appears in this
                presentation.
              </p>
            </div>

            <div className={styles.storyboard}>
              <div className={styles.storyboardTopline}>
                <span>36-second cut</span>
                <span>One idea per beat</span>
              </div>
              <ol>
                {STORYBOARD.map((beat) => (
                  <li key={beat.time}>
                    <time>{beat.time}</time>
                    <div>
                      <strong>{beat.title}</strong>
                      <p>{beat.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section
        id="website-launch"
        className={styles.offerSection}
        aria-labelledby="website-launch-title"
      >
        <div className={styles.shell}>
          <div className={styles.offerHeader}>
            <div>
              <p className={styles.kickerDark}>The fixed offer</p>
              <h2 id="website-launch-title">Website Launch</h2>
              <p>
                Premier proves what a larger connected system can become. This offer is the
                public foundation: five focused pages, a clear buyer path, and a working way
                to capture the next conversation.
              </p>
            </div>
            <aside className={styles.priceCard} aria-label="Website Launch price">
              <span>Fixed project total</span>
              <strong>$1,000</strong>
              <p>$500 now. $500 after approval, before launch.</p>
              <a
                href={WEBSITE_LAUNCH_CHECKOUT}
                data-analytics="cta-premier-system-offer-checkout"
              >
                Start My Website Launch | $500
              </a>
              <small>
                Once intake begins, the $500 deposit is non-refundable, except where the
                written agreement or applicable law requires otherwise.
              </small>
            </aside>
          </div>

          <figure className={styles.approvalVisual}>
            <Image
              src="/images/offer-v2/website-launch-approval-path.webp"
              alt="A secure website build path moving from protected intake to production, approval, and launch"
              fill
              sizes="(max-width: 760px) 100vw, 1280px"
            />
            <figcaption>
              <span>Reserve</span>
              <span>Build</span>
              <span>Approve</span>
              <span>Launch</span>
            </figcaption>
          </figure>

          <div className={styles.scopeGrid}>
            <div className={styles.scopeHeading}>
              <p className={styles.kickerDark}>Exact scope</p>
              <h3>What the $1,000 gets you.</h3>
              <p>
                A deliberately tight first release. The final page names, responsibilities,
                assets, and primary conversion action are confirmed in writing.
              </p>
            </div>
            <ol className={styles.scopeLedger}>
              {WEBSITE_LAUNCH_SCOPE.map((item) => (
                <li key={item.number}>
                  <span>{item.number}</span>
                  <div>
                    <strong>{item.name}</strong>
                    <p>{item.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className={styles.bonusBlock}>
            <header>
              <p className={styles.kicker}>Founding-rate bonus</p>
              <h3>Three premium visual scenes.</h3>
              <p>
                These are visual explanations, not posters full of copy. The page keeps the
                real message in readable HTML and lets each scene make the flow easier to see.
              </p>
            </header>
            <ol>
              {VISUAL_BONUS.map((item) => (
                <li key={item.number}>
                  <span>{item.number}</span>
                  <strong>{item.name}</strong>
                  <p>{item.detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className={styles.paymentSection} aria-labelledby="payment-title">
        <div className={styles.shell}>
          <header className={styles.sectionIntro}>
            <p className={styles.kickerDark}>Payment and approval</p>
            <h2 id="payment-title">Working proof before the final payment.</h2>
            <p>
              The two-payment structure keeps the start simple and the approval milestone
              clear. It does not create an open-ended build or change the written scope.
            </p>
          </header>
          <ol className={styles.milestones}>
            {MILESTONES.map((item) => (
              <li key={item.number}>
                <span>{item.number}</span>
                <strong>{item.name}</strong>
                <p>{item.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={styles.fitSection} aria-labelledby="fit-title">
        <div className={styles.shell}>
          <header className={styles.fitIntro}>
            <p className={styles.kicker}>The fit filter</p>
            <h2 id="fit-title">The right foundation for the right buyer.</h2>
            <p>
              Clear scope protects the quality of the work. If the business needs a larger
              system, that is a different conversation and a different price.
            </p>
          </header>
          <div className={styles.fitGrid}>
            <article>
              <span>Good fit</span>
              <h3>Start here when the public site is the immediate bottleneck.</h3>
              <ul>
                {GOOD_FIT.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article>
              <span>Not this scope</span>
              <h3>Scope a larger system when the work starts behind the website.</h3>
              <ul>
                {NOT_FIT.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>

          <div className={styles.exclusions}>
            <div>
              <p className={styles.kicker}>Separately scoped</p>
              <h3>What is not hidden inside $1,000.</h3>
            </div>
            <ul>
              {EXCLUSIONS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className={styles.faqSection} aria-labelledby="faq-title">
        <div className={styles.shell}>
          <div className={styles.faqGrid}>
            <header>
              <p className={styles.kickerDark}>Straight answers</p>
              <h2 id="faq-title">Before you start.</h2>
              <p>
                No guarantee language. No private data. No pretending the full Premier system
                is a thousand-dollar website.
              </p>
            </header>
            <div className={styles.faqList}>
              {FAQ.map((item, index) => (
                <details key={item.question} open={index === 0}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.finalSection} aria-labelledby="final-title">
        <div className={styles.shell}>
          <div className={styles.finalGrid}>
            <div>
              <p className={styles.kicker}>Build the front door first</p>
              <h2 id="final-title">Let the site show people what you can do.</h2>
            </div>
            <div>
              <p>
                Start with the five-page Website Launch. If the business needs the CRM,
                funnel, portal, course, payments, ads, or automation behind it, we scope that
                next layer honestly.
              </p>
              <a
                href={WEBSITE_LAUNCH_CHECKOUT}
                data-analytics="cta-premier-system-final-checkout"
              >
                Start My Website Launch | $500
              </a>
              <small>
                Secure checkout through Longview Training Center, LLC. The $500 payment is
                applied to the $1,000 Website Launch total. Once intake begins, the deposit
                is non-refundable, except where the written agreement or applicable law
                requires otherwise.
              </small>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
