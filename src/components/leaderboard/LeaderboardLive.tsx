// src/components/leaderboard/LeaderboardLive.tsx
//
// THE viral piece. Public live leaderboard with:
//  - Live-updating animated bar chart (top 20)
//  - Recent purchases ticker that scrolls
//  - Range slider $1 → $1,000 with snap presets + "what your buy does"
//    preview ("→ this puts Joe's Roofing at #2")
//  - Buy form → POST /api/leaderboard/buy → redirects to Stripe
//  - Confetti on success page (separate)
//  - Shareable result button after purchase

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, Crown, Flame, HeartHandshake, Loader2, MapPin, Trophy,
  ExternalLink, Globe2, Sparkles,
} from "lucide-react";
import {
  CATEGORIES,
  DEFAULT_GIVEBACK_TARGET_ID,
  EAST_TX_CITIES,
  type GivebackTargetId,
  GIVEBACK_TARGETS,
} from "@/lib/leaderboard";

type Entry = {
  rank: number;
  publicName: string;
  city: string | null;
  category: string | null;
  websiteUrl: string | null;
  socialUrl: string | null;
  imageUrl: string | null;
  points: number;
  pctOfTop: number;
};

type Ticker = {
  publicName: string;
  city: string | null;
  amountDollars: number;
  agoSeconds: number;
};

type Boost = {
  publicName: string;
  city: string | null;
  message: string;
  imageUrl: string | null;
  websiteUrl: string | null;
  amountDollars: number;
  expiresInSeconds: number;
};

type Snapshot = {
  weekStart: string;
  weekEnd: string;
  resetsInSeconds: number;
  totalEntries: number;
  totalDollars: number;
  totalGivebackCents: number;
  givebackRate: number;
  entries: Entry[];
  ticker: Ticker[];
  boosts?: Boost[];
  lastUpdated: string;
};

const PRESETS = [1, 5, 10, 25, 50, 100, 250, 500, 1000];

