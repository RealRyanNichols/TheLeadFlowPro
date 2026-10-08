import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, Check, Globe2, MapPin, Users, Sparkles, Play, Layers3 } from "lucide-react";
import ConsultationForm from "@/components/site/ConsultationForm";
import HomeScoreboard from "@/components/site/HomeScoreboard";
import HomeProofStories from "@/components/site/HomeProofStories";
import SeptemberSpecialNotice from "@/components/site/SeptemberSpecialNotice";
import { TOOL_COUNT } from "@/lib/tools";
import { BUSINESS } from "@/lib/site/business";
import { CONSULTATION } from "@/lib/site/consultation";
import { managedUpfrontSummary, managedCampaignSummary } from "@/lib/site/managedPlans";
import { graph, jsonLdText, localBusinessJsonLd, organizationJsonLd, webPageJsonLd, websiteJsonLd } from "@/lib/site/structuredData";
import styles from "./growth-home.module.css";

const TITLE = "Grow Your Business & Community | The LeadFlow Pro";
const DESCRIPTION = "Websites, marketing, content and follow-up for local businesses, online businesses and communities. Build your next move with Ryan Nichols and The LeadFlow Pro.";
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
            <p className={styles.eyebrow}><span />THE LEADFLOW PRO / YOUR NEXT MOVE</p>
            <h1>Grow the business.<br />Build the following.<br /><em>Own what’s next.</em></h1>
            <p className={styles.intro}>For the business on Main Street. The brand selling online. The community bringing people together. We build the websites, marketing and follow-up that help you grow.</p>
            <div className={styles.actions}><a className={styles.button} href={CONSULT_HREF} data-cta="consultation_cta" data-cta-placement="home_hero_copy">Let’s build your next move <ArrowUpRight size={20} aria-hidden="true" /></a><a className={styles.textLink} href="#client-stories"><Play size={15} aria-hidden="true" />Hear the stories</a></div>
            <p className={styles.heroNote}>Start with a free {CONSULTATION.minutes}-minute conversation. Your business. Your accounts. Your direction.</p>
          </div>
          <div className={styles.heroVisual}>
            <figure className={styles.heroPhoto}><Image src="/images/ryan-wholesale-universe-owner.jpg" alt="Ryan Nichols above pallets of inventory in the Wholesale Universe warehouse" width={1800} height={1350} sizes="(max-width:800px) 92vw, 44vw" priority /><figcaption><span>RYAN NICHOLS / WHOLESALE UNIVERSE</span><strong>Business experience.<br />Put to work for you.</strong><Link href="/about">Meet Ryan Nichols <ArrowUpRight size={18} aria-hidden="true" /></Link></figcaption></figure>
            <Link className={styles.archiveCard} href="/about"><Image src="/images/ryan-meta-raybans-production-clean.jpg" alt="Ryan Nichols wearing smart glasses" width={768} height={1024} sizes="100px" /><span>MEET YOUR BUSINESS GUIDE<strong>Meet Ryan Nichols <ArrowUpRight size={15} aria-hidden="true" /></strong></span></Link>
            <div className={styles.visualStamp} aria-hidden="true"><Sparkles size={18} />BUILT AROUND<br />YOUR AMBITION</div>
          </div>
        </div>
        <div className={styles.heroBottom}><span><MapPin size={16} aria-hidden="true" />Local businesses</span><span><Globe2 size={16} aria-hidden="true" />Online businesses</span><span><Users size={16} aria-hidden="true" />Communities &amp; creators</span><a href="#possibilities">Find your next move <ArrowRight size={17} aria-hidden="true" /></a></div>
      </div>
    </section>

    <section className={`${styles.wrap} ${styles.section}`} id="possibilities" aria-labelledby="possibilities-title">
      <div className={styles.sectionHead}><div><p className={styles.eyebrow}>WHERE DO YOU WANT TO GROW?</p><h2 id="possibilities-title">Different businesses.<br /><em>Big possibilities.</em></h2></div><p>More customers. A stronger online presence. A place for people to connect. Start with what you’re building, and we’ll help connect the next steps.</p></div>
      <div className={styles.audienceGrid}>
        <article className={styles.audienceCard} id="contractor-example"><Image src="/images/contractors/scott-cab-hero.jpg" alt="Scott and Ryan on location with O-L Guy Farms" width={1200} height={800} sizes="(max-width:800px) 100vw, 33vw" /><div><span className={styles.index}>01 / LOCAL BUSINESSES</span><h3>Be the business<br />people ask for.</h3><p>Show your work, reach the right people and give each inquiry a clear path to a conversation.</p><Link href="/agency">Grow your local business <ArrowUpRight size={18} aria-hidden="true" /></Link></div></article>
        <article className={styles.audienceCard}><Image src="/images/ryan-wholesale-universe-designer-rack-sale.jpg" alt="Merchandise display from the Wholesale Universe business archive" width={480} height={360} sizes="(max-width:800px) 100vw, 33vw" /><div><span className={styles.index}>02 / ONLINE BUSINESSES</span><h3>Turn your offer<br />into a destination.</h3><p>Connect your storefront, content and customer journey so people understand what you sell and how to buy.</p><Link href="/commerce">Build your online business <ArrowUpRight size={18} aria-hidden="true" /></Link></div></article>
        <article className={styles.audienceCard}><Image src="/images/portfolio/belize-mission-team.jpg" alt="Team photo from the Belize mission project featured in the LeadFlow portfolio" width={1032} height={928} sizes="(max-width:800px) 100vw, 33vw" /><div><span className={styles.index}>03 / COMMUNITIES &amp; CREATORS</span><h3>Give people<br />a place to belong.</h3><p>Bring your purpose, content, learning and member experience into a place people can find and use.</p><Link href="/agency/community-help-desk">Explore community support <ArrowUpRight size={18} aria-hidden="true" /></Link></div></article>
      </div>
    </section>

    <HomeProofStories />

    <section className={`${styles.wrap} ${styles.section}`} id="what-we-do" aria-labelledby="services-title">
      <div className={styles.sectionHead}><div><p className={styles.eyebrow}>MAKE THE PIECES WORK TOGETHER</p><h2 id="services-title">A better website.<br /><em>A bigger plan.</em></h2></div><p>You might need one great project. You might need a team to run the marketing. We’ll help you choose the scope that fits.</p></div>
      <div className={styles.serviceGrid}>
        <article className={styles.projectPath}><span className={styles.index}>BUILD SOMETHING GREAT</span><h3>Your next website.<br />Storefront. Customer journey.</h3><p>Bring the idea and the way your business works. We shape the experience, build the pages and connect the practical next steps.</p><div className={styles.serviceLinks}><Link href="/agency/websites">Websites &amp; funnels <ArrowUpRight size={16} /></Link><Link href="/commerce">Stores &amp; online sales <ArrowUpRight size={16} /></Link><Link href="/agency/automation">Follow-up &amp; connected systems <ArrowUpRight size={16} /></Link></div><Link className={styles.outlineButton} href="/services">Explore project services <ArrowRight size={18} /></Link><small>Projects are scoped and quoted separately. Review the written scope before committing.</small></article>
        <article className={styles.growthPath}><span className={styles.index}>PUT A TEAM BEHIND YOUR GROWTH</span><h3>The campaign.<br />The content. The follow-through.</h3><p>Bring your offer and your goals. We connect the website, advertising, content and follow-up around an agreed campaign.</p><div className={styles.serviceLinks}><Link href="/agency/meta-ads">Facebook &amp; Instagram campaigns <ArrowUpRight size={16} /></Link><Link href="/agency/google-ads">Search campaigns <ArrowUpRight size={16} /></Link><Link href="/agency/content">Content &amp; creative <ArrowUpRight size={16} /></Link></div><Link className={styles.button} href="/agency">Explore managed growth <ArrowRight size={18} /></Link><small><Link href="/pricing">{managedUpfrontSummary()} {managedCampaignSummary()}</Link></small></article>
      </div>
    </section>

    <section className={styles.workSection} aria-labelledby="work-title"><div className={styles.wrap}>
      <div className={styles.sectionHead}><div><p className={styles.eyebrow}>FROM THE PORTFOLIO</p><h2 id="work-title">Work with a purpose.<br /><em>Built for real people.</em></h2></div><Link className={styles.textLink} href="/portfolio">Explore the work <ArrowUpRight size={19} /></Link></div>
      <div className={styles.workGrid}>
        <article id="education-example"><Link href="/premier-system" className={styles.workImage}><Image src="/images/premier/premier-classroom.jpg" alt="Students practicing with dental models at Premier Dental Academy" width={1000} height={750} sizes="(max-width:800px) 100vw, 60vw" /><span>EDUCATION / ENROLLMENT / STUDENT TOOLS</span></Link><h3>Premier Dental Academy</h3><p>A real school with a connected website, enrollment journey, practice tools and student portal.</p><Link href="/premier-system">Explore the academy system <ArrowUpRight size={17} /></Link><small>Premier and LeadFlow share an ownership group. Amanda Williams leads the academy; its team delivers the education and student support.</small></article>
        <article><Link href="/portfolio" className={styles.workImage}><Image src="/images/portfolio/lone-star-fleet-before-after.jpg" alt="Truck before and after washing, from Lone Star Total Wash’s completed-jobs gallery" width={1400} height={933} sizes="(max-width:800px) 100vw, 40vw" /><span>BUSINESS WEBSITES / CLEARER CUSTOMER PATHS</span></Link><h3>Lone Star Total Wash</h3><p>A business website built around its services, completed jobs and a clear way to ask for a quote.</p><Link href="/portfolio">See more projects <ArrowUpRight size={17} /></Link><small>The washing shown was performed by Lone Star Total Wash’s crew. LeadFlow’s project was the website.</small></article>
      </div>
    </div></section>

    <section className={`${styles.wrap} ${styles.section}`} aria-labelledby="process-title"><div className={styles.sectionHead}><div><p className={styles.eyebrow}>A CLEAR WAY FORWARD</p><h2 id="process-title">Bring the ambition.<br /><em>We’ll work on the next move.</em></h2></div><p>Start with a conversation, get specific about the work, and build around the outcome you want.</p></div><ol className={styles.steps}><li><span>01</span><h3>Talk it through.</h3><p>Show Ryan your business, website or idea. Meet by phone or video, or in person around Longview and East Texas.</p></li><li><span>02</span><h3>Make a clear plan.</h3><p>Agree on the audience, scope, ownership, priorities and what happens next. Know what you’re buying before work begins.</p></li><li><span>03</span><h3>Build. Learn. Improve.</h3><p>Connect the work to the customer journey. Review inquiries and outcomes where the connected records support them.</p></li></ol></section>

    <section className={styles.consultSection} id={CONSULTATION.anchor} aria-labelledby="free-consultation-title"><div className={`${styles.wrap} ${styles.consultGrid}`}>
      <div className={styles.consultIntro}><p className={styles.eyebrow}>FREE {CONSULTATION.minutes}-MINUTE CONSULTATION</p><h2 id="free-consultation-title">Let’s talk about<br /><em>what’s next for you.</em></h2><p>A local business. An online offer. A community you believe in. Bring what you have and where you want to go.</p><ul><li><Check size={18} />A real conversation about your business.</li><li><Check size={18} />A practical place to start.</li><li><Check size={18} />A clear next step and scope that fits.</li></ul><a href={BUSINESS.phone.tel} className={styles.textLink}>Prefer to talk? {BUSINESS.phone.display} <ArrowUpRight size={18} /></a><p className={styles.consultBase}>Based in Longview, Texas. Working with businesses and communities online and on location.</p></div>
      <div className={`lf-consult ${styles.consultCard}`}><ConsultationForm placement={CONSULTATION.placement} labelledBy="free-consultation-title" /></div>
    </div></section>

    <section className={`${styles.wrap} ${styles.section}`} id="results" aria-labelledby="score-title"><div className={styles.sectionHead}><div><p className={styles.eyebrow}>OPEN THE NUMBERS</p><h2 id="score-title">See what the<br /><em>records actually show.</em></h2></div><p>Explore activity from our own businesses. Each board explains what its numbers measure, including where lead records differ from customers and sales.</p></div><HomeScoreboard /><div className={styles.actions}><Link className={styles.outlineButton} href="/scoreboard">Explore the scoreboards <ArrowUpRight size={18} /></Link><Link className={styles.textLink} href="/results">More results &amp; context <ArrowRight size={18} /></Link></div></section>

    <section className={styles.resources}><div className={styles.wrap}><div><p className={styles.eyebrow}>KEEP BUILDING</p><h2>A few tools<br />for your next move.</h2></div><Link href="/tools"><Layers3 size={23} /><span><strong>{TOOL_COUNT} free business tools</strong><small>Plan, price and work through an idea.</small></span><ArrowUpRight size={20} /></Link><Link href="/articles"><Globe2 size={23} /><span><strong>Guides you can use</strong><small>Practical answers for the work ahead.</small></span><ArrowUpRight size={20} /></Link><Link href="/academy"><Sparkles size={23} /><span><strong>Learn at your pace</strong><small>Explore the academy and learning resources.</small></span><ArrowUpRight size={20} /></Link></div></section>
  </main>;
}
