// src/components/voice/TopicSubmitForm.tsx — submit a Voice topic.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { CATEGORIES, EAST_TX_CITIES } from "@/lib/leaderboard";

export function TopicSubmitForm() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/voice/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        description: description || null,
        city: city || null,
        category: category || null,
        submitterName: submitterName || null,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.topic?.slug) {
      setErr(data?.error || "Couldn't submit topic.");
      setBusy(false);
      return;
    }
    router.push(`/voice/${data.topic.slug}`);
  }

  return (
    <form onSubmit={submit} className="mt-3 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-5 space-y-3">
      <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} required
        placeholder="The question — yes/no, e.g. 'Should the new Buc-ee's open in Tyler?'"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
        placeholder="(optional) a sentence of context"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200" />
      <div className="grid gap-2 sm:grid-cols-3">
        <select value={city} onChange={(e) => setCity(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none">
          <option value="">— city —</option>
          {EAST_TX_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none">
          <option value="">— category —</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="text" value={submitterName} onChange={(e) => setSubmitterName(e.target.value)}
          placeholder="(your name, optional)"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none" />
      </div>
      {err && <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-900">{err}</div>}
      <button type="submit" disabled={busy || question.length < 8}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60">
        {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : <>Submit topic <ArrowRight className="h-4 w-4" /></>}
      </button>
      <p className="text-[11px] text-slate-500">
        Free to submit. Topic stays open for 7 days. Money-weighted voting only — no wagers.
      </p>
    </form>
  );
}
