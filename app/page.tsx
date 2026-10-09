import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, Check, GraduationCap, HardHat, Users, ShieldCheck, Play } from "lucide-react";
import ConsultationForm from "@/components/site/ConsultationForm";
import HomeProofStories from "@/components/site/HomeProofStories";
import BusinessResults from "@/components/site/BusinessResults";
import VeteranStory from "@/components/site/VeteranStory";
import SeptemberSpecialNotice from "@/components/site/SeptemberSpecialNotice";
import { BUSINESS } from "@/lib/site/business";
import { CONSULTATION } from "@/lib/site/consultation";
import { managedUpfrontSummary, managedCampaignSummary } from "@/lib/site/managedPlans";
import { graph, jsonLdText, localBusinessJsonLd, organizationJsonLd, webPageJsonLd, websiteJsonLd } from "@/lib/site/structuredData";
import styles from "./growth-home.module.css";
import results from "./results-home.module.css";

const TITLE = "More of the Right Customers. More Predictable Growth. | The LeadFlow Pro";
const DESCRIPTION = "Grow your business, school or paid community with clear expectations, an agreed budget and a target cost per result. Veteran-owned and operated.";
export const metadata = withPublicPageMetadata("/", { title: TITLE, description: DESCRIPTION });
export const revalidate = 900;
const HOME_JSONLD = graph(organizationJsonLd(), localBusinessJsonLd(), websiteJsonLd(), webPageJsonLd("/", TITLE, DESCRIPTION));
const CONSULT_HREF = `#${CONSULTATION.anchor}`;

