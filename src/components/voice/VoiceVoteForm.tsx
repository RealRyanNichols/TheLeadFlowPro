// src/components/voice/VoiceVoteForm.tsx — client form for a YES/NO money vote.

"use client";

import { useState } from "react";
import { ArrowRight, Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import { EAST_TX_CITIES } from "@/lib/leaderboard";

const PRESETS = [1, 5, 10, 25, 50, 100, 250, 500];

export function VoiceVoteForm({ slug, side, accent }: { slug: string; side: "yes" | "no"; accent: "cyan" | "rose" }) {
  const [dollars, setDollars] = useState(5);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/voice/buy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, side, dollars, displayName: name || null, city: city || null, email: email || null }),
    });
    const data = await res.json();
    if (!res.ok || !data.url) {
      setErr(data?.error || "Couldn't open checkout. Try again.");
      setBusy(false);
      return;
    }
    window.location.assign(data.url);
  }

  const Icon = side === "yes" ? ThumbsUp : ThumbsDown;
  const tone = accent === "cyan"
    ? { border: "border-cyan-300", bg: "bg-cyan-50/80", text: "text-cyan-800", btn: "bg-cyan-600 hover:bg-cyan-700", chip: "border-cyan-300 bg-cyan-100 text-cyan-800" }
    : { border: "border-rose-300", bg: "bg-rose-50",    text: "text-rose-800", btn: "bg-rose-600 hover:bg-rose-700", chip: "border-rose-300 bg-rose-100 text-rose-800" };

  return (
    <form onSubmit={submit}
      className={`rounded-2xl border-2 ${tone.border} ${tone.bg} backdrop-blur p-5 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.10)]`}>
      <div className={`inline-flex items-center gap-2 rounded-full border ${tone.chip} px-3 py-1 text-xs font-bold uppercase tracking-widest`}>
        <Icon className="h-3.5 w-3.5" /> Vote {side.toUpperCase()}
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Your weight</div>
          <div className="mt-1 text-4xl font-bold tabular-nums text-slate-950">${dollars}</div>
        </div>
      </div>

      <input
        type="range"
        min={1} max={500} step={1}
        value={dollars}
        onChange={(e) => setDollars(Number(e.target.value))}
        className="mt-3 w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-200
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6
                   [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
                   [&::-webkit-slider-thumb]:shadow-md
                   [&::-webkit-slider-thumb]:bg-cyan-500"
      />
      <div className="mt-2 flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <button type="button" key={p} onClick={() => setDollars(p)}
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition ${
              dollars === p ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700 hover:border-cyan-400"
            }`}>${p}</button>
        ))}
      </div>

      <div className="mt-4 grid gap-2">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name (optional)"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none" />
        <select value={city} onChange={(e) => setCity(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none">
          <option value="">— your East TX city (optional) —</option>
          {EAST_TX_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email for receipt (optional)"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none" />
      </div>

      {err && <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-900">{err}</div>}

      <button type="submit" disabled={busy}
        className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl ${tone.btn} px-5 py-3 font-bold text-white disabled:opacity-60`}>
        {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Opening…</> : <>Cast ${dollars} on {side.toUpperCase()} <ArrowRight className="h-4 w-4" /></>}
      </button>
    </form>
  );
}
