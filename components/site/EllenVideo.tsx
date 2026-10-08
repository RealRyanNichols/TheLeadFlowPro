"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Play, X } from "lucide-react";
import { RYAN_PROOF } from "@/lib/site/ryanProof";
import styles from "./ellen-video.module.css";

export default function EllenVideo() {
  const [open, setOpen] = useState(false);
  const close = useRef<HTMLButtonElement>(null);
  const cover = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const stop = () => setOpen(false);
    window.addEventListener("leadflow-native-proof-play", stop);
    return () => window.removeEventListener("leadflow-native-proof-play", stop);
  }, []);
  useEffect(() => { if (open) close.current?.focus(); }, [open]);
  const video = RYAN_PROOF.ellen.video;
  return <div className={styles.wrapper}>
    <div className={styles.player}>
      {open ? <>
        <iframe src={video.embedSrc} title="Ryan Nichols: Ellen appearance excerpt and rescue-boat follow-up" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        <button ref={close} className={styles.close} type="button" aria-label="Close Ellen video" onClick={() => { setOpen(false); requestAnimationFrame(() => cover.current?.focus()); }}><X size={16} />Close video</button>
      </> : <button ref={cover} className={styles.cover} type="button" aria-label="Watch Ryan on Ellen and his rescue story, 5 minutes 32 seconds" onClick={() => {
        document.querySelectorAll<HTMLVideoElement>("video[data-proof-video]").forEach(v => v.pause());
        setOpen(true);
      }}>
        {/* Only the backdrop is generated. The studio frame and both people remain unchanged. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.background} src="/images/proof/ellen-rescue-blue-background.png" alt="" loading="lazy" />
        <span className={styles.photoFrame}><img src={video.poster} alt="Ryan Nichols speaking with Ellen DeGeneres on her show's set" loading="lazy" /></span>
        <span className={styles.coverCopy}><span className={styles.kicker}>THE STORY BEHIND THE OWNER</span><strong>RYAN<br /><em>ON ELLEN.</em></strong><span className={styles.subtitle}>Service. Rescue. Showing up.</span></span>
        <span className={styles.play}><span><Play size={22} fill="currentColor" /></span><b>WATCH HIS STORY<small>{video.duration}</small></b></span>
        <span className={styles.archive}>REAL FOOTAGE · SEPTEMBER 2018</span>
      </button>}
    </div>
    <p className={styles.caption}>2018 archive: Ellen appearance excerpt and Ryan’s rescue-boat update. Fundraising references belong to the historical recording. <a href={video.watchUrl} target="_blank" rel="noopener noreferrer">Watch on Rumble <ArrowUpRight size={12} /></a></p>
  </div>;
}