export default function HomePage() {
  return <main className={`lf-home ${styles.page}`}>
    <SeptemberSpecialNotice />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(HOME_JSONLD) }} />
    <section className={styles.hero}>
      <div className={styles.heroGlow} aria-hidden="true" />
      <div className={styles.wrap}>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <p className={`${styles.eyebrow} ${results.veteranBadge}`}><ShieldCheck size={18} />VETERAN-OWNED &amp; OPERATED</p>
            <h1>More of the right customers.<br /><em>More predictable growth.</em></h1>
            <p className={styles.intro}><strong>Fill your job schedule. Fill your classrooms. Grow your paid community.</strong> We bring greater certainty to your growth plan with clear expectations, an agreed budget and a target cost per result.</p>
            <p className={results.heroPromise}>Know the plan. Know the investment. See the results.</p>
            <div className={styles.actions}><a className={styles.button} href={CONSULT_HREF} data-cta="consultation_cta" data-cta-placement="home_hero_copy">Plan my next results <ArrowUpRight size={20} aria-hidden="true" /></a><a className={styles.textLink} href="#results"><Play size={15} aria-hidden="true" />See the numbers</a></div>
            <p className={styles.heroNote}>Start with a free {CONSULTATION.minutes}-minute conversation about your customers, margins and capacity. Agree on the result and the target cost before work begins.</p>
          </div>
          <div className={styles.heroVisual}>
            <figure className={styles.heroPhoto}><Image src="/images/ryan-wholesale-universe-owner.jpg" alt="Ryan Nichols above pallets of inventory in the Wholesale Universe warehouse" width={1800} height={1350} sizes="(max-width:800px) 92vw, 44vw" priority /><figcaption><span>RYAN NICHOLS / MARINE CORPS VETERAN</span><strong>He knows what it takes<br />to run a business.</strong><a href="#ryans-story">Meet Ryan. Watch his story. <ArrowUpRight size={18} aria-hidden="true" /></a></figcaption></figure>
            <a className={styles.archiveCard} href="#ellen-home"><Image src="/images/proof/ryan-ellen-studio.jpg" alt="Ryan Nichols with Ellen DeGeneres" width={854} height={480} sizes="100px" /><span>THE ELLEN APPEARANCE<strong>Watch Ryan’s rescue story <Play size={15} aria-hidden="true" /></strong></span></a>
            <div className={styles.visualStamp} aria-hidden="true"><ShieldCheck size={18} />VETERAN OWNED<br />OWNER OPERATED</div>
          </div>
        </div>
        <div className={styles.heroBottom}><span><HardHat size={16} aria-hidden="true" />High-value jobs</span><span><GraduationCap size={16} aria-hidden="true" />Student enrollments</span><span><Users size={16} aria-hidden="true" />Paying customers &amp; members</span><a href="#possibilities">Find your result <ArrowRight size={17} aria-hidden="true" /></a></div>
      </div>
    </section>

    <BusinessResults />

    <section className={`${styles.wrap} ${styles.section}`} id="possibilities" aria-labelledby="possibilities-title">
      <div className={styles.sectionHead}><div><p className={styles.eyebrow}>WHAT DOES A WIN LOOK LIKE FOR YOU?</p><h2 id="possibilities-title">Start with the result.<br /><em>Make the numbers work.</em></h2></div><p>The right customer is worth more than a busy inbox. We work backward from what you sell, what it costs to deliver and how much business you can handle.</p></div>
      <div className={styles.audienceGrid}>
        <article className={styles.audienceCard} id="contractor-example"><Image src="/images/contractors/scott-cab-hero.jpg" alt="Scott and Ryan on location with O-L Guy Farms" width={1200} height={800} sizes="(max-width:800px) 100vw, 33vw" /><div><span className={styles.index}>01 / CONTRACTORS &amp; LOCAL BUSINESSES</span><h3>Win jobs worth<br />rolling out for.</h3><p>Dirt work. Land clearing. Ponds. We focus on customers whose project, location and budget fit your equipment, crew and margins.</p><a href={CONSULT_HREF}>Plan for higher-value jobs <ArrowUpRight size={18} aria-hidden="true" /></a></div></article>
        <article className={styles.audienceCard} id="education-example"><Image src="/images/premier/premier-classroom.jpg" alt="Students learning practical dental skills at Premier Dental Academy" width={1000} height={750} sizes="(max-width:800px) 100vw, 33vw" /><div><span className={styles.index}>02 / SCHOOLS &amp; TRAINING PROGRAMS</span><h3>Fill the next class<br />with the right students.</h3><p>Turn interest into enrollment and tuition payments. Start with your program, available seats, admissions process and the cost you can afford per enrolled student.</p><a href={CONSULT_HREF}>Plan for more enrollments <ArrowUpRight size={18} aria-hidden="true" /></a></div></article>
        <article className={styles.audienceCard}><Image src="/images/ryan-wholesale-universe-designer-rack-sale.jpg" alt="Merchandise from Ryan’s Wholesale Universe business archive" width={480} height={360} sizes="(max-width:800px) 100vw, 33vw" /><div><span className={styles.index}>03 / ONLINE BUSINESSES &amp; COMMUNITIES</span><h3>Bring in customers.<br />Build lasting value.</h3><p>Grow product sales, paid memberships or program sign-ups around an offer people want and an acquisition cost your business can support.</p><a href={CONSULT_HREF}>Plan my next customers <ArrowUpRight size={18} aria-hidden="true" /></a></div></article>
      </div>
    </section>

    <VeteranStory />
    <HomeProofStories />

    <section className={`${styles.wrap} ${styles.section}`} id="what-we-do" aria-labelledby="result-plan-title">
      <div className={styles.sectionHead}><div><p className={styles.eyebrow}>A CLEAR COST. A CLEAR SCORECARD.</p><h2 id="result-plan-title">Know what counts.<br /><em>Know what it costs.</em></h2></div><p>We do the work the result requires. Your plan stays centered on the customer you want, the outcome we are measuring and the budget behind it.</p></div>
      <ol className={styles.steps}>
        <li><span>01</span><h3>Define a real result.</h3><p>An accepted job. A student who enrolls and makes the required payment. A paying customer or member. Agree on the definition and how we will verify it.</p></li>
        <li><span>02</span><h3>Set the target cost.</h3><p>Work back from your price, delivery costs and capacity. Set a sensible acquisition budget and a target cost per result in your written plan.</p></li>
        <li><span>03</span><h3>Measure. Improve. Repeat.</h3><p>Track verified outcomes against the agreed acquisition spend. Keep what works, address what gets in the way and make the next decision from actual results.</p></li>
      </ol>
      <div className={results.math}><div><span>THE NUMBER THAT MATTERS</span><strong>Total acquisition spend ÷ verified results</strong><p>Include the fees and advertising spend covered by your plan. Keep inquiries, accepted work and collected payments clear in the reporting.</p></div><a className={styles.button} href={CONSULT_HREF}>Work out my target cost <ArrowUpRight size={18} /></a></div>
      <p className={results.scopeNote}>Targets and outcomes depend on the agreed scope, your market and delivery capacity. Review your written plan for pricing, responsibilities and any specific commitments. <Link href="/pricing">{managedUpfrontSummary()} {managedCampaignSummary()}</Link></p>
    </section>

    <section className={styles.consultSection} id={CONSULTATION.anchor} aria-labelledby="free-consultation-title"><div className={`${styles.wrap} ${styles.consultGrid}`}>
      <div className={styles.consultIntro}><p className={styles.eyebrow}>FREE {CONSULTATION.minutes}-MINUTE RESULTS CONVERSATION</p><h2 id="free-consultation-title">What result would<br /><em>move your business?</em></h2><p>Tell Ryan what you sell, who you want to serve and what a good customer is worth. Let’s work out a practical path to more of them.</p><ul><li><Check size={18} />The jobs, students or customers you want.</li><li><Check size={18} />A target acquisition cost that fits your margins.</li><li><Check size={18} />Clear priorities, responsibilities and next steps.</li></ul><a href={BUSINESS.phone.tel} className={styles.textLink}>Prefer to talk? {BUSINESS.phone.display} <ArrowUpRight size={18} /></a><p className={styles.consultBase}>Based in Longview, Texas. Helping local and online businesses and communities grow.</p></div>
      <div className={`lf-consult ${styles.consultCard}`}><ConsultationForm placement={CONSULTATION.placement} labelledBy="free-consultation-title" /></div>
    </div></section>

    <section className={results.explore} aria-label="Explore more of LeadFlow"><div className={styles.wrap}><div><strong>More of the story.</strong><p>Explore our work, the people behind it and the ways we can help.</p></div><nav><Link href="/about">Meet Ryan &amp; the team <ArrowUpRight size={15} /></Link><Link href="/portfolio">See our work <ArrowUpRight size={15} /></Link><Link href="/services">Explore services <ArrowUpRight size={15} /></Link><Link href="/scoreboard">Business scoreboards <ArrowUpRight size={15} /></Link><Link href="/tools">Business resources <ArrowUpRight size={15} /></Link></nav></div></section>
  </main>;
}
