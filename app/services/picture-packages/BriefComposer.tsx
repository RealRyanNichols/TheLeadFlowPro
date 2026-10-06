"use client";

import { useState } from "react";
import { BUSINESS } from "@/lib/site/business";
import { PICTURE_PACKAGES, PICTURE_BULK, PICTURE_CONTENT_TYPES } from "@/lib/site/picturePackages";
import { usd } from "@/lib/site/prices";
import styles from "./pictures.module.css";

export default function BriefComposer() {
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");

  function openDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const get = (key: string) => String(data.get(key) ?? "").trim();
    const body = [
      "Picture and story pack brief", `Business, family, or project: ${get("business")}`, `Contact: ${get("contact")}`,
      `Checkout email: ${get("email")}`, `Package / quantity: ${get("package")}`,
      `Business page: ${get("page")}`, `Logo and photo folder: ${get("photos")}`,
      `Content choices: ${data.getAll("content").join(", ") || "Please help me choose"}`,
      `Moment / event: ${get("moment")}`, `Emotion: ${get("emotion")}`, `Theme: ${get("theme")}`,
      `Music selection / cue: ${get("music")}`, "", "Your story, exact words, and approved details:", get("details"),
      "", "I understand the team will verify my payment in Stripe before starting.",
    ].join("\n");
    setDraft(body);
    setStatus("Your email app is opening. Send the email there to deliver your brief. If it does not open, copy the brief below and email it to us.");
    window.location.href = `mailto:${BUSINESS.email.hello}?subject=${encodeURIComponent(`Picture pack brief — ${get("business")}`)}&body=${encodeURIComponent(body)}`;
  }

  async function copy() {
    try { await navigator.clipboard.writeText(draft); setStatus("Brief copied. Paste it into an email and send it to our team."); }
    catch { setStatus("Select and copy the brief below, then email it to our team."); }
  }

  return <form className={styles.briefForm} onSubmit={openDraft}>
    <div className={styles.fieldGrid}>
      <label>Business, family, or project name<input name="business" required maxLength={100} /></label>
      <label>Your name<input name="contact" required maxLength={100} autoComplete="name" /></label>
      <label>Email used at checkout<input name="email" type="email" required maxLength={200} autoComplete="email" /></label>
      <label>Package<select name="package" defaultValue="30-Picture Pack: 30 pictures">
        {PICTURE_PACKAGES.map(p => <option key={p.id} value={`${p.name}: ${p.pictures} pictures`}>{p.name} · {p.pictures} pictures · {usd(p.priceUsd)}</option>)}
        {[2,3,4].map(n => <option key={n} value={`${n} 30-Picture Packs: ${30*n} pictures`}>{n} 30-Picture Packs · {30*n} pictures</option>)}
        <option value={PICTURE_BULK.name}>100-picture bulk pack · {usd(PICTURE_BULK.priceUsd)}</option>
      </select></label>
      <label>Social page or website (optional)<input name="page" maxLength={200} placeholder="Where you plan to share the pictures" /></label>
      <label>Photo or logo folder link (optional)<input name="photos" type="url" maxLength={500} placeholder="https://…" /></label>
      <label>The moment or event<input name="moment" required maxLength={250} placeholder="A milestone, launch, celebration, or connected story" /></label>
      <label>The emotion<input name="emotion" required maxLength={150} placeholder="Pride, laughter, hope, nostalgia…" /></label>
      <label>The theme<input name="theme" required maxLength={250} placeholder="Sci-fi, sports comeback, family adventure…" /></label>
      <label>Music and cue (optional)<input name="music" maxLength={400} placeholder="Song, artist, version, and the moment you want" /></label>
    </div>
    <fieldset><legend>What would you like us to create?</legend><div className={styles.choices}>
      {PICTURE_CONTENT_TYPES.map(type => <label key={type}><input type="checkbox" name="content" value={type} />{type}</label>)}
    </div></fieldset>
    <label>Your story, exact words, and approved details<textarea name="details" maxLength={1600} rows={5} placeholder="Who is in the pictures? What happens across the scenes? What exact words should appear? Share accurate facts, examples, colors, and your preferred tone." /></label>
    <p className={styles.small}>Share photos you own or have permission to use, including permission for anyone pictured. Include parent or guardian permission for children and required terms for advertised offers. Music notes need your preview; audio and licenses are separate.</p>
    <button className={styles.button} type="submit">Open email with my brief <span aria-hidden="true">↗</span></button>
    <p className={styles.small}>This opens a draft in your email app. You send it to <a href={`mailto:${BUSINESS.email.hello}`}>{BUSINESS.email.hello}</a>.</p>
    <p role="status" aria-live="polite" className={styles.small}>{status}</p>
    {draft && <div className={styles.draft}><label>Your brief<textarea readOnly rows={10} value={draft} /></label><button className={styles.textButton} type="button" onClick={copy}>Copy brief</button></div>}
  </form>;
}
