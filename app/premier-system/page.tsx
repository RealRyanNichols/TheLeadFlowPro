import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ClipboardCheck,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  MessageCircle,
  Monitor,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { WEBSITE_LAUNCH_CHECKOUT } from "@/lib/offers";
import ContactForm from "@/app/contact/ContactForm";
import styles from "./premier-system.module.css";

const CANONICAL_URL = "https://www.theleadflowpro.com/premier-system";
const PREMIER = "https://www.premierdentalacademyoflongview.com";

export const metadata: Metadata = withPublicPageMetadata("/premier-system", {
  title: "Premier Dental Academy’s System | The LeadFlow Pro",
  description:
    "Meet Amanda Williams and explore the website, enrollment tools, and student learning system built for Premier Dental Academy of Longview by The LeadFlow Pro.",
  openGraph: {
    title: "Premier Dental Academy: a school, a team, a connected system",
    description:
      "Meet Amanda. See the real academy. Try the tools that connect a first question to a place to learn.",
  },
});

const STUDENT_PATH = [
  {
    icon: Search,
    title: "Find the school",
    detail: "Programs, real school photos, and a clear way to ask a question.",
    action: "Explore Premier",
    href: `${PREMIER}/`,
  },
  {
    icon: CalendarDays,
    title: "Picture yourself here",
    detail:
      "Try a training tool, explore the costs, or ask Amanda’s team for a tour.",
    action: "Request a tour",
    href: `${PREMIER}/tour`,
  },
  {
    icon: ClipboardCheck,
    title: "Take the next step",
    detail:
      "Apply, review the enrollment options, and work with the school’s team.",
    action: "See the application",
    href: `${PREMIER}/apply`,
  },
  {
    icon: GraduationCap,
    title: "Learn by doing",
    detail:
      "Coursework, practice tools, and instructor support connect the next part of the journey.",
    action: "Try Practice Pro",
    href: `${PREMIER}/tools/practice-pro`,
  },
];

const SYSTEM_PIECES = [
  {
    icon: Monitor,
    name: "A website that answers questions",
    detail: "Programs, school photos, free tools, and visible next steps.",
  },
  {
    icon: Users,
    name: "One place for inquiries",
    detail:
      "Contact details, applications, and the next follow-up for the team.",
  },
  {
    icon: CreditCard,
    name: "An enrollment path",
    detail:
      "Application, plan selection, and payment steps connected to the school.",
  },
  {
    icon: GraduationCap,
    name: "A student home",
    detail: "A private place to reach courses and learning tools.",
  },
  {
    icon: BookOpen,
    name: "Practice beyond the lesson",
    detail: "Front-desk and chairside trainers students can explore and use.",
  },
  {
    icon: MessageCircle,
    name: "Follow-up with context",
    detail:
      "The team can pick up the conversation after someone asks for help.",
  },
  {
    icon: LayoutDashboard,
    name: "A working back office",
    detail: "A shared view of the operation for the people running the school.",
  },
];

