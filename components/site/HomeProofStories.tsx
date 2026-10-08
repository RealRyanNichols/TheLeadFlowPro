import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Tv, ArrowRight } from "lucide-react";
import ProofVideo from "./ProofVideo";
import { PROOF_STORIES as STORIES } from "@/lib/site/proofStories";
import { RYAN_PROOF } from "@/lib/site/ryanProof";
import styles from "./home-proof-stories.module.css";

const ROOT = "https://sites.theleadflowpro.com/_proof/20261006-v1/assets/";


function Story({ story }: { story: typeof STORIES[number] }) {
  return <article className={styles.card}>
    <div className={styles.player}><ProofVideo src={story.id === "scott" ? `${ROOT}scott.mp4?v=6e0292f3272c` : `${ROOT}${story.id}.mp4`} poster={`${ROOT}${story.id}-reference.jpg`} name={story.name} duration={story.duration} coverTitle={story.coverTitle} /></div>
    <div className={styles.copy}><p className={styles.context}>{story.context}</p><h3>{story.name}</h3><strong>{story.title}</strong><p>{story.summary}</p></div>
  </article>;
}

export default function HomeProofStories() {
  return <section className={styles.section} id="client-stories" aria-labelledby="stories-title">
    <div className={styles.wrap}>
      <div className={styles.heading}><div><p className={styles.eyebrow}>REAL BUSINESSES. REAL PEOPLE.</p><h2 id="stories-title">Meet the people.<br /><em>Hear the stories.</em></h2></div><p>Meet Ryan through the businesses he’s built, then hear from clients and collaborators who have worked with the team. Their original stories are here to watch.</p></div>
      <div className={styles.founders} id="ryans-story">
        <Link className={styles.founderPhoto} href="/about#wholesale-universe"><Image src="/images/ryan-wholesale-universe-2015-pallets.jpg" alt="Ryan beside stacked merchandise cartons and a trailer from the Wholesale Universe archive" width={1800} height={1350} sizes="(max-width:800px) 90vw, 25vw" /><span>RYAN NICHOLS / WHOLESALE UNIVERSE <ArrowUpRight size={16} aria-hidden="true" /></span></Link>
        <div className={styles.founderCopy}><p className={styles.eyebrow}>BUILT THROUGH EXPERIENCE</p><h3>Ryan knows the work<br />behind the business.</h3><p>Ryan founded Wholesale Universe in 2015. From sourcing inventory to selling online and fulfilling orders, his experience starts with running a real operation. That perspective shapes the work at LeadFlow.</p><Link href="/about">Get to know Ryan Nichols <ArrowRight size={16} aria-hidden="true" /></Link></div>
        <aside className={styles.ellen} id="ellen-home"><Tv size={25} aria-hidden="true" /><p className={styles.eyebrow}>SEPTEMBER 2018 / THE ELLEN SHOW</p><h3>Ryan’s Ellen appearance.</h3><p>{RYAN_PROOF.ellen.context}</p>{RYAN_PROOF.ellen.video ? <ProofVideo {...RYAN_PROOF.ellen.video} name="Ryan Nichols on The Ellen Show" /> : <a href={RYAN_PROOF.ellen.coverageUrl} target="_blank" rel="noopener noreferrer">Read the original coverage <ArrowUpRight size={15} aria-hidden="true" /></a>}</aside>
      </div>
      <div className={styles.videoHeading}><span>IN THEIR OWN WORDS</span><p>Client stories &amp; historical references</p></div>
      <div className={styles.grid}>{STORIES.slice(0, 3).map(story => <Story key={story.id} story={story} />)}</div>
      <details className={styles.more}><summary><span>Explore all nine video stories <small>Coaching, campaigns, real estate and business experience</small></span><span className={styles.expand} aria-hidden="true">+</span></summary><div className={styles.grid}>{STORIES.slice(3).map(story => <Story key={story.id} story={story} />)}</div></details>
      <p className={styles.contextNote}>These are individual experiences in their original markets and time periods. Leads, conversations, sales, revenue and profit measure different things. Historical outcomes are not promises for your business.</p>
    </div>
  </section>;
}
