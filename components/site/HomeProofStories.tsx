import ProofVideo from "./ProofVideo";
import { PROOF_STORIES as STORIES } from "@/lib/site/proofStories";
import styles from "./home-proof-stories.module.css";

const FEATURED = STORIES.filter(story => story.id === "scott" || story.id === "luke");
const MORE = STORIES.filter(story => !["scott", "luke", "stewman-funnels", "stewman-personal", "katrina"].includes(story.id));

const ROOT = "https://sites.theleadflowpro.com/_proof/20261006-v1/assets/";


function Story({ story }: { story: typeof STORIES[number] }) {
  return <article className={styles.card} id={`${story.id}-story`}>
    <div className={styles.player}><ProofVideo src={story.id === "scott" ? `${ROOT}scott.mp4?v=6e0292f3272c` : `${ROOT}${story.id}.mp4`} poster={`${ROOT}${story.id}-reference.jpg`} name={story.name} duration={story.duration} coverTitle={story.coverTitle} /></div>
    <div className={styles.copy}><p className={styles.context}>{story.context}</p><h3>{story.name}</h3><strong>{story.title}</strong><p>{story.summary}</p></div>
  </article>;
}

export default function HomeProofStories() {
  return <section className={styles.section} id="client-stories" aria-labelledby="stories-title">
    <div className={styles.wrap}>
      <div className={styles.heading}><div><p className={styles.eyebrow}>REAL BUSINESSES. REAL PEOPLE.</p><h2 id="stories-title">Meet the people.<br /><em>Hear the stories.</em></h2></div><p>Hear customers and collaborators describe the work, the numbers and their experience in their own words.</p></div>
      <div className={styles.videoHeading}><span>IN THEIR OWN WORDS</span><p>Client stories &amp; historical references</p></div>
      <div className={`${styles.grid} ${styles.featured}`}>{FEATURED.map(story => <Story key={story.id} story={story} />)}</div>
      <details className={styles.more}><summary><span>More client stories <small>Coaching, real estate and business experience</small></span><span className={styles.expand} aria-hidden="true">+</span></summary><div className={styles.grid}>{MORE.map(story => <Story key={story.id} story={story} />)}</div></details>
      <p className={styles.contextNote}>These are individual experiences in their original markets and time periods. Leads, conversations, sales, revenue and profit measure different things. Historical outcomes are not promises for your business.</p>
    </div>
  </section>;
}