const WEBSITE_LAUNCH_SCOPE = [
  {
    number: "01",
    name: "Conversion map",
    detail:
      "One audience, one primary offer, and one measurable next action before the pages are built.",
  },
  {
    number: "02",
    name: "Five agreed pages",
    detail:
      "Typically Home, About, Offer or Services, Proof, and Contact. The final page list is written into the scope.",
  },
  {
    number: "03",
    name: "Responsive production build",
    detail:
      "A deliberate desktop and mobile experience built for speed, clarity, and accessibility.",
  },
  {
    number: "04",
    name: "Lead capture + routing",
    detail:
      "One primary form and a clear delivery path so the right person receives the inquiry context.",
  },
  {
    number: "05",
    name: "Launch foundation",
    detail:
      "Core on-page SEO, basic analytics, domain connection, and production deployment for the agreed site.",
  },
  {
    number: "06",
    name: "Two focused revision rounds",
    detail:
      "Review a working preview, then tighten the approved scope before the final launch payment.",
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
    detail:
      "Pages, assets, primary action, responsibilities, and launch requirements are agreed before production.",
  },
  {
    number: "03",
    name: "You review working proof",
    detail:
      "The site is presented in a live review environment with two focused revision rounds.",
  },
  {
    number: "04",
    name: "$500 is due after approval",
    detail:
      "The remaining balance is paid after approval and before the production site goes live.",
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

const FAQ = [
  {
    question:
      "Is the $1,000 Website Launch the same system Ryan built for Premier?",
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
    question:
      "Can I add a funnel, CRM, portal, course, payments, ads, or automation?",
    answer:
      "Yes, when the business case is clear. Those are separate modules with their own written scope, price, requirements, and timeline. They are not hidden inside the $1,000 Website Launch.",
  },
  {
    question: "Who did what in the Premier build?",
    answer:
      "Amanda Williams leads Premier Dental Academy as its owner and director. Premier’s instructors deliver the curriculum, and its enrollment team handles student conversations. Ryan Nichols built the connected website, tools, and business system through The LeadFlow Pro.",
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
        url: "https://www.theleadflowpro.com/packages/launch",
        description:
          "$500 to start and $500 after approval, before production launch. The initial deposit becomes non-refundable once intake begins, except where the written agreement or applicable law requires otherwise.",
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
      <section className={styles.hero} aria-labelledby="premier-title">
        <div className={styles.shell}>
          <div className={styles.brandRow}>
            <Image
              src="/images/brand/premier-dental-academy-logo.png"
              alt="Premier Dental Academy tooth and graduation cap logo"
              width={64}
              height={64}
            />
            <div>
              <strong>Premier Dental Academy of Longview</strong>
              <span>Client spotlight · Longview, Texas</span>
            </div>
          </div>
          <div className={styles.heroGrid}>
            <div>
              <p className={styles.kicker}>
                A school. A team. A connected system.
              </p>
              <h1 id="premier-title">
                A new career starts <em>with a person.</em>
              </h1>
              <p className={styles.lead}>
                Amanda and her team help people take their next step into dental
                assisting. We built the website and tools that help that first
                question become a clear path to learning.
              </p>
              <div className={styles.actions}>
                <a href="#student-path" className={styles.primary}>
                  See how it works <ArrowRight aria-hidden="true" size={18} />
                </a>
                <a href="#website-launch" className={styles.secondary}>
                  Build this kind of clarity for my business
                </a>
              </div>
              <p className={styles.note}>
                Premier’s people teach and support the students. The LeadFlow
                Pro connects the technology behind their work.
              </p>
            </div>
            <figure className={styles.heroVisual}>
              <Image
                src="/images/premier/academy-learning-20260907.webp"
                alt="Premier-inspired dental training illustration with a dental chair, tooth model, and learning tools in academy blue and teal"
                width={1440}
                height={810}
                priority
                sizes="(max-width: 850px) 100vw, 52vw"
              />
              <figcaption>
                <span>The learning experience · illustrated</span>
                <strong>
                  Explore the school. Take the next step. Practice the work.
                </strong>
              </figcaption>
            </figure>
          </div>
          <nav
            className={styles.jumpLinks}
            aria-label="Explore the Premier story"
          >
            <a href="#meet-amanda">
              Meet Amanda <ArrowRight size={15} aria-hidden="true" />
            </a>
            <a href="#student-path">
              Follow the student path{" "}
              <ArrowRight size={15} aria-hidden="true" />
            </a>
            <a href="#try-the-tools">
              Try the real tools <ArrowRight size={15} aria-hidden="true" />
            </a>
            <a href="#website-launch">
              Plan your own build <ArrowRight size={15} aria-hidden="true" />
            </a>
          </nav>
        </div>
      </section>

      <section
        id="meet-amanda"
        className={styles.section}
        aria-labelledby="amanda-title"
      >
        <div className={`${styles.shell} ${styles.amandaGrid}`}>
          <figure className={styles.portrait}>
            <Image
              src="/images/premier/amanda-williams.jpg"
              alt="Amanda Williams, owner and director of Premier Dental Academy of Longview"
              width={750}
              height={1000}
              sizes="(max-width: 650px) 100vw, 35vw"
            />
            <figcaption>
              <strong>Amanda Williams</strong>
              <span>Owner & Director · Registered Dental Assistant</span>
            </figcaption>
          </figure>
          <div>
            <p className={styles.kicker}>The person behind Premier</p>
            <h2 id="amanda-title">
              She sat in the student’s chair.
              <br />
              <em>Now she leads the school.</em>
            </h2>
            <p className={styles.lead}>
              Amanda graduated from Premier, worked chairside in East Texas, and
              came back to own the academy. Today, she teaches and mentors
              students in Longview.
            </p>
            <p>
              That experience belongs at the center of this story. The school’s
              instructors, enrollment team, and students bring the work to life.
              The website helps people see it, ask for help, and take a useful
              next step.
            </p>
            <div className={styles.creditCards}>
              <div>
                <Users aria-hidden="true" />
                <strong>Premier’s contribution</strong>
                <p>
                  The teaching, student support, enrollment conversations, and
                  school experience.
                </p>
              </div>
              <div>
                <Monitor aria-hidden="true" />
                <strong>The LeadFlow Pro’s contribution</strong>
                <p>
                  The connected website, enrollment tools, learning environment,
                  and back office.
                </p>
              </div>
            </div>
            <a
              className={styles.textLink}
              href={`${PREMIER}/about`}
              target="_blank"
              rel="noreferrer"
            >
              Read Amanda’s story at Premier{" "}
              <ArrowRight size={17} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <section
        id="student-path"
        className={`${styles.section} ${styles.tinted}`}
        aria-labelledby="path-title"
      >
        <div className={styles.shell}>
          <header className={styles.sectionHeader}>
            <p className={styles.kicker}>What the system makes easier</p>
            <h2 id="path-title">
              “Could I do this?”
              <br />
              <em>Give that question somewhere to go.</em>
            </h2>
            <p>
              A person should see the school, understand the next step, and find
              someone who can help. Follow the path below; every button opens
              part of Premier’s real website.
            </p>
          </header>
          <figure className={styles.students}>
            <Image
              src="/images/premier/premier-students.jpg"
              alt="Premier Dental Academy students in blue scrubs outside the Longview campus"
              width={1000}
              height={750}
              sizes="(max-width: 760px) 100vw, 70vw"
            />
            <figcaption>
              <span>Real people. A real academy.</span>
              <strong>This is the school behind the system.</strong>
              <p>Longview, Texas · Published academy photography</p>
            </figcaption>
          </figure>
          <ol className={styles.pathGrid}>
            {STUDENT_PATH.map(({ icon: Icon, ...step }, index) => (
              <li key={step.title}>
                <div className={styles.stepTop}>
                  <span>0{index + 1}</span>
                  <Icon size={26} aria-hidden="true" />
                </div>
                <h3>{step.title}</h3>
                <p>{step.detail}</p>
                <a href={step.href} target="_blank" rel="noreferrer">
                  {step.action}
                  <ArrowRight size={17} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="try-the-tools"
        className={styles.section}
        aria-labelledby="tools-title"
      >
        <div className={styles.shell}>
          <header className={styles.sectionHeader}>
            <p className={styles.kicker}>Open it. Try it. Understand it.</p>
            <h2 id="tools-title">
              The lesson can keep going <em>after class.</em>
            </h2>
            <p>
              Premier pairs instructor-led learning with tools for practicing
              the work. These links open the academy’s own training experiences.
            </p>
          </header>
          <div className={styles.learningGrid}>
            <figure className={styles.classroom}>
              <Image
                src="/images/premier/premier-classroom.jpg"
                alt="Premier students practicing with dental tooth models in the classroom"
                width={1000}
                height={750}
                sizes="(max-width: 850px) 100vw, 50vw"
              />
              <figcaption>
                Hands-on learning at Premier’s Longview campus.
              </figcaption>
            </figure>
            <div className={styles.toolCards}>
              <a
                href={`${PREMIER}/tools/practice-pro`}
                target="_blank"
                rel="noreferrer"
              >
                <Monitor size={28} aria-hidden="true" />
                <div>
                  <span>At the front desk</span>
                  <h3>Practice Pro</h3>
                  <p>
                    Explore scheduling, charting, and the everyday flow of a
                    dental office in a training environment.
                  </p>
                  <strong>
                    Open the trainer <ArrowRight size={17} aria-hidden="true" />
                  </strong>
                </div>
              </a>
              <a
                href={`${PREMIER}/skills-lab/virtual-office`}
                target="_blank"
                rel="noreferrer"
              >
                <GraduationCap size={28} aria-hidden="true" />
                <div>
                  <span>Beside the dental chair</span>
                  <h3>Virtual Dental Office</h3>
                  <p>
                    Explore the operatory, discover the stations, and practice
                    setting up an instrument tray.
                  </p>
                  <strong>
                    Step inside the office{" "}
                    <ArrowRight size={17} aria-hidden="true" />
                  </strong>
                </div>
              </a>
              <p className={styles.note}>
                Training tools use fictional practice scenarios. They support
                learning; they do not replace an instructor or clinical
                supervision.
              </p>
            </div>
          </div>
          <div className={styles.studentCallout}>
            <div>
              <p className={styles.kicker}>Thinking about dental assisting?</p>
              <h3>Meet Amanda. See Premier for yourself.</h3>
              <p>
                Amanda’s team can answer questions about programs, class dates,
                and enrollment.
              </p>
            </div>
            <a
              className={styles.primary}
              href={`${PREMIER}/tour`}
              target="_blank"
              rel="noreferrer"
            >
              Request a school tour <ArrowRight size={18} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <section
        className={`${styles.section} ${styles.tinted}`}
        aria-labelledby="system-title"
      >
        <div className={styles.shell}>
          <header className={styles.sectionHeader}>
            <p className={styles.kicker}>Behind the experience</p>
            <h2 id="system-title">
              One school.
              <br />
              <em>Seven connected parts.</em>
            </h2>
            <p>
              Each part has a job. Together, they support the people running the
              academy and the students finding their way through it.
            </p>
          </header>
          <div className={styles.systemGrid}>
            {SYSTEM_PIECES.map(({ icon: Icon, name, detail }) => (
              <article key={name}>
                <Icon size={28} aria-hidden="true" />
                <h3>{name}</h3>
                <p>{detail}</p>
              </article>
            ))}
          </div>
          <div className={styles.proofLink}>
            <ShieldCheck aria-hidden="true" />
            <p>
              Want the numbers too? The academy’s board shows aggregate activity
              and explains what each metric counts.
            </p>
            <Link href="/businesses/premier-dental-academy-of-longview">
              View Premier’s board <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section
        id="website-launch"
        className={styles.section}
        aria-labelledby="launch-title"
      >
        <div className={styles.shell}>
          <header className={styles.sectionHeader}>
            <p className={styles.kicker}>Now picture your own business</p>
            <h2 id="launch-title">
              Start with a clearer website.
              <br />
              <em>Build the next pieces from there.</em>
            </h2>
            <p>
              Premier is a larger, separately scoped system. Our Website Launch
              starts with the public foundation: five agreed pages and one clear
              way for customers to reach you.
            </p>
          </header>
          <div className={styles.offerGrid}>
            <div className={styles.scopeList}>
              {WEBSITE_LAUNCH_SCOPE.map((item) => (
                <div key={item.number}>
                  <Check aria-hidden="true" size={20} />
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <aside className={styles.priceCard}>
              <span>Website Launch · fixed scope</span>
              <strong>$1,000</strong>
              <p>$500 to start. $500 after approval, before launch.</p>
              <a
                href={WEBSITE_LAUNCH_CHECKOUT}
                className={styles.primary}
                data-cta="premier_launch_checkout"
                data-cta-placement="premier_offer"
              >
                Start my website · $500{" "}
                <ArrowRight size={18} aria-hidden="true" />
              </a>
              <small>
                Checkout through Longview Training Center, LLC. Once intake
                begins, the deposit is non-refundable, except where the written
                agreement or applicable law requires otherwise.
              </small>
              <a href="#talk-about-your-build" className={styles.textLink}>
                Need a larger system? Talk to Ryan{" "}
                <ArrowRight size={17} aria-hidden="true" />
              </a>
            </aside>
          </div>
          <div className={styles.bonus}>
            <BookOpen size={25} aria-hidden="true" />
            <div>
              <h3>Three custom visual scenes included at the founding rate.</h3>
              <p>
                A hero image, a process visual, and a proof or approval scene,
                planned for your business within the agreed five-page scope.
              </p>
            </div>
          </div>
          <ol className={styles.milestones}>
            {MILESTONES.map((step) => (
              <li key={step.number}>
                <span>{step.number}</span>
                <h3>{step.name}</h3>
                <p>{step.detail}</p>
              </li>
            ))}
          </ol>
          <details className={styles.scopeDetails}>
            <summary>What needs a separate scope and price?</summary>
            <ul>
              {EXCLUSIONS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </details>
        </div>
      </section>

      <section
        id="talk-about-your-build"
        className={`${styles.section} ${styles.tinted}`}
        aria-labelledby="contact-title"
      >
        <div className={`${styles.shell} ${styles.contactGrid}`}>
          <div>
            <p className={styles.kicker}>For business owners</p>
            <h2 id="contact-title">
              What should your website <em>help people do?</em>
            </h2>
            <p className={styles.lead}>
              Tell Ryan what you sell and where people get stuck. We’ll talk
              through a practical starting point for your business.
            </p>
            <p>
              This message goes to The LeadFlow Pro. For classes or enrollment,{" "}
              <a className={styles.inlineLink} href={`${PREMIER}/contact`}>
                contact Premier’s team
              </a>
              .
            </p>
            <Link className={styles.textLink} href="/portfolio">
              See more businesses we’ve built for{" "}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.formCard}>
            <ContactForm />
          </div>
        </div>
      </section>
      <section className={styles.section} aria-labelledby="faq-title">
        <div className={`${styles.shell} ${styles.faqGrid}`}>
          <header>
            <p className={styles.kicker}>Straight answers</p>
            <h2 id="faq-title">Before you start.</h2>
          </header>
          <div className={styles.faqList}>
            {FAQ.map((item) => (
              <details key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
