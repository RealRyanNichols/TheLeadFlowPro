"use client";

import { useEffect, useRef, useState } from "react";
import { Play, ArrowUpRight } from "lucide-react";
import styles from "./proof-video.module.css";

type Props = { src: string; poster: string; name: string; duration: string; priority?: boolean; coverTitle?: readonly string[] };

export default function ProofVideo({ src, poster, name, duration, priority = false, coverTitle }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const [enhanced, setEnhanced] = useState(false);
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => setEnhanced(true), []);
  return (
    <div className={styles.player}>
      <video ref={video} controls playsInline preload="none" poster={poster}
        aria-label={`${name} video story`} data-proof-video
        onPlay={() => {
          setStarted(true);
          document.querySelectorAll<HTMLVideoElement>("video[data-proof-video]").forEach(other => {
            if (other !== video.current) other.pause();
          });
        }}
        onError={() => setFailed(true)}>
        <source src={src} type="video/mp4" />
        <a href={src}>Open {name}’s video</a>
      </video>
      {enhanced && !started && !failed && (
        <button type="button" className={`${styles.cover} ${coverTitle ? styles.brandedCover : ""}`} aria-label={`Play ${name}’s story, ${duration}`}
          onClick={() => {
            setStarted(true);
            video.current?.play().catch(() => { /* Native controls remain available. */ });
          }}>
          {/* Existing approved reference photograph; no altered likeness. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {coverTitle && <img className={styles.graphic} src="/images/proof/leadflow-proof-background.png" alt="" loading="lazy" />}
          <img className={coverTitle ? styles.reference : styles.fullPhoto} style={poster.includes("blake-reference") ? { objectPosition: "100% 0" } : undefined} src={poster} alt="" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} />
          <span className={styles.shade} />
          {coverTitle && <span className={styles.coverCopy}><span className={styles.brand}><img src="/images/proof/leadflow-logo.webp" alt="" width={26} height={26} />THE LEADFLOW PRO</span><strong className={styles.headline}>{coverTitle.map(line => <span key={line}>{line}</span>)}</strong></span>}
          <span className={styles.play}><Play size={20} fill="currentColor" aria-hidden="true" /><span>Watch the story <small>{duration}</small></span></span>
        </button>
      )}
      {failed && <p className={styles.error}>Video not loading? <a href={src} target="_blank" rel="noopener noreferrer">Open the video <ArrowUpRight size={14} aria-hidden="true" /></a></p>}
    </div>
  );
}
