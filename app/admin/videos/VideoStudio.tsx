"use client";

import { useEffect, useRef, useState } from "react";

type Avatar = { id: string; name: string; preview: string | null };
type Voice = { id: string; name: string; gender: string; language: string };

export default function VideoStudio() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [avatarId, setAvatarId] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [title, setTitle] = useState("");
  const [script, setScript] = useState("");
  const [busy, setBusy] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/videos?resource=avatars");
      if (r.status === 501) {
        setConfigured(false);
        return;
      }
      if (!r.ok) {
        setConfigured(false);
        setError("Could not reach the video service.");
        return;
      }
      const a = await r.json();
      setAvatars(a.avatars ?? []);
      if (a.avatars?.[0]) setAvatarId(a.avatars[0].id);
      const rv = await fetch("/api/videos?resource=voices");
      const v = await rv.json().catch(() => ({ voices: [] }));
      setVoices(v.voices ?? []);
      if (v.voices?.[0]) setVoiceId(v.voices[0].id);
      setConfigured(true);
    })();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setVideoUrl(null);
    setStatus(null);
    const r = await fetch("/api/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, script, avatar_id: avatarId, voice_id: voiceId }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.video_id) {
      setError(j.error ?? "Generation failed.");
      setBusy(false);
      return;
    }
    setVideoId(j.video_id);
    setStatus("processing");
    pollRef.current = setInterval(async () => {
      const sr = await fetch(`/api/videos?resource=status&video_id=${encodeURIComponent(j.video_id)}`);
      const sj = await sr.json().catch(() => ({}));
      setStatus(sj.status ?? "unknown");
      if (sj.status === "completed" && sj.video_url) {
        setVideoUrl(sj.video_url);
        setBusy(false);
        if (pollRef.current) clearInterval(pollRef.current);
      }
      if (sj.status === "failed") {
        setError(typeof sj.error === "string" ? sj.error : "Video generation failed on HeyGen's side.");
        setBusy(false);
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, 8000);
  }

  if (configured === null) {
    return <div className="card text-slate-400">Checking video service…</div>;
  }

  if (configured === false) {
    return (
      <div className="card border border-violet-400/40 shadow-glow-violet">
        <h2 className="text-lg font-bold text-white">One step to turn this on</h2>
        <p className="mt-2 text-sm text-slate-300">
          The AI Video Studio runs on HeyGen — prompt in, spoken avatar video out.
          Same activation pattern as the lead emails:
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-300">
          <li>Create a HeyGen account and copy an API key from Settings → API.</li>
          <li>Vercel → the-lead-flow-pro → Settings → Environment Variables → add <code className="rounded bg-line px-1.5 py-0.5 text-flow-400">HEYGEN_API_KEY</code> (paste the key yourself).</li>
          <li>Redeploy, come back to this page, and the studio lights up. No code changes.</li>
        </ol>
        <p className="mt-3 text-xs text-slate-500">
          For cinematic prompt-to-video (Runway / Veo-class), we wire that in as a
          second engine later — this studio handles tutorial, explainer, and
          talking-head content first.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={generate} className="card space-y-4">
        <div>
          <label className="label" htmlFor="v-title">Video title</label>
          <input id="v-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Own Your Platform — 60 second explainer" maxLength={120} />
        </div>
        <div>
          <label className="label" htmlFor="v-script">Script (what the avatar says)</label>
          <textarea id="v-script" className="input" rows={8} value={script} onChange={(e) => setScript(e.target.value)} required maxLength={5000}
            placeholder={"Stop renting your business.\nShopify, Wix, Mailchimp - an arm and a leg, every month, forever.\nI teach business owners to OWN their platform..."} />
          <p className="mt-1 text-xs text-slate-500">{script.length}/5000 · roughly {Math.max(1, Math.round(script.split(/\s+/).filter(Boolean).length / 145))} min spoken</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="v-avatar">Avatar</label>
            <select id="v-avatar" className="input" value={avatarId} onChange={(e) => setAvatarId(e.target.value)}>
              {avatars.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="v-voice">Voice</label>
            <select id="v-voice" className="input" value={voiceId} onChange={(e) => setVoiceId(e.target.value)}>
              {voices.map((v) => (
                <option key={v.id} value={v.id}>{v.name}{v.gender ? ` (${v.gender})` : ""}</option>
              ))}
            </select>
          </div>
        </div>
        {error && <p className="text-sm font-medium text-red-400">{error}</p>}
        <button type="submit" disabled={busy || !script} className="btn-primary w-full disabled:opacity-50">
          {busy ? "Generating…" : "Generate Video"}
        </button>
      </form>

      <div className="card">
        <h2 className="font-bold text-white">Output</h2>
        {!videoId && (
          <p className="mt-3 text-sm text-slate-400">
            Write the script, pick an avatar and voice, hit generate. Videos take
            a few minutes to render — this panel updates itself.
          </p>
        )}
        {videoId && !videoUrl && (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-ink p-4">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-violet-400" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Rendering on HeyGen…</p>
              <p className="text-xs text-slate-400">status: {status ?? "queued"} · id {videoId}</p>
            </div>
          </div>
        )}
        {videoUrl && (
          <div className="mt-4 space-y-3">
            <video src={videoUrl} controls className="w-full rounded-xl border border-white/10" />
            <a href={videoUrl} target="_blank" rel="noreferrer" className="btn-ghost block text-center">
              Open / Download MP4
            </a>
            <p className="text-xs text-slate-500">
              Download links from HeyGen expire — save the file if you're keeping it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
