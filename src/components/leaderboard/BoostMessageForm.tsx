// src/components/leaderboard/BoostMessageForm.tsx — buy a boost message slot.

"use client";

import { useState } from "react";
import { ArrowRight, Loader2, Megaphone } from "lucide-react";
import { EAST_TX_CITIES } from "@/lib/leaderboard";
import { E164_US_MOBILE_PATTERN } from "@/lib/phone";

const TIERS = [
  { dollars: 5,  hours: 1,  label: "$5 · 1 hour" },
  { dollars: 20, hours: 6,  label: "$20 · 6 hours" },
  { dollars: 50, hours: 24, label: "$50 · 24 hours" },
];

export function BoostMessageForm() {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [smsOptOut, setSmsOptOut] = useState(false);
  const [tier, setTier] = useState(TIERS[0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/leaderboard/boost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        publicName: name,
        city: city || null,
        message,
        imageUrl: imageUrl || null,
        websiteUrl: websiteUrl || null,
        email,
        phone: smsOptOut ? null : phone,
        smsOptOut,
        dollars: tier.dollars,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.url) {
      setErr(data?.error || "Couldn't open checkout.");
      setBusy(false);
      return;
    }
    window.location.assign(data.url);
  }

  return (
    <form onSubmit={submit}
      className="rounded-3xl border border-cyan-400 bg-gradient-to-br from-cyan-50 via-white to-accent-300/15 backdrop-blur-xl p-5 sm:p-7 shadow-[0_30px_70px_-20px_rgba(15,23,42,0.20)] ring-1 ring-slate-900/5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-cyan-700 font-bold">
        <Megaphone className="h-3.5 w-3.5" /> Boost the ticker — paid shoutout
      </div>
      <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
        Scroll your message in the live ticker.
      </h3>
      <p className="mt-1 text-sm text-slate-700">
        $5 = 1 hour, $20 = 6 hours, $50 = 24 hours. Highest-tier shoutouts show first.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Field label="Business / display name *">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80}
            placeholder="Smith Roofing"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200" />
        </Field>
        <Field label="East TX city">
          <select value={city} onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200">
            <option value="">— pick a city —</option>
            {EAST_TX_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Your shoutout (5-80 chars) *" className="mt-3">
        <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} required minLength={5} maxLength={80}
          placeholder="Free pie at Joe's Diner this Friday only — Marshall TX"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200" />
        <p className="mt-1 text-[11px] text-slate-500">{message.length}/80 characters · keep it punchy</p>
      </Field>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Logo URL (optional)">
          <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://yourdomain.com/logo.png"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200" />
        </Field>
        <Field label="Website URL (optional)">
          <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://yourbusiness.com"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200" />
        </Field>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        {TIERS.map((t) => (
          <button type="button" key={t.dollars} onClick={() => setTier(t)}
            className={`rounded-2xl border-2 p-3 text-left transition ${
              tier.dollars === t.dollars
                ? "border-cyan-500 bg-white shadow-md"
                : "border-slate-200 bg-white/70 hover:border-cyan-300"
            }`}>
            <div className="text-2xl font-bold text-slate-950 tabular-nums">${t.dollars}</div>
            <div className="text-xs text-slate-600">{t.hours} hour{t.hours === 1 ? "" : "s"} in the ticker</div>
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Email for Stripe record *">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@business.com"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200" />
        </Field>
        <Field label="Mobile (we text receipts) *">
          <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            required={!smsOptOut}
            disabled={smsOptOut}
            pattern={E164_US_MOBILE_PATTERN}
            placeholder="+19031234567"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200 disabled:bg-slate-100 disabled:text-slate-400" />
          <p className="mt-1 text-[10px] text-slate-500">Use +1 followed by 10 digits.</p>
        </Field>
      </div>

      <label className="mt-3 flex items-start gap-2 rounded-2xl border border-slate-200 bg-white/70 p-3 text-xs leading-relaxed text-slate-700">
        <input
          type="checkbox"
          checked={smsOptOut}
          onChange={(e) => setSmsOptOut(e.target.checked)}
          className="mt-0.5"
        />
        <span>I&rsquo;d rather not text. Show me the confirmation on the success page.</span>
      </label>

      {err && <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-900">{err}</div>}

      <button type="submit" disabled={busy || !name || message.length < 5 || !email || (!smsOptOut && !phone)}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-base font-bold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 disabled:opacity-60">
        {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Opening checkout…</> : <>Boost it — ${tier.dollars} <ArrowRight className="h-4 w-4" /></>}
      </button>
    </form>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className || ""}`}>
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
