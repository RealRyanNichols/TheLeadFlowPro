import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Camera, MessageSquare, Music } from "lucide-react";
import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import { BUSINESS } from "@/lib/site/business";
import { PICTURE_PACKAGES, PICTURE_BULK, PICTURE_CONTENT_TYPES, pictureUnitPrice } from "@/lib/site/picturePackages";
import { usd } from "@/lib/site/prices";
import { getPictureStudioReadiness } from "@/lib/pictureStudio/auth";
import BriefComposer from "./BriefComposer";
import PackQuantity from "./PackQuantity";
import PictureGallery from "./PictureGallery";
import { PICTURE_PORTFOLIO } from "./picturePortfolio";
import styles from "./pictures.module.css";

export const metadata = withPublicPageMetadata("/services/picture-packages", {
  title: "Custom Pictures & Story Packages | The LeadFlow Pro",
  description: `Custom pictures, captions, themes, and music placement notes for businesses, creators, individuals, and families. Five pictures from ${usd(PICTURE_PACKAGES[0].priceUsd)}.`,
});
const included = ["Distinct custom picture designs", "A matching caption for every picture", "Square + portrait files for social", "A connected theme and story plan", "Music cue notes when requested", "One consolidated round of minor revisions"];
export const dynamic = "force-dynamic";