export function LeaderboardLive({ initial, prefill }: { initial: Snapshot; prefill?: string }) {
  const [snap, setSnap] = useState<Snapshot>(initial);
  const [poll, setPoll] = useState(0);

  // Buy form state
  const [name, setName] = useState(prefill || "");
  const [city, setCity] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [socialUrl, setSocialUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [email, setEmail] = useState("");
  const [dollars, setDollars] = useState(25);
  const [givebackTargetId, setGivebackTargetId] = useState<GivebackTargetId>(DEFAULT_GIVEBACK_TARGET_ID);
  const [givebackTargetNote, setGivebackTargetNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Autocomplete
  type Suggestion = {
    slug: string;
    publicName: string;
    city: string | null;
    category: string | null;
    websiteUrl: string | null;
    socialUrl: string | null;
    imageUrl: string | null;
    totalLifetimeDollars: number;
  };
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [matchedExisting, setMatchedExisting] = useState<Suggestion | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (name.trim().length < 2) {
      setSuggestions([]);
      setMatchedExisting(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/leaderboard/suggest?q=${encodeURIComponent(name.trim())}`);
        if (!res.ok) return;
        const data = await res.json();
        const list: Suggestion[] = data.suggestions || [];
        setSuggestions(list);
        const exact = list.find((s) => s.publicName.toLowerCase() === name.trim().toLowerCase());
        setMatchedExisting(exact || null);
      } catch {}
    }, 220);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [name]);

  function applySuggestion(s: Suggestion) {
    setName(s.publicName);
    if (s.city) setCity(s.city);
    if (s.category) setCategory(s.category);
    if (s.websiteUrl) setWebsiteUrl(s.websiteUrl);
    if (s.socialUrl) setSocialUrl(s.socialUrl);
    if (s.imageUrl) setImageUrl(s.imageUrl);
    setMatchedExisting(s);
    setShowSuggestions(false);
  }

  // Poll the snapshot every 5 seconds
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const res = await fetch("/api/leaderboard", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as Snapshot;
          setSnap(data);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(t);
  }, [poll]);

  // Countdown
  const [countdown, setCountdown] = useState("");
  useEffect(() => {
    const tick = () => {
      const sec = Math.max(0, Math.floor((new Date(snap.weekEnd).getTime() - Date.now()) / 1000));
      const d = Math.floor(sec / 86400);
      const h = Math.floor((sec % 86400) / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      setCountdown(`${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [snap.weekEnd]);

  // What rank would `name` land at if they bought `dollars`?
  const projectedRank = useMemo(() => {
    if (!name) return null;
    const trimmedName = name.trim();
    const existing = snap.entries.find((e) => e.publicName.toLowerCase() === trimmedName.toLowerCase());
    const myPoints = (existing?.points ?? 0) + dollars;
    const others = snap.entries.filter((e) => e.publicName.toLowerCase() !== trimmedName.toLowerCase());
    let rank = 1;
    for (const o of others) {
      if (o.points > myPoints) rank++;
    }
    const passed = others.filter((o) => o.points <= myPoints && (existing ? o.points >= existing.points : true));
    return { rank, points: myPoints, passed: passed.length };
  }, [snap.entries, name, dollars]);

  const selectedGivebackTarget = useMemo(
    () => GIVEBACK_TARGETS.find((target) => target.id === givebackTargetId) || GIVEBACK_TARGETS[0],
    [givebackTargetId]
  );

  async function submitBuy(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch("/api/leaderboard/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicName: name,
          city: city || null,
          category: category || null,
          websiteUrl: websiteUrl || null,
          socialUrl: socialUrl || null,
          imageUrl: imageUrl || null,
          email: email || null,
          dollars,
          givebackTargetId,
          givebackTargetNote: givebackTargetNote || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setErr(data?.error || "Couldn't create checkout. Try again.");
        setSubmitting(false);
        return;
      }
      window.location.assign(data.url);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Network error.");
      setSubmitting(false);
    }
  }

  const top3 = snap.entries.slice(0, 3);
  const rest = snap.entries.slice(3, 20);
  const projectedGivebackCents = dollars * 70;

  return (
    <div className="space-y-8">
      {/* Top strip: countdown + total + share */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatPill label="Resets in" value={countdown || "—"} accent="cyan" />
        <StatPill label="Total votes this week" value={snap.totalDollars.toLocaleString()} accent="accent" />
        <StatPill label="Local giveback pool" value={formatMoneyFromCents(snap.totalGivebackCents)} accent="rose" />
        <StatPill label="Active competitors" value={String(snap.totalEntries)} accent="brand" />
      </div>

      {/* Boost messages — paid scrolling shouts */}
      {snap.boosts && snap.boosts.length > 0 && (
        <div className="rounded-2xl border border-accent-400 bg-gradient-to-r from-accent-300/40 via-cyan-200/40 to-accent-300/40 backdrop-blur p-3 overflow-hidden">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-accent-700 font-bold mb-2">
            <Sparkles className="h-3.5 w-3.5" /> BOOSTED · paid shoutouts
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {snap.boosts.map((b, i) => (
              <div
                key={`boost-${b.publicName}-${i}`}
                className="shrink-0 rounded-2xl border border-accent-400 bg-white px-3 py-2 text-xs flex items-center gap-2 shadow-sm max-w-md"
              >
                {b.imageUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={b.imageUrl} alt="" className="h-6 w-6 rounded-md object-cover shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 truncate">
                    {b.publicName}
                    {b.city ? <span className="ml-1 text-slate-500">· {b.city}</span> : null}
                  </div>
                  <div className="text-slate-700 truncate">{b.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live ticker */}
      {snap.ticker.length > 0 && (
        <div className="rounded-2xl border border-cyan-200 bg-cyan-50/70 backdrop-blur p-3 overflow-hidden">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-cyan-700 font-bold mb-2">
            <Flame className="h-3.5 w-3.5 animate-pulse" /> LIVE · just backed the board
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {snap.ticker.map((t, i) => (
              <div
                key={`${t.publicName}-${i}`}
                className="shrink-0 rounded-full border border-cyan-300 bg-white px-3 py-1 text-xs flex items-center gap-1.5"
              >
                <span className="font-bold text-slate-900">{t.publicName}</span>
                <span className="text-slate-500">{t.city ? `· ${t.city}` : ""}</span>
                <span className="text-cyan-700 font-bold">+${t.amountDollars}</span>
                <span className="text-slate-400">· {fmtAgo(t.agoSeconds)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top 3 podium */}
      {top3.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {top3.map((e) => (
            <PodiumCard key={e.publicName} e={e} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No one&rsquo;s on the board yet this week. Be the first.
        </div>
      )}

      {/* Bar chart positions 4-20 */}
      {rest.length > 0 && (
        <div className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl p-5 sm:p-6 shadow-[0_30px_70px_-20px_rgba(15,23,42,0.20)] ring-1 ring-slate-900/5">
          <div className="text-xs uppercase tracking-widest text-cyan-700 font-bold mb-4">
            Positions 4 – {3 + rest.length}
          </div>
          <div className="space-y-2.5">
            {rest.map((e) => (
              <BarRow key={e.publicName} e={e} />
            ))}
          </div>
        </div>
      )}

      {/* Buy panel */}
      <form
        onSubmit={submitBuy}
        className="rounded-3xl border border-accent-300 bg-gradient-to-br from-accent-300/15 via-white to-cyan-50 backdrop-blur-xl p-5 sm:p-7 shadow-[0_30px_70px_-20px_rgba(15,23,42,0.20)] ring-1 ring-slate-900/5"
      >
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-accent-700 font-bold">
          <Crown className="h-3.5 w-3.5" /> Climb the East TX Top 10
        </div>
        <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
          $1 = 1 point. Slide your vote. Take the throne.
        </h2>
        <p className="mt-2 text-sm text-slate-700">
          Name + city + how much you want to climb. Stripe handles checkout. Points go up, and
          70% of leaderboard vote proceeds are reserved for East Texas organizations, charity events,
          or local causes.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Field label="Business / display name *">
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Smith Roofing"
                required
                maxLength={80}
                autoComplete="off"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-10 rounded-lg border border-slate-200 bg-white shadow-lg max-h-64 overflow-y-auto">
                  {suggestions.map((s) => (
                    <button
                      key={s.slug}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); applySuggestion(s); }}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                    >
                      <div className="font-semibold text-slate-950">{s.publicName}</div>
                      <div className="text-xs text-slate-500">
                        {s.city || "East TX"}{s.category ? ` · ${s.category}` : ""} · ${s.totalLifetimeDollars.toLocaleString()} lifetime
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {matchedExisting && (
              <p className="mt-1 text-[11px] text-cyan-700">
                ✓ Adding to existing business · their site/social/category stays as set by the owner
              </p>
            )}
          </Field>
          <Field label="East TX city">
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
            >
              <option value="">— pick a city —</option>
              {EAST_TX_CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
            >
              <option value="">— pick a category —</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Email (for receipt)">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@business.com"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
            />
          </Field>
          <Field label="Website (optional, shown publicly)">
            <input
              type="text"
              inputMode="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="yourbusiness.com"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
            />
          </Field>
          <Field label="Social link (optional, shown publicly)">
            <input
              type="text"
              inputMode="url"
              value={socialUrl}
              onChange={(e) => setSocialUrl(e.target.value)}
              placeholder="instagram.com/yourhandle"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
            />
          </Field>
          <Field label="Logo image URL (optional, shown publicly)">
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://yourdomain.com/logo.png"
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              />
              {imageUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={imageUrl}
                  alt="Logo preview"
                  className="h-10 w-10 rounded-lg border border-slate-300 bg-white object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
            </div>
            <p className="mt-1 text-[10px] text-slate-500">
              PNG, JPG, or SVG hosted anywhere public. We&rsquo;ll show it next to your name on the chart.
            </p>
          </Field>
        </div>

        {/* SLIDER — the fun part */}
        <div className="mt-7 rounded-2xl border border-white/60 bg-white/80 backdrop-blur p-5 shadow-sm">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                Your vote
              </div>
              <div className="mt-1 text-5xl sm:text-6xl font-bold tabular-nums">
                <span className="bg-gradient-to-r from-cyan-600 to-accent-600 bg-clip-text text-transparent">
                  ${dollars}
                </span>
              </div>
              <div className="text-sm text-slate-500">
                = {dollars} ranking points
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
                <HeartHandshake className="h-3.5 w-3.5" />
                {formatMoneyFromCents(projectedGivebackCents)} goes into the local giveback pool
              </div>
            </div>
            {projectedRank && (
              <div className="rounded-2xl border border-cyan-300 bg-cyan-50 px-4 py-2 text-right text-sm">
                <div className="text-[10px] uppercase tracking-widest text-cyan-700 font-bold">
                  Lands you at
                </div>
                <div className="text-3xl font-bold tabular-nums text-cyan-800">#{projectedRank.rank}</div>
                <div className="text-[11px] text-slate-600">
                  {projectedRank.points} pts{projectedRank.passed > 0 ? ` · passes ${projectedRank.passed}` : ""}
                </div>
              </div>
            )}
          </div>

          <input
            type="range"
            min={1}
            max={1000}
            step={1}
            value={dollars}
            onChange={(e) => setDollars(Number(e.target.value))}
            className="mt-5 w-full h-3 rounded-full appearance-none cursor-pointer
                       bg-gradient-to-r from-cyan-200 via-accent-200 to-rose-200
                       [&::-webkit-slider-thumb]:appearance-none
                       [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7
                       [&::-webkit-slider-thumb]:rounded-full
                       [&::-webkit-slider-thumb]:bg-gradient-to-br
                       [&::-webkit-slider-thumb]:from-cyan-500
                       [&::-webkit-slider-thumb]:to-accent-500
                       [&::-webkit-slider-thumb]:shadow-lg
                       [&::-webkit-slider-thumb]:shadow-accent-500/40
                       [&::-webkit-slider-thumb]:border-2
                       [&::-webkit-slider-thumb]:border-white
                       [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-7
                       [&::-moz-range-thumb]:rounded-full
                       [&::-moz-range-thumb]:border-0
                       [&::-moz-range-thumb]:bg-cyan-500"
          />

          <div className="mt-3 flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setDollars(p)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  dollars === p
                    ? "bg-slate-900 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:border-cyan-400"
                }`}
              >
                ${p}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <GivebackNote title="Visibility" body={`${dollars} point${dollars === 1 ? "" : "s"} added instantly after checkout.`} />
            <GivebackNote title="Local support" body={`${formatMoneyFromCents(projectedGivebackCents)} reserved for East Texas giveback.`} />
            <GivebackNote title="Proof" body="Check/photo proof gets posted after distributions." />
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-cyan-700 font-bold">
            <HeartHandshake className="h-3.5 w-3.5" /> Choose the giveback direction
          </div>
          <p className="mt-2 text-sm text-slate-700">
            Optional, but useful. This tracks what voters want the 70% local giveback pool pointed
            toward. If people use it, the data tells us what to feature next.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {GIVEBACK_TARGETS.map((target) => {
              const active = target.id === givebackTargetId;
              return (
                <button
                  key={target.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setGivebackTargetId(target.id)}
                  className={`rounded-2xl border p-3 text-left transition ${
                    active
                      ? "border-cyan-500 bg-white shadow-sm ring-2 ring-cyan-200"
                      : "border-white/70 bg-white/60 hover:border-cyan-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-bold text-slate-950">{target.shortLabel}</div>
                    <span
                      className={`h-3 w-3 rounded-full border ${
                        active ? "border-cyan-700 bg-cyan-600" : "border-slate-300 bg-white"
                      }`}
                    />
                  </div>
                  <div className="mt-1 text-xs leading-relaxed text-slate-600">{target.description}</div>
                </button>
              );
            })}
          </div>
          {givebackTargetId === "suggest-local-ministry" && (
            <label className="mt-3 block">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600">
                East Texas ministry to consider
              </span>
              <input
                type="text"
                value={givebackTargetNote}
                onChange={(e) => setGivebackTargetNote(e.target.value)}
                placeholder="Ministry name, church, or local cause"
                maxLength={120}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              />
            </label>
          )}
          <div className="mt-3 rounded-xl border border-white/70 bg-white/70 p-3 text-xs leading-relaxed text-slate-600">
            Preference selected: <strong className="text-slate-950">{selectedGivebackTarget.label}</strong>.
            This is not a separate tax-deductible donation receipt. It is a tracked preference on a
            paid leaderboard vote, reviewed before funds are routed.
          </div>
        </div>

        {err && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            {err}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !name}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-4 text-base font-bold text-white shadow-lg shadow-slate-900/30 hover:bg-slate-800 disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Creating checkout…
            </>
          ) : (
            <>
              Vote ${dollars} · climb to #{projectedRank?.rank ?? "?"} <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        <p className="mt-3 text-[11px] text-slate-500 text-center leading-relaxed">
          Pay-to-rank sponsored placement. Not a contest of chance, sweepstakes, or gambling. Your
          payment buys visible ranking points; top weekly ranks get featured placement and a
          digital badge. 70% of leaderboard vote proceeds are reserved for East Texas organizations,
          charity events, or local causes. All sales final. Texas-law governed.
        </p>
      </form>
    </div>
  );
}

/* ─── small components ─── */

function StatPill({ label, value, accent }: { label: string; value: string; accent: "cyan" | "accent" | "brand" | "rose" }) {
  const tone = {
    cyan: "border-cyan-300 bg-cyan-50/80",
    accent: "border-accent-300 bg-accent-300/20",
    brand: "border-brand-300 bg-brand-50",
    rose: "border-rose-200 bg-rose-50/80",
  }[accent];
  return (
    <div className={`rounded-2xl border ${tone} backdrop-blur p-4`}>
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-950 tabular-nums">{value}</div>
    </div>
  );
}

function PodiumCard({ e }: { e: Entry }) {
  const rankTone = {
    1: "border-accent-400 bg-gradient-to-br from-accent-200/40 to-white",
    2: "border-cyan-400 bg-gradient-to-br from-cyan-100 to-white",
    3: "border-brand-300 bg-gradient-to-br from-brand-100 to-white",
  }[e.rank as 1 | 2 | 3];

  const rankIcon = e.rank === 1 ? Crown : Trophy;
  const RankIcon = rankIcon;
  const rankColor = e.rank === 1 ? "text-accent-600" : e.rank === 2 ? "text-cyan-700" : "text-brand-700";

  return (
    <div className={`rounded-3xl border-2 ${rankTone} backdrop-blur p-5 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.15)]`}>
      <div className="flex items-center justify-between">
        <RankIcon className={`h-7 w-7 ${rankColor}`} />
        <div className="text-3xl font-bold tabular-nums text-slate-950">#{e.rank}</div>
      </div>
      {e.imageUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={e.imageUrl}
          alt={`${e.publicName} logo`}
          className="mt-3 h-14 w-14 rounded-2xl border border-white/80 bg-white object-cover shadow-sm"
          onError={(ev) => { (ev.target as HTMLImageElement).style.display = "none"; }}
        />
      )}
      <div className="mt-3 text-lg font-bold text-slate-950 leading-tight truncate">{e.publicName}</div>
      <div className="mt-1 text-xs text-slate-600 flex items-center gap-2">
        {e.city && (<><MapPin className="h-3 w-3" /> {e.city}</>)}
        {e.category && <><span>·</span><span className="truncate">{e.category}</span></>}
      </div>
      <div className="mt-3 text-2xl font-bold tabular-nums text-cyan-700">{e.points} pts</div>
      <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-accent-500 transition-all duration-700"
          style={{ width: `${e.pctOfTop}%` }}
        />
      </div>
      {(e.websiteUrl || e.socialUrl) && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {e.websiteUrl && (
            <a href={e.websiteUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-cyan-700 hover:underline">
              <Globe2 className="h-3 w-3" /> Website
            </a>
          )}
          {e.socialUrl && (
            <a href={e.socialUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-cyan-700 hover:underline">
              <ExternalLink className="h-3 w-3" /> Social
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function BarRow({ e }: { e: Entry }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 text-right text-xs font-bold tabular-nums text-slate-500">#{e.rank}</div>
      {e.imageUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={e.imageUrl}
          alt=""
          className="h-8 w-8 rounded-lg border border-slate-200 bg-white object-cover shrink-0"
          onError={(ev) => { (ev.target as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-100 to-accent-100 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="font-semibold text-slate-950 truncate">{e.publicName}</span>
          <span className="tabular-nums text-cyan-700 font-bold shrink-0">{e.points} pts</span>
        </div>
        <div className="mt-1 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-accent-500 transition-all duration-700"
            style={{ width: `${e.pctOfTop}%` }}
          />
        </div>
        <div className="mt-1 text-[10px] text-slate-500 truncate">
          {e.city ? `${e.city}` : "East TX"}{e.category ? ` · ${e.category}` : ""}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function GivebackNote({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/70 p-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</div>
      <div className="mt-1 text-xs leading-relaxed text-slate-700">{body}</div>
    </div>
  );
}

function fmtAgo(s: number): string {
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function formatMoneyFromCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
