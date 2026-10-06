"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { PictureOrder, PictureFile, PictureAsset } from "@/lib/pictureStudio/types";
import { usd } from "@/lib/site/prices";
import { ProtectedPicture } from "./OrderStudio";
import styles from "./studio.module.css";

type AdminOrder = Omit<PictureOrder, "assets" | "files"> & { assets: Omit<PictureAsset, "path">[]; files: Omit<PictureFile, "path">[] };
type Readiness = { ready: boolean; configured: boolean; checkoutReady: boolean; checks: Record<string, boolean>; message: string };

export default function OwnerStudio() {
  const [token, setToken] = useState("");
  const [inputToken, setInputToken] = useState("");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [notes, setNotes] = useState("");
  const [revisionScene, setRevisionScene] = useState(0);
  const [revisionPrompt, setRevisionPrompt] = useState("");
  const [revisionCaption, setRevisionCaption] = useState("");
  const [manualScene, setManualScene] = useState(0);
  const [manualCaption, setManualCaption] = useState("");

  useEffect(() => { try { setToken(sessionStorage.getItem("picture-studio-owner") || ""); } catch { /* Team can enter a token without storage. */ } }, []);
  const refresh = useCallback(async () => {
    if (!token) return; setBusy(true); setError("");
    try { const response = await fetch("/api/picture-studio/admin", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Team access could not be verified."); setOrders(body.orders); setReadiness(body.readiness); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "Orders could not be loaded."); }
    finally { setBusy(false); }
  }, [token]);
  useEffect(() => { void refresh(); }, [refresh]);

  function login(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const value = inputToken.trim(); try { sessionStorage.setItem("picture-studio-owner", value); } catch { /* Current page access still works. */ } setToken(value); setInputToken(""); }
  function logout() { try { sessionStorage.removeItem("picture-studio-owner"); } catch { /* Clear memory regardless. */ } setToken(""); setOrders([]); setReadiness(null); setSelected(""); }
  async function action(id: string, kind: string, extra: object = {}) {
    setBusy(true); setError(""); setNotice("");
    try { const response = await fetch(`/api/picture-studio/admin/orders/${id}`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: kind, notes, ...extra }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "The action could not be completed."); setNotice("Team action saved."); await refresh(); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "The action could not be completed."); }
    finally { setBusy(false); }
  }
  const order = orders.find(item => item.id === selected);
  function selectOrder(next: AdminOrder) { setSelected(next.id); setNotes(""); setRevisionScene(0); setRevisionPrompt(next.scenes[0]?.prompt || ""); setRevisionCaption(next.scenes[0]?.caption || ""); setManualScene(0); setManualCaption(next.scenes[0]?.caption || ""); }
  async function uploadAdjustment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const file = data.get("file");
    if (!order || !(file instanceof File) || !file.size) return;
    if (file.size > 10 * 1024 * 1024) { setError("The adjusted picture must be 10 MB or smaller."); return; }
    setBusy(true); setError(""); setNotice("");
    try { const response = await fetch(`/api/picture-studio/admin/orders/${order.id}/outputs`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: data }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "The adjustment could not be saved."); setNotice("Adjusted picture saved with square and portrait exports. Review the full collection before releasing it."); form.reset(); await refresh(); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "The adjustment could not be saved."); }
    finally { setBusy(false); }
  }

  return <main className={styles.page}><div className={styles.shell}>
    <Link className={styles.back} href="/services/picture-packages">← Picture packages</Link><p className={styles.eyebrow}>PRIVATE TEAM WORKSPACE</p><h1>Picture production desk.</h1><p className={styles.lead}>Review briefs, confirm studio readiness, inspect drafts, and release completed collections. Customers receive final downloads only after their approval.</p>
    {!token ? <form className={styles.card} onSubmit={login}><label className={styles.field}>Team access token<input type="password" value={inputToken} required minLength={32} autoComplete="off" onChange={event => setInputToken(event.target.value)} /></label><button type="submit" className={styles.button}>Open the production desk</button><p className={styles.muted}>The token stays in this browser session. Use the configured team token; this form does not create one.</p></form> : <div className={styles.actions}><button className={styles.button} type="button" onClick={() => void refresh()} disabled={busy}>Refresh orders</button><button className={styles.button + " " + styles.secondary} type="button" onClick={logout}>Clear team access</button></div>}
    {error && <p role="alert" className={styles.notice + " " + styles.error}>{error}</p>}{notice && <p role="status" className={styles.notice}>{notice}</p>}
    {readiness && <section className={styles.card}><h2>{readiness.ready ? "Studio is accepting automated orders" : "Studio activation is incomplete"}</h2><p>{readiness.message}</p><div className={styles.checkList}>{Object.entries(readiness.checks).map(([name, passed]) => <span key={name}>{passed ? "✓" : "○"} {name}</span>)}</div></section>}
    {token && <section className={styles.card}><h2>Latest orders</h2><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Project</th><th>Customer</th><th>Payment</th><th>Production</th><th>Open</th></tr></thead><tbody>{orders.map(item => <tr key={item.id}><td><strong>{item.brief.title}</strong><br />{item.pictureCount} pictures · {usd(item.amountCents/100)}</td><td>{item.name}<br />{item.email}</td><td>{item.paymentStatus}</td><td>{item.status.replaceAll("_", " ")}</td><td><button className={styles.button + " " + styles.secondary} type="button" onClick={() => selectOrder(item)}>Review</button></td></tr>)}</tbody></table></div>{!orders.length && <p className={styles.muted}>No orders to display.</p>}</section>}
    {order && <>
      <section className={styles.card}><h2>{order.brief.title}</h2><p>Order {order.id}. {order.paymentStatus} · {order.status.replaceAll("_", " ")}</p><p><strong>Moment:</strong> {order.brief.moment}<br /><strong>Emotion:</strong> {order.brief.emotion}<br /><strong>Theme:</strong> {order.brief.theme}</p><p style={{ whiteSpace: "pre-wrap" }}>{order.brief.story}</p>{order.error && <p className={styles.notice + " " + styles.error}>{order.error}</p>}{order.revisionNotes && <p className={styles.notice}><strong>Customer revision request:</strong><br />{order.revisionNotes}</p>}<label className={styles.field}>Team action note<textarea maxLength={2000} rows={3} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Explain a pause, retry, refund review, or release decision." /></label><div className={styles.actions}>
        {order.status !== "paused" && order.status !== "delivered" && order.paymentStatus === "paid" && <button className={styles.button + " " + styles.secondary} disabled={busy} onClick={() => void action(order.id, "pause")} type="button">Pause production</button>}
        {order.status === "paused" && <button className={styles.button + " " + styles.secondary} disabled={busy} onClick={() => void action(order.id, "resume")} type="button">Resume when safe</button>}
        {["failed", "paused"].includes(order.status) && <button className={styles.button + " " + styles.secondary} disabled={busy} onClick={() => void action(order.id, "retry")} type="button">Retry eligible unspent jobs</button>}
        {order.status === "owner_review" && <button className={styles.button} disabled={busy} onClick={() => void action(order.id, "release")} type="button">Release drafts for customer review</button>}
        <button className={styles.button + " " + styles.secondary} disabled={busy || notes.trim().length < 3} onClick={() => void action(order.id, "refund_note")} type="button">Record refund review note</button>
      </div><p className={styles.muted}>Refund notes do not issue a refund. Process an actual refund in Stripe. Jobs with uncertain provider charges require reconciliation before retrying.</p></section>
      <section className={styles.card}><h2>Creative details to verify</h2><p><strong>Approved wording:</strong> {order.brief.words || "Original suggested wording requested."}<br /><strong>Music selection:</strong> {order.brief.musicTitle || "Musical direction only."} {order.brief.musicArtist}<br /><strong>Music cue:</strong> {order.brief.musicCueNotes || "Preview required."}<br /><strong>Exact time:</strong> {order.brief.userConfirmedMusic && order.brief.musicStartSeconds !== null ? `${order.brief.musicStartSeconds}s, customer confirmed` : "No customer-confirmed timestamp"}<br /><strong>Photo rights confirmed:</strong> {order.brief.assetsRights ? "Yes" : "No"}<br /><strong>Likeness requested:</strong> {order.brief.usesLikeness ? "Yes" : "No"}<br /><strong>Subject permission confirmed:</strong> {order.brief.subjectsConsent ? "Yes" : "No"}</p>{order.assets.length > 0 && <div className={styles.sceneGrid}>{order.assets.map(asset => <article className={styles.scene} key={asset.id}><ProtectedPicture url={`/api/picture-studio/admin/orders/${order.id}/files/${asset.id}`} token={token} alt={`Customer reference: ${asset.filename}`} /><p>{asset.filename}</p></article>)}</div>}</section>
      {order.files.length > 0 && <section className={styles.card}><h2>Private draft review</h2><div className={styles.sceneGrid}>{order.files.filter(file => file.variant === "portrait").map(file => <article className={styles.scene} key={file.id}><ProtectedPicture url={`/api/picture-studio/admin/orders/${order.id}/files/${file.id}`} token={token} alt={`Draft picture ${file.sceneIndex + 1}`} /><h3>Picture {file.sceneIndex+1}</h3><p>{order.scenes.find(scene => scene.index === file.sceneIndex)?.caption}</p></article>)}</div></section>}
      {["paused", "queued", "generating"].includes(order.status) && order.revisionNotes && <form className={styles.card} onSubmit={event => { event.preventDefault(); void action(order.id, "revise_scene", { sceneIndex: revisionScene, prompt: revisionPrompt, caption: revisionCaption }); }}><h2>Apply the reviewed revision</h2><p>Adjust each affected scene within the approved story and the existing production budget. If generation budget or attempts are exhausted, upload a manual adjustment below.</p><label className={styles.field}>Scene<select value={revisionScene} onChange={event => { const index = Number(event.target.value); setRevisionScene(index); setRevisionPrompt(order.scenes.find(scene => scene.index === index)?.prompt || ""); setRevisionCaption(order.scenes.find(scene => scene.index === index)?.caption || ""); }}>{order.scenes.map(scene => <option key={scene.index} value={scene.index}>Picture {scene.index+1}: {scene.title}</option>)}</select></label><label className={styles.field}>Reviewed image direction<textarea required minLength={10} maxLength={6000} rows={6} value={revisionPrompt} onChange={event => setRevisionPrompt(event.target.value)} /></label><label className={styles.field}>Updated caption<textarea required maxLength={4000} rows={4} value={revisionCaption} onChange={event => setRevisionCaption(event.target.value)} /></label><button className={styles.button} disabled={busy} type="submit">Queue this reviewed scene revision</button></form>}
      {["paused", "owner_review"].includes(order.status) && order.paymentStatus === "paid" && order.scenes.length > 0 && <form className={styles.card} onSubmit={event => void uploadAdjustment(event)}><h2>Upload a manual picture adjustment</h2><p>Replace an affected scene with a team-adjusted picture. This creates both exports without making another image-provider call. Release the collection after all requested changes are complete.</p><label className={styles.field}>Scene<select name="sceneIndex" value={manualScene} onChange={event => { const index = Number(event.target.value); setManualScene(index); setManualCaption(order.scenes.find(scene => scene.index === index)?.caption || ""); }}>{order.scenes.map(scene => <option value={scene.index} key={scene.index}>Picture {scene.index+1}: {scene.title}</option>)}</select></label><label className={styles.field}>Adjusted picture<input type="file" name="file" required accept="image/jpeg,image/png,image/webp" /></label><label className={styles.field}>Caption<textarea name="caption" maxLength={4000} rows={4} value={manualCaption} onChange={event => setManualCaption(event.target.value)} /></label><button className={styles.button} disabled={busy} type="submit">Save adjustment and create both exports</button></form>}
    </>}
  </div></main>;
}
