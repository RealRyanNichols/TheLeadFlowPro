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
      "Picture pack brief", `Business: ${get("business")}`, `Contact: ${get("contact")}`,
      `Checkout email: ${get("email")}`, `Package / quantity: ${get("package")}`,
      `Business page: ${get("page")}`, `Logo and photo folder: ${get("photos")}`,
      `Content choices: ${data.getAll("content").join(", ") || "Please help me choose"}`,
      "", "Approved offers, vehicle details, and style:", get("details"),
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
      <label>Dealership or business name<input name="business" required maxLength={100} autoComplete="organization" /></label>
      <label>Your name<input name="contact" required maxLength={100} autoComplete="name" /></label>
      <label>Email used at checkout<input name="email" type="email" required maxLength={200} autoComplete="email" /></label>
      <label>Package<select name="package" defaultValue="Daily Presence: 30 pictures">
        {PICTURE_PACKAGES.map(p => <option key={p.id} value={`${p.name}: ${p.pictures} pictures`}>{p.name} · {p.pictures} pictures · {usd(p.priceUsd)}</option>)}
        {[2,3,4].map(n => <option key={n} value={`${n} Daily Presence packs: ${30*n} pictures`}>{n} Daily Presence packs · {30*n} pictures</option>)}
        <option value={PICTURE_BULK.name}>100-picture bulk pack · {usd(PICTURE_BULK.priceUsd)}</option>
      </select></label>
      <label>Facebook page or website<input name="page" maxLength={200} placeholder="Your business page or website" /></label>
      <label>Logo and photo folder link<input name="photos" type="url" maxLength={500} placeholder="https://…" /></label>
    </div>
    <fieldset><legend>What would you like us to create?</legend><div className={styles.choices}>
      {PICTURE_CONTENT_TYPES.map(type => <label key={type}><input type="checkbox" name="content" value={type} />{type}</label>)}
    </div></fieldset>
    <label>Approved offers, vehicle details, and the look you want<textarea name="details" maxLength={1600} rows={4} placeholder="Tell us what is accurate and approved to promote. Share your colors, examples, and preferred tone." /></label>
    <p className={styles.small}>Share assets you own or have permission to use. Send customer photos only with their permission. Include the required terms for any advertised offer.</p>
    <button className={styles.button} type="submit">Open email with my brief <span aria-hidden="true">↗</span></button>
    <p className={styles.small}>This opens a draft in your email app. You send it to <a href={`mailto:${BUSINESS.email.hello}`}>{BUSINESS.email.hello}</a>.</p>
    <p role="status" aria-live="polite" className={styles.small}>{status}</p>
    {draft && <div className={styles.draft}><label>Your brief<textarea readOnly rows={10} value={draft} /></label><button className={styles.textButton} type="button" onClick={copy}>Copy brief</button></div>}
  </form>;
}
