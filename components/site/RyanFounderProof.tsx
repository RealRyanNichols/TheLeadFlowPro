import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Warehouse, Tv, Layers3 } from "lucide-react";
import { RYAN_PROOF } from "@/lib/site/ryanProof";
import EllenVideo from "./EllenVideo";
import styles from "./ryan-founder-proof.module.css";

export default function RyanFounderProof({ full = false }: { full?: boolean }) {
  return <section className={styles.section} id="ryans-story" aria-labelledby="ryan-story-title">
    <div className="lf-shell">
      <div className={styles.intro}><p className="lf-eyebrow">MEET RYAN NICHOLS</p><h2 id="ryan-story-title">A business builder.<br /><em>A story you can see.</em></h2><p>Wholesale Universe. The Ellen appearance. The businesses and systems that came after. Explore the operating experience Ryan brings to the LeadFlow team.</p></div>
      <div className={styles.main}>
        <figure className={styles.photo}><Image src={RYAN_PROOF.warehouseImage} alt="Ryan Nichols standing above pallets in the Wholesale Universe warehouse" width={1800} height={1350} sizes="(max-width: 800px) 100vw, 55vw" /><figcaption>Ryan at Wholesale Universe · From the business archive</figcaption></figure>
        <div className={styles.story}><p className={styles.kicker}>WHOLESALE UNIVERSE / EST. {RYAN_PROOF.foundedYear}</p><h3>He built the business<br />before he built the tools.</h3><p>Ryan founded Wholesale Universe in 2015. Sourcing inventory, selling online, moving pallets and getting orders out the door were part of the job.</p><p>That experience shapes how he approaches a business today: understand the work, find what slows it down, and connect the next steps.</p><div className={styles.storyLinks}><Link href={full ? "/#free-consultation" : "/about#wholesale-universe"}>{full ? "Talk through your business" : "Explore the Wholesale Universe story"}<ArrowRight size={17} aria-hidden="true" /></Link><a href={RYAN_PROOF.wholesaleSource} target="_blank" rel="noopener noreferrer">2018 ecommerce speaking appearance <ArrowUpRight size={15} aria-hidden="true" /></a></div></div>
      </div>
      <div className={styles.chapters}>
        <article><Warehouse size={23} aria-hidden="true" /><p>{RYAN_PROOF.foundedYear} / WHOLESALE UNIVERSE</p><h3>Real product. Real operations.</h3><span>Inventory, ecommerce, live selling and fulfillment—the experience behind the systems.</span></article>
        <article id={full ? "ellen" : "ellen-home"} className={styles.ellen}><Tv size={23} aria-hidden="true" /><p>{RYAN_PROOF.ellen.dateLabel.toUpperCase()} / THE ELLEN SHOW</p><h3>{RYAN_PROOF.ellen.title}</h3><span>{RYAN_PROOF.ellen.context}</span><EllenVideo /></article>
        <article><Layers3 size={23} aria-hidden="true" /><p>TODAY / THE LEADFLOW PRO</p><h3>Put the experience to work.</h3><span>High-value jobs, student enrollments and paying customers, measured against the cost of bringing them in.</span><Link href="/premier-system">Explore the Premier academy build <ArrowRight size={16} aria-hidden="true" /></Link></article>
      </div>
      {!full && <Link className={styles.more} href="/about">Meet Ryan and Patrick <ArrowRight size={18} aria-hidden="true" /></Link>}
    </div>
  </section>;
}
