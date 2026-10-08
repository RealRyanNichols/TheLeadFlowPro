import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import EllenVideo from "./EllenVideo";
import { RYAN_PROOF } from "@/lib/site/ryanProof";
import styles from "./veteran-story.module.css";

export default function VeteranStory() {
  return <section className={styles.section} id="ryans-story" aria-labelledby="veteran-title"><div className={styles.wrap}>
    <div className={styles.copy}>
      <p className={styles.badge}><ShieldCheck size={18} />VETERAN-OWNED &amp; OPERATED</p>
      <h2 id="veteran-title">Service is part<br />of Ryan’s story.</h2>
      <p>Ryan Nichols is a U.S. Marine Corps veteran, business owner and volunteer rescuer. He founded Wholesale Universe in {RYAN_PROOF.foundedYear}, building firsthand experience in winning customers and running an operation.</p>
      <p>During Hurricane Florence, Ryan traveled from Texas to North Carolina to help rescue people and animals from floodwaters. His work brought him onto <strong>The Ellen DeGeneres Show</strong> in September 2018.</p>
      <p className={styles.principle}>Today, he brings that same willingness to show up and do the work to the businesses he serves.</p>
      <div className={styles.links}><Link href="/about">More about Ryan <ArrowUpRight size={16} /></Link><a href={RYAN_PROOF.ellen.coverageUrl} target="_blank" rel="noopener noreferrer">Read the 2018 coverage <ArrowUpRight size={14} /></a></div>
    </div>
    <div className={styles.video} id="ellen-home"><EllenVideo /></div>
  </div></section>;
}
