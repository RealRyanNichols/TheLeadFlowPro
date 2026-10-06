"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { PublicPictureOrder, PictureBrief, PictureStatus } from "@/lib/pictureStudio/types";
import { BUSINESS } from "@/lib/site/business";
import { usd } from "@/lib/site/prices";
import BriefFields from "./BriefFields";
import styles from "./studio.module.css";

const STATUS: Record<PictureStatus, string> = { awaiting_payment: "Ready for checkout", planning: "Creating your scene plan", awaiting_plan_approval: "Your scene plan is ready", queued: "Production queued", generating: "Creating your pictures", owner_review: "Our team is reviewing the drafts", customer_review: "Your drafts are ready to review", delivered: "Your approved collection is ready", paused: "Paused for team attention", failed: "Our team needs to check this project", refunded: "Payment refunded", disputed: "Payment needs review" };

export function ProtectedPicture({ url, token, alt }: { url: string; token: string; alt: string }) {
  const [source, setSource] = useState("");
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [visible, setVisible] = useState(false);
  const target = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!("IntersectionObserver" in window)) { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); } }, { rootMargin: "400px" });
    if (target.current) observer.observe(target.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController(); let local = ""; setFailed(false);
    fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: "no-store" }).then(async response => { if (!response.ok) throw new Error(); local = URL.createObjectURL(await response.blob()); setSource(local); }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => { controller.abort(); if (local) URL.revokeObjectURL(local); };
  }, [url, token, attempt, visible]);
  if (failed) return <div ref={target}><p className={styles.muted}>The preview could not load.</p><button type="button" className={styles.button + " " + styles.secondary} onClick={() => setAttempt(value => value+1)}>Retry preview</button></div>;
  if (!source) return <div ref={target} style={{ minHeight: 90 }}><p className={styles.muted}>{visible ? "Loading private preview…" : "Private picture preview"}</p></div>;
  // Blob URLs come from the authenticated image endpoint and cannot use Next's image proxy.
  // eslint-disable-next-line @next/next/no-img-element
  return <div ref={target}><img src={source} alt={alt} className={styles.preview} /></div>;
}