export default async function PicturePackagesPage() {
  const automated = process.env.PICTURE_STUDIO_ENABLED === "true" && (await getPictureStudioReadiness()).ready;
  const startHref = (id: string, checkout: string) => automated ? `/picture-studio?pack=${id}` : checkout;
  return <main className={styles.page}>
    <section className={styles.hero}><div className={styles.shell}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/services">Services</Link><span aria-hidden="true">/</span><span>Picture packages</span></nav>
      <div className={styles.heroGrid}>
        <div><p className={styles.eyebrow}>BUSINESSES · CREATORS · INDIVIDUALS · FAMILIES</p>
          <h1>Your business.<br />Your family.<br /><em>Your story.</em></h1>
          <p className={styles.lead}>Turn the moments that matter into pictures people want to stop and see. Ryan Nichols and The LeadFlow Pro team connect a theme, an emotion, custom pictures, captions, and music placement notes for your organic social presence.</p>
          <div className={styles.actions}><a href="#packages" className={styles.button}>Choose your picture pack <ArrowRight size={19} aria-hidden="true" /></a><a href={PICTURE_PORTFOLIO.length ? "#portfolio" : "#how-it-works"} className={styles.textLink}>{PICTURE_PORTFOLIO.length ? "See the pictures" : "See how it works"} <ArrowRight size={18} aria-hidden="true" /></a></div>
          <p className={styles.small}>Start with 5 pictures for {usd(PICTURE_PACKAGES[0].priceUsd)}. Pay once. Make something personal.</p>
        </div>
        <div className={styles.themeBoard} aria-label="Ideas for your picture story">
          <p className={styles.eyebrow}>MAKE THE WHOLE POST MAKE SENSE</p>
          <div className={styles.themeTile}><span>01 · THE MOMENT</span><strong>A milestone.<br />A launch. A comeback.</strong><p>Choose what matters right now.</p></div>
          <div className={styles.themeTile}><span>02 · THE FEELING</span><strong>Pride. Laughter.<br />Hope. Nostalgia.</strong><p>Give the creative a clear emotional direction.</p></div>
          <div className={styles.themeTile}><span>03 · THE STORY</span><strong>Your face.<br />Your theme. Your words.</strong><p>Bring the picture, caption, and music cue together.</p></div>
        </div>
      </div>
    </div></section>
    <PictureGallery pictures={PICTURE_PORTFOLIO} />
    <section className={styles.promiseStrip} aria-label="What you receive"><div className={styles.shell + " " + styles.promiseGrid}>
      <p><Camera size={26} aria-hidden="true" /><span><strong>A picture that belongs to your story.</strong>Your people, your business, or an imaginative scene.</span></p>
      <p><MessageSquare size={26} aria-hidden="true" /><span><strong>Words with a purpose.</strong>A matching caption tied to the moment and emotion.</span></p>
      <p><Music size={26} aria-hidden="true" /><span><strong>A musical moment that fits.</strong>Music direction and placement notes you preview before posting.</span></p>
    </div></section>
    <section id="packages" className={styles.section}><div className={styles.shell}>
      <div className={styles.heading}><p className={styles.eyebrow}>THREE WAYS TO START</p><h2>Pick the amount of creative you need.</h2><p>The same three packages work for business content, personal stories, family keepsakes, and movie-inspired scenes. These are one-time purchases.</p></div>
      <div className={styles.packages}>{PICTURE_PACKAGES.map(pack => <article key={pack.id} className={`${styles.package} ${pack.id === "growth" ? styles.featured : ""}`}>
        <p className={styles.packageLabel}>{pack.id === "daily" ? "BUILD A CONTENT BANK" : pack.id === "starter" ? "TRY A THEME" : "TELL A CONNECTED STORY"}</p>
        <h3>{pack.name}</h3><p className={styles.pictureCount}>{pack.pictures} <span>pictures + captions</span></p>
        <p className={styles.price}>{usd(pack.priceUsd)} <span>once</span></p><p className={styles.unitPrice}>{pictureUnitPrice(pack.priceUsd, pack.pictures)} per picture</p>
        <p>{pack.use}</p><ul>{included.map(item => <li key={item}><Check size={17} aria-hidden="true" />{item}</li>)}</ul>
        <Link className={styles.button} href={startHref(pack.id, pack.checkout)}>{automated ? "Start" : "Buy"} {pack.pictures} pictures <ArrowRight size={18} aria-hidden="true" /></Link>
        <p className={styles.small}>First drafts within {pack.days} business days after payment and a complete, approved brief.</p>
      </article>)}</div><PackQuantity automated={automated} />
      {!automated && <p className={styles.small}>Pay securely through Stripe, then send the brief below. Our team confirms your payment and handles the creative with you.</p>}
    </div></section>
    <section className={styles.storySection}><div className={styles.shell + " " + styles.contentGrid}>
      <div><p className={styles.eyebrow}>PUT YOURSELF IN THE STORY</p><h2>Ten scenes.<br />One connected adventure.</h2><p>Want a movie-inspired series starring you or your family? Choose the 12-Picture Pack: ten connected scenes, a title picture, and a finale. Or use all twelve for scenes.</p><p>Tell us the atmosphere you love: a sci-fi awakening, a sports comeback, an action adventure, a western, or a heartfelt family story. We plan the sequence with you before creating the pictures.</p><Link className={styles.button} href={automated ? "/picture-studio?pack=growth" : "#brief"}>Plan my picture story <ArrowRight size={18} aria-hidden="true" /></Link></div>
      <div className={styles.storyCards}><article><span>THE OPENING</span><h3>Set the moment.</h3><p>A person, a place, and a reason to care.</p></article><article><span>THE JOURNEY</span><h3>Make the scenes connect.</h3><p>A consistent look, recurring people, and a story that progresses.</p></article><article><span>THE PAYOFF</span><h3>Land the feeling.</h3><p>A final picture, a caption, and a music cue that fit together.</p></article></div>
    </div></section>
    <section className={styles.section}><div className={styles.shell + " " + styles.contentGrid}>
      <div><p className={styles.eyebrow}>MORE THAN A GREAT PICTURE</p><h2>The moment gives it meaning.</h2><p>A birthday, graduation, launch, holiday, community event, or personal milestone gives the post a reason to exist. We connect that moment to the emotion and theme you choose.</p><p>This is a creative process for organic social content. Results depend on your audience, timing, posting, and many other factors. We do not promise reach or engagement.</p></div>
      <div className={styles.contentTypes}>{PICTURE_CONTENT_TYPES.map((type,i) => <div key={type}><span>{String(i+1).padStart(2,"0")}</span><strong>{type}</strong></div>)}</div>
    </div></section>
    <section className={styles.bulkSection}><div className={styles.shell + " " + styles.bulkGrid}>
      <div><p className={styles.eyebrow}>BUILD YOUR CONTENT BANK</p><h2>{PICTURE_BULK.pictures} pictures.<br />{usd(PICTURE_BULK.priceUsd)}.</h2><p>{pictureUnitPrice(PICTURE_BULK.priceUsd, PICTURE_BULK.pictures)} per distinct picture, with a matching caption for each. Mix themes for your business, personal brand, or story series.</p></div>
      <div className={styles.bulkDetails}><p>We agree the creative plan and deliver in batches, so a larger collection still has a clear direction.</p><ul><li>100 distinct designs with square and portrait exports</li><li>100 matching captions and requested music cue notes</li><li>One minor revision round per agreed delivery batch</li><li>First drafts within 10 business days; full first-draft set within 30 business days after a complete approved brief</li></ul><Link href={startHref("bulk100", PICTURE_BULK.checkout)} className={styles.button}>{automated ? "Start" : "Buy"} 100 pictures for {usd(PICTURE_BULK.priceUsd)} <ArrowRight size={19} aria-hidden="true" /></Link></div>
    </div></section>
    <section id="how-it-works" className={styles.processSection}><div className={styles.shell}><p className={styles.eyebrow}>YOUR CREATIVE STUDIO</p><h2>From an idea to something ready to share.</h2><ol className={styles.process}>
      <li><span>01</span><h3>Choose the moment.</h3><p>Pick a pack, tell us the event, emotion, theme, and words you want. {automated ? "Upload the photos you want us to use." : "Email the photos you want us to use."}</p></li>
      <li><span>02</span><h3>Approve the plan.</h3><p>Pay securely through Stripe. Review the scene plan before production, including the captions and musical direction.</p></li>
      <li><span>03</span><h3>Review. Download. Share.</h3><p>Review your drafts {automated ? "in the studio" : "with our team"}. Send one consolidated revision list or approve the collection and receive your files.</p></li>
    </ol></div></section>
    <section id="sample" className={styles.section}><div className={styles.shell + " " + styles.sampleGrid}>
      <div><p className={styles.eyebrow}>ONE EXAMPLE: CAR DEALERSHIPS</p><h2>Yes, your business fits here too.</h2><p>A dealership can build a month of inventory posts. A restaurant can introduce a menu. A contractor can spotlight work. A creator can build a visual series. A family can tell a story together.</p><p>For posts about real products or completed work, we use your actual photos and approved facts. Imaginative scenes are presented as creative artwork.</p><Link className={styles.textLink} href={automated ? "/picture-studio" : "#brief"}>Bring us your idea <ArrowRight size={18} aria-hidden="true" /></Link></div>
      <figure className={styles.heroArt}><Image src="/images/picture-packages/dealership-sample.png" alt="Illustrative dealership social graphic with a car lot, phone, and message about posting pictures regularly." width={1024} height={1280} sizes="(max-width: 760px) 92vw, 38vw" /><figcaption><span>DEALERSHIP CREATIVE EXAMPLE</span>Illustrative artwork. Inventory content uses actual vehicle photos and approved details.</figcaption></figure>
    </div></section>
    <section id="brief" className={styles.section}><div className={styles.shell + " " + styles.briefGrid}>
      <div><p className={styles.eyebrow}>PREFER TO TALK IT THROUGH?</p><h2>Tell us what you have in mind.</h2><p>{automated ? "Start in the studio to save your brief and upload photos. If you paid through an original Stripe link, use this email brief so the team can match your payment." : "Use this email brief to tell us the moment, feeling, and theme you want. After checkout, include the email you used in Stripe so our team can verify payment."}</p><p>Send questions to <a href={`mailto:${BUSINESS.email.hello}`}>{BUSINESS.email.hello}</a>.</p>{automated && <Link href="/picture-studio" className={styles.button}>Open the picture studio <ArrowRight size={18} aria-hidden="true" /></Link>}</div><BriefComposer />
    </div></section>
    <section className={styles.termsSection} id="terms"><div className={styles.shell}><p className={styles.eyebrow}>A CLEAR SCOPE</p><h2>Know what you are buying.</h2><div className={styles.termsGrid}>
      <details><summary>What counts as one picture?</summary><p>One distinct finished design with square (1080 × 1080) and portrait (1080 × 1350) exports. A 30-picture pack includes 30 designs, 60 image files, and 30 captions. A sequence of ten scenes fits the 12-picture pack with two extra designs.</p></details>
      <details><summary>How do music notes work?</summary><p>We work with your song selection or suggest a musical mood and point to preview, such as a chorus lift or opening beat. Exact timestamps are marked as confirmed only when you provide and confirm the version and cue. Otherwise, preview the track to find the right spot. Audio files and music licenses are not included; use music available for your account and intended post.</p></details>
      <details><summary>Can I use my face or my family?</summary><p>Yes. Upload clear reference photos you have permission to use. Confirm permission from identifiable adults and parent or guardian permission for children. Creative scenes are imaginative artwork, and reference photos help us keep people recognizable.</p></details>
      <details><summary>How do movie-inspired scenes work?</summary><p>We create custom imaginative scenes with the atmosphere you choose. This is a picture series, not a complete film or a claim of affiliation with a studio. Describe the setting and action you want and provide any exact words you want included.</p></details>
      <details><summary>How do revisions work?</summary><p>Send one consolidated list of minor changes to text, color, crop, or layout. One revision round is included per pack, or per agreed bulk delivery batch. New concepts, replacement briefs, or additional rounds receive a separate quote.</p></details>
      <details><summary>Do you post or run ads for me?</summary><p>These packages provide creative pictures, captions, and music placement notes for you to share. Page management, scheduling, paid ads, ad spend, video, on-site photography, and third-party licensing have a separate written scope.</p></details>
      <details><summary>When will I receive the work?</summary><p>The delivery clock starts after payment is verified and your brief, references, and scene plan are complete and approved. First drafts take up to 5 business days for 5 or 12 pictures and 10 for 30. Multiple packs have an agreed batch schedule. The 100-picture offer has first drafts within 10 business days and the full first-draft set within 30; revisions follow your feedback.</p></details>
      <details><summary>What if I need to cancel?</summary><p>Contact us before production begins for a full refund. After production starts, contact us to review completed work and any unused balance. Creative content cannot guarantee reach, engagement, leads, or sales. You receive approved final exports for your intended use; source files and third-party rights are addressed separately.</p></details>
    </div><p className={styles.small}>{BUSINESS.dbaLine}. Questions: <a href={`mailto:${BUSINESS.email.hello}`}>{BUSINESS.email.hello}</a>. <Link href="/privacy">Privacy policy</Link>.</p></div></section>
  </main>;
}
