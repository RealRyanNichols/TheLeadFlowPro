import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import RyanFounderProof from "@/components/site/RyanFounderProof";
import { RYAN_PROOF } from "@/lib/site/ryanProof";
import styles from "./about-story.module.css";

export const metadata = withPublicPageMetadata("/about", {
  title: "Meet Ryan Nichols & the LeadFlow Team | The LeadFlow Pro",
  description: "Ryan’s operating and ecommerce experience. Patrick’s marketing, funnel and advisory work. Meet the people helping businesses and communities grow with LeadFlow.",
});

export default function AboutPage() {
  return <main className={styles.page}>
    <section className={`lf-shell ${styles.hero}`}>
      <p className={styles.eyebrow}>RYAN NICHOLS / THE LEADFLOW TEAM</p>
      <h1>The people.<br />The experience.<br /><em>The work ahead.</em></h1>
      <div className={styles.heroBottom}><p>Running a business teaches you what needs to connect. Building campaigns teaches you how to get people moving. Ryan and Patrick bring those experiences together for local businesses, online businesses and communities.</p><Link className={styles.button} href="/#client-stories">Hear the client stories <ArrowRight size={18} aria-hidden="true" /></Link></div>
      <div className={styles.team}><article><span>01 / RYAN NICHOLS</span><h2>From the operation<br />to the system.</h2><p>Wholesale Universe, ecommerce, fulfillment and hands-on content work. Ryan brings the experience of running the operation to websites and connected business tools.</p><a href="#ryans-story">Explore Ryan’s story <ArrowRight size={17} aria-hidden="true" /></a></article><article><span>02 / PATRICK</span><h2>From the offer<br />to the conversation.</h2><p>Patrick’s past clients and collaborators describe his funnel building, marketing, offer development and business support. Their original interviews show the work in their own words.</p><a href="#patrick">Explore Patrick’s experience <ArrowRight size={17} aria-hidden="true" /></a></article></div>
    </section>
    <RyanFounderProof full />
    <section className={`lf-shell ${styles.section}`} id="wholesale-universe">
      <p className={styles.eyebrow}>THE WHOLESALE UNIVERSE ARCHIVE</p><h2>Product on the floor.<br /><em>A business to run.</em></h2><p className={styles.lead}>At Wholesale Universe, Ryan handled sourcing, inventory and the work behind each order. His operating experience connects the sales conversation to what happens after someone buys.</p>
      <div className={styles.gallery}><figure><Image src="/images/ryan-wholesale-universe-2015-pallets.jpg" alt="Ryan beside stacked merchandise cartons and a trailer, from the Wholesale Universe archive" width={1800} height={1350} sizes="(max-width:800px) 100vw, 60vw" /><figcaption>Ryan with inventory from the Wholesale Universe archive.</figcaption></figure><figure><Image src="/images/wholesale-universe-michael-kors-load-1.jpg" alt="Merchandise inventory from a Wholesale Universe load" width={768} height={1024} sizes="(max-width:800px) 100vw, 40vw" /><figcaption>Merchandise from the Wholesale Universe inventory archive.</figcaption></figure></div>
      <p className={styles.lead}>In July 2018, Ryan spoke at the Midwest E-Com Conference on sourcing and scaling as Wholesale Universe’s owner and president.</p><a className={styles.textLink} href={RYAN_PROOF.wholesaleSource} target="_blank" rel="noopener noreferrer">View the 2018 conference listing <ArrowUpRight size={16} aria-hidden="true" /></a>
    </section>
    <section className={styles.patrick} id="patrick"><div className="lf-shell"><p className={styles.eyebrow}>PATRICK’S MARKETING & ADVISORY WORK</p><h2>The experience behind<br /><em>the next move.</em></h2><p className={styles.lead}>Offers, funnels, campaigns and conversations. Hear how earlier clients and collaborators describe working with Patrick, in the markets and roles where that work happened.</p><div className={styles.references}><article><span>FUNNELS & COLLABORATION</span><h3>Ryan Stewman</h3><p>Describes years of funnel work, teamwork and attention to the goals of the business.</p></article><article><span>OFFERS & ADVISORY</span><h3>Katrina Ruth</h3><p>Describes a conversation with Patrick that helped her launch a mastermind.</p></article><article><span>COACHING & BUSINESS SUPPORT</span><h3>Glenn Smith</h3><p>Shares the support and clarity he experienced while building his coaching business.</p></article></div><Link className={styles.button} href="/#client-stories">Watch the original testimonials <ArrowRight size={18} aria-hidden="true" /></Link><p className={styles.note}>Historical experiences retain their original context. They do not establish a particular outcome for another business.</p></div></section>
    <section className={`lf-shell ${styles.section}`}><p className={styles.eyebrow}>THE WORK TOGETHER</p><h2>A clear message.<br /><em>A connected next step.</em></h2><p className={styles.lead}>At LeadFlow, Ryan’s operating and content experience comes together with Patrick’s strategy and marketing work. The aim is practical: connect what you offer to the people it helps, then make the inquiry, purchase and follow-up easier to manage.</p><div className={styles.work}><div><h3>See the Premier academy build.</h3><p>A website, enrollment path, practice tools and student portal around a real school. Amanda Williams leads the academy; its staff deliver the education and support.</p><p className={styles.note}>Premier Dental Academy and LeadFlow share an ownership group.</p></div><Link className={styles.textLink} href="/premier-system">Explore the system <ArrowRight size={18} aria-hidden="true" /></Link></div></section>
    <section className={styles.close}><div className="lf-shell"><p className={styles.eyebrow}>YOUR NEXT CHAPTER</p><h2>What are you<br /><em>ready to grow?</em></h2><p>Bring your business, your community or the idea you’re working on. Start with a free 30-minute consultation.</p><Link className={styles.button} href="/#free-consultation">Book my free consultation <ArrowRight size={18} aria-hidden="true" /></Link></div></section>
  </main>;
}
