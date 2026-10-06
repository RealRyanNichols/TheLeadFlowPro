"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./pictures.module.css";

export interface PortfolioPicture {
  src: string;
  width: number;
  height: number;
  title: string;
  subject: string;
  category: string;
  alt: string;
  description: string;
  musicCue?: string;
}

export default function PictureGallery({ pictures }: { pictures: readonly PortfolioPicture[] }) {
  const [category, setCategory] = useState("All examples");
  if (!pictures.length) return null;
  const categories = ["All examples", ...Array.from(new Set(pictures.map(picture => picture.category)))];
  const visible = category === "All examples" ? pictures : pictures.filter(picture => picture.category === category);
  return <section id="portfolio" className={styles.gallerySection} aria-labelledby="portfolio-heading"><div className={styles.shell}>
    <div className={styles.galleryHeading}><div><p className={styles.eyebrow}>PICTURES WE HAVE CREATED</p><h2 id="portfolio-heading">Different people.<br />Different stories.<br />Same creative possibilities.</h2></div><p>Explore custom artwork we have created. Each picture connects a recognizable theme with a feeling and a reason to share it. Choose the kind of story you want to tell.</p></div>
    <div className={styles.galleryFilters} aria-label="Filter creative examples">{categories.map(label => <button key={label} type="button" className={category === label ? styles.galleryFilterActive : ""} aria-pressed={category === label} onClick={() => setCategory(label)}>{label}</button>)}</div>
    <p className={styles.galleryCount} role="status" aria-live="polite">{visible.length} {visible.length === 1 ? "example" : "examples"}</p>
    <div className={styles.galleryGrid}>{visible.map(picture => <figure className={styles.galleryCard} key={picture.src}>
      <a className={styles.galleryImageLink} href={picture.src} target="_blank" rel="noopener noreferrer" aria-label={`View ${picture.title} at full size in a new tab`}><Image src={picture.src} width={picture.width} height={picture.height} alt={picture.alt} sizes="(max-width: 760px) 92vw, (max-width: 1248px) 46vw, 570px" /><span aria-hidden="true">View full picture ↗</span></a>
      <figcaption><p className={styles.galleryCategory}>{picture.subject} · {picture.category}</p><h3>{picture.title}</h3><p>{picture.description}</p>{picture.musicCue && <p className={styles.galleryMusic}><strong>Music pairing:</strong> {picture.musicCue}</p>}</figcaption>
    </figure>)}</div>
    <div className={styles.galleryFooter}><p>Creative artwork, including imaginative scenes. Your pictures are planned around your own people, theme, and moment. Reach and engagement vary.</p><a className={styles.button} href="#packages">Find your picture pack <span aria-hidden="true">↓</span></a></div>
  </div></section>;
}
