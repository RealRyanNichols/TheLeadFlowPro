"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BUSINESS } from "@/lib/site/business";
import { PICTURE_PACKAGES, PICTURE_BULK } from "@/lib/site/picturePackages";
import type { PackId } from "@/lib/pictureStudio/types";
import { usd } from "@/lib/site/prices";
import BriefFields, { EMPTY_BRIEF } from "./BriefFields";
import styles from "./studio.module.css";

export default function StartStudio() {
  const [packId, setPackId] = useState<PackId>("starter");
  const [quantity, setQuantity] = useState(1);
  const [brief, setBrief] = useState({ ...EMPTY_BRIEF });
  const [ready, setReady] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const packs = [...PICTURE_PACKAGES, PICTURE_BULK];
  const pack = packs.find(item => item.id === packId)!;

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const selected = query.get("pack");
    if (["starter", "growth", "daily", "bulk100"].includes(selected || "")) setPackId(selected as PackId);
    if (selected === "daily") setQuantity(Math.min(4, Math.max(1, Math.trunc(Number(query.get("quantity")) || 1))));
    const controller = new AbortController();
    fetch("/api/picture-studio/readiness", { signal: controller.signal, cache: "no-store" }).then(async result => { const body = await result.json(); setReady(result.ok && body.ready === true); }).catch(() => { if (!controller.signal.aborted) setReady(false); });
    return () => controller.abort();
  }, []);

  async function start(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!ready || busy) return;
    const data = new FormData(event.currentTarget); setBusy(true); setError("");
    try {
      const response = await fetch("/api/picture-studio/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packId, quantity, email: data.get("email"), name: data.get("name"), brief }) });
      const body = await response.json();
      if (!response.ok || !body.id || !body.accessToken) throw new Error(body.error || "Your brief could not be saved. Please try again.");
      try { sessionStorage.setItem(`picture-order:${body.id}`, body.accessToken); } catch { /* The fragment carries access when browser storage is unavailable. */ }
      window.location.assign(`/picture-studio/orders/${encodeURIComponent(body.id)}#access=${encodeURIComponent(body.accessToken)}`);
    } catch (problem) { setError(problem instanceof Error ? problem.message : "Your brief could not be saved."); setBusy(false); }
  }

  return <main className={styles.page}><div className={styles.shell}>
    <Link className={styles.back} href="/services/picture-packages">← Picture packages</Link>
    <p className={styles.eyebrow}>YOUR PICTURE STUDIO</p><h1>Give the pictures a reason to matter.</h1><p className={styles.lead}>Choose the moment, feeling, and theme. Save your brief, upload references, then pay securely in Stripe. Production starts after successful payment and your scene-plan approval.</p>
    {ready === null && <p role="status" className={styles.notice}>Checking studio availability…</p>}
    {ready === false && <div className={styles.notice}><strong>The automated studio is being prepared.</strong><p>You can still order a picture pack and work with our team by email. We verify your Stripe payment before starting.</p><div className={styles.actions}><Link className={styles.button} href="/services/picture-packages#packages">View available packages</Link><a className={styles.button + " " + styles.secondary} href={`mailto:${BUSINESS.email.hello}`}>Contact the team</a></div></div>}
    <form onSubmit={start}>
      <section className={styles.card}><h2>1. Choose your pack</h2><div className={styles.fieldGrid}>
        <label className={styles.field}>Picture package<select value={packId} onChange={e => { setPackId(e.target.value as PackId); setQuantity(1); }}>{packs.map(item => <option key={item.id} value={item.id}>{item.name} · {usd(item.priceUsd)}</option>)}</select></label>
        <label className={styles.field}>Quantity<select value={quantity} disabled={packId !== "daily"} onChange={e => setQuantity(Number(e.target.value))}>{(packId === "daily" ? [1,2,3,4] : [1]).map(n => <option key={n} value={n}>{n} {n === 1 ? "pack" : "packs"}</option>)}</select></label>
        <label className={styles.field}>Your name<input name="name" required minLength={2} maxLength={140} autoComplete="name" /></label>
        <label className={styles.field}>Your email<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
      </div><div className={styles.summary}><div><strong>{pack.pictures * quantity} custom pictures</strong><p>Matching captions · Square + portrait exports</p></div><strong>{usd(pack.priceUsd * quantity)} once</strong></div></section>
      <section className={styles.card}><h2>2. Tell us the story</h2><BriefFields value={brief} onChange={setBrief} /></section>
      <p className={styles.muted}>Next: add up to eight reference photos and review your Stripe checkout. No payment is taken by this form. Save your private order link for access to your project.</p>
      {error && <p role="alert" className={styles.notice + " " + styles.error}>{error}</p>}
      <button className={styles.button} disabled={!ready || busy} type="submit">{busy ? "Saving your brief…" : "Save brief and add photos"}</button>
    </form>
  </div></main>;
}
