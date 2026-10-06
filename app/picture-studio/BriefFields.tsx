"use client";

import type { PictureBrief } from "@/lib/pictureStudio/types";
import styles from "./studio.module.css";

export const EMPTY_BRIEF: PictureBrief = { audience: "personal", title: "", moment: "", emotion: "", theme: "", story: "", words: "", musicTitle: "", musicArtist: "", musicStartSeconds: null, musicCueNotes: "", userConfirmedMusic: false, usesLikeness: false, subjectsConsent: false, assetsRights: false };

export default function BriefFields({ value, onChange, disabled = false }: { value: PictureBrief; onChange: (value: PictureBrief) => void; disabled?: boolean }) {
  const update = <K extends keyof PictureBrief>(key: K, next: PictureBrief[K]) => onChange({ ...value, [key]: next, ...(["musicTitle", "musicArtist", "musicStartSeconds"].includes(key) ? { userConfirmedMusic: false } : {}) });
  return <fieldset disabled={disabled} style={{ border: 0, margin: 0, padding: 0 }}>
    <div className={styles.fieldGrid}>
      <label className={styles.field}>Who is this for?<select value={value.audience} onChange={e => update("audience", e.target.value as PictureBrief["audience"])}><option value="personal">Me or my family</option><option value="business">A business or organization</option><option value="creator">A creator or personal brand</option></select></label>
      <label className={styles.field}>Project title<input required minLength={2} maxLength={140} value={value.title} onChange={e => update("title", e.target.value)} placeholder="Our family adventure, a launch, a comeback…" /></label>
      <label className={styles.field}>The moment or event<input required minLength={2} maxLength={600} value={value.moment} onChange={e => update("moment", e.target.value)} placeholder="What makes this meaningful right now?" /></label>
      <label className={styles.field}>Event date (optional)<input type="date" value={value.eventDate || ""} onChange={e => update("eventDate", e.target.value || undefined)} /><small>The date is planning context, not a promise of rush delivery.</small></label>
      <label className={styles.field}>The emotion<input required minLength={2} maxLength={240} value={value.emotion} onChange={e => update("emotion", e.target.value)} placeholder="Pride, laughter, hope, nostalgia…" /></label>
      <label className={styles.field}>The visual theme<input required minLength={2} maxLength={600} value={value.theme} onChange={e => update("theme", e.target.value)} placeholder="Sci-fi awakening, sports comeback, western…" /></label>
    </div>
    <label className={styles.field}>Tell us the story<textarea required minLength={2} maxLength={4000} rows={5} value={value.story} onChange={e => update("story", e.target.value)} placeholder="Who is pictured? What should happen? For a connected series, describe the opening, journey, and final moment. For business posts, supply accurate details." /></label>
    <label className={styles.field}>Exact words or approved facts (optional)<textarea maxLength={2000} rows={3} value={value.words} onChange={e => update("words", e.target.value)} placeholder="Write any exact text you want included. Add confirmed dates, prices, or details. Leave blank for original suggested wording." /></label>
    <label className={styles.check}><input type="checkbox" checked={value.usesLikeness} onChange={e => update("usesLikeness", e.target.checked)} />Use my face, my family, or other identifiable people in the pictures. I will upload clear reference photos.</label>
    {value.usesLikeness && <label className={styles.check}><input type="checkbox" required checked={value.subjectsConsent} onChange={e => update("subjectsConsent", e.target.checked)} />I have permission from the people pictured, including parent or guardian permission for children.</label>}
    <h3>Make the music fit</h3><p className={styles.muted}>Optional. We provide placement notes, not audio. Preview the version available for your social account before posting.</p>
    <div className={styles.fieldGrid}>
      <label className={styles.field}>Song title<input maxLength={200} value={value.musicTitle} onChange={e => update("musicTitle", e.target.value)} placeholder="Leave blank for a suggested musical direction" /></label>
      <label className={styles.field}>Artist / version<input maxLength={200} value={value.musicArtist} onChange={e => update("musicArtist", e.target.value)} placeholder="Artist and the recording/version you mean" /></label>
      <label className={styles.field}>Start time in seconds (optional)<input type="number" min={0} max={86400} step={1} value={value.musicStartSeconds ?? ""} onChange={e => update("musicStartSeconds", e.target.value === "" ? null : Number(e.target.value))} placeholder="Example: 42" /><small>Add an exact time only after previewing the same recording.</small></label>
      <label className={styles.field}>The musical moment<input maxLength={600} value={value.musicCueNotes} onChange={e => update("musicCueNotes", e.target.value)} placeholder="The opening beat, chorus lift, quiet moment…" /></label>
    </div>
    {(value.musicTitle || value.musicStartSeconds !== null) && <label className={styles.check}><input type="checkbox" required checked={value.userConfirmedMusic} onChange={e => update("userConfirmedMusic", e.target.checked)} />I have previewed this song/version and any exact timestamp I supplied.</label>}
    <label className={styles.check}><input type="checkbox" required checked={value.assetsRights} onChange={e => update("assetsRights", e.target.checked)} />I can use the photos, wording, logos, and other materials I provide.</label>
  </fieldset>;
}