export default function OrderStudio({ id }: { id: string }) {
  const [token, setToken] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [order, setOrder] = useState<PublicPictureOrder | null>(null);
  const [brief, setBrief] = useState<PictureBrief | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [notes, setNotes] = useState("");
  const [returned, setReturned] = useState("");
  const [origin, setOrigin] = useState("");
  const [linkSaved, setLinkSaved] = useState(false);
  const base = `/api/picture-studio/orders/${encodeURIComponent(id)}`;

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const fromLink = fragment.get("access");
    let saved = "";
    try { saved = sessionStorage.getItem(`picture-order:${id}`) || ""; if (fromLink) sessionStorage.setItem(`picture-order:${id}`, fromLink); } catch { /* The private link still works without browser storage. */ }
    setToken(fromLink || saved); setInitialized(true);
    setOrigin(window.location.origin);
    setReturned(new URLSearchParams(window.location.search).get("checkout") || "");
    if (fromLink) window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, [id]);

  const refresh = useCallback(async (quiet = false) => {
    if (!token) return;
    try {
      const response = await fetch(base, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Your project could not be loaded.");
      setOrder(result); if (!quiet) setError("");
    } catch (problem) { if (!quiet) setError(problem instanceof Error ? problem.message : "Your project could not be loaded."); }
  }, [base, token]);

  useEffect(() => { void refresh(); const timer = window.setInterval(() => { if (!document.hidden) void refresh(true); }, 15000); return () => window.clearInterval(timer); }, [refresh]);

  async function action(path: string, payload: object = {}, method = "POST") {
    if (busy) return; setBusy(path); setError(""); setNotice("");
    try {
      const response = await fetch(base + path, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "This step could not be completed.");
      if (path === "/checkout") {
        if (typeof result.url !== "string" || !result.url.startsWith("https://checkout.stripe.com/")) throw new Error("Stripe checkout could not be opened.");
        window.location.assign(result.url); return;
      }
      if (method === "PATCH") setEditing(false);
      setNotice(path === "/review" ? "Your review was saved." : path === "/approve-plan" ? "Your scene plan is approved. Production is queued." : "Your brief was saved.");
      await refresh();
    } catch (problem) { setError(problem instanceof Error ? problem.message : "This step could not be completed."); }
    finally { setBusy(""); }
  }

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []); event.target.value = "";
    if (!files.length || busy) return;
    setBusy("upload"); setError(""); setNotice("");
    try {
      if (files.length + (order?.assets.length || 0) > 8) throw new Error("Use up to eight reference photos per project.");
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} is larger than 10 MB.`);
        const data = new FormData(); data.set("file", file);
        const response = await fetch(base + "/assets", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: data });
        const result = await response.json(); if (!response.ok) throw new Error(result.error || `${file.name} could not be uploaded.`);
      }
      setNotice("Reference photos uploaded.");
    } catch (problem) { setError(problem instanceof Error ? problem.message : "The upload could not be completed."); }
    finally { await refresh(); setBusy(""); }
  }

  async function privateLink() {
    const link = `${window.location.origin}/picture-studio/orders/${encodeURIComponent(id)}#access=${encodeURIComponent(token)}`;
    try { await navigator.clipboard.writeText(link); setNotice("Private project link copied. Keep it somewhere safe. Anyone with this link can access your project."); }
    catch { setNotice("Your browser could not copy the link. Select and copy the private link shown below, or contact the team for help."); }
  }

  async function download(fileId: string, filename: string, archive = false) {
    setBusy(fileId); setError("");
    try {
      const response = await fetch(base + (archive ? "/download" : `/files/${encodeURIComponent(fileId)}`), { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (!response.ok) throw new Error("The file could not be downloaded. Refresh and try again.");
      const url = URL.createObjectURL(await response.blob()); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (problem) { setError(problem instanceof Error ? problem.message : "The file could not be downloaded."); }
    finally { setBusy(""); }
  }

  function downloadWords() {
    if (!order) return;
    const content = [`${order.brief.title}`, `Customer-selected music: ${order.brief.musicTitle || "Musical direction only; choose and preview your track."}${order.brief.musicArtist ? ` · ${order.brief.musicArtist}` : ""}`, "", order.scenes.map(scene => [`${scene.index + 1}. ${scene.title}`, "", scene.caption, "", `Music notes: ${scene.musicCueNotes || "Preview your preferred track and choose the musical moment."}`, scene.musicStartSeconds == null || !order.brief.userConfirmedMusic ? "Exact music timestamp: preview required." : `Customer-confirmed music start: ${scene.musicStartSeconds} seconds.`, ""].join("\n")).join("\n")].join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `picture-project-${id}-captions.txt`; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const stage = !order || order.paymentStatus === "unpaid" ? 1 : ["planning", "awaiting_plan_approval"].includes(order.status) ? 2 : ["queued", "generating", "owner_review"].includes(order.status) ? 3 : order.status === "delivered" ? 5 : 4;
  const canEdit = !!order && !order.planApprovedAt && ["awaiting_payment", "awaiting_plan_approval", "failed"].includes(order.status);
  const canUpload = !!order && !order.planApprovedAt && ["awaiting_payment", "awaiting_plan_approval"].includes(order.status);

  return <main className={styles.page}><div className={styles.shell}>
    <Link className={styles.back} href="/services/picture-packages">← Picture packages</Link><p className={styles.eyebrow}>YOUR PRIVATE PROJECT</p><h1>{order?.brief.title || "Your picture story"}</h1>
    {!initialized && <p role="status">Opening your project…</p>}
    {initialized && token && !order && !error && <p role="status">Loading your project…</p>}
    {initialized && !token && <div className={styles.notice + " " + styles.error}><strong>Open your private project link.</strong><p>This browser does not have the access link for this order. Use the private link saved when you created the project, or contact <a href={`mailto:${BUSINESS.email.hello}`}>{BUSINESS.email.hello}</a> with your order number.</p><p>Order: {id}</p></div>}
    {error && <p role="alert" className={styles.notice + " " + styles.error}>{error}</p>}
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    {token && <div className={styles.actions}><button type="button" className={styles.button + " " + styles.secondary} onClick={() => void refresh()} disabled={!!busy}>Refresh status</button><button type="button" className={styles.button + " " + styles.secondary} onClick={() => void privateLink()}>Copy private project link</button></div>}
    {order && <>
      <ol className={styles.steps} aria-label="Project progress">{["Brief & photos", "Payment", "Scene plan", "Draft review", "Final files"].map((name, i) => <li key={name} className={i < stage ? styles.active : ""}>{i+1}. {name}</li>)}</ol>
      <div className={styles.summary}><div><strong>{order.pictureCount} custom pictures</strong><p>Square + portrait exports · {usd(order.amountCents / 100)} once</p></div><span className={styles.status}>{STATUS[order.status]}</span></div>
      <p className={styles.muted}>Order {id}. Updates refresh automatically while this page is open.</p>
      {returned === "complete" && order.paymentStatus !== "paid" && <p className={styles.notice}>You returned from checkout. We are waiting for Stripe to confirm successful payment. Returning here does not by itself confirm payment.</p>}
      {returned === "cancelled" && order.paymentStatus === "unpaid" && <p className={styles.notice}>Checkout was cancelled. Your brief is saved, and you can return to checkout when ready.</p>}
      {order.error && <p className={styles.notice}>This project needs team attention. Your saved brief and payment status are retained. Contact <a href={`mailto:${BUSINESS.email.hello}?subject=${encodeURIComponent(`Picture project ${id}`)}`}>{BUSINESS.email.hello}</a> for help.</p>}
      <section className={styles.card}><h2>Your creative brief</h2>{editing && brief ? <form onSubmit={event => { event.preventDefault(); void action("", { brief }, "PATCH"); }}><BriefFields value={brief} onChange={setBrief} disabled={!!busy} /><div className={styles.actions}><button className={styles.button} disabled={!!busy} type="submit">Save updated brief</button><button className={styles.button + " " + styles.secondary} type="button" onClick={() => setEditing(false)}>Cancel edit</button></div><p className={styles.muted}>Saving changes replaces the scene plan and creates a new plan for your approval.</p></form> : <><p><strong>Moment:</strong> {order.brief.moment}<br /><strong>Feeling:</strong> {order.brief.emotion}<br /><strong>Theme:</strong> {order.brief.theme}</p><p style={{ whiteSpace: "pre-wrap" }}>{order.brief.story}</p>{order.brief.words && <p><strong>Approved words:</strong> {order.brief.words}</p>}{canEdit && <button type="button" className={styles.button + " " + styles.secondary} onClick={() => { setBrief({ ...order.brief }); setEditing(true); }}>Edit the brief</button>}</>}</section>
      <section className={styles.card}><h2>Reference photos</h2><p className={styles.muted}>Up to eight JPG, PNG, or WebP images, 10 MB each. Clear faces and consistent reference photos help us keep your people recognizable.</p>{order.assets.length > 0 && <div className={styles.sceneGrid}>{order.assets.map(asset => <div key={asset.id} className={styles.scene}><ProtectedPicture token={token} url={base + `/assets/${asset.id}`} alt={`Your reference photo: ${asset.filename}`} /><p>{asset.filename}</p></div>)}</div>}{canUpload && <label className={styles.upload}>Add photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event => void upload(event)} disabled={!!busy || order.assets.length >= 8} /></label>}{order.brief.usesLikeness && !order.assets.length && <p className={styles.notice}>Your project uses identifiable people. Add at least one reference photo before checkout and plan approval.</p>}</section>
      {order.paymentStatus === "unpaid" && <section className={styles.card}><h2>Save your private project link</h2><p>This link lets you reopen the project after checkout, on another device, or after closing this tab. Keep it in your notes or a password manager. Anyone with the link can access your project.</p><label className={styles.field}>Your private link<input readOnly value={`${origin}/picture-studio/orders/${encodeURIComponent(id)}#access=${encodeURIComponent(token)}`} onFocus={event => event.target.select()} /></label><button className={styles.button + " " + styles.secondary} type="button" onClick={() => void privateLink()}>Copy private link</button><label className={styles.check}><input type="checkbox" checked={linkSaved} onChange={event => setLinkSaved(event.target.checked)} />I have saved my private project link somewhere I can find it again.</label><p className={styles.muted}>If you lose access, contact {BUSINESS.email.hello} with the order number and checkout email. This service does not send an automatic access email yet.</p></section>}
      {order.paymentStatus === "unpaid" && <section className={styles.card}><h2>Pay securely through Stripe</h2><p>Your total is <strong>{usd(order.amountCents / 100)}</strong> for {order.pictureCount} distinct pictures with captions. This is one payment.</p><p>Payment is confirmed by Stripe before your scene plan is created. Images are produced only after you approve the complete plan.</p><button type="button" className={styles.button} disabled={!!busy || !linkSaved || (order.brief.usesLikeness && !order.assets.length)} onClick={() => void action("/checkout")}>{busy === "/checkout" ? "Opening Stripe…" : `Continue to Stripe · ${usd(order.amountCents / 100)}`}</button>{!linkSaved && <p className={styles.muted}>Save your private link above to continue.</p>}</section>}
      {order.paymentStatus === "paid" && <p className={styles.notice}><strong>Payment confirmed.</strong> {STATUS[order.status]}.</p>}
      {order.scenes.length > 0 && <section className={styles.card}><h2>Your scene plan</h2><p>Read the picture direction, full sequence, and captions. Music notes without a customer-confirmed timestamp require previewing the track before posting.</p><div className={styles.sceneGrid}>{order.scenes.map(scene => <article key={scene.index} className={styles.scene}><span>PICTURE {scene.index+1}</span><h3>{scene.title}</h3>{scene.visualDirection && <p><strong>Picture direction:</strong> {scene.visualDirection}</p>}<p><strong>Caption:</strong> {scene.caption}</p>{scene.musicCueNotes && <p><strong>Music:</strong> {scene.musicCueNotes}</p>}{scene.musicStartSeconds != null && order.brief.userConfirmedMusic ? <p className={styles.muted}>Your confirmed cue: {scene.musicStartSeconds}s.</p> : <p className={styles.muted}>Music timing: preview required.</p>}</article>)}</div>{order.status === "awaiting_plan_approval" && <div className={styles.actions}><button className={styles.button} disabled={!!busy} onClick={() => void action("/approve-plan")} type="button">Approve this plan and start production</button><button className={styles.button + " " + styles.secondary} onClick={() => { setBrief({ ...order.brief }); setEditing(true); window.scrollTo({ top: 0, behavior: "smooth" }); }} type="button">Update the brief first</button></div>}</section>}
      {order.files.length > 0 && <section className={styles.card}><h2>{order.status === "delivered" ? "Your final files" : "Review your draft pictures"}</h2><div className={styles.sceneGrid}>{order.files.filter(file => file.variant === "portrait").map(file => <article className={styles.scene} key={file.id}><ProtectedPicture url={base + `/files/${file.id}`} token={token} alt={`Picture ${file.sceneIndex + 1} draft`} /><h3>Picture {file.sceneIndex+1}</h3><p>{order.scenes.find(scene => scene.index === file.sceneIndex)?.caption}</p></article>)}</div>{order.status === "delivered" && <><div className={styles.actions}><button className={styles.button} type="button" disabled={!!busy} onClick={() => void download("archive", `picture-project-${id}.zip`, true)}>{busy === "archive" ? "Preparing your download…" : "Download complete collection"}</button><button className={styles.button + " " + styles.secondary} type="button" onClick={downloadWords}>Download captions and music notes</button></div><p className={styles.muted}>The complete ZIP includes square and portrait pictures, captions, and music notes. You can also download individual files below.</p><div className={styles.files}>{order.files.map(file => <div className={styles.file} key={file.id}><p><strong>Picture {file.sceneIndex+1} · {file.variant}</strong><br />{file.filename}</p><button className={styles.button + " " + styles.secondary} type="button" disabled={!!busy} onClick={() => void download(file.id, file.filename)}>{busy === file.id ? "Downloading…" : "Download"}</button></div>)}</div></>}</section>}
      {order.status === "customer_review" && <section className={styles.card}><h2>Approve your collection or request changes</h2><p>Review every picture before choosing. You have {order.revisionsRemaining} consolidated minor revision round{order.revisionsRemaining === 1 ? "" : "s"} remaining. New concepts or a replacement story need a separate scope.</p>{order.revisionsRemaining > 0 && <label className={styles.field}>One consolidated revision list<textarea minLength={3} maxLength={2000} rows={5} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Picture 1: change the text… Picture 3: adjust the crop…" /></label>}<div className={styles.actions}><button className={styles.button} type="button" disabled={!!busy} onClick={() => void action("/review", { action: "approve" })}>Approve collection and unlock final downloads</button>{order.revisionsRemaining > 0 && <button className={styles.button + " " + styles.secondary} type="button" disabled={!!busy || notes.trim().length < 3} onClick={() => void action("/review", { action: "revise", notes })}>Submit my revision list</button>}</div></section>}
      <p className={styles.muted}>Pictures, captions, and music placement notes are creative deliverables. Posting, audio licenses, ad management, and guaranteed engagement are not included. Questions: <a href={`mailto:${BUSINESS.email.hello}`}>{BUSINESS.email.hello}</a>.</p>
    </>}
  </div></main>;
}
