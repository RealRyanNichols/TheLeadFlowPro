import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Camera, MessageSquare, CalendarDays } from "lucide-react";
import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import { BUSINESS } from "@/lib/site/business";
import { PICTURE_PACKAGES, PICTURE_BULK, PICTURE_CONTENT_TYPES, pictureUnitPrice } from "@/lib/site/picturePackages";
import { usd } from "@/lib/site/prices";
import BriefComposer from "./BriefComposer";
import PackQuantity from "./PackQuantity";
import styles from "./pictures.module.css";

export const metadata = withPublicPageMetadata("/services/picture-packages", {
  title: "Dealership Picture Packages | The LeadFlow Pro",
  description: `Branded social pictures and matching captions for dealerships and local businesses. Five pictures from ${usd(PICTURE_PACKAGES[0].priceUsd)}. Get 100 for ${usd(PICTURE_BULK.priceUsd)}.`,
});

const included = ["Distinct branded picture designs", "A matching caption for every picture", "Square + portrait files for social", "Your logo, colors, and approved details", "One consolidated round of minor revisions"];

export default function PicturePackagesPage() {
  return <main className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.shell}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/services">Services</Link><span aria-hidden="true">/</span><span>Picture packages</span></nav>
        <div className={styles.heroGrid}>
          <div>
            <p className={styles.eyebrow}>FOR CAR DEALERSHIPS + LOCAL BUSINESSES</p>
            <h1>Your lot is full.<br /><em>Your feed should be, too.</em></h1>
            <p className={styles.lead}>An idle Facebook page gives people nothing new to see. Ryan Nichols and The LeadFlow Pro team turn your photos, offers, and stories into pictures ready to post.</p>
            <div className={styles.actions}><a href="#packages" className={styles.button}>Give us a chance <ArrowRight size={19} aria-hidden="true" /></a><a href="#sample" className={styles.textLink}>See a sample <ArrowRight size={18} aria-hidden="true" /></a></div>
            <p className={styles.small}>Start with 5 pictures for {usd(PICTURE_PACKAGES[0].priceUsd)}. Pay once. Choose more when you need them.</p>
          </div>
          <figure id="sample" className={styles.heroArt}>
            <Image src="/images/picture-packages/dealership-sample.png" alt="Illustrative dealership graphic showing a car lot and phone, with the headline: If you're a car dealership and you aren't posting pictures on your page every day, you're wrong." width={1024} height={1280} priority sizes="(max-width: 760px) 92vw, 38vw" />
            <figcaption><span>CREATIVE EXAMPLE</span>Illustrative artwork. Your inventory posts use your actual vehicle photos and approved details.</figcaption>
          </figure>
        </div>
      </div>
    </section>

    <section className={styles.promiseStrip} aria-label="What you receive"><div className={styles.shell + " " + styles.promiseGrid}>
      <p><Camera size={24} aria-hidden="true" /><span><strong>Your business, in the picture.</strong>Graphics branded to your dealership.</span></p>
      <p><MessageSquare size={24} aria-hidden="true" /><span><strong>The words come with it.</strong>A caption for each finished picture.</span></p>
      <p><CalendarDays size={24} aria-hidden="true" /><span><strong>A reason to show up.</strong>Content ready for your posting calendar.</span></p>
    </div></section>

    <section id="packages" className={styles.section}>
      <div className={styles.shell}>
        <div className={styles.heading}><p className={styles.eyebrow}>THREE WAYS TO START</p><h2>Pick the amount of content you need.</h2><p>Every package includes pictures, captions, and files ready to post. These are one-time purchases.</p></div>
        <div className={styles.packages}>{PICTURE_PACKAGES.map(pack => <article key={pack.id} className={`${styles.package} ${pack.id === "daily" ? styles.featured : ""}`}>
          <p className={styles.packageLabel}>{pack.id === "daily" ? "A FULL MONTH OF DAILY CONTENT" : pack.id === "starter" ? "TRY OUR TEAM" : "KEEP THE PAGE MOVING"}</p>
          <h3>{pack.name}</h3><p className={styles.pictureCount}>{pack.pictures} <span>pictures + captions</span></p>
          <p className={styles.price}>{usd(pack.priceUsd)} <span>once</span></p><p className={styles.unitPrice}>{pictureUnitPrice(pack.priceUsd, pack.pictures)} per picture</p>
          <p>{pack.use}</p><ul>{included.map(item => <li key={item}><Check size={17} aria-hidden="true" />{item}</li>)}</ul>
          <a className={styles.button} href={pack.checkout}>Buy {pack.pictures} pictures <ArrowRight size={18} aria-hidden="true" /></a>
          <p className={styles.small}>First drafts within {pack.days} business days after a complete brief.</p>
        </article>)}</div>
        <PackQuantity />
      </div>
    </section>

    <section className={styles.bulkSection}><div className={styles.shell + " " + styles.bulkGrid}>
      <div><p className={styles.eyebrow}>BUILD YOUR CONTENT BANK</p><h2>{PICTURE_BULK.pictures} pictures.<br />{usd(PICTURE_BULK.priceUsd)}. Done.</h2><p>That is {pictureUnitPrice(PICTURE_BULK.priceUsd, PICTURE_BULK.pictures)} per picture. A matching caption for each one. More than three months of content when you post once a day.</p></div>
      <div className={styles.bulkDetails}><p>Mix inventory spotlights, approved offers, new arrivals, team introductions, service reminders, and brand graphics. We agree the style and deliver in batches.</p><ul><li>100 distinct designs with square and portrait exports</li><li>100 matching captions</li><li>One minor revision round per delivery batch</li><li>First drafts within 10 business days; full first-draft set within 30 business days after a complete brief</li></ul><a href={PICTURE_BULK.checkout} className={styles.button}>Buy 100 pictures for {usd(PICTURE_BULK.priceUsd)} <ArrowRight size={19} aria-hidden="true" /></a></div>
    </div></section>

    <section className={styles.section}><div className={styles.shell + " " + styles.contentGrid}>
      <div><p className={styles.eyebrow}>YOUR CARS. YOUR PEOPLE. YOUR STORY.</p><h2>Give buyers something worth seeing.</h2><p>You choose the mix. We create the graphics and captions around the information you approve.</p><a className={styles.textLink} href="#brief">Tell us what you want <ArrowRight size={18} aria-hidden="true" /></a></div>
      <div className={styles.contentTypes}>{PICTURE_CONTENT_TYPES.map((type,i) => <div key={type}><span>{String(i+1).padStart(2,"0")}</span><strong>{type}</strong></div>)}</div>
    </div></section>

    <section className={styles.processSection}><div className={styles.shell}><p className={styles.eyebrow}>YOU SELL THE CARS. WE HANDLE THE CREATIVE.</p><h2>Three steps to a fuller feed.</h2><ol className={styles.process}>
      <li><span>01</span><h3>Pick a pack.</h3><p>Pay securely through Stripe. Start small or stock up on content.</p></li>
      <li><span>02</span><h3>Send the real details.</h3><p>Share your logo, vehicle photos, approved offers, and the style you like. Our team verifies payment and confirms the brief.</p></li>
      <li><span>03</span><h3>Review. Then post.</h3><p>Review the drafts, send one consolidated revision list, and receive your final files and captions.</p></li>
    </ol></div></section>

    <section id="brief" className={styles.section}><div className={styles.shell + " " + styles.briefGrid}>
      <div><p className={styles.eyebrow}>AFTER CHECKOUT</p><h2>Show us your dealership.</h2><p>Use this brief to get the work moving. Gather your logo, photos, offer details, and examples of the style you like.</p><p>Already have it all in a folder? Email the link to <a href={`mailto:${BUSINESS.email.hello}`}>{BUSINESS.email.hello}</a> with your dealership name and the email used at checkout.</p><a href={BUSINESS.phone.tel} className={styles.textLink}>Talk to Ryan: {BUSINESS.phone.display}</a></div>
      <BriefComposer />
    </div></section>

    <section className={styles.termsSection} id="terms"><div className={styles.shell}><p className={styles.eyebrow}>A CLEAR SCOPE</p><h2>Know what you are buying.</h2><div className={styles.termsGrid}>
      <details><summary>What counts as one picture?</summary><p>One distinct finished design. Square (1080 × 1080) and portrait (1080 × 1350) versions are exports of the same design. A 30-picture pack includes 30 designs, 60 image files, and 30 captions.</p></details>
      <details><summary>How do revisions work?</summary><p>Send one consolidated list of minor changes to text, color, crop, or layout. One revision round is included per pack, or per agreed batch for the 100-picture offer. New concepts, replacement briefs, or additional revision rounds receive a separate quote.</p></details>
      <details><summary>Do you post or run ads for me?</summary><p>These packages deliver the creative files and captions for you to post. Page management, scheduling, paid ads, ad spend, video, and on-site photography have a separate written scope.</p></details>
      <details><summary>How will you use my vehicle photos?</summary><p>Inventory posts use supplied real vehicle photos. We preserve the actual vehicle and use the details you approve. Illustrative AI artwork is labeled and never presented as a vehicle you have for sale. You approve final prices, availability, claims, and offer terms before posting.</p></details>
      <details><summary>When will I receive the work?</summary><p>The delivery clock starts when payment is verified and your brief, logo, photos, and approved details are complete. First drafts take up to 5 business days for 5 or 12 pictures and 10 for 30. Multiple packs have an agreed batch schedule. The 100-picture offer has first drafts within 10 business days and the full first-draft set within 30; revisions follow your feedback.</p></details>
      <details><summary>What if I need to cancel?</summary><p>Contact us before production begins for a full refund. After production starts, contact us to review completed work and any unused balance. A custom creative service cannot guarantee reach, leads, or vehicle sales. You receive the final approved exports for your business to use; source files and third-party licensing are addressed separately.</p></details>
    </div><p className={styles.small}>{BUSINESS.dbaLine}. Questions: <a href={`mailto:${BUSINESS.email.hello}`}>{BUSINESS.email.hello}</a>. <Link href="/privacy">Privacy policy</Link>.</p></div></section>
  </main>;
}
